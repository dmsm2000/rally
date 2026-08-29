export type Locale = 'pt' | 'en' | 'es';

export const LOCALES: readonly Locale[] = ['pt', 'en', 'es'];
export const DEFAULT_LOCALE: Locale = 'pt';

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: 'PT',
  en: 'EN',
  es: 'ES',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  pt: '🇵🇹',
  en: '🇬🇧',
  es: '🇪🇸',
};
