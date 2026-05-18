'use client';
import { Button } from '@/components/ui/Button';

export function CopyButton({ slug }: { slug: string }) {
  const handleCopy = () => {
    const fullUrl = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    alert('Link público de inscrição copiado com sucesso! Você já pode enviar para os membros.');
  };

  return (
    <Button variant="outline" className="w-full" onClick={handleCopy}>
      Copiar Link Público
    </Button>
  );
}

