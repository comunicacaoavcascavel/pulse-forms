import { FormBuilder } from '@/components/admin/FormBuilder';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  const { data: folders } = await supabase.from('form_folders').select('*').order('name');
  
  // Fetch form data including sections, questions, rules, and AI evaluation rules
  const { data: form, error } = await supabase
    .from('forms')
    .select(`
      *,
      sections:form_sections(
        *,
        questions:form_questions(*)
      ),
      rules:form_rules(*),
      ai_evaluation_rules(*)
    `)
    .eq('id', resolvedParams.id)
    .single();

  if (error || !form) {
    redirect('/admin');
  }

  // Format data to match what FormBuilder expects
  const formattedSections = form.sections
    ?.sort((a: any, b: any) => a.order_index - b.order_index)
    .map((s: any) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      questions: s.questions
        ?.sort((a: any, b: any) => a.order_index - b.order_index)
        .map((q: any) => ({
          id: q.id, // Keeping real DB ID as ID for rules mapping
          label: q.label,
          type: q.type,
          options: q.options ? JSON.parse(q.options) : [],
          required: q.is_required
        }))
    })) || [];

  const formattedRules = form.rules?.map((r: any) => ({
    id: r.id,
    type: r.rule_type,
    question_id: r.question_id, // Maps to the real question ID since we kept it
    condition_value: r.condition?.value || '',
    message: r.message
  })) || [];

  const formattedAiRules = form.ai_evaluation_rules?.map((ar: any) => ({
    id: ar.id,
    name: ar.name,
    description: ar.description,
    criteria: ar.criteria || [],
    max_score: ar.max_score,
    active: ar.active
  })) || [];

  const initialData = {
    id: form.id,
    title: form.title,
    description: form.description,
    slug: form.slug,
    folder_id: form.folder_id,
    welcome_title: form.welcome_title,
    welcome_text: form.welcome_text,
    theme: form.theme,
    sections: formattedSections,
    rules: formattedRules,
    aiRules: formattedAiRules
  };

  return (
    <div className="min-h-screen p-6 md:p-10 bg-background relative pt-24 md:pt-10">
      <div className="absolute top-0 right-0 w-[40%] h-[30%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <header className="mb-10 max-w-4xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Editar Formulário</h1>
          <p className="text-muted mt-2 text-sm">Altere as informações, seções e regras de bloqueio do seu formulário.</p>
        </div>
      </header>

      <FormBuilder folders={folders || []} initialData={initialData} />
    </div>
  );
}
