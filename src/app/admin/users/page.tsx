import { redirectToDefaultTenant } from '@/lib/tenancy';

export default async function UsersManagementPage() {
  await redirectToDefaultTenant('/users');
}
