
import type { AIAnalysisResult } from "../types";
import { VehicleType } from "../types";
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

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
  try {
    const call = httpsCallable(functions, 'analyzeDeliveryRequest');
    const result = await call({ pickup, dropoff, itemDescription });
    const data = result.data as any;

    if (!data) return null;

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
  try {
    const call = httpsCallable(functions, 'parseNaturalLanguageOrder');
    const result = await call({ input });
    return result.data as { pickup?: string; dropoff?: string; itemDescription?: string };
  } catch (e) {
    console.error(e);
    return null;
  }
}

export const chatWithLogisticsAssistant = async (history: { role: string, parts: { text: string }[] }[], message: string) => {
  try {
    const call = httpsCallable(functions, 'chatWithAssistant');
    const result = await call({ history, message });
    const data = result.data as { text: string };
    return data.text;
  } catch (e) {
    console.error(e);
    return "Sorry, I had trouble connecting to the network.";
  }
}
