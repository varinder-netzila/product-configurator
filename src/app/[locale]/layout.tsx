import { locales } from "@/i18n/config";
import { LocaleStorageSync } from "@/components/LocaleStorageSync";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <>
      <LocaleStorageSync />
      {children}
    </>
  );
}
