'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { FormActions } from './forms/FormActions';
import { CopyButton } from './CopyButton';
import { deleteFolderAction, moveFormAction } from './forms/actions';
import { Eye, FolderInput, Trash2 } from 'lucide-react';

type Folder = {
  id: string;
  name: string;
};

type Form = {
  id: string;
  title: string;
  slug: string;
  form_submissions: { count: number }[];
  [key: string]: any;
};

interface FormListTabsProps {
  folders: Folder[];
  formsByFolder: Record<string, Form[]>;
  tenantId: string;
  tenantSlug: string;
}

export function FormListTabs({ folders, formsByFolder, tenantId, tenantSlug }: FormListTabsProps) {
  const [activeTab, setActiveTab] = useState<string>('unassigned');
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [movingFormId, setMovingFormId] = useState<string | null>(null);

  // Helper to get count safely
  const getSubmissionsCount = (form: Form) => {
    return form.form_submissions?.[0]?.count ?? 0;
  };

  const handleDeleteFolder = async () => {
    if (activeTab === 'unassigned') return;
    const confirmDelete = confirm('Tem certeza? Isso apagará a pasta E TODOS os formulários (com suas respostas) dentro dela!');
    if (!confirmDelete) return;

    setDeletingFolder(true);
    const res = await deleteFolderAction(activeTab, tenantId, tenantSlug);
    setDeletingFolder(false);
    if (res.success) {
      setActiveTab('unassigned');
    } else {
      alert(res.error);
    }
  };

  const FormCard = ({ form }: { form: Form }) => {
    const count = getSubmissionsCount(form);
    return (
      <Card key={form.id} className="p-4 flex flex-col gap-3 border border-primary/20 bg-[#050b16]/80 hover:border-primary/40 transition-colors relative overflow-hidden group">
        <div className="absolute top-0 right-0 h-24 w-32 bg-[radial-gradient(ellipse_at_center,rgba(131,189,255,0.14),transparent_65%)] pointer-events-none transition-all group-hover:opacity-100 opacity-70" />
        <div className="flex justify-between items-start gap-2 relative z-10">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate text-sm" title={form.title}>{form.title}</h3>
            <p className="text-xs text-gray-500 font-mono truncate" title={form.slug}>/{form.slug}</p>
          </div>
          {form.status === 'published' ? (
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 font-medium whitespace-nowrap">ATIVO</span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 font-medium whitespace-nowrap">RASCUNHO</span>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm mt-1 relative z-10">
          <div className="flex flex-col">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">Respostas</span>
            <span className="text-primary font-bold text-lg leading-tight">{count}</span>
          </div>
        </div>
        
        <div className="mt-2 border-t border-white/5 pt-3 flex flex-col gap-3 relative z-10">
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              <Link href={`/t/${tenantSlug}/admin/forms/${form.id}`} title="Visualizar Respostas">
                <button className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors border border-white/5 hover:border-emerald-500/30">
                  <Eye size={14} />
                </button>
              </Link>
              <CopyButton slug={form.slug} tenantSlug={tenantSlug} />
              <FormActions formId={form.id} tenantId={tenantId} tenantSlug={tenantSlug} />
            </div>
            
            <div className="relative group/folder">
              <button className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors border border-white/5 hover:border-emerald-500/30">
                <FolderInput size={14} />
              </button>
              <select
                value={form.folder_id || 'unassigned'}
                disabled={movingFormId === form.id}
                title="Mover Pasta"
                onChange={async (e) => {
                  const val = e.target.value === 'unassigned' ? null : e.target.value;
                  setMovingFormId(form.id);
                  await moveFormAction(form.id, val, tenantId, tenantSlug);
                  setMovingFormId(null);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
              >
                <option value="unassigned">Mover para: Geral</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>Mover para: {f.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const activeForms = formsByFolder[activeTab] || [];
  const hasNoFormsAtAll = Object.values(formsByFolder).every(arr => arr.length === 0);

  if (hasNoFormsAtAll && folders.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
        <p className="mb-4">Você ainda não possui formulários.</p>
        <Link href={`/t/${tenantSlug}/admin/forms/new`}>
          <Button variant="outline">+ Criar seu primeiro formulário</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/5 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('unassigned')}
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'unassigned' 
                ? 'text-primary border-primary bg-white/[0.03]' 
                : 'text-gray-400 border-transparent hover:bg-white/[0.02] hover:text-gray-300'
            }`}
          >
            <span className="mr-2">⏺</span> Geral
          </button>
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => setActiveTab(folder.id)}
              className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === folder.id 
                ? 'text-primary border-primary bg-white/[0.03]' 
                  : 'text-gray-400 border-transparent hover:bg-white/[0.02] hover:text-gray-300'
              }`}
            >
              <span className="mr-2">📁</span> {folder.name}
            </button>
          ))}
        </div>
        
        {activeTab !== 'unassigned' && (
          <div className="pl-4">
            <button 
              onClick={handleDeleteFolder}
              disabled={deletingFolder}
              title="Apagar Pasta"
              className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20 disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="bg-white/[0.01] p-1 rounded-xl">
        {activeForms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeForms.map(form => <FormCard key={form.id} form={form} />)}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500 border border-dashed border-white/5 rounded-lg bg-black/20">
            <p className="italic mb-2">
              {activeTab === 'unassigned' 
                ? 'Nenhum formulário na pasta geral.' 
                : 'Esta pasta está vazia.'}
            </p>
            <Link href={`/t/${tenantSlug}/admin/forms/new`}>
              <Button variant="outline" className="text-xs mt-2">Criar formulário aqui</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
