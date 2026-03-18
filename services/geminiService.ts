
import { GoogleGenAI, Type } from "@google/genai";
import type { AIAnalysisResult } from "../types";
import { VehicleType } from "../types";
import { APP_CONFIG } from "../config";

const ai = new GoogleGenAI({ apiKey: APP_CONFIG.GEMINI_API_KEY });

// Helper to determine vehicle from string
const determineVehicle = (v: string): VehicleType => {
  const lower = v.toLowerCase();
  if (lower.includes('boda') || lower.includes('bike')) return VehicleType.BODA;
  if (lower.includes('tuk')) return VehicleType.TUKTUK;
  if (lower.includes('van')) return VehicleType.VAN;
  if (lower.includes('lorry') || lower.includes('truck') && !lower.includes('trailer') && !lower.includes('prime')) return VehicleType.LORRY;
  if (lower.includes('trailer') || lower.includes('prime') || lower.includes('mover') || lower.includes('container')) return VehicleType.TRAILER;
  return VehicleType.PICKUP;
};

export const analyzeDeliveryRequest = async (
  pickup: string,
  dropoff: string,
  itemDescription: string
): Promise<AIAnalysisResult | null> => {
  if (!APP_CONFIG.GEMINI_API_KEY) return null;

  try {
    const prompt = `
      You are an expert logistics coordinator for Axon in Kenya.
      Analyze this delivery request:
      Pickup: ${pickup}
      Dropoff: ${dropoff}
      Item: ${itemDescription}

      Provide a JSON response with:
      1. recommendedVehicle: (Boda Boda, Tuk-Tuk, Pickup Truck, Cargo Van, 3T Lorry)
      2. relevantVehicles: (Array of vehicle types that are appropriate for this item, e.g. ["Boda Boda", "Tuk-Tuk"] for a laptop)
      3. estimatedPrice: (Number in KES, be realistic based on Kenyan logistics costs)
      4. packagingAdvice: (Short advice on how to pack this item)
      5. riskAssessment: (Any risks like fragility, traffic delays, theft risk)
      6. estimatedDuration: (e.g., "45 mins", "2 days")

      IMPORTANT RULES FOR VEHICLE SELECTION:
      - BODA BODA: Max distance 150km. Only for small items (documents, food, small parcels, medicine).
      - TUK-TUK: Max distance 100km. For medium items or small cargo within towns.
      - PICKUP TRUCK / CARGO VAN: For inter-city (e.g. Nairobi to Mombasa) or large items.
      - 3T LORRY: For heavy cargo, construction materials, or large furniture up to 3 tons.
      - CONTAINER TRAILER: For ultra-heavy cargo (3+ tons), shipping containers (20ft, 40ft), and port logistics.
      - If the distance is > 150km, NEVER recommend Boda Boda or Tuk-Tuk.
      - If the item is a "Container", "20ft", "40ft", or "Ultra-Heavy", MUST recommend Container Trailer.
      - If the item is described as "Cargo", "Gunia", "Sacks", or "Heavy", prefer Pickup Truck, Lorry or Trailer based on weight.
      - For "Instant" city deliveries, prioritize Boda Boda for speed.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
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
          required: ["recommendedVehicle", "relevantVehicles", "estimatedPrice", "packagingAdvice", "riskAssessment", "estimatedDuration"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(text);

    return {
      estimatedPrice: data.estimatedPrice,
      recommendedVehicle: determineVehicle(data.recommendedVehicle),
      relevantVehicles: data.relevantVehicles.map(determineVehicle),
      packagingAdvice: data.packagingAdvice,
      riskAssessment: data.riskAssessment,
      estimatedDuration: data.estimatedDuration
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};

export const parseNaturalLanguageOrder = async (input: string) => {
  if (!APP_CONFIG.GEMINI_API_KEY) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Extract delivery details from this text: "${input}". Return JSON with keys: pickup, dropoff, itemDescription. If a location is not mentioned, use null.`,
      config: {
        responseMimeType: "application/json",
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
  } catch (e) {
    console.error(e);
    return null;
  }
}

export const chatWithLogisticsAssistant = async (history: { role: string, parts: { text: string }[] }[], message: string) => {
  if (!APP_CONFIG.GEMINI_API_KEY) return "I'm offline right now (API Key missing).";

  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: history,
      config: {
        systemInstruction: `You are 'Kifaru', a helpful, witty Kenyan logistics assistant for the app Axon. 
        
        PRICING RULES (in KES):
        - Boda Boda: Base 100 + 40 per km
        - Tuk-Tuk: Base 250 + 60 per km
        - Pickup Truck: Base 800 + 120 per km
        - Cargo Van: Base 1500 + 180 per km
        - 3T Lorry: Base 3500 + 350 per km
        - Container Trailer: Base 12000 + 850 per km
        
        When asked about price, estimate the distance between the locations (if known) and apply these formulas. Round to the nearest 10.
        
        Tone: Use local Kenyan slang occasionally (like 'Sawa', 'Haina shida', 'Niko rada') but remain professional. 
        Role: Help users decide how to ship items, check if items are legal to ship, and give general distance estimates between Kenyan towns.`
      }
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (e) {
    console.error(e);
    return "Sorry, I had trouble connecting to the network.";
  }
}
