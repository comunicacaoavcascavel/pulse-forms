import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sanitizeFileName, storageValue } from '@/lib/storage';

const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantSlug: string; formId: string }> },
) {
  try {
    const { tenantSlug, formId } = await context.params;
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 400 });
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Envie apenas arquivos de vídeo.' }, { status: 400 });
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return NextResponse.json({ error: 'O vídeo deve ter no máximo 50 MB.' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: tenant } = await admin
      .from('tenants')
      .select('id, slug, status')
      .eq('slug', tenantSlug)
      .eq('status', 'active')
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant não encontrado.' }, { status: 404 });
    }

    const { data: form } = await admin
      .from('forms')
      .select('id, tenant_id, status')
      .eq('id', formId)
      .eq('tenant_id', tenant.id)
      .eq('status', 'published')
      .maybeSingle();

    if (!form) {
      return NextResponse.json({ error: 'Formulário indisponível.' }, { status: 404 });
    }

    const cleanFileName = sanitizeFileName(file.name);
    const storagePath = `tenants/${tenant.slug}/forms/${form.id}/uploads/${crypto.randomUUID()}-${cleanFileName}`;

    const { error: uploadError } = await admin.storage
      .from('videos')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({
      bucket: 'videos',
      path: storagePath,
      value: storageValue('videos', storagePath),
      fileName: cleanFileName,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao enviar arquivo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
