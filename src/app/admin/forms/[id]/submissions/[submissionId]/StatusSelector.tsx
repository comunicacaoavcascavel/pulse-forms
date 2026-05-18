'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Nova', color: 'text-blue-400 border-blue-500/40 bg-blue-500/10' },
  { value: 'under_review', label: 'Em Análise', color: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' },
  { value: 'approved', label: '✓ Aprovada', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
  { value: 'rejected', label: '✕ Reprovada', color: 'text-red-400 border-red-500/40 bg-red-500/10' },
];

export function StatusSelector({ submissionId, currentStatus }: { submissionId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleChange = async (newStatus: string) => {
    setSaving(true);
    setStatus(newStatus);
    await supabase.from('form_submissions').update({ status: newStatus }).eq('id', submissionId);
    setSaving(false);
    router.refresh();
  };

  const current = STATUS_OPTIONS.find(o => o.value === status) ?? STATUS_OPTIONS[0];

  return (
    <div className="flex flex-col gap-2 min-w-[180px]">
      <p className="text-xs text-muted uppercase tracking-wider">Status da Inscrição</p>
      <div className="flex flex-col gap-1.5">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value)}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all text-left ${
              status === opt.value
                ? opt.color + ' ring-1 ring-current/30'
                : 'text-gray-500 border-white/10 bg-transparent hover:border-white/20 hover:text-gray-300'
            }`}
          >
            {opt.label}
            {status === opt.value && (
              <span className="float-right">✓</span>
            )}
          </button>
        ))}
      </div>
      {saving && <p className="text-xs text-muted text-center">Salvando...</p>}
    </div>
  );
}
