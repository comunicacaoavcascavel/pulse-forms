export const aiProviders = {
  openai: { label: 'OpenAI', defaultModel: 'gpt-4o-mini' },
  gemini: { label: 'Gemini', defaultModel: 'gemini-1.5-flash' },
  openrouter: { label: 'OpenRouter (gratuito)', defaultModel: 'openrouter/free' },
} as const;

export type AiProvider = keyof typeof aiProviders;

export function isAiProvider(value: string): value is AiProvider {
  return Object.hasOwn(aiProviders, value);
}

export function isFreeOpenRouterModel(model: string) {
  return model === aiProviders.openrouter.defaultModel
    || /^[\w.-]+\/[\w.-]+:free$/.test(model);
}
