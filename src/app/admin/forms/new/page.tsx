import { redirectToDefaultTenant } from '@/lib/tenancy';

export default async function NewFormPage() {
  await redirectToDefaultTenant('/forms/new');
}
