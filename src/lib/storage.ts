export function sanitizeFileName(fileName: string) {
  const sanitized = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return sanitized || 'arquivo';
}

export function storageValue(bucket: string, path: string) {
  return `storage://${bucket}/${path}`;
}

export function parseStorageValue(value?: string | null) {
  if (!value?.startsWith('storage://')) return null;

  const withoutScheme = value.replace('storage://', '');
  const slashIndex = withoutScheme.indexOf('/');

  if (slashIndex === -1) return null;

  return {
    bucket: withoutScheme.slice(0, slashIndex),
    path: withoutScheme.slice(slashIndex + 1),
  };
}
