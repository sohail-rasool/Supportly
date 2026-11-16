import OpenAI from "openai";
import {
  type ModelSettings,
  setDefaultOpenAIClient,
  setOpenAIAPI,
  setTracingDisabled,
} from "@openai/agents";

/**
 * Chooses which LLM service the agents talk to.
 *
 * - OPENROUTER_API_KEY set → OpenRouter (free `:free` models available).
 * - otherwise              → OpenAI, using OPENAI_API_KEY.
 *
 * The model comes from AI_MODEL, with a sensible default per provider.
 */
const openRouterKey = process.env.OPENROUTER_API_KEY;

export const aiProvider = openRouterKey ? "openrouter" : "openai";

if (openRouterKey) {
  setDefaultOpenAIClient(
    new OpenAI({
      apiKey: openRouterKey,
      baseURL: "https://openrouter.ai/api/v1",
    }),
  );
  // OpenRouter speaks the Chat Completions API, not OpenAI's Responses API.
  setOpenAIAPI("chat_completions");
  // Tracing uploads run logs to OpenAI, which needs a working OpenAI key.
  setTracingDisabled(true);
}

export const aiModel =
  process.env.AI_MODEL ??
  process.env.OPENAI_MODEL ??
  (openRouterKey ? "nvidia/nemotron-3.5-lightning:free" : "gpt-4o-mini");

/**
 * Free OpenRouter models share capacity with everyone and are often busy (429).
 * OpenRouter tries these, in order, when the main model is unavailable.
 * Override with AI_FALLBACK_MODELS="model-a,model-b".
 */
const fallbackModels = (
  process.env.AI_FALLBACK_MODELS ??
  // Both passed a handoff + tool-call test (Nov 2026).
  "nvidia/nemotron-3-ultra-550b-a55b:free,cohere/north-mini-code:free"
)
  .split(",")
  .map((m) => m.trim())
  .filter((m) => m && m !== aiModel);

/** Model settings shared by every agent. */
export const aiModelSettings: ModelSettings = openRouterKey
  ? { providerData: { models: [aiModel, ...fallbackModels] } }
  : {};

/** True when an API key for the selected provider is configured. */
export const hasAiKey = Boolean(openRouterKey || process.env.OPENAI_API_KEY);
