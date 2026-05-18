'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { createFolderAction } from './forms/actions';

export function FolderCreator() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name) return;
    setLoading(true);
    const res = await createFolderAction(name);
    setLoading(false);
    if (res.success) {
      setIsOpen(false);
      setName('');
    } else {
      alert(res.error);
    }
  };

  if (!isOpen) {
    return (
      <Button variant="outline" className="text-sm h-10 whitespace-nowrap" onClick={() => setIsOpen(true)}>
        + Nova Pasta
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input 
        type="text" 
        value={name} 
        onChange={e => setName(e.target.value)} 
        placeholder="Nome da pasta..."
        className="bg-black/50 border border-white/10 rounded-md px-3 py-1 text-sm text-white focus:outline-none focus:border-emerald-500/50"
        autoFocus
        onKeyDown={e => e.key === 'Enter' && handleCreate()}
      />
      <Button variant="primary" className="text-xs py-1.5" onClick={handleCreate} disabled={loading}>Salvar</Button>
      <button onClick={() => setIsOpen(false)} className="text-gray-400 text-xs hover:text-white px-2">X</button>
    </div>
  );
}
