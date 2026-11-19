/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getSupabasePublicConfig } from '@/utils/supabase/config';
import { absoluteUrl, trimForMeta } from '@/lib/share';

export const runtime = 'edge';

const size = {
  width: 1200,
  height: 630,
};

function cleanHexColor(value: unknown, fallback = '#4f7dff') {
  if (typeof value !== 'string') return fallback;
  const color = value.trim();
  return /^#[0-9a-f]{6}$/i.test(color) || /^#[0-9a-f]{3}$/i.test(color) ? color : fallback;
}

function getReadableBackground(theme: Record<string, any>) {
  if (theme.backgroundType === 'solid') {
    return cleanHexColor(theme.backgroundColor, '#020617');
  }

  if (theme.backgroundType === 'gradient' && typeof theme.backgroundGradient === 'string') {
    return theme.backgroundGradient;
  }

  return 'linear-gradient(135deg, #020617 0%, #08111f 48%, #1e3a8a 100%)';
}

async function fetchTable<T>(table: string, query: string): Promise<T | null> {
  const { url, anonKey } = getSupabasePublicConfig();
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) return null;

  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function GET(request: NextRequest) {
  const tenantSlug = request.nextUrl.searchParams.get('tenant') || '';
  const formSlug = request.nextUrl.searchParams.get('form') || '';

  const tenant = await fetchTable<{ id: string; name: string; slug: string }>(
    'tenants',
    `select=id,name,slug&slug=eq.${encodeURIComponent(tenantSlug)}&status=eq.active&limit=1`,
  );

  if (!tenant) {
    return new Response('Tenant not found', { status: 404 });
  }

  const form = await fetchTable<{
    title: string | null;
    description: string | null;
    welcome_text: string | null;
    theme: Record<string, any> | null;
  }>(
    'forms',
    [
      'select=title,description,welcome_text,theme',
      `tenant_id=eq.${tenant.id}`,
      `slug=eq.${encodeURIComponent(formSlug)}`,
      'status=eq.published',
      'limit=1',
    ].join('&'),
  );

  if (!form) {
    return new Response('Form not found', { status: 404 });
  }

  const theme = form.theme || {};
  const title = form.title || 'Formulário';
  const description = trimForMeta(form.description || form.welcome_text, `Formulário de ${tenant.name}.`, 190);
  const primaryColor = cleanHexColor(theme.primaryColor);
  const background = getReadableBackground(theme);
  const logoUrl = absoluteUrl('/brand/zalen-icon.svg');
  const backgroundImage = theme.backgroundType === 'image' && typeof theme.backgroundImage === 'string'
    ? theme.backgroundImage
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background,
          color: '#f8fafc',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        {backgroundImage ? (
          <img
            src={backgroundImage}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.54,
            }}
          />
        ) : null}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.72) 48%, rgba(2,6,23,0.28) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 560,
            height: 560,
            right: -120,
            top: -120,
            borderRadius: 560,
            background: primaryColor,
            opacity: 0.28,
            filter: 'blur(70px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 680,
            height: 680,
            left: -260,
            bottom: -300,
            borderRadius: 680,
            background: '#60a5fa',
            opacity: 0.16,
            filter: 'blur(80px)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '76px 86px 70px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <div
              style={{
                width: 82,
                height: 82,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 20,
                background: 'rgba(15, 23, 42, 0.72)',
                border: '1px solid rgba(148, 163, 184, 0.34)',
                boxShadow: `0 0 34px ${primaryColor}66`,
              }}
            >
              <img src={logoUrl} alt="Zalen" width={58} height={58} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 0 }}>Forms Zalen</div>
              <div style={{ fontSize: 19, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 3 }}>
                {tenant.name}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 820 }}>
            <div
              style={{
                display: 'flex',
                width: 92,
                height: 8,
                borderRadius: 999,
                background: primaryColor,
                boxShadow: `0 0 20px ${primaryColor}`,
              }}
            />
            <div
              style={{
                fontSize: title.length > 46 ? 62 : 72,
                lineHeight: 1.03,
                fontWeight: 800,
                letterSpacing: 0,
                textWrap: 'balance',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 28,
                lineHeight: 1.36,
                color: '#cbd5e1',
                maxWidth: 780,
              }}
            >
              {description}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#94a3b8',
              fontSize: 22,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: 12, background: primaryColor }} />
              Link público de formulário
            </div>
            <div>forms.zalen.tech</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
