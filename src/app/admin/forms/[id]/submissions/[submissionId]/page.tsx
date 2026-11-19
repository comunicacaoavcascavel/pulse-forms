import { redirectToDefaultTenant } from '@/lib/tenancy';

export default async function SubmissionDetailPage(
  props: { params: Promise<{ id: string; submissionId: string }> },
) {
  const { id, submissionId } = await props.params;
  await redirectToDefaultTenant(`/forms/${id}/submissions/${submissionId}`);
}
