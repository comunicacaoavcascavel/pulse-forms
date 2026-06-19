'use client';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button 
      onClick={handleLogout}
      className="p-2 ml-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20"
      title="Sair do sistema"
    >
      <LogOut size={16} />
    </button>
  );
}
