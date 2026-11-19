'use client';

import { useState } from 'react';
import { aiProviders, isAiProvider, type AiProvider } from '@/lib/aiProviders';

const inputClass = 'w-full h-11 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-gray-100';

export function AiProviderFields({ initialProvider, initialModel }: {
  initialProvider: AiProvider;
  initialModel?: string | null;
}) {
  const [provider, setProvider] = useState(initialProvider);

  return (
    <>
      <div>
        <label htmlFor="ai-provider" className="block text-sm font-medium mb-1.5 text-gray-200">Provedor</label>
        <select id="ai-provider" name="provider" value={provider} className={inputClass} onChange={(event) => {
          if (isAiProvider(event.target.value)) setProvider(event.target.value);
        }}>
          {Object.entries(aiProviders).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="ai-model" className="block text-sm font-medium mb-1.5 text-gray-200">Modelo</label>
        <input
          key={provider}
          id="ai-model"
          name="model"
          defaultValue={provider === initialProvider ? initialModel ?? '' : ''}
          placeholder={aiProviders[provider].defaultModel}
          className={inputClass}
          aria-describedby={provider === 'openrouter' ? 'ai-model-help' : undefined}
        />
        {provider === 'openrouter' && (
          <p id="ai-model-help" className="text-xs text-muted mt-2">
            Deixe em branco para usar openrouter/free ou informe um modelo com sufixo :free.
          </p>
        )}
      </div>
    </>
  );
}
