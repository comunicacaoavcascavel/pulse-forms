'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createUserAction } from '../forms/actions';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function UserForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('leader');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setStatus({ type: 'error', message: 'Por favor, preencha todos os campos.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await createUserAction(email, name, role);
      if (res.success) {
        setName('');
        setEmail('');
        setRole('leader');
        setStatus({
          type: 'success',
          message: 'Usuário convidado com sucesso! A senha padrão de acesso é: PulseForms2026!'
        });
      } else {
        setStatus({ type: 'error', message: res.error || 'Erro ao convidar usuário.' });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: 'Houve um erro imprevisto ao processar.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status && (
        <div className={`p-4 rounded-xl border text-sm flex gap-2.5 items-start ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
          {status.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <p className="leading-relaxed">{status.message}</p>
        </div>
      )}

      <Input
        label="Nome Completo"
        placeholder="Ex: João da Silva"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
      />

      <Input
        label="E-mail"
        type="email"
        placeholder="joao@igreja.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />

      <div className="w-full">
        <label className="block text-sm font-medium mb-1.5 text-gray-200">
          Nível de Acesso
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={loading}
          className="w-full h-11 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-gray-100 placeholder-gray-500 transition-all focus:border-primary focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="leader">Líder de Louvor (Cria forms, avalia)</option>
          <option value="reviewer">Membro da Banca (Visualiza, avalia)</option>
          <option value="pastor">Pastor de Louvor (Apenas visualização)</option>
          <option value="super_admin">Super Administrador (Controle Total)</option>
        </select>
      </div>

      <Button
        variant="primary"
        type="submit"
        className="w-full h-11 flex items-center justify-center gap-2 mt-2"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Convidando...
          </>
        ) : (
          'Convidar Membro'
        )}
      </Button>
    </form>
  );
}
