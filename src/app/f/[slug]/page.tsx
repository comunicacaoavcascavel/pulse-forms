import { redirect } from 'next/navigation';

export default async function LegacyFormPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  redirect(`/t/pulse/f/${slug}`);
}
