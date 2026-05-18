'use client';
import React, { useState } from 'react';
import { updateUserRoleAction, deleteUserAction } from '../forms/actions';
import { Trash2, Loader2, UserCheck, ShieldAlert } from 'lucide-react';

export function UserRow({ profile, currentUserId }: { profile: any; currentUserId: string }) {
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isMe = profile.id === currentUserId;

  const handleRoleChange = async (newRole: string) => {
    setUpdating(true);
    try {
      const res = await updateUserRoleAction(profile.id, newRole);
      if (!res.success) {
        alert(res.error || 'Erro ao alterar nível de acesso.');
      }
    } catch (err) {
      alert('Erro de conexão ao alterar nível de acesso.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (isMe) {
      alert('Você não pode excluir a si mesmo.');
      return;
    }

    if (!confirm(`Tem certeza de que deseja remover ${profile.name || profile.email} da equipe?`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await deleteUserAction(profile.id);
      if (!res.success) {
        alert(res.error || 'Erro ao remover membro.');
      }
    } catch (err) {
      alert('Erro de conexão ao remover membro.');
    } finally {
      setDeleting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'pastor':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'reviewer':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'pastor':
        return 'Pastor';
      case 'reviewer':
        return 'Banca';
      default:
        return 'Líder';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border uppercase ${isMe ? 'bg-emerald-900/40 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}>
          {profile.name?.charAt(0) || profile.email?.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-200 truncate">{profile.name || 'Sem nome'}</span>
            {isMe && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                Você
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 block truncate">{profile.email}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {updating ? (
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
        ) : (
          <select
            value={profile.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={updating || deleting || isMe}
            className="bg-black/20 border border-white/10 rounded-lg text-xs py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary text-gray-300 disabled:opacity-50"
          >
            <option value="leader">Líder</option>
            <option value="reviewer">Banca</option>
            <option value="pastor">Pastor</option>
            <option value="super_admin">Super Admin</option>
          </select>
        )}

        <button
          onClick={handleDelete}
          disabled={isMe || deleting}
          className={`p-2 rounded-lg transition-colors ${isMe ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'}`}
          title={isMe ? 'Você não pode remover a si mesmo' : 'Remover usuário'}
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin text-red-400" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
