"use client";

import { useParams } from "next/navigation";
import { Locale, defaultLocale, locales } from "./config";
import en from "./translations/en.json";
import nl from "./translations/nl.json";
import fr from "./translations/fr.json";
import de from "./translations/de.json";
import cs from "./translations/cs.json";
import es from "./translations/es.json";

const translations: Record<Locale, typeof en> = { en, nl, fr, de, cs, es };

/**
 * Get a nested value from an object by dot-separated key.
 * e.g. get(obj, "viewer.rotateMe") → obj.viewer.rotateMe
 */
function get(obj: any, path: string): string {
  return path.split(".").reduce((o, k) => o?.[k], obj) ?? path;
}

/**
 * Hook that returns the current locale and a translation function.
 * Usage: const { t, locale } = useTranslation();
 *        t("viewer.rotateMe") → "Rotate me" (en) or "Draai mij" (nl)
 */
export function useTranslation() {
  const params = useParams();
  const paramLocale = params?.locale as string | undefined;
  const locale: Locale =
    paramLocale && locales.includes(paramLocale as Locale)
      ? (paramLocale as Locale)
      : defaultLocale;

  const dict = translations[locale] || translations[defaultLocale];

  function t(key: string, vars?: Record<string, string | number>): string {
    let value = get(dict, key);
    // Fallback to English if key not found in current locale
    if (value === key) value = get(translations[defaultLocale], key);
    // Replace template variables like {min}
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(`{${k}}`, String(v));
      }
    }
    return value;
  }

  return { t, locale };
}

/**
 * Server-side translation helper (for non-hook contexts).
 */
export function getTranslation(locale: string) {
  const l = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;
  const dict = translations[l] || translations[defaultLocale];

  function t(key: string, vars?: Record<string, string | number>): string {
    let value = get(dict, key);
    if (value === key) value = get(translations[defaultLocale], key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(`{${k}}`, String(v));
      }
    }
    return value;
  }

  return { t, locale: l };
}
