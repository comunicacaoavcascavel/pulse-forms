'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createFormAction, updateFormAction } from '@/app/admin/forms/actions';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Palette, ShieldAlert, Brain, X, Plus, Trash2, Circle, Square, Award } from 'lucide-react';

export function FormBuilder({ folders, initialData }: { folders?: any[], initialData?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const supabase = createClient();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('form_assets')
      .upload(filePath, file);

    if (uploadError) {
      alert('Erro ao fazer upload da imagem.');
      setUploadingImage(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('form_assets')
      .getPublicUrl(filePath);

    setTheme({ ...theme, backgroundImage: publicUrl });
    setUploadingImage(false);
  };
  
  // Form Info State
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [status, setStatus] = useState(initialData?.status || 'draft');
  const [slugTouched, setSlugTouched] = useState(!!initialData);
  const [welcomeTitle, setWelcomeTitle] = useState(initialData?.welcome_title || '');
  const [welcomeText, setWelcomeText] = useState(initialData?.welcome_text || '');
  const [folderId, setFolderId] = useState<string>(initialData?.folder_id || '');
  
  // Sections State
  const [sections, setSections] = useState<any[]>(initialData?.sections || []);
  
  // Rules State
  const [rules, setRules] = useState<any[]>(initialData?.rules || []);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Manual Review Criteria State
  const [reviewCriteria, setReviewCriteria] = useState<any[]>(initialData?.review_criteria || []);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Theme State
  const defaultTheme = { primaryColor: '#10b981', backgroundType: 'gradient', backgroundGradient: 'linear-gradient(to bottom right, #020617, #064e3b)', backgroundColor: '#000000' };
  const [theme, setTheme] = useState(initialData?.theme || defaultTheme);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // AI Rules State
  const defaultAiRules = [
    {
      name: 'Chamado e Ministério',
      description: 'Avaliar a clareza do candidato sobre seu chamado ministerial e o desejo sincero de servir no Louvor.',
      max_score: 20,
      active: true,
      criteria: [
        { name: 'Entendimento do Chamado', description: 'O candidato compreende o significado espiritual do serviço?' },
        { name: 'Motivação', description: 'A motivação é servir a Deus e à igreja ou autopromoção?' }
      ]
    },
    {
      name: 'Vida Devocional',
      description: 'Avaliar a constância na leitura bíblica, oração e busca por intimidade espiritual.',
      max_score: 20,
      active: true,
      criteria: [
        { name: 'Constância', description: 'Prática diária de oração e devocional.' },
        { name: 'Maturidade espiritual', description: 'Evidência de relacionamento real com Deus.' }
      ]
    },
    {
      name: 'Maturidade Emocional',
      description: 'Avaliar submissão à liderança, resiliência perante feedbacks e capacidade de trabalhar em equipe.',
      max_score: 20,
      active: true,
      criteria: [
        { name: 'Submissão e Humildade', description: 'Respeito e docilidade com a liderança.' },
        { name: 'Relacionamento Interpessoal', description: 'Facilidade de trabalhar em grupo e lidar com diferenças.' }
      ]
    },
    {
      name: 'Compromisso Ministerial',
      description: 'Avaliar pontualidade, dedicação aos ensaios, zelo com equipamentos e prontidão para servir.',
      max_score: 20,
      active: true,
      criteria: [
        { name: 'Responsabilidade', description: 'Comprometimento com horários e combinados.' },
        { name: 'Zelo e Dedicação', description: 'Disposição para ensaiar e buscar excelência.' }
      ]
    },
    {
      name: 'Alinhamento com a Visão',
      description: 'Avaliar a concordância com a cultura, doutrina e liderança da igreja local.',
      max_score: 20,
      active: true,
      criteria: [
        { name: 'Cultura da Igreja', description: 'Identificação com o DNA e valores da igreja.' }
      ]
    }
  ];

  const [aiRules, setAiRules] = useState<any[]>(initialData?.aiRules?.length ? initialData.aiRules : defaultAiRules);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Auto-generate slug
  useEffect(() => {
    if (!slugTouched && title) {
      setSlug(title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  }, [title, slugTouched]);

  const addSection = () => {
    setSections([...sections, { id: `sec-${Date.now()}`, title: '', description: '', questions: [] }]);
  };

  const updateSection = (sIndex: number, field: string, value: string) => {
    const newSections = [...sections];
    newSections[sIndex][field] = value;
    setSections(newSections);
  };

  const removeSection = (sIndex: number) => {
    setSections(sections.filter((_, i) => i !== sIndex));
  };

  const addQuestion = (sIndex: number) => {
    const newSections = [...sections];
    newSections[sIndex].questions.push({ id: `q-${Date.now()}`, label: '', type: 'short_text', required: true, options: [] });
    setSections(newSections);
  };

  const updateQuestion = (sIndex: number, qIndex: number, field: string, value: any) => {
    const newSections = [...sections];
    newSections[sIndex].questions[qIndex][field] = value;
    setSections(newSections);
  };

  const removeQuestion = (sIndex: number, qIndex: number) => {
    const newSections = [...sections];
    newSections[sIndex].questions = newSections[sIndex].questions.filter((_: any, i: number) => i !== qIndex);
    setSections(newSections);
  };

  const addRule = () => {
    setRules([...rules, { id: `rule-${Date.now()}`, type: 'blocking_prerequisite', question_id: '', condition_value: '', message: '' }]);
  };

  const updateRule = (rIndex: number, field: string, value: string) => {
    const newRules = [...rules];
    newRules[rIndex][field] = value;
    setRules(newRules);
  };

  const removeRule = (rIndex: number) => {
    setRules(rules.filter((_, i) => i !== rIndex));
  };

  // AI Rules Helper Functions
  const addAiRule = () => {
    setAiRules([...aiRules, {
      id: `ai-${Date.now()}`,
      name: '',
      description: '',
      max_score: 20,
      active: true,
      criteria: []
    }]);
  };

  const updateAiRule = (index: number, field: string, value: any) => {
    const newAiRules = [...aiRules];
    newAiRules[index] = { ...newAiRules[index], [field]: value };
    setAiRules(newAiRules);
  };

  const removeAiRule = (index: number) => {
    setAiRules(aiRules.filter((_, i) => i !== index));
  };

  const addAiCriterion = (ruleIndex: number) => {
    const newAiRules = [...aiRules];
    if (!newAiRules[ruleIndex].criteria) newAiRules[ruleIndex].criteria = [];
    newAiRules[ruleIndex].criteria.push({ name: '', description: '' });
    setAiRules(newAiRules);
  };

  const updateAiCriterion = (ruleIndex: number, critIndex: number, field: string, value: string) => {
    const newAiRules = [...aiRules];
    newAiRules[ruleIndex].criteria[critIndex][field] = value;
    setAiRules(newAiRules);
  };

  const removeAiCriterion = (ruleIndex: number, critIndex: number) => {
    const newAiRules = [...aiRules];
    newAiRules[ruleIndex].criteria = newAiRules[ruleIndex].criteria.filter((_: any, i: number) => i !== critIndex);
    setAiRules(newAiRules);
  };

  // Helper to get all questions for rules dropdown
  const allQuestions = sections.flatMap(s => s.questions).filter(q => q.type === 'single_choice' || q.type === 'multiple_choice');

  const handleSave = async () => {
    if (!title || !slug) {
      alert('Título e Slug são obrigatórios.');
      return;
    }

    setLoading(true);
    const payload = {
      title,
      description,
      slug,
      status,
      folder_id: folderId || null,
      welcome_title: welcomeTitle,
      welcome_text: welcomeText,
      theme,
      sections,
      rules,
      aiRules,
      review_criteria: reviewCriteria
    };

    const res = initialData?.id 
      ? await updateFormAction(initialData.id, payload)
      : await createFormAction(payload);

    setLoading(false);

    if (res.success) {
      router.push('/admin');
    } else {
      alert(res.error || 'Erro ao salvar formulário');
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-32">
      
      {/* Header Info */}
      <Card glow className="p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-2">
          <h2 className="text-xl font-bold text-emerald-400">Informações Básicas</h2>
          <div className="flex items-center gap-3">
            {/* Status Select Box */}
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Status:</span>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className={`bg-transparent text-xs font-bold outline-none border-none cursor-pointer focus:ring-0 ${
                  status === 'published' ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                <option value="draft" className="bg-zinc-900 text-amber-400 font-bold">Rascunho (Offline)</option>
                <option value="published" className="bg-zinc-900 text-emerald-400 font-bold">Público (No Ar)</option>
              </select>
            </div>
            
            <div className="flex gap-2">
            <button
              onClick={() => setIsThemeModalOpen(true)}
              title="Personalizar Aparência"
              className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors border border-white/5 hover:border-emerald-500/30"
            >
              <Palette size={16} />
            </button>
            <button
              onClick={() => setIsRulesModalOpen(true)}
              title={`Regras de Bloqueio (${rules.length})`}
              className="relative p-2 rounded-lg bg-white/5 hover:bg-purple-500/20 text-gray-400 hover:text-purple-400 transition-colors border border-white/5 hover:border-purple-500/30"
            >
              <ShieldAlert size={16} />
              {rules.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-purple-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                  {rules.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsAiModalOpen(true)}
              title="Critérios de Avaliação por IA"
              className="relative p-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-colors border border-white/5 hover:border-blue-500/30"
            >
              <Brain size={16} />
              {aiRules.filter(r => r.active).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold animate-pulse">
                  {aiRules.filter(r => r.active).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsReviewModalOpen(true)}
              title="Critérios de Avaliação Manual (Liderança)"
              className="relative p-2 rounded-lg bg-white/5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-400 transition-colors border border-white/5 hover:border-amber-500/30"
            >
              <Award size={16} />
              {reviewCriteria.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rounded-full text-[9px] text-black flex items-center justify-center font-bold">
                  {reviewCriteria.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Título do Formulário *</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="bg-black/50 border border-white/10 rounded-md p-2 text-white" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">URL / Slug *</label>
            <input 
              type="text" 
              value={slug} 
              onChange={e => { setSlug(e.target.value); setSlugTouched(true); }} 
              placeholder="ex: audicao-2026"
              className="bg-black/50 border border-white/10 rounded-md p-2 text-white" 
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-400">Pasta</label>
          <select 
            value={folderId} 
            onChange={e => setFolderId(e.target.value)} 
            className="bg-black/50 border border-white/10 rounded-md p-2 text-white"
          >
            <option value="">Sem pasta (Geral)</option>
            {folders?.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-400">Descrição</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="bg-black/50 border border-white/10 rounded-md p-2 text-white min-h-[80px]" 
          />
        </div>
        
        <h3 className="text-lg font-semibold text-emerald-300 mt-4 border-t border-white/10 pt-4">Tela de Boas-vindas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Título</label>
            <input 
              type="text" 
              value={welcomeTitle} 
              onChange={e => setWelcomeTitle(e.target.value)} 
              className="bg-black/50 border border-white/10 rounded-md p-2 text-white" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Texto</label>
            <textarea 
              value={welcomeText} 
              onChange={e => setWelcomeText(e.target.value)} 
              className="bg-black/50 border border-white/10 rounded-md p-2 text-white h-full" 
            />
          </div>
        </div>
      </Card>

      {/* Sections List */}
      <div className="flex flex-col gap-6">
        {sections.map((section, sIndex) => (
          <Card key={section.id} className="p-6 border border-emerald-500/30 bg-emerald-950/10 flex flex-col gap-4 relative">
            <button 
              onClick={() => removeSection(sIndex)}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-400 text-sm"
            >
              Remover Seção
            </button>
            
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="bg-emerald-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-xs">{sIndex + 1}</span>
              Seção
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Título da Seção</label>
                <input 
                  type="text" 
                  value={section.title} 
                  onChange={e => updateSection(sIndex, 'title', e.target.value)} 
                  className="bg-black/50 border border-white/10 rounded-md p-2 text-white" 
                />
              </div>
            </div>

            {/* Questions List */}
            <div className="mt-4 flex flex-col gap-3 pl-4 border-l-2 border-white/10">
              <h4 className="text-sm font-semibold text-gray-300">Perguntas:</h4>
              
              {section.questions.map((question: any, qIndex: number) => (
                <div key={question.id} className="bg-black/30 p-4 rounded-lg border border-white/5 flex flex-col gap-3 relative">
                  <button 
                    onClick={() => removeQuestion(sIndex, qIndex)}
                    className="absolute top-3 right-3 text-gray-600 hover:text-red-400 text-xs"
                  >
                    X
                  </button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400">Pergunta</label>
                      <input 
                        type="text" 
                        value={question.label} 
                        onChange={e => updateQuestion(sIndex, qIndex, 'label', e.target.value)} 
                        className="bg-black/50 border border-white/10 rounded-md p-2 text-white text-sm" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400">Tipo de Resposta</label>
                      <select 
                        value={question.type} 
                        onChange={e => updateQuestion(sIndex, qIndex, 'type', e.target.value)} 
                        className="bg-black/50 border border-white/10 rounded-md p-2 text-white text-sm"
                      >
                        <option value="short_text">Texto Curto</option>
                        <option value="long_text">Texto Longo</option>
                        <option value="email">E-mail</option>
                        <option value="phone">Telefone (WhatsApp)</option>
                        <option value="date">Data</option>
                        <option value="url">URL (Link)</option>
                        <option value="single_choice">Seleção Única (Múltipla Escolha)</option>
                        <option value="multiple_choice">Caixas de Seleção (Múltiplas Opções)</option>
                        <option value="video_upload">Vídeo / Link de Vídeo</option>
                      </select>
                    </div>
                  </div>
                  
                  {(question.type === 'single_choice' || question.type === 'multiple_choice') && (() => {
                    const currentOpts = question.options && question.options.length > 0 ? question.options : ['Opção 1'];
                    return (
                      <div className="flex flex-col gap-2.5 mt-3 pl-2">
                        <label className="text-xs font-semibold text-gray-400">Opções da Pergunta</label>
                        <div className="flex flex-col gap-2">
                          {currentOpts.map((opt: string, optIndex: number) => (
                            <div key={optIndex} className="flex items-center gap-3 group">
                              {question.type === 'single_choice' ? (
                                <Circle className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                              )}
                              
                              <input 
                                type="text" 
                                value={opt} 
                                onChange={e => {
                                  const newOpts = [...currentOpts];
                                  newOpts[optIndex] = e.target.value;
                                  updateQuestion(sIndex, qIndex, 'options', newOpts);
                                }}
                                placeholder={`Opção ${optIndex + 1}`}
                                className="bg-transparent border-b border-white/10 focus:border-emerald-500/50 py-1 text-white text-xs outline-none flex-1 transition-all" 
                              />

                              <button
                                type="button"
                                onClick={() => {
                                  const newOpts = currentOpts.filter((_, idx) => idx !== optIndex);
                                  updateQuestion(sIndex, qIndex, 'options', newOpts);
                                }}
                                disabled={currentOpts.length <= 1}
                                className="text-gray-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-all"
                                title="Excluir opção"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const newOpts = [...currentOpts, `Opção ${currentOpts.length + 1}`];
                            updateQuestion(sIndex, qIndex, 'options', newOpts);
                          }}
                          className="w-max text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors pl-6 mt-1 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar Opção
                        </button>
                      </div>
                    );
                  })()}

                  <div className="flex items-center gap-2 mt-2">
                    <input 
                      type="checkbox" 
                      checked={question.required} 
                      onChange={e => updateQuestion(sIndex, qIndex, 'required', e.target.checked)} 
                      id={`req-${sIndex}-${qIndex}`}
                      className="accent-emerald-500"
                    />
                    <label htmlFor={`req-${sIndex}-${qIndex}`} className="text-xs text-gray-400">Obrigatória</label>
                  </div>
                </div>
              ))}
              
              <Button variant="outline" onClick={() => addQuestion(sIndex)} className="w-max text-xs mt-2 border-dashed">
                + Adicionar Pergunta
              </Button>
            </div>
          </Card>
        ))}

        <Button variant="outline" onClick={addSection} className="py-4 border-dashed border-white/20 text-emerald-400 hover:bg-emerald-500/10">
          + Adicionar Nova Seção
        </Button>
      </div>

      {/* Theme Modal */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card glow className="w-full max-w-lg max-h-[90vh] flex flex-col p-0 border-blue-500/30">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-blue-950/20">
              <h3 className="text-lg font-bold text-blue-400">Personalizar Aparência</h3>
              <button onClick={() => setIsThemeModalOpen(false)} className="text-gray-400 hover:text-white">X</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-300">Cor Principal (Botões e Destaques)</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded border border-white/20 overflow-hidden relative">
                    <input 
                      type="color" 
                      value={theme.primaryColor} 
                      onChange={e => setTheme({ ...theme, primaryColor: e.target.value })}
                      className="absolute inset-[-10px] w-16 h-16 cursor-pointer"
                    />
                  </div>
                  <span className="text-xs text-gray-400 uppercase font-mono">{theme.primaryColor}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-gray-300">Estilo do Fundo</label>
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 mb-2">
                  {[
                    { id: 'solid', label: 'Cor Sólida' },
                    { id: 'gradient', label: 'Gradiente' },
                    { id: 'image', label: 'Imagem' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setTheme({ ...theme, backgroundType: tab.id })}
                      className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${
                        theme.backgroundType === tab.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {theme.backgroundType === 'solid' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-400">Cor Sólida</label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded border border-white/20 overflow-hidden relative">
                        <input 
                          type="color" 
                          value={theme.backgroundColor} 
                          onChange={e => setTheme({ ...theme, backgroundColor: e.target.value })}
                          className="absolute inset-[-10px] w-16 h-16 cursor-pointer"
                        />
                      </div>
                      <span className="text-xs text-gray-400 uppercase font-mono">{theme.backgroundColor}</span>
                    </div>
                  </div>
                )}

                {theme.backgroundType === 'gradient' && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-gray-400">Cores em gradiente</label>
                      <div className="flex items-center gap-2">
                        {/* Start Color */}
                        <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden relative shrink-0 shadow-lg">
                          <input 
                            type="color" 
                            value={theme.gradientStart || '#020617'} 
                            onChange={e => {
                              const start = e.target.value;
                              const end = theme.gradientEnd || '#064e3b';
                              const style = theme.gradientStyle || 'to bottom right';
                              setTheme({ 
                                ...theme, 
                                gradientStart: start,
                                backgroundGradient: `${style.includes('circle') ? 'radial' : 'linear'}-gradient(${style}, ${start}, ${end})`
                              });
                            }}
                            className="absolute inset-[-10px] w-16 h-16 cursor-pointer"
                          />
                        </div>
                        {/* End Color */}
                        <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden relative shrink-0 shadow-lg">
                          <input 
                            type="color" 
                            value={theme.gradientEnd || '#064e3b'} 
                            onChange={e => {
                              const end = e.target.value;
                              const start = theme.gradientStart || '#020617';
                              const style = theme.gradientStyle || 'to bottom right';
                              setTheme({ 
                                ...theme, 
                                gradientEnd: end,
                                backgroundGradient: `${style.includes('circle') ? 'radial' : 'linear'}-gradient(${style}, ${start}, ${end})`
                              });
                            }}
                            className="absolute inset-[-10px] w-16 h-16 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-gray-400">Estilo</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'to right', type: 'linear' },
                          { id: 'to bottom', type: 'linear' },
                          { id: 'to bottom right', type: 'linear' },
                          { id: 'to bottom left', type: 'linear' },
                          { id: 'circle at center', type: 'radial' },
                        ].map(style => {
                          const start = theme.gradientStart || '#020617';
                          const end = theme.gradientEnd || '#064e3b';
                          const isActive = (theme.gradientStyle || 'to bottom right') === style.id;
                          return (
                            <button
                              key={style.id}
                              onClick={() => {
                                setTheme({
                                  ...theme,
                                  gradientStyle: style.id,
                                  backgroundGradient: `${style.type}-gradient(${style.id}, ${start}, ${end})`
                                })
                              }}
                              className={`w-12 h-12 rounded-lg border-2 transition-all ${isActive ? 'border-purple-500 scale-105' : 'border-white/10 hover:border-white/30'}`}
                              style={{ background: `${style.type}-gradient(${style.id}, ${start}, ${end})` }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {theme.backgroundType === 'image' && (
                  <div className="flex flex-col gap-3 mt-2">
                    <label className="text-xs text-gray-400">Upload de Imagem</label>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => document.getElementById('theme-image-upload')?.click()}
                        disabled={uploadingImage}
                        className="text-xs border-dashed border-white/30 text-gray-300 hover:text-white"
                      >
                        {uploadingImage ? 'Enviando...' : '📷 Escolher Imagem'}
                      </Button>
                      <input 
                        id="theme-image-upload"
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload}
                      />
                    </div>
                    {theme.backgroundImage && (
                      <div className="mt-2 text-xs text-emerald-400 break-all flex flex-col gap-1">
                        <span>Imagem carregada com sucesso!</span>
                        <a href={theme.backgroundImage} target="_blank" rel="noreferrer" className="text-gray-500 hover:underline">Ver arquivo</a>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="mt-4 p-4 rounded-xl border border-white/10 transition-all duration-500" 
                style={{ 
                  background: theme.backgroundType === 'solid' ? theme.backgroundColor 
                    : theme.backgroundType === 'gradient' ? theme.backgroundGradient 
                    : theme.backgroundType === 'image' ? `url(${theme.backgroundImage}) center/cover` 
                    : '#000'
                }}>
                <div className="bg-black/60 backdrop-blur-md p-6 rounded-lg border border-white/10 text-center flex flex-col gap-4 items-center">
                  <h4 className="text-white font-bold text-lg">Preview do Formulário</h4>
                  <button style={{ backgroundColor: theme.primaryColor }} className="px-6 py-2.5 rounded-lg text-black font-semibold text-sm w-full max-w-[200px] shadow-lg transition-transform hover:scale-105">
                    Botão Principal
                  </button>
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
              <Button variant="primary" onClick={() => setIsThemeModalOpen(false)}>Concluído</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Rules Modal */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card glow className="w-full max-w-2xl max-h-[80vh] flex flex-col p-0 border-purple-500/30">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-purple-950/20">
              <h3 className="text-lg font-bold text-purple-400">Regras de Bloqueio</h3>
              <button onClick={() => setIsRulesModalOpen(false)} className="text-gray-400 hover:text-white">X</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              <p className="text-sm text-gray-400">Crie regras para bloquear a inscrição se o candidato escolher uma resposta específica (ex: Pré-requisitos não concluídos).</p>
              
              {rules.map((rule, rIndex) => (
                <div key={rule.id} className="bg-black/30 border border-white/10 p-4 rounded-lg flex flex-col gap-3 relative">
                  <button onClick={() => removeRule(rIndex)} className="absolute top-3 right-3 text-red-400 text-xs hover:text-red-300">Remover</button>
                  <div className="flex flex-col gap-1 pr-12">
                    <label className="text-xs text-gray-400">Se a resposta da pergunta...</label>
                    <select 
                      value={rule.question_id}
                      onChange={e => updateRule(rIndex, 'question_id', e.target.value)}
                      className="bg-black/50 border border-white/10 rounded-md p-2 text-white text-sm"
                    >
                      <option value="">Selecione uma pergunta...</option>
                      {allQuestions.map(q => (
                        <option key={q.id} value={q.id}>{q.label || '(Sem título)'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">For igual a...</label>
                    <input 
                      type="text" 
                      value={rule.condition_value} 
                      onChange={e => updateRule(rIndex, 'condition_value', e.target.value)} 
                      placeholder="Ex: Não"
                      className="bg-black/50 border border-white/10 rounded-md p-2 text-white text-sm" 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Mensagem de Bloqueio</label>
                    <input 
                      type="text" 
                      value={rule.message} 
                      onChange={e => updateRule(rIndex, 'message', e.target.value)} 
                      placeholder="Você não cumpre o pré-requisito."
                      className="bg-black/50 border border-white/10 rounded-md p-2 text-white text-sm" 
                    />
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addRule} className="border-dashed border-purple-500/30 text-purple-400 hover:bg-purple-500/10 py-3">
                + Nova Regra de Bloqueio
              </Button>
            </div>
            
            <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
              <Button variant="primary" onClick={() => setIsRulesModalOpen(false)}>Concluído</Button>
            </div>
          </Card>
        </div>
      )}

      {/* AI Rules Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card glow className="w-full max-w-2xl max-h-[85vh] flex flex-col p-0 border-blue-500/30">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-blue-950/20">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-blue-400">Critérios de Avaliação por IA</h3>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="text-gray-400 hover:text-white">X</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl text-sm text-gray-300 leading-relaxed">
                <p className="font-semibold text-blue-300 mb-1">Como funciona a avaliação por IA?</p>
                As respostas textuais e de vídeo (transcritas) do candidato serão analisadas pelo assistente de IA. A IA atribuirá uma pontuação baseada nestes critérios e emitirá um parecer com pontos fortes, fraquezas e recomendação de aprovação.
                <div className="mt-3 flex justify-between text-xs text-blue-400/80 font-mono">
                  <span>Critérios Ativos: {aiRules.filter(r => r.active).length}</span>
                  <span>Pontuação Máxima Total: {aiRules.reduce((acc, curr) => acc + (curr.active ? Number(curr.max_score || 0) : 0), 0)} pts</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-4">
                {aiRules.map((rule, index) => (
                  <div 
                    key={rule.id || index} 
                    className={`border rounded-xl p-4 transition-all relative ${
                      rule.active 
                        ? 'bg-black/30 border-blue-500/20 shadow-[inset_0_0_10px_rgba(59,130,246,0.05)]' 
                        : 'bg-black/10 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={rule.active} 
                          onChange={e => updateAiRule(index, 'active', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-black"
                        />
                        <span className="font-bold text-sm text-gray-200">
                          Critério #{index + 1}
                        </span>
                      </div>
                      <button 
                        onClick={() => removeAiRule(index)} 
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 flex flex-col gap-1">
                          <label className="text-xs text-gray-400">Nome do Critério</label>
                          <input 
                            type="text" 
                            value={rule.name}
                            onChange={e => updateAiRule(index, 'name', e.target.value)}
                            placeholder="Ex: Vida Devocional"
                            className="bg-black/50 border border-white/10 rounded-md p-2 text-white text-sm focus:border-blue-500/50 outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400">Peso (Max Score)</label>
                          <input 
                            type="number" 
                            value={rule.max_score}
                            onChange={e => updateAiRule(index, 'max_score', parseInt(e.target.value) || 0)}
                            placeholder="Ex: 20"
                            className="bg-black/50 border border-white/10 rounded-md p-2 text-white text-sm focus:border-blue-500/50 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Instruções para a IA (Descrição)</label>
                        <textarea 
                          rows={2}
                          value={rule.description}
                          onChange={e => updateAiRule(index, 'description', e.target.value)}
                          placeholder="Instrua a IA sobre como analisar as respostas dos candidatos para esta categoria..."
                          className="bg-black/50 border border-white/10 rounded-md p-2 text-white text-sm focus:border-blue-500/50 outline-none resize-none leading-relaxed"
                        />
                      </div>

                      {/* Sub-criteria list */}
                      <div className="mt-2 pl-4 border-l border-white/10 flex flex-col gap-2">
                        <span className="text-xs font-semibold text-gray-400">Sub-itens de Observação</span>
                        {rule.criteria?.map((crit: any, cIdx: number) => (
                          <div key={cIdx} className="flex gap-2 items-center">
                            <input 
                              type="text" 
                              value={crit.name}
                              onChange={e => updateAiCriterion(index, cIdx, 'name', e.target.value)}
                              placeholder="Nome (Ex: Constância)"
                              className="bg-black/40 border border-white/5 rounded-md p-1.5 text-white text-xs flex-1 outline-none"
                            />
                            <input 
                              type="text" 
                              value={crit.description}
                              onChange={e => updateAiCriterion(index, cIdx, 'description', e.target.value)}
                              placeholder="Descrição detalhada..."
                              className="bg-black/40 border border-white/5 rounded-md p-1.5 text-white text-xs flex-[2] outline-none"
                            />
                            <button 
                              onClick={() => removeAiCriterion(index, cIdx)}
                              className="text-red-400 hover:text-red-300 text-xs px-1.5"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => addAiCriterion(index)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-semibold text-left mt-1"
                        >
                          + Adicionar Sub-item
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button 
                variant="outline" 
                onClick={addAiRule} 
                className="border-dashed border-blue-500/30 text-blue-400 hover:bg-blue-500/10 py-3"
              >
                + Novo Critério de IA
              </Button>
            </div>
            
            <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
              <Button variant="primary" onClick={() => setIsAiModalOpen(false)}>Concluído</Button>
            </div>
          </Card>
        </div>
      )}

      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <Card glow className="w-full max-w-2xl bg-[#090d0b] border-amber-500/20 flex flex-col max-h-[90vh] shadow-2xl relative">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
              <div>
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <Award className="w-5 h-5 shrink-0" />
                  Critérios de Avaliação Manual (Liderança)
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Defina os critérios e notas que a banca examinadora avaliará manualmente para cada candidato.
                </p>
              </div>
              <button 
                onClick={() => setIsReviewModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                {reviewCriteria.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                    <span className="text-3xl block mb-2">📋</span>
                    <p className="text-sm font-semibold text-gray-300">Sem Critérios Definidos</p>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 leading-relaxed">
                      Você pode cadastrar critérios específicos (ex: Afinação Vocal, Técnica Instrumental, Presença de Palco) para que a banca possa dar notas individuais durante a audição.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {reviewCriteria.map((criterion: any, index: number) => (
                      <div key={index} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-3 relative group">
                        <button 
                          onClick={() => {
                            setReviewCriteria(reviewCriteria.filter((_, idx) => idx !== index));
                          }}
                          className="absolute top-4 right-4 text-gray-500 hover:text-red-400 text-xs transition-colors p-1"
                          title="Remover Critério"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2 flex flex-col gap-1">
                            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Nome do Critério</label>
                            <input 
                              type="text"
                              value={criterion.name}
                              onChange={e => {
                                const updated = [...reviewCriteria];
                                updated[index].name = e.target.value;
                                setReviewCriteria(updated);
                              }}
                              placeholder="Ex: Afinação Vocal"
                              className="bg-black/50 border border-white/10 rounded-md p-2 text-white text-xs outline-none focus:border-amber-500/50"
                            />
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Nota Máxima</label>
                            <select
                              value={criterion.max_score || 10}
                              onChange={e => {
                                const updated = [...reviewCriteria];
                                updated[index].max_score = Number(e.target.value);
                                setReviewCriteria(updated);
                              }}
                              className="bg-black/50 border border-white/10 rounded-md p-2 text-white text-xs outline-none focus:border-amber-500/50 cursor-pointer"
                            >
                              <option value={5}>5 Pontos</option>
                              <option value={10}>10 Pontos</option>
                              <option value={20}>20 Pontos</option>
                              <option value={50}>50 Pontos</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Instruções para o Avaliador (Opcional)</label>
                          <input 
                            type="text"
                            value={criterion.description || ''}
                            onChange={e => {
                              const updated = [...reviewCriteria];
                              updated[index].description = e.target.value;
                              setReviewCriteria(updated);
                            }}
                            placeholder="Descreva o que a banca deve observar ao pontuar este critério..."
                            className="bg-black/50 border border-white/10 rounded-md p-2 text-white text-xs outline-none focus:border-amber-500/50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setReviewCriteria([
                    ...reviewCriteria,
                    { name: 'Novo Critério', description: '', max_score: 10 }
                  ]);
                }}
                className="w-full py-2.5 border border-dashed border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Adicionar Critério de Avaliação
              </button>
            </div>
            
            <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
              <Button variant="primary" onClick={() => setIsReviewModalOpen(false)} className="bg-amber-500 hover:bg-amber-600 text-black border-none font-bold text-xs px-4 h-9">
                Concluído
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="fixed bottom-0 left-0 w-full p-4 bg-background/80 backdrop-blur-md border-t border-white/10 flex justify-end gap-4 z-40">
        <Button variant="outline" onClick={() => router.push('/admin')}>Cancelar</Button>
        <Button variant="primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Formulário'}
        </Button>
      </div>
    </div>
  );
}
