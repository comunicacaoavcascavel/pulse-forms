'use client';

import { deleteFormAction } from './actions';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';

export function FormActions({ formId, tenantId, tenantSlug }: { formId: string; tenantId: string; tenantSlug: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este formulário?')) {
      await deleteFormAction(formId, tenantId, tenantSlug);
    }
  };

  return (
    <div className="flex gap-2">
      <button 
        onClick={() => router.push(`/t/${tenantSlug}/admin/forms/${formId}/edit`)}
        className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors border border-white/5 hover:border-emerald-500/30"
        title="Editar"
      >
        <Pencil size={14} />
      </button>
      <button 
        onClick={handleDelete}
        className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors border border-white/5 hover:border-red-500/30"
        title="Apagar"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
