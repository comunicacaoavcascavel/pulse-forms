'use client';
import { Link as LinkIcon, Check } from 'lucide-react';
import { useState } from 'react';

export function CopyButton({ slug, tenantSlug }: { slug: string; tenantSlug: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const fullUrl = `${window.location.origin}/t/${tenantSlug}/f/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="p-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-colors border border-white/5 hover:border-blue-500/30"
      title="Copiar Link Público"
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <LinkIcon size={14} />}
    </button>
  );
}
