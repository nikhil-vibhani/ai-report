import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { initializeKeys, getNextKey, markKeyAsRateLimited } from "@/config/keys";

// Initialize the key management system
initializeKeys();

// Cache for model instances
let currentModel: ChatGoogleGenerativeAI | null = null;
let currentApiKey: string | null = null;

// Error codes that indicate rate limiting or quota exceeded
const RATE_LIMIT_CODES = [
  '429', // Too Many Requests
  '429 Too Many Requests',
  'resource_exhausted',
  'quota_exceeded',
  'rate_limit_exceeded'
];

interface ApiError extends Error {
  code?: string | number;
  message: string;
}

function isRateLimitError(error: unknown): boolean {
  const err = error as ApiError;
  const errorMessage = (err.message || '').toLowerCase();
  const errorCode = (err.code || '').toString();
  
  return RATE_LIMIT_CODES.some(code => 
    errorMessage.includes(code.toLowerCase()) || 
    errorCode.toString() === code
  );
}

function createModel(apiKey: string): ChatGoogleGenerativeAI {
  return new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    apiKey,
    temperature: 0.7,
    maxOutputTokens: 2048,
  });
}

export async function getGeminiModel(): Promise<ChatGoogleGenerativeAI> {
  // If we have a valid model, return it
  if (currentModel && currentApiKey) {
    return currentModel;
  }

  // Get the next available API key
  const apiKey = getNextKey();
  if (!apiKey) {
    throw new Error('All API keys are currently rate limited. Please try again later.');
  }

  // Create and cache the new model
  currentApiKey = apiKey;
  currentModel = createModel(apiKey);
  return currentModel;
}

// Wrapper function to handle rate limiting and automatic key rotation
export async function withKeyRotation<T>(
  fn: (model: ChatGoogleGenerativeAI) => Promise<T>
): Promise<T> {
  let lastError: Error | null = null;
  let retries = 3; // Maximum number of retries with different keys

  while (retries > 0) {
    try {
      const model = await getGeminiModel();
      const result = await fn(model);
      return result;
    } catch (error: unknown) {
      const err = error as ApiError;
      lastError = err;
      
      if (isRateLimitError(error) && currentApiKey) {
        console.warn(`Rate limit hit for API key (${currentApiKey.substring(0, 10)}...), rotating to next key`);
        markKeyAsRateLimited(currentApiKey);
        
        // Clear the current model to force creation of a new one with a different key
        currentModel = null;
        currentApiKey = null;
        
        retries--;
        
        // Add a small delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // For non-rate-limit errors, rethrow immediately
        throw error;
      }
    }
  }

  throw lastError || new Error('Failed after multiple retries with different API keys');
}
