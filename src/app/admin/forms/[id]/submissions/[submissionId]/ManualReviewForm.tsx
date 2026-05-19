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
    scores?: any;
  } | null;
  reviewCriteria: any[];
}

export function ManualReviewForm({ submissionId, initialReview, reviewCriteria }: ManualReviewFormProps) {
  const [comments, setComments] = useState(initialReview?.comments || '');
  const [recommendation, setRecommendation] = useState(initialReview?.recommendation || 'under_review');
  const [scores, setScores] = useState<Record<string, number>>(initialReview?.scores || {});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    
    const res = await saveManualReviewAction(submissionId, comments, recommendation, scores);
    
    if (res.success) {
      setSuccess(true);
      router.refresh();
      setTimeout(() => {
        setSuccess(false);
        setLoading(false);
      }, 2000);
    } else {
      setLoading(false);
      alert(res.error || 'Erro ao salvar avaliação');
    }
  };

  const handleScoreChange = (criterionName: string, value: number) => {
    setScores(prev => ({
      ...prev,
      [criterionName]: value
    }));
  };

  const totalGiven = Object.values(scores).reduce((a, b) => a + b, 0);
  const maxPossible = reviewCriteria.reduce((acc, c) => acc + (c.max_score || 10), 0);

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

      {/* Dynamic Criteria Scoring */}
      {reviewCriteria.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-purple-500/10 pt-4 mt-1">
          <div className="flex justify-between items-center">
            <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>📊</span> Pontuação dos Critérios ({totalGiven} / {maxPossible} pts)
            </h4>
            <div className="text-[10px] text-gray-500 font-mono">
              {maxPossible > 0 ? Math.round((totalGiven / maxPossible) * 100) : 0}% de aproveitamento
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {reviewCriteria.map((c: any) => {
              const currentScore = scores[c.name] || 0;
              const max = c.max_score || 10;
              return (
                <div key={c.name} className="p-3.5 rounded-xl border border-white/5 bg-black/20 flex flex-col gap-2.5">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-xs font-bold text-gray-200">{c.name}</span>
                      {c.description && (
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{c.description}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
                      {currentScore} / {max}
                    </span>
                  </div>

                  {/* Bubble Score controls */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Array.from({ length: max }).map((_, i) => {
                      const value = i + 1;
                      const isSelected = currentScore === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleScoreChange(c.name, value)}
                          className={`w-7 h-7 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center justify-center border ${
                            isSelected
                              ? 'bg-amber-500 border-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)] scale-105'
                              : 'bg-black/40 border-white/5 text-gray-400 hover:border-amber-500/30 hover:text-amber-400'
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
