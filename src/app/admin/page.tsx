import { redirectToDefaultTenant } from '@/lib/tenancy';

export default async function AdminDashboard() {
  await redirectToDefaultTenant();
}
