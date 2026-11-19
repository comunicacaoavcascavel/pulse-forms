import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { isPlatformOwnerEmail } from '@/lib/tenancy';
import { sanitizeFileName } from '@/lib/storage';

const MAX_ASSET_SIZE_BYTES = 8 * 1024 * 1024;
const EDIT_ROLES = ['owner', 'admin', 'editor'];

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const { tenantSlug } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Envie apenas imagens.' }, { status: 400 });
    }

    if (file.size > MAX_ASSET_SIZE_BYTES) {
      return NextResponse.json({ error: 'A imagem deve ter no máximo 8 MB.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: tenant } = await admin
      .from('tenants')
      .select('id, slug')
      .eq('slug', tenantSlug)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant não encontrado.' }, { status: 404 });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('platform_role')
      .eq('id', user.id)
      .maybeSingle();

    const { data: membership } = await admin
      .from('tenant_memberships')
      .select('role')
      .eq('tenant_id', tenant.id)
      .eq('user_id', user.id)
      .maybeSingle();

    const canUpload = profile?.platform_role === 'owner'
      || isPlatformOwnerEmail(user.email)
      || EDIT_ROLES.includes(membership?.role || '');

    if (!canUpload) {
      return NextResponse.json({ error: 'Sem permissão para enviar assets.' }, { status: 403 });
    }

    const cleanFileName = sanitizeFileName(file.name);
    const storagePath = `tenants/${tenant.slug}/assets/${crypto.randomUUID()}-${cleanFileName}`;

    const { error: uploadError } = await admin.storage
      .from('form_assets')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicData } = admin.storage.from('form_assets').getPublicUrl(storagePath);

    return NextResponse.json({
      bucket: 'form_assets',
      path: storagePath,
      publicUrl: publicData.publicUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao enviar asset.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
