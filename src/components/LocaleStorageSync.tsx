'use client';

import { useLocaleStorage } from '@/hooks/useLocaleStorage';

export function LocaleStorageSync() {
  // This component syncs the current locale to localStorage
  // It needs to be a client component to access localStorage
  useLocaleStorage();
  return null;
}
