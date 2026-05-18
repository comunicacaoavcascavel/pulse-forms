'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { saveManualReviewAction } from '../../../actions';
import { CheckCircle2, MessageSquare, ShieldAlert, Award } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ManualReviewFormProps {
  submissionId: string;
  initialReview: {
    comments: string;
    recommendation: string;
  } | null;
}

export function ManualReviewForm({ submissionId, initialReview }: ManualReviewFormProps) {
  const [comments, setComments] = useState(initialReview?.comments || '');
  const [recommendation, setRecommendation] = useState(initialReview?.recommendation || 'under_review');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    
    const res = await saveManualReviewAction(submissionId, comments, recommendation);
    
    setLoading(false);
    if (res.success) {
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } else {
      alert(res.error || 'Erro ao salvar avaliação');
    }
  };

  const options = [
    {
      value: 'approved',
      label: 'Aprovado para Audição',
      description: 'Candidato cumpre os critérios e está pronto para o teste prático.',
      color: 'border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-emerald-400 bg-emerald-500/5',
      icon: Award
    },
    {
      value: 'needs_pastoral_convo',
      label: 'Conversa Pastoral',
      description: 'Apresenta bons pontos, mas requer alinhamento ou cuidado específico.',
      color: 'border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/5 text-amber-400 bg-amber-500/5',
      icon: MessageSquare
    },
    {
      value: 'rejected',
      label: 'Não Recomendado',
      description: 'Não atende aos pré-requisitos essenciais da escala atual.',
      color: 'border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-500/5 text-rose-400 bg-rose-500/5',
      icon: ShieldAlert
    }
  ];

  return (
    <Card glow className="border-purple-500/20 bg-purple-950/5 p-6 flex flex-col gap-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-xl rounded-full pointer-events-none" />
      
      <div className="flex items-center gap-2">
        <span className="text-xl">⚖️</span>
        <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
          Avaliação de Liderança (Manual)
        </h3>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs text-gray-400 font-medium">Recomendação da Liderança</label>
        <div className="flex flex-col gap-2">
          {options.map(opt => {
            const OptIcon = opt.icon;
            const isSelected = recommendation === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRecommendation(opt.value)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-start gap-3 outline-none ${
                  isSelected 
                    ? opt.color + ' ring-1 ring-purple-500/35 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                    : 'border-white/5 bg-black/10 text-gray-400 hover:text-gray-200'
                }`}
              >
                <OptIcon className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? '' : 'text-gray-500'}`} />
                <div className="flex flex-col gap-0.5">
                  <span className={`font-bold ${isSelected ? '' : 'text-gray-300'}`}>{opt.label}</span>
                  <span className="text-gray-500 leading-relaxed font-normal">{opt.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 font-medium">Parecer / Comentários da Banca</label>
        <textarea
          rows={4}
          value={comments}
          onChange={e => setComments(e.target.value)}
          placeholder="Registre aqui as observações da avaliação, pontos fracos/fortes ou orientações pastorais..."
          className="w-full bg-black/40 border border-white/5 rounded-lg p-3 text-white text-xs focus:border-purple-500/50 outline-none resize-none leading-relaxed transition-all"
        />
      </div>

      <Button
        variant="primary"
        onClick={handleSave}
        disabled={loading}
        className="w-full mt-2 font-semibold flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Salvando...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span className="text-emerald-400">Salvo com Sucesso!</span>
          </>
        ) : (
          <span>Salvar Avaliação</span>
        )}
      </Button>
    </Card>
  );
}
