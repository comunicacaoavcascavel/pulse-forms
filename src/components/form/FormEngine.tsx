'use client';
import React, { useState } from 'react';
import { FormSchema, Section, Question } from '@/types/form';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChevronRight, AlertCircle } from 'lucide-react';

interface FormEngineProps {
  schema: FormSchema;
}

export function FormEngine({ schema }: FormEngineProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const currentSection = schema.sections[currentSectionIndex];
  const isLastSection = currentSectionIndex === schema.sections.length - 1;

  const handleInputChange = (questionKey: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionKey]: value }));
  };

  const checkBlockingRules = (section: Section): string | null => {
    // Specific rule logic for MVP (can be abstracted in schema later)
    if (section.title.toLowerCase().includes('pré-requisitos') || section.title.toLowerCase().includes('pre-requisitos')) {
      const q1 = answers['recepcao_novos_membros'] || answers[section.questions.find(q => q.label.toLowerCase().includes('recepção'))?.key || ''];
      const q2 = answers['curso_essencia'] || answers[section.questions.find(q => q.label.toLowerCase().includes('essência'))?.key || ''];
      const q3 = answers['retiro_transformacao'] || answers[section.questions.find(q => q.label.toLowerCase().includes('retiro'))?.key || ''];
      
      if (q1 === 'Não' || q2 === 'Não' || q3 === 'Não') {
        return "Neste momento sua inscrição ainda não pode prosseguir, pois a conclusão da Recepção, Essência e Retiro são pré-requisitos para participar da audição.";
      }
    }
    return null;
  };

  const handleNext = async () => {
    // Basic required validation
    const unansweredRequired = currentSection.questions.filter(q => q.required && !answers[q.key]);
    if (unansweredRequired.length > 0) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    // Check custom rules
    const blockMsg = checkBlockingRules(currentSection);
    if (blockMsg) {
      setBlockedMessage(blockMsg);
      return;
    }

    if (!isLastSection) {
      setCurrentSectionIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsSubmitting(true);
      try {
        const { submitFormAction } = await import('@/app/actions/submitForm');
        const res = await submitFormAction(schema.id, answers);
        setSubmissionId(res.protocolNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error(err);
        alert("Houve um erro ao enviar sua inscrição. Tente novamente.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (submissionId) {
    return (
      <Card glow className="text-center p-8 max-w-xl mx-auto mt-16 border-emerald-900/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
           <span className="text-emerald-400 text-3xl">✓</span>
        </div>
        <h2 className="text-2xl font-bold mb-4 text-emerald-50">Inscrição Concluída!</h2>
        <p className="text-gray-300 mb-2">Sua resposta foi gravada com sucesso e enviada para nossa liderança.</p>
        <div className="mt-8 p-4 bg-black/40 rounded-xl border border-white/5">
           <p className="text-muted text-sm mb-1 uppercase tracking-wider">Número de Protocolo</p>
           <p className="text-emerald-400 font-mono text-xl">{submissionId}</p>
        </div>
      </Card>
    );
  }

  if (blockedMessage) {
    return (
      <Card glow className="text-center p-8 max-w-xl mx-auto mt-16 border-red-900/50 shadow-[0_0_30px_rgba(220,38,38,0.15)]">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">Inscrição Interrompida</h2>
        <p className="text-gray-300 mb-8">{blockedMessage}</p>
        <Button variant="outline" onClick={() => setBlockedMessage(null)}>Voltar e corrigir</Button>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-12 mb-20 px-6">
      {/* Progress */}
      <div className="flex items-center justify-between mb-8">
        <div className="text-sm text-primary font-semibold tracking-wider uppercase">
          Etapa {currentSectionIndex + 1} de {schema.sections.length}
        </div>
        <div className="flex gap-2">
          {schema.sections.map((_, idx) => (
            <div key={idx} className={`h-1.5 w-8 rounded-full transition-all ${idx <= currentSectionIndex ? 'bg-primary shadow-[0_0_8px_var(--primary)]' : 'bg-border'}`} />
          ))}
        </div>
      </div>

      <Card glow className="p-8 md:p-10 relative">
         <div className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full blur-xl opacity-60"></div>
        <h2 className="text-3xl font-bold mb-2">{currentSection.title}</h2>
        {currentSection.description && (
          <p className="text-muted text-lg mb-8 pb-8 border-b border-white/5">{currentSection.description}</p>
        )}

        <div className="space-y-8">
          {currentSection.questions.map((question) => (
            <div key={question.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <RenderQuestion 
                question={question} 
                value={answers[question.key] || ''} 
                onChange={(val) => handleInputChange(question.key, val)} 
              />
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-between items-center pt-8 border-t border-white/5">
           {currentSectionIndex > 0 ? (
             <Button variant="outline" className="w-auto px-6" onClick={() => setCurrentSectionIndex(prev => prev - 1)}>
               Voltar
             </Button>
           ) : <div/>}
           
           <Button variant="primary" className="w-auto px-8 flex items-center gap-2" onClick={handleNext} disabled={isSubmitting}>
             {isSubmitting ? 'Processando...' : (isLastSection ? 'Finalizar Inscrição' : 'Próxima etapa')} 
             {!isLastSection && !isSubmitting && <ChevronRight className="w-5 h-5" />}
           </Button>
        </div>
      </Card>
    </div>
  );
}

function RenderQuestion({ question, value, onChange }: { question: Question, value: string, onChange: (val: string) => void }) {
  if (question.type === 'single_choice' && question.options) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium mb-3 text-gray-200">
          {question.label} {question.required && <span className="text-primary">*</span>}
        </label>
        <div className="space-y-3">
          {question.options.map((opt) => (
            <label 
              key={opt} 
              onClick={() => onChange(opt)}
              className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer ${value === opt ? 'bg-primary/10 border-primary shadow-[inset_0_0_10px_rgba(16,185,129,0.2)]' : 'bg-black/20 border-border hover:border-primary/40'}`}
            >
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 transition-colors ${value === opt ? 'border-primary' : 'border-gray-500'}`}>
                 {value === opt && <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_5px_var(--primary)]" />}
              </div>
              <span className="text-sm text-gray-200">{opt}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  // Fallback for text, email, phone, url, date
  return (
    <Input 
      label={`${question.label} ${question.required ? '*' : ''}`}
      tip={question.description}
      type={question.type === 'date' ? 'date' : question.type === 'email' ? 'email' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Sua resposta...`}
    />
  );
}
