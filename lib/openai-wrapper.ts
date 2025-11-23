import OpenAI from "openai";
import { logger } from "./logger";

export interface OpenAICallOptions {
  sessionId?: string;
  timeout?: number; // milliseconds
  maxRetries?: number;
  retryDelay?: number; // milliseconds
}

const DEFAULT_TIMEOUT = 60000; // 60 seconds
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 2000; // 2 seconds

export async function callOpenAIWithRetry<T>(
  fn: () => Promise<T>,
  operation: string,
  options: OpenAICallOptions = {}
): Promise<T> {
  const {
    sessionId,
    timeout = DEFAULT_TIMEOUT,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(
        "OpenAI",
        `${operation} - Attempt ${attempt}/${maxRetries}`,
        undefined,
        sessionId
      );

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`OpenAI call timed out after ${timeout}ms`));
        }, timeout);
      });

      // Race between the actual call and timeout
      const result = await Promise.race([fn(), timeoutPromise]);

      logger.info(
        "OpenAI",
        `${operation} - Success on attempt ${attempt}`,
        undefined,
        sessionId
      );

      return result;
    } catch (error: any) {
      lastError = error;

      const errorMessage = error?.message || String(error);
      const errorType = error?.constructor?.name || "Unknown";

      logger.warn(
        "OpenAI",
        `${operation} - Attempt ${attempt} failed: ${errorType}`,
        { message: errorMessage, attempt, maxRetries },
        sessionId
      );

      // Check if it's a retryable error
      const isRetryable =
        error?.message?.includes("timeout") ||
        error?.message?.includes("Connection error") ||
        error?.message?.includes("ECONNRESET") ||
        error?.message?.includes("ETIMEDOUT") ||
        error?.message?.includes("other side closed") ||
        error?.status === 429 || // Rate limit
        error?.status === 500 || // Server error
        error?.status === 502 || // Bad gateway
        error?.status === 503 || // Service unavailable
        error?.status === 504; // Gateway timeout

      if (!isRetryable || attempt === maxRetries) {
        logger.error(
          "OpenAI",
          `${operation} - Failed after ${attempt} attempts`,
          {
            error: errorMessage,
            type: errorType,
            isRetryable,
          },
          sessionId
        );
        throw error;
      }

      // Exponential backoff: retryDelay * 2^(attempt-1)
      const backoffDelay = retryDelay * Math.pow(2, attempt - 1);
      logger.info(
        "OpenAI",
        `${operation} - Retrying in ${backoffDelay}ms`,
        undefined,
        sessionId
      );

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error("Unknown error in OpenAI call");
}

// Specific helper for chat completions
export async function createChatCompletion(
  openai: OpenAI,
  params: OpenAI.Chat.ChatCompletionCreateParams,
  operation: string,
  options: OpenAICallOptions = {}
): Promise<OpenAI.Chat.ChatCompletion> {
  return callOpenAIWithRetry(
    () => openai.chat.completions.create(params),
    operation,
    options
  );
}
