export const defaultLocale = 'en';
export const locales = ['en', 'nl', 'fr', 'de', 'cs', 'es'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  nl: 'Nederlands',
  fr: 'Français',
  de: 'Deutsch',
  cs: 'Čeština',
  es: 'Español',
};

export const localeFlags: Record<Locale, string> = {
  en: 'GB',
  nl: 'NL',
  fr: 'FR',
  de: 'DE',
  cs: 'CZ',
  es: 'ES',
};
