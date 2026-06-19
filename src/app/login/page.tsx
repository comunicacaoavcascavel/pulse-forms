'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ZalenLogo } from '@/components/ui/ZalenLogo';
import Image from 'next/image';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('E-mail ou senha incorretos. Verifique suas credenciais.');
      setLoading(false);
      return;
    }

    const nextPath = new URLSearchParams(window.location.search).get('next') || '/tenants';
    router.push(nextPath);
    router.refresh();
  };

  return (
    <div className="zalen-page min-h-screen flex items-center justify-center p-6">
      <Card glow className="w-full max-w-[470px] border-primary/25 p-8 md:p-10 relative">
        <div className="mb-8 flex flex-col items-center text-center">
          <ZalenLogo size="lg" />
          <p className="mt-4 text-muted">Acesse sua empresa, igreja ou operação</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            name="email"
            type="email"
            label="E-mail"
            placeholder="admin@empresa.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            name="password"
            type="password"
            label="Senha"
            placeholder="••••••••"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <Button type="submit" variant="gradient" className="w-full py-4 text-lg" disabled={loading}>
            {loading ? 'Acessando...' : 'Entrar'}
          </Button>
        </form>
      </Card>

      <div className="fixed bottom-7 left-7 hidden h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.035] backdrop-blur-md md:flex">
        <Image
          src="/brand/zalen-icon.svg"
          alt="Zalen"
          width={28}
          height={28}
          unoptimized
          className="h-7 w-7 rounded-md object-cover"
        />
      </div>
    </div>
  );
}
