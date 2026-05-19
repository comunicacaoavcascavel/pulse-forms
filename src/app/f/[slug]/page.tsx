import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { FormEngine } from '@/components/form/FormEngine';
import { FormSchema } from '@/types/form';
import { notFound } from 'next/navigation';

export default async function FormPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const supabase = await createClient();

  // 1. Buscar o form
  const { data: form, error: formErr } = await supabase
    .from('forms')
    .select('*')
    .eq('slug', slug)
    .single();

  if (formErr || !form) {
    return notFound();
  }

  // 1.5. Verificar se o formulário está publicado
  if (form.status !== 'published') {
    const theme = form.theme || {};
    let bgStyle = '';
    if (theme.backgroundType === 'solid') {
      bgStyle = theme.backgroundColor || '#000000';
    } else if (theme.backgroundType === 'gradient') {
      bgStyle = theme.backgroundGradient || 'linear-gradient(to bottom right, #020617, #064e3b)';
    } else if (theme.backgroundType === 'image' && theme.backgroundImage) {
      bgStyle = `url(${theme.backgroundImage}) center/cover fixed`;
    } else {
      bgStyle = 'linear-gradient(to bottom right, #020617, #064e3b)';
    }
    const primaryColor = theme.primaryColor || '#10b981';

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
        style={{ 
          background: bgStyle,
          '--primary': primaryColor,
        } as React.CSSProperties}
      >
        {theme.backgroundType === 'image' && (
          <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        )}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none opacity-40" style={{ background: primaryColor }} />
        
        <div className="relative z-10 w-full max-w-md p-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl text-center shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Inscrições Encerradas</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            Este formulário foi desativado temporariamente pela liderança ou o período de inscrições para este processo foi encerrado.
          </p>
          <div className="text-[10px] text-gray-500 font-mono tracking-wider uppercase">
            Pulse Forms • Status: Rascunho
          </div>
        </div>
      </div>
    );
  }

  // 2. Buscar as seções com suas perguntas
  const { data: sectionsData, error: secErr } = await supabase
    .from('form_sections')
    .select('*, form_questions(*)')
    .eq('form_id', form.id)
    .order('order_index', { ascending: true });

  if (secErr || !sectionsData) {
    return notFound();
  }

  // 3. Converter para FormSchema
  const schema: FormSchema = {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description,
    welcome_title: form.welcome_title,
    welcome_text: form.welcome_text,
    welcome_duration: form.welcome_duration,
    welcome_disclaimer: form.welcome_disclaimer,
    sections: sectionsData.map((sec: any) => ({
      id: sec.id,
      key: `sec_${sec.order_index}`,
      title: sec.title,
      description: sec.description,
      order: sec.order_index,
      questions: sec.form_questions
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((q: any) => {
          let parsedOptions;
          try {
             parsedOptions = q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : undefined;
          } catch(e) {}

          return {
            id: q.id,
            key: q.id,
            type: q.type,
            label: q.label,
            description: q.description,
            required: q.is_required,
            options: parsedOptions
          };
        })
    }))
  };

  // 4. Processar tema
  const theme = form.theme || {};
  let bgStyle = '';
  if (theme.backgroundType === 'solid') {
    bgStyle = theme.backgroundColor || '#000000';
  } else if (theme.backgroundType === 'gradient') {
    bgStyle = theme.backgroundGradient || 'linear-gradient(to bottom right, #020617, #064e3b)';
  } else if (theme.backgroundType === 'image' && theme.backgroundImage) {
    bgStyle = `url(${theme.backgroundImage}) center/cover fixed`;
  } else {
    // default gradient
    bgStyle = 'linear-gradient(to bottom right, #020617, #064e3b)';
  }

  const primaryColor = theme.primaryColor || '#10b981';

  return (
    <div
      className="min-h-screen relative overflow-hidden pb-12"
      style={{ 
        background: bgStyle,
        '--primary': primaryColor,
        '--primary-hover': primaryColor,
      } as React.CSSProperties}
    >
      {/* Overlay escuro para melhorar legibilidade quando for imagem */}
      {theme.backgroundType === 'image' && (
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      )}
      {/* Glow */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none opacity-40"
        style={{ background: primaryColor }}
      />
      <div className="relative z-10">
        <FormEngine schema={schema} primaryColor={primaryColor} />
      </div>
    </div>
  );
}
