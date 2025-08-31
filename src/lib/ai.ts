import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY (or GOOGLE_API_KEY) in environment variables");
}

export function getGeminiModel() {
  // gemini-1.5-flash is cost-effective and fast; swap to pro if needed
  return new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    apiKey,
    temperature: 0.7,
    maxOutputTokens: 2048,
  });
}
