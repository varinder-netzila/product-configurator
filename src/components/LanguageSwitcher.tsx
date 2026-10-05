"use client";

import { useState, useRef, useEffect, startTransition } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { locales, localeNames, localeFlags, Locale, defaultLocale } from "@/i18n/config";

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentLocale = (params?.locale as Locale) || defaultLocale;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

const switchLocale = (newLocale: Locale) => {
  let newPath: string;
  if (pathname.startsWith(`/${currentLocale}/`)) {
    newPath = pathname.replace(`/${currentLocale}/`, `/${newLocale}/`);
  } else if (pathname === `/${currentLocale}`) {
    newPath = `/${newLocale}`;
  } else {
    newPath = `/${newLocale}${pathname === "/" ? "" : pathname}`;
  }

  const search = window.location.search;
  const hash = window.location.hash;

  document.cookie = `locale=${newLocale};path=/;max-age=31536000;samesite=lax`;

  startTransition(() => {
    router.push(newPath + search + hash);
    router.refresh(); // drops the client router cache so server data is refetched
  });

  setOpen(false);
};

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
      >
        <span className="text-sm">{localeFlags[currentLocale]}</span>
        <span className="hidden sm:inline">{localeNames[currentLocale]}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 min-w-[140px]">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => switchLocale(locale)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                locale === currentLocale
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-sm">{localeFlags[locale]}</span>
              {localeNames[locale]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
