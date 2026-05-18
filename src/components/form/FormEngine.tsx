'use client';
import React, { useState, useEffect } from 'react';
import { FormSchema, Section, Question } from '@/types/form';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChevronRight, AlertCircle, UploadCloud, FileVideo, Trash2, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { submitFormAction } from '@/app/actions/submitForm';

interface FormEngineProps {
  schema: FormSchema;
}

export function FormEngine({ schema }: FormEngineProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(!!schema.welcome_text);

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

  if (showWelcome && schema.welcome_text) {
    return (
      <div className="max-w-2xl w-full mx-auto mt-12 mb-20 px-6 z-10">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black border border-primary/20 shadow-glow-inner mb-6">
             <svg className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-primary leading-tight">
            {schema.title}
          </h1>
          {schema.description && (
            <p className="text-muted text-lg">
              {schema.description}
            </p>
          )}
        </div>

        <Card glow className="p-8 md:p-12 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 border border-white/5 bg-black/40">
           <div className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full blur-xl opacity-60"></div>

          <h2 className="text-2xl font-bold mb-6 text-center text-white">{schema.welcome_title || 'Bem-vindo(a) ao processo!'}</h2>
          
          <div className="space-y-6 text-gray-300 mb-10 text-left">
            {schema.welcome_text.split('\n\n').map((p, index) => (
              <p key={index} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: p.replace(/\*(.*?)\*/g, '<strong>$1</strong>') }} />
            ))}
            
            {schema.welcome_disclaimer && (
              <div className="bg-black/30 border border-primary/20 rounded-xl p-5 flex gap-4 mt-6 items-start shadow-glow-inner">
                <svg className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                <div>
                  <h4 className="font-semibold text-gray-200 text-sm mb-1">Aviso de Sigilo Ministerial</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {schema.welcome_disclaimer}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Button 
            variant="gradient" 
            className="w-full py-4 text-lg font-semibold flex items-center justify-center gap-2"
            onClick={() => {
              setShowWelcome(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Iniciar Inscrição
          </Button>
        </Card>
        
        <p className="text-center text-muted text-sm mt-8">
          Pulse Forms &copy; 2026. Todos os direitos reservados.
        </p>
      </div>
    );
  }

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
  if (question.type === 'video_upload') {
    return (
      <VideoUploadField 
        question={question} 
        value={value} 
        onChange={onChange} 
      />
    );
  }

  if (question.type === 'single_choice' && question.options) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium mb-3 text-gray-200">
          {question.label} {question.required && <span className="text-primary">*</span>}
        </label>
        {question.description && (
          <p className="text-xs text-gray-400 mb-3">{question.description}</p>
        )}
        <div className="space-y-3">
          {question.options.map((optOption) => {
            let optionKey = '';
            let optionDisplayLabel = '';
            let optionSubText = '';

            if (typeof optOption === 'object' && optOption !== null) {
              const keys = Object.keys(optOption);
              if (keys.length > 0) {
                optionKey = keys[0];
                optionDisplayLabel = keys[0];
                optionSubText = (optOption as any)[keys[0]];
              }
            } else {
              optionKey = String(optOption);
              optionDisplayLabel = String(optOption);
            }

            const isSelected = value === optionKey;

            return (
              <label 
                key={optionKey} 
                onClick={() => onChange(optionKey)}
                className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-primary/10 border-primary shadow-[inset_0_0_10px_rgba(16,185,129,0.2)]' : 'bg-black/20 border-border hover:border-primary/40'}`}
              >
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 shrink-0 transition-colors ${isSelected ? 'border-primary' : 'border-gray-500'}`}>
                     {isSelected && <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_5px_var(--primary)]" />}
                  </div>
                  <span className="text-sm font-semibold text-gray-200">{optionDisplayLabel}</span>
                </div>
                {optionSubText && (
                  <p className="text-xs text-gray-400 mt-1.5 pl-8 leading-relaxed">
                    {optionSubText}
                  </p>
                )}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.type === 'multiple_choice' && question.options) {
    const selectedValues = value ? value.split(', ') : [];
    
    const toggleOption = (optOption: any) => {
      let optionKey = '';
      if (typeof optOption === 'object' && optOption !== null) {
        const keys = Object.keys(optOption);
        if (keys.length > 0) optionKey = keys[0];
      } else {
        optionKey = String(optOption);
      }

      let newValues;
      if (selectedValues.includes(optionKey)) {
        newValues = selectedValues.filter(v => v !== optionKey);
      } else {
        newValues = [...selectedValues, optionKey];
      }
      onChange(newValues.join(', '));
    };

    return (
      <div className="w-full">
        <label className="block text-sm font-medium mb-3 text-gray-200">
          {question.label} {question.required && <span className="text-primary">*</span>}
        </label>
        {question.description && (
          <p className="text-xs text-gray-400 mb-3">{question.description}</p>
        )}
        <div className="space-y-3">
          {question.options.map((optOption) => {
            let optionKey = '';
            let optionDisplayLabel = '';
            let optionSubText = '';

            if (typeof optOption === 'object' && optOption !== null) {
              const keys = Object.keys(optOption);
              if (keys.length > 0) {
                optionKey = keys[0];
                optionDisplayLabel = keys[0];
                optionSubText = (optOption as any)[keys[0]];
              }
            } else {
              optionKey = String(optOption);
              optionDisplayLabel = String(optOption);
            }

            const isChecked = selectedValues.includes(optionKey);

            return (
              <label 
                key={optionKey} 
                onClick={() => toggleOption(optOption)}
                className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer ${isChecked ? 'bg-primary/10 border-primary shadow-[inset_0_0_10px_rgba(16,185,129,0.2)]' : 'bg-black/20 border-border hover:border-primary/40'}`}
              >
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3 shrink-0 transition-colors ${isChecked ? 'bg-primary border-primary' : 'border-gray-500'}`}>
                     {isChecked && (
                       <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                         <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                       </svg>
                     )}
                  </div>
                  <span className="text-sm font-semibold text-gray-200">{optionDisplayLabel}</span>
                </div>
                {optionSubText && (
                  <p className="text-xs text-gray-400 mt-1.5 pl-8 leading-relaxed">
                    {optionSubText}
                  </p>
                )}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback for text, email, phone, url, date, long_text
  if (question.type === 'long_text') {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium mb-1.5 text-gray-200">
          {question.label} {question.required && <span className="text-primary">*</span>}
        </label>
        {question.description && (
          <p className="text-xs text-gray-400 mb-3">{question.description}</p>
        )}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite sua resposta detalhada..."
          rows={4}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 transition-all focus:border-primary focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y"
        />
      </div>
    );
  }

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

function VideoUploadField({ question, value, onChange }: { question: Question, value: string, onChange: (val: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      const parts = value.split('/');
      setFileName(decodeURIComponent(parts[parts.length - 1]));
    }
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 200MB (209,715,200 bytes)
    const MAX_SIZE_MB = 200;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setError(`O arquivo é muito grande. O limite máximo é de ${MAX_SIZE_MB} MB.`);
      return;
    }

    // Check mime type (should be video)
    if (!file.type.startsWith('video/')) {
      setError('Formato inválido. Por favor, envie apenas arquivos de vídeo (MP4, MOV, etc.).');
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(5);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.cloudinary.com/v1_1/dw75s1ygk/video/upload', true);

      // Track upload progress in real-time
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            const videoUrl = response.secure_url;
            onChange(videoUrl);
            setFileName(file.name);
            setProgress(100);
            setUploading(false);
          } catch (e) {
            console.error(e);
            setError('Erro ao processar a resposta do servidor de vídeo.');
            setUploading(false);
          }
        } else {
          console.error('Cloudinary upload error', xhr.responseText);
          setError('Falha ao enviar o vídeo para o servidor. Tente novamente.');
          setUploading(false);
        }
      };

      xhr.onerror = () => {
        setError('Erro de conexão ao enviar o arquivo. Verifique sua internet.');
        setUploading(false);
      };

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'pulse_uploads');
      
      xhr.send(formData);
    } catch (err: any) {
      console.error(err);
      setError('Falha ao iniciar o envio do arquivo. Tente novamente.');
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    onChange('');
    setFileName(null);
    setProgress(0);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-1 text-gray-200">
        {question.label} {question.required && <span className="text-primary">*</span>}
      </label>
      {question.description && (
        <p className="text-xs text-gray-400 mb-3">{question.description}</p>
      )}

      {value ? (
        <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
              <FileVideo className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-emerald-100 truncate max-w-[200px] md:max-w-xs">{fileName || 'Vídeo enviado'}</p>
              <p className="text-xs text-emerald-400/70">✓ Upload concluído com sucesso</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleRemove}
            className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className={`relative border-2 border-dashed rounded-xl p-6 transition-all text-center ${uploading ? 'border-primary/55 bg-primary/5' : 'border-white/10 hover:border-primary/50 hover:bg-black/10'}`}>
          {uploading ? (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-200">Enviando vídeo... {progress > 0 && `${progress}%`}</p>
              <p className="text-xs text-gray-400 mt-1">Por favor, não feche esta página até o upload concluir.</p>
              <div className="w-full max-w-[200px] bg-black/40 h-1.5 rounded-full mt-4 overflow-hidden border border-white/5">
                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center cursor-pointer py-4">
              <UploadCloud className="w-10 h-10 text-gray-400 mb-3" />
              <span className="text-sm font-medium text-gray-200">Clique para selecionar seu vídeo</span>
              <span className="text-xs text-gray-400 mt-1.5">Formatos aceitos: MP4, MOV, AVI (Tamanho máximo: 200 MB)</span>
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </label>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5 animate-in fade-in">
          <span className="w-1 h-1 rounded-full bg-red-400" />
          {error}
        </p>
      )}
    </div>
  );
}
