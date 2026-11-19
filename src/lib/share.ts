const DEFAULT_BASE_URL = 'https://forms.zalen.tech';

export function getFormsZalenBaseUrl() {
  const configuredUrl = process.env.FORMS_ZALEN_BASE_URL?.trim() || DEFAULT_BASE_URL;

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return DEFAULT_BASE_URL;
  }
}

export function absoluteUrl(path: string) {
  return new URL(path, getFormsZalenBaseUrl()).toString();
}

export function trimForMeta(value: string | null | undefined, fallback: string, maxLength = 160) {
  const text = value?.replace(/\s+/g, ' ').trim() || fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
}
