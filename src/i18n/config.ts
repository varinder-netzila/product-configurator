export const defaultLocale = 'nl';
export const locales = ['nl', 'en', 'fr', 'de', 'cs', 'es'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  cs: 'Čeština',
  es: 'Español',
};

export const localeFlags: Record<Locale, string> = {
  nl: 'NL',
  en: 'GB',
  fr: 'FR',
  de: 'DE',
  cs: 'CZ',
  es: 'ES',
};
