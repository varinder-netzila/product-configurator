"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Top-of-page tab bar shown on every admin route. Auto-detects which tab is
 *  active from the URL and preserves the current locale prefix. */
const ITEMS: { suffix: string; label: string }[] = [
  { suffix: "/admin/resellers", label: "Resellers" },
  { suffix: "/admin/leads", label: "Leads" },
  { suffix: "/admin/stats", label: "Stats" },
];

export default function AdminNav() {
  const pathname = usePathname() || "";
  // pathname looks like "/en/admin/stats" — keep the locale segment.
  const locale = pathname.split("/")[1] || "en";

  return (
    <nav className="flex items-center gap-2 mb-6 flex-wrap">
      {ITEMS.map(({ suffix, label }) => {
        const href = `/${locale}${suffix}`;
        const active = pathname.endsWith(suffix);
        return (
          <Link
            key={suffix}
            href={href}
            className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
              active
                ? "bg-gray-900 text-white"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
