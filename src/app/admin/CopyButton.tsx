'use client';
import { Button } from '@/components/ui/Button';

export function CopyButton({ link }: { link: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    alert('Link público de inscrição copiado com sucesso! Você já pode enviar para os membros.');
  };

  return (
    <Button variant="outline" className="w-full" onClick={handleCopy}>
      Copiar Link Público
    </Button>
  );
}
