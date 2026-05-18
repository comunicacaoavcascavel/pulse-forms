'use client';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <Button variant="outline" className="w-full md:w-auto" onClick={handleLogout}>
      Sair do sistema
    </Button>
  );
}
