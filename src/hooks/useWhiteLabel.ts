"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getReseller, resellerProductName, type ResellerConfig, type FeatureKey } from "@/data/resellers";
import { B2B_PRICING, getB2BPrice, type ProductPricing } from "@/data/b2bPricing";

const IZY_LOGO = "/assets/images/Logo-IZY-800x683-1-edited.webp";
const IZY_ACCENT = "#111827"; // gray-900 — the default IZY button colour

export interface WhiteLabel {
  /** True when a valid reseller is active (or whiteLabel=true with no reseller). */
  isWhiteLabel: boolean;
  /** The resolved reseller config, or null for IZY / generic white-label. */
  reseller: ResellerConfig | null;
  /** Logo to show — reseller logo, or IZY logo, or null to hide. */
  logoUrl: string | null;
  /** Accent colour for primary buttons / highlights. */
  accentColor: string;
  /** Brand display name — reseller company name or "IZY". */
  companyName: string;
  /** Whether to show the IZY watermark / share-to-IZY affordances. */
  showIzyBranding: boolean;
  /** "Need support?" link target (reseller's support URL/mailto), or null. */
  supportUrl: string | null;
  /** Transform an IZY product name for display. */
  productName: (izyName: string) => string;
  /** Per-piece price for a product + quantity (reseller's or IZY's). */
  price: (izyProductName: string, quantity: number) => number | null;
  /** Full pricing object for a product (reseller's or IZY's). */
  pricing: (izyProductName: string) => ProductPricing | null;
  /** Whether a design feature/tab is enabled (default true; resellers can disable). */
  isFeature: (key: FeatureKey) => boolean;
}

/**
 * Resolves white-label state from the URL.
 *   ?reseller=<id>     → full reseller branding + pricing + lead routing
 *   ?whiteLabel=true   → generic white-label (hide IZY) with no reseller config
 * Neither → normal IZY mode.
 */
export function useWhiteLabel(): WhiteLabel {
  const params = useSearchParams();
  const resellerId = params.get("reseller");
  const genericWhiteLabel = params.get("whiteLabel") === "true";

  // Live overlay from KV (admin-UI edits). We always start with the static
  // config so first render is instant and matches SSR — the KV result, if it
  // differs, just updates state on the next tick.
  const [overlay, setOverlay] = useState<ResellerConfig | null>(null);
  useEffect(() => {
    if (!resellerId) {
      setOverlay(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/resellers/${encodeURIComponent(resellerId)}`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled) setOverlay(data?.reseller ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [resellerId]);

  return useMemo(() => {
    const reseller = overlay ?? getReseller(resellerId);
    const isWhiteLabel = !!reseller || genericWhiteLabel;

    return {
      isWhiteLabel,
      reseller,
      logoUrl: reseller
        ? reseller.logoUrl // reseller logo (may be null → no logo)
        : isWhiteLabel
          ? null // generic white-label → hide logo entirely
          : IZY_LOGO,
      accentColor: reseller?.accentColor ?? IZY_ACCENT,
      companyName: reseller?.companyName ?? "IZY",
      showIzyBranding: !isWhiteLabel,
      supportUrl: reseller
        ? reseller.supportUrl ?? (reseller.email ? `mailto:${reseller.email}` : null)
        : null,
      productName: (izyName: string) =>
        reseller ? resellerProductName(reseller, izyName) : isWhiteLabel ? izyName.replace(/^IZY\s+/, "") : izyName,
      price: (izyProductName: string, quantity: number) => {
        if (reseller) {
          const p = reseller.pricing[izyProductName];
          if (!p) return null;
          const tier = p.tiers.find((t) => quantity >= t.min && (t.max === null || quantity <= t.max));
          return tier && tier.price > 0 ? tier.price : null;
        }
        // Generic white-label with no reseller config → never leak IZY prices.
        if (isWhiteLabel) return null;
        return getB2BPrice(izyProductName, quantity);
      },
      pricing: (izyProductName: string) => {
        if (reseller) return reseller.pricing[izyProductName] ?? null;
        if (isWhiteLabel) return null; // generic white-label hides IZY pricing
        return B2B_PRICING[izyProductName] ?? null;
      },
      // A feature is enabled unless the reseller explicitly disabled it.
      isFeature: (key: FeatureKey) => reseller?.features?.[key] !== false,
    };
  }, [resellerId, genericWhiteLabel, overlay]);
}
