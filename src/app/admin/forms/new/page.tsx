import { FormBuilder } from '@/components/admin/FormBuilder';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function NewFormPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  const { data: folders } = await supabase.from('form_folders').select('*').order('name');

  return (
    <div className="min-h-screen p-6 md:p-10 bg-background relative pt-24 md:pt-10">
      <div className="absolute top-0 right-0 w-[40%] h-[30%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <header className="mb-10 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white">Criar Novo Formulário</h1>
        <p className="text-muted mt-2 text-sm">Monte o seu formulário adicionando seções e perguntas personalizadas.</p>
      </header>

      <FormBuilder folders={folders || []} />
    </div>
  );
}
