import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { FormEngine } from '@/components/form/FormEngine';
import { FormSchema } from '@/types/form';
import { notFound } from 'next/navigation';

export default async function TenantPublicFormPage(
  props: { params: Promise<{ tenantSlug: string; formSlug: string }> },
) {
  const { tenantSlug, formSlug } = await props.params;
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, status')
    .eq('slug', tenantSlug)
    .eq('status', 'active')
    .single();

  if (!tenant) return notFound();

  const { data: form, error: formErr } = await supabase
    .from('forms')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('slug', formSlug)
    .eq('status', 'published')
    .single();

  if (formErr || !form) {
    return notFound();
  }

  const { data: sectionsData, error: secErr } = await supabase
    .from('form_sections')
    .select('*, form_questions(*)')
    .eq('tenant_id', tenant.id)
    .eq('form_id', form.id)
    .order('order_index', { ascending: true });

  if (secErr || !sectionsData) {
    return notFound();
  }

  const schema: FormSchema = {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description,
    welcome_title: form.welcome_title,
    welcome_text: form.welcome_text,
    welcome_duration: form.welcome_duration,
    welcome_disclaimer: form.welcome_disclaimer,
    sections: sectionsData.map((section: any) => ({
      id: section.id,
      key: `sec_${section.order_index}`,
      title: section.title,
      description: section.description,
      order: section.order_index,
      questions: section.form_questions
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((question: any) => {
          let parsedOptions;
          try {
            parsedOptions = question.options ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options) : undefined;
          } catch {
            parsedOptions = undefined;
          }

          return {
            id: question.id,
            key: question.id,
            type: question.type,
            label: question.label,
            description: question.description,
            required: question.is_required,
            options: parsedOptions,
          };
        }),
    })),
  };

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
      className="min-h-screen relative overflow-hidden pb-12"
      style={{
        background: bgStyle,
        '--primary': primaryColor,
        '--primary-hover': primaryColor,
      } as React.CSSProperties}
    >
      {theme.backgroundType === 'image' && (
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      )}
      <div
        className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none opacity-40"
        style={{ background: primaryColor }}
      />
      <div className="relative z-10">
        <FormEngine schema={schema} primaryColor={primaryColor} tenantSlug={tenantSlug} />
      </div>
    </div>
  );
}
