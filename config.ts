// This file acts as the environment configuration.
// In a real production app, these would come from process.env

export const APP_CONFIG = {
  // Set this to TRUE to simulate backend calls (M-Pesa) without a real server
  // Set to FALSE to use Actual STK Push via Firebase Functions
  USE_MOCK_BACKEND: false,

  // Firebase Functions URL (Update this with your actual project URL)
  API_BASE_URL: 'https://us-central1-axon-8b0a8.cloudfunctions.net',

  // Google Gemini API Key (exposed via vite.config define from GEMINI_API_KEY in .env.local)
  GEMINI_API_KEY: (import.meta.env.VITE_GEMINI_API_KEY as string) || (process.env.GEMINI_API_KEY as string) || '',

  // Google Maps API Key (Fall back to Firebase API key if Maps specific key is missing)
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY || ''
};

// Helper to simulate network latency for realistic feel in Mock mode
export const simulateLatency = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));
