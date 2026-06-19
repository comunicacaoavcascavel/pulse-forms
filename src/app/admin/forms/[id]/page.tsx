import { redirectToDefaultTenant } from '@/lib/tenancy';

export default async function SubmissionsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await redirectToDefaultTenant(`/forms/${id}`);
}
