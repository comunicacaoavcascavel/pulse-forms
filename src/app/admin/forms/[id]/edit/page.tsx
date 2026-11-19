import { redirectToDefaultTenant } from '@/lib/tenancy';

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await redirectToDefaultTenant(`/forms/${id}/edit`);
}
