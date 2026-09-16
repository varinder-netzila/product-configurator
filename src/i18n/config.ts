export const defaultLocale = 'nl';
export const locales = ['nl', 'en', 'fr', 'de', 'es'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
};

export const localeFlags: Record<Locale, string> = {
  nl: 'NL',
  en: 'GB',
  fr: 'FR',
  de: 'DE',
  es: 'ES',
};
