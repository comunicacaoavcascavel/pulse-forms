import React from 'react';
import { supabase } from '@/lib/supabase';
import { FormEngine } from '@/components/form/FormEngine';
import { FormSchema } from '@/types/form';
import { notFound } from 'next/navigation';

export default async function FormPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  // 1. Buscar o form
  const { data: form, error: formErr } = await supabase
    .from('forms')
    .select('*')
    .eq('slug', slug)
    .single();

  if (formErr || !form) {
    return notFound();
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

  // 3. Converter do formato do banco para o nosso FormSchema
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
      key: `sec_${sec.order_index}`, // Fallback key
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
            key: q.id, // Usamos o UUID como chave para guardar as respostas
            type: q.type,
            label: q.label,
            description: q.description,
            required: q.is_required,
            options: parsedOptions
          }
        })
    }))
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background pb-12">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
      <FormEngine schema={schema} />
    </div>
  );
}
