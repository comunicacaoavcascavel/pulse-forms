import React from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { FormEngine } from '@/components/form/FormEngine';
import { FormSchema } from '@/types/form';
import { absoluteUrl, trimForMeta } from '@/lib/share';
import { notFound } from 'next/navigation';

type PublicFormPageProps = {
  params: Promise<{ tenantSlug: string; formSlug: string }>;
};

async function getPublishedForm(tenantSlug: string, formSlug: string) {
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, name, status')
    .eq('slug', tenantSlug)
    .eq('status', 'active')
    .single();

  if (!tenant) return null;

  const { data: form, error: formErr } = await supabase
    .from('forms')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('slug', formSlug)
    .eq('status', 'published')
    .single();

  if (formErr || !form) return null;

  return { tenant, form };
}

export async function generateMetadata({ params }: PublicFormPageProps): Promise<Metadata> {
  const { tenantSlug, formSlug } = await params;
  const data = await getPublishedForm(tenantSlug, formSlug);

  if (!data) {
    return {
      title: 'Formulário indisponível | Forms Zalen',
      description: 'Este formulário não está disponível no momento.',
    };
  }

  const title = data.form.title || 'Formulário';
  const description = trimForMeta(
    data.form.description || data.form.welcome_text,
    `Formulário de ${data.tenant.name || 'Forms Zalen'}.`,
  );
  const publicPath = `/t/${tenantSlug}/f/${formSlug}`;
  const imageUrl = absoluteUrl(`/api/og/form?tenant=${encodeURIComponent(tenantSlug)}&form=${encodeURIComponent(formSlug)}`);

  return {
    title: `${title} | Forms Zalen`,
    description,
    alternates: {
      canonical: publicPath,
    },
    openGraph: {
      title,
      description,
      url: publicPath,
      siteName: 'Forms Zalen',
      locale: 'pt_BR',
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function TenantPublicFormPage(
  props: PublicFormPageProps,
) {
  const { tenantSlug, formSlug } = await props.params;
  const supabase = await createClient();

  const publishedForm = await getPublishedForm(tenantSlug, formSlug);

  if (!publishedForm) {
    return notFound();
  }

  const { tenant, form } = publishedForm;

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
