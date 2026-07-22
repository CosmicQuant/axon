// ── Gemini AI handlers (server-side key, never exposed to client) ──
const functions = require('firebase-functions/v1');
const { GoogleGenAI, Type } = require('@google/genai');
const { VEHICLE_RATES } = require('./pricing');

// Initialize with server-side env var (set via Firebase CLI: 
// firebase functions:secrets:set GEMINI_API_KEY)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODEL = 'gemini-2.5-flash';

// Build a pricing summary from the authoritative VEHICLE_RATES table
// so the AI prompt never drifts out of sync with the actual pricing logic.
const buildPricingRules = () => {
    const lines = Object.entries(VEHICLE_RATES)
        .filter(([id]) => !['standard'].includes(id)) // exclude consolidated rate
        .map(([id, r]) => `- ${id}: Base ${r.base} + ${r.perKm} per km`)
        .join('\n');
    return `PRICING RULES (in KES, from authoritative pricing table):\n${lines}\n\nWhen asked about price, estimate the distance between the locations (if known) and apply these formulas. Round to the nearest 10.`;
};

// ── Analyze a delivery request and recommend vehicle/price/packaging ──
const analyzeDeliveryRequestHandler = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { pickup, dropoff, itemDescription } = data;
    if (!pickup || !dropoff || !itemDescription) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing pickup, dropoff, or itemDescription.');
    }

    try {
        const prompt = `
          You are an expert logistics coordinator for Axon in Kenya.
          Analyze this delivery request:
          Pickup: ${pickup}
          Dropoff: ${dropoff}
          Item: ${itemDescription}

          Provide a JSON response with:
          1. recommendedVehicle: (Boda Boda, Tuk-Tuk, Pickup Truck, Cargo Van, 3T Lorry)
          2. relevantVehicles: (Array of vehicle types that are appropriate for this item)
          3. estimatedPrice: (Number in KES, be realistic based on Kenyan logistics costs)
          4. packagingAdvice: (Short advice on how to pack this item)
          5. riskAssessment: (Any risks like fragility, traffic delays, theft risk)
          6. estimatedDuration: (e.g., "45 mins", "2 days")

          IMPORTANT RULES FOR VEHICLE SELECTION:
          - BODA BODA: Max distance 150km. Only for small items (documents, food, small parcels, medicine).
          - TUK-TUK: Max distance 100km. For medium items or small cargo within towns.
          - PICKUP TRUCK / CARGO VAN: For inter-city or large items.
          - 3T LORRY: For heavy cargo, construction materials, or large furniture up to 3 tons.
          - CONTAINER TRAILER: For ultra-heavy cargo (3+ tons), shipping containers (20ft, 40ft).
          - If the distance is > 150km, NEVER recommend Boda Boda or Tuk-Tuk.
          - For "Instant" city deliveries, prioritize Boda Boda for speed.
        `;

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recommendedVehicle: { type: Type.STRING },
                        relevantVehicles: { type: Type.ARRAY, items: { type: Type.STRING } },
                        estimatedPrice: { type: Type.NUMBER },
                        packagingAdvice: { type: Type.STRING },
                        riskAssessment: { type: Type.STRING },
                        estimatedDuration: { type: Type.STRING },
                    },
                    required: ['recommendedVehicle', 'relevantVehicles', 'estimatedPrice', 'packagingAdvice', 'riskAssessment', 'estimatedDuration']
                }
            }
        });

        const text = response.text;
        if (!text) return null;

        return JSON.parse(text);
    } catch (error) {
        console.error('Gemini Analysis Error:', error);
        throw new functions.https.HttpsError('internal', 'AI analysis failed.');
    }
};

// ── Parse natural language into structured order fields ──
const parseNaturalLanguageOrderHandler = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { input } = data;
    if (!input) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing input.');
    }

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: `Extract delivery details from this text: "${input}". Return JSON with keys: pickup, dropoff, itemDescription. If a location is not mentioned, use null.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        pickup: { type: Type.STRING, nullable: true },
                        dropoff: { type: Type.STRING, nullable: true },
                        itemDescription: { type: Type.STRING, nullable: true },
                    }
                }
            }
        });

        return JSON.parse(response.text || '{}');
    } catch (error) {
        console.error('Gemini Parse Error:', error);
        return {};
    }
};

// ── Chat with the logistics assistant "Kifaru" ──
const chatWithAssistantHandler = async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { history, message } = data;
    if (!message) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing message.');
    }

    try {
        const chat = ai.chats.create({
            model: GEMINI_MODEL,
            history: history || [],
            config: {
                systemInstruction: `You are 'Kifaru', a helpful, witty Kenyan logistics assistant for the app Axon.
                
                ${buildPricingRules()}
                
                Tone: Use local Kenyan slang occasionally (like 'Sawa', 'Haina shida', 'Niko rada') but remain professional.
                Role: Help users decide how to ship items, check if items are legal to ship, and give general distance estimates between Kenyan towns.`
            }
        });

        const result = await chat.sendMessage({ message });
        return { text: result.text };
    } catch (error) {
        console.error('Gemini Chat Error:', error);
        return { text: "Sorry, I had trouble connecting to the network." };
    }
};

module.exports = {
    analyzeDeliveryRequestHandler,
    parseNaturalLanguageOrderHandler,
    chatWithAssistantHandler,
};
