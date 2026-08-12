'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/i18n/useTranslation';

const LOCALE_STORAGE_KEY = 'izy-preferred-locale';

export function useLocaleStorage() {
  const { locale } = useTranslation();

  // Sync current locale to localStorage whenever it changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      }
    } catch (e) {
      // localStorage might be unavailable in some environments
      console.warn('Failed to persist locale to localStorage:', e);
    }
  }, [locale]);

  return locale;
}

export function getStoredLocale(): string | null {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCALE_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed to read locale from localStorage:', e);
  }
  return null;
}
