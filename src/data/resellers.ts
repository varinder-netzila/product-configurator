import type { ProductPricing } from "./b2bPricing";

/** Configurator design features that can be toggled per reseller. */
export type FeatureKey = "texture" | "map" | "art" | "jersey" | "brand";
//export type FeatureKey = "texture" | "map" | "brand";

/**
 * A reseller / white-label partner. Resellers embed the configurator on their
 * own website via ?reseller=<id>. Their branding (logo, accent colour,
 * company name) and their OWN selling prices replace the IZY defaults, and
 * the IZY identity is hidden.
 *
 * Resellers are added here and shipped with a deploy — the audience is a
 * small set of B2B partners, so a static config map is sufficient for now.
 * (If this grows, move to a DB / hosted JSON.)
 */
export interface ResellerConfig {
  /** URL-safe id used in ?reseller=<id> */
  id: string;
  /** Shown in product titles + page copy instead of "IZY". */
  companyName: string;
  /** Reseller logo (absolute URL or /assets path). null → no logo shown. */
  logoUrl: string | null;
  /** Optional header logo height as a CSS value (e.g. "4rem"). Defaults to
   *  2.25rem. Use a larger value for stacked/tall logos. */
  logoHeight?: string;
  /** Set true when the reseller only ships a white-on-transparent logo: we
   *  apply `filter: invert(1)` so it renders as dark-on-white on our header.
   *  Skipped in email (CSS filters aren't reliable in email clients). */
  logoInvert?: boolean;
  /** Hex accent colour used for primary buttons / highlights. */
  accentColor: string;
  /** Where design requests / leads are emailed (in addition to IZY). When
   *  omitted, leads go to IZY only (e.g. while a reseller's address is pending). */
  email?: string;
  /**
   * Where the "Need support?" link points. A full URL (https://…) or a
   * mailto:. If omitted, it falls back to mailto:<email>.
   */
  supportUrl?: string;
  /**
   * Product-name prefix to strip from the IZY product names. Defaults to
   * "IZY " so "IZY Bottle" → "Bottle". Set to a custom string to rename.
   */
  stripPrefix?: string;
  /** Optional rename map: IZY product name → reseller product name. */
  productNames?: Record<string, string>;
  /**
   * Reseller's OWN selling prices, keyed by the IZY product name
   * ("IZY Bottle", "IZY Travel Bottle", "IZY Mug", "IZY Tumbler").
   * If a product is missing, no price is shown for it.
   */
  pricing: Record<string, ProductPricing>;
  /**
   * Which design features are enabled. A feature is ON unless explicitly set
   * to false, so a reseller only needs to list what they want to DISABLE.
   * Omit the whole object to enable everything.
   */
  features?: Partial<Record<FeatureKey, boolean>>;
  /**
   * Optional packaging options for this reseller. Each option includes the
   * packaging type, and either simple pricing (costPerUnit + moq) or tiered pricing.
   */
  packaging?: Array<{
    name: string;
    costPerUnit?: number;
    moq?: number;
    tiers?: Array<{ min: number; max: number | null; price: number }>;
  }>;
}

/**
 * Default volume staffel — used as a placeholder for new resellers until they
 * confirm their own prices. Identical to what the early resellers (Tailwind,
 * By Acte, BF Promotions, GoPromo, Compacon) were seeded with.
 */
export const STD_STAFFEL: Record<string, ProductPricing> = {
  "IZY Bottle": {
    retail: 29.99,
    tiers: [
      { label: "50-99", min: 50, max: 99, price: 20.99 },
      { label: "100-249", min: 100, max: 249, price: 19.99 },
      { label: "250-499", min: 250, max: 499, price: 18.99 },
      { label: "500-999", min: 500, max: 999, price: 17.99 },
    ],
  },
  "IZY Travel Bottle": {
    retail: 34.99,
    tiers: [
      { label: "50-99", min: 50, max: 99, price: 24.99 },
      { label: "100-249", min: 100, max: 249, price: 23.99 },
      { label: "250-499", min: 250, max: 499, price: 22.99 },
      { label: "500-999", min: 500, max: 999, price: 21.99 },
    ],
  },
  "IZY Mug": {
    retail: 29.99,
    tiers: [
      { label: "50-99", min: 50, max: 99, price: 20.99 },
      { label: "100-249", min: 100, max: 249, price: 19.99 },
      { label: "250-499", min: 250, max: 499, price: 18.99 },
      { label: "500-999", min: 500, max: 999, price: 17.99 },
    ],
  },
  "IZY Tumbler": {
    retail: 32.99,
    tiers: [
      { label: "50-99", min: 50, max: 99, price: 22.99 },
      { label: "100-249", min: 100, max: 249, price: 21.99 },
      { label: "250-499", min: 250, max: 499, price: 20.99 },
      { label: "500-999", min: 500, max: 999, price: 19.99 },
    ],
  },
};

export const RESELLERS: Record<string, ResellerConfig> = {
  // Tailwind Premiums — promotional gifts reseller (tailwindpremiums.nl).
  // Branding extracted from their site: teal #00A896 primary.
  // NOTE: pricing below is a placeholder copy of IZY's — update with Tailwind
  // Premiums' actual selling prices.
  tailwind: {
    id: "tailwind",
    companyName: "Tailwind Premiums",
    // Dark wordmark on a transparent background — reads well on our white header.
    logoUrl: "/assets/images/tailwind-premiums.png",
    accentColor: "#00A896",
    email: "willem@tailwindpremiums.nl",
    stripPrefix: "IZY ",
    // Art + Jersey disabled for Tailwind Premiums.
    features: { art: false, jersey: false },
    pricing: {
      "IZY Bottle": {
        retail: 29.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 20.99 },
          { label: "100-249", min: 100, max: 249, price: 19.99 },
          { label: "250-499", min: 250, max: 499, price: 18.99 },
          { label: "500-999", min: 500, max: 999, price: 17.99 },
        ],
      },
      "IZY Travel Bottle": {
        retail: 34.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 24.99 },
          { label: "100-249", min: 100, max: 249, price: 23.99 },
          { label: "250-499", min: 250, max: 499, price: 22.99 },
          { label: "500-999", min: 500, max: 999, price: 21.99 },
        ],
      },
      "IZY Mug": {
        retail: 29.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 20.99 },
          { label: "100-249", min: 100, max: 249, price: 19.99 },
          { label: "250-499", min: 250, max: 499, price: 18.99 },
          { label: "500-999", min: 500, max: 999, price: 17.99 },
        ],
      },
      "IZY Tumbler": {
        retail: 32.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 22.99 },
          { label: "100-249", min: 100, max: 249, price: 21.99 },
          { label: "250-499", min: 250, max: 499, price: 20.99 },
          { label: "500-999", min: 500, max: 999, price: 19.99 },
        ],
      },
    },
  },

  // By Acte (byacte.nl) — minimalist black branding.
  // NOTE: lead email intentionally omitted for now — leads go to IZY only until
  // By Acte confirm the right address (then add `email: "..."`). Pricing is a
  // copy of the IZY/Tailwind staffel for now.
  byacte: {
    id: "byacte",
    companyName: "By Acte",
    logoUrl: "https://static.wixstatic.com/media/9178e9_27deffd1512645368de00df7aca24bf8~mv2.png/v1/fill/w_320,h_88,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/ByActe_logo__logo.png",
    accentColor: "#000000",
    stripPrefix: "IZY ",
    // Art + Jersey disabled for By Acte.
    features: { art: false, jersey: false },
    pricing: {
      "IZY Bottle": {
        retail: 29.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 20.99 },
          { label: "100-249", min: 100, max: 249, price: 19.99 },
          { label: "250-499", min: 250, max: 499, price: 18.99 },
          { label: "500-999", min: 500, max: 999, price: 17.99 },
        ],
      },
      "IZY Travel Bottle": {
        retail: 34.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 24.99 },
          { label: "100-249", min: 100, max: 249, price: 23.99 },
          { label: "250-499", min: 250, max: 499, price: 22.99 },
          { label: "500-999", min: 500, max: 999, price: 21.99 },
        ],
      },
      "IZY Mug": {
        retail: 29.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 20.99 },
          { label: "100-249", min: 100, max: 249, price: 19.99 },
          { label: "250-499", min: 250, max: 499, price: 18.99 },
          { label: "500-999", min: 500, max: 999, price: 17.99 },
        ],
      },
      "IZY Tumbler": {
        retail: 32.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 22.99 },
          { label: "100-249", min: 100, max: 249, price: 21.99 },
          { label: "250-499", min: 250, max: 499, price: 20.99 },
          { label: "500-999", min: 500, max: 999, price: 19.99 },
        ],
      },
    },
  },

  // BF Promotions (bfpromotions.cz) — Czech promotional-products reseller.
  // Brand colours from their site: dark navy #000C2C (primary) + lime #75FA4C
  // (accent). We use the navy as accent so white button text stays readable.
  // Their logo is an SVG sprite (#logo) that can't be used as a plain <img>, so
  // we fall back to the company name — save a PNG to
  // public/assets/images/bfpromotions.png and point logoUrl at it to show it.
  // Lead email omitted for now — leads go to IZY only until BF Promotions
  // confirm the right address (their site lists info@bfpromotions.cz). Pricing
  // is a copy of the IZY/Tailwind staffel.
    marvins: {
    id: "marvins",
    companyName: "Marvins",
    logoUrl: "/assets/images/marvin-logo.png",
    accentColor: "#000C2C",
    email: "info@marvins.cz",
    stripPrefix: "IZY ",
    // Art + Jersey disabled for BF Promotions.
    features: { art: false, jersey: false },
    pricing: {
      "IZY Bottle": {
        retail: 29.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 20.99 },
          { label: "100-249", min: 100, max: 249, price: 19.99 },
          { label: "250-499", min: 250, max: 499, price: 18.99 },
          { label: "500-999", min: 500, max: 999, price: 17.99 },
        ]
      },
    }
  },
  bfpromotions: {
    id: "bfpromotions",
    companyName: "BF Promotions",
    logoUrl: "/assets/images/bfpromotions-logo.png",
    accentColor: "#000C2C",
    email: "info@bfpromotions.cz",
    stripPrefix: "IZY ",
    // Art + Jersey disabled for BF Promotions.
    features: { art: false, jersey: false },
    pricing: {
      "IZY Bottle": {
        retail: 29.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 20.99 },
          { label: "100-249", min: 100, max: 249, price: 19.99 },
          { label: "250-499", min: 250, max: 499, price: 18.99 },
          { label: "500-999", min: 500, max: 999, price: 17.99 },
        ],
      },
      "IZY Travel Bottle": {
        retail: 34.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 24.99 },
          { label: "100-249", min: 100, max: 249, price: 23.99 },
          { label: "250-499", min: 250, max: 499, price: 22.99 },
          { label: "500-999", min: 500, max: 999, price: 21.99 },
        ],
      },
      "IZY Mug": {
        retail: 29.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 20.99 },
          { label: "100-249", min: 100, max: 249, price: 19.99 },
          { label: "250-499", min: 250, max: 499, price: 18.99 },
          { label: "500-999", min: 500, max: 999, price: 17.99 },
        ],
      },
      "IZY Tumbler": {
        retail: 32.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 22.99 },
          { label: "100-249", min: 100, max: 249, price: 21.99 },
          { label: "250-499", min: 250, max: 499, price: 20.99 },
          { label: "500-999", min: 500, max: 999, price: 19.99 },
        ],
      },
    },
  },

  // GoPromo (gopromo.nl) — Dutch promotional-products reseller.
  // Accent #008cba (their site's primary blue). Lead email omitted for now —
  // leads go to IZY only until GoPromo confirm the address (site lists
  // info@gopromo.nl). Pricing is a copy of the IZY/Tailwind staffel.
  gopromo: {
    id: "gopromo",
    companyName: "GoPromo",
    logoUrl: "https://www.gopromo.nl/uploads/editor/1730965978_gopromo-logo-webshop.png",
    accentColor: "#008cba",
    stripPrefix: "IZY ",
    // Art + Jersey disabled for GoPromo.
    features: { art: false, jersey: false },
    pricing: {
      "IZY Bottle": {
        retail: 29.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 20.99 },
          { label: "100-249", min: 100, max: 249, price: 19.99 },
          { label: "250-499", min: 250, max: 499, price: 18.99 },
          { label: "500-999", min: 500, max: 999, price: 17.99 },
        ],
      },
      "IZY Travel Bottle": {
        retail: 34.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 24.99 },
          { label: "100-249", min: 100, max: 249, price: 23.99 },
          { label: "250-499", min: 250, max: 499, price: 22.99 },
          { label: "500-999", min: 500, max: 999, price: 21.99 },
        ],
      },
      "IZY Mug": {
        retail: 29.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 20.99 },
          { label: "100-249", min: 100, max: 249, price: 19.99 },
          { label: "250-499", min: 250, max: 499, price: 18.99 },
          { label: "500-999", min: 500, max: 999, price: 17.99 },
        ],
      },
      "IZY Tumbler": {
        retail: 32.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 22.99 },
          { label: "100-249", min: 100, max: 249, price: 21.99 },
          { label: "250-499", min: 250, max: 499, price: 20.99 },
          { label: "500-999", min: 500, max: 999, price: 19.99 },
        ],
      },
    },
  },

  // Compacon (compacon.nl, part of Plato Group) — promotional-products reseller.
  // Accent #002d76 (their navy). Logo is an SVG hosted on their site. Lead email
  // omitted for now — leads go to IZY only until Compacon confirm the address
  // (site lists thenetherlands@compacon.com). Pricing copies the IZY/Tailwind staffel.
  compacon: {
    id: "compacon",
    companyName: "Compacon",
    logoUrl: "https://www.compacon.nl/images/compacon-logo-wow-below-rgb.svg",
    logoHeight: "4.5rem", // stacked "wow-below" logo — needs more height
    accentColor: "#002d76",
    stripPrefix: "IZY ",
    // Art + Jersey disabled for Compacon.
    features: { art: false, jersey: false },
    pricing: {
      "IZY Bottle": {
        retail: 29.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 20.99 },
          { label: "100-249", min: 100, max: 249, price: 19.99 },
          { label: "250-499", min: 250, max: 499, price: 18.99 },
          { label: "500-999", min: 500, max: 999, price: 17.99 },
        ],
      },
      "IZY Travel Bottle": {
        retail: 34.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 24.99 },
          { label: "100-249", min: 100, max: 249, price: 23.99 },
          { label: "250-499", min: 250, max: 499, price: 22.99 },
          { label: "500-999", min: 500, max: 999, price: 21.99 },
        ],
      },
      "IZY Mug": {
        retail: 29.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 20.99 },
          { label: "100-249", min: 100, max: 249, price: 19.99 },
          { label: "250-499", min: 250, max: 499, price: 18.99 },
          { label: "500-999", min: 500, max: 999, price: 17.99 },
        ],
      },
      "IZY Tumbler": {
        retail: 32.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 22.99 },
          { label: "100-249", min: 100, max: 249, price: 21.99 },
          { label: "250-499", min: 250, max: 499, price: 20.99 },
          { label: "500-999", min: 500, max: 999, price: 19.99 },
        ],
      },
    },
  },

  // ── Wave 1 batch ────────────────────────────────────────────────────────
  // The entries below were scaffolded together from the resellers' websites.
  // Defaults: Art + Jersey disabled, lead email omitted (leads go to IZY only)
  // until each reseller confirms an address, pricing = STD_STAFFEL.
  // Accent picked from the site where visible; #1a1a1a fallback otherwise.
  // logoUrl = null falls back to the company name in the accent colour.

  kickspromo: {
    id: "kickspromo",
    companyName: "Kicks Promo",
    logoUrl: "https://www.kickspromo.nl/uploads/editor/1705328723_ppp.jpg",
    accentColor: "#ff6b35",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  looren: {
    id: "looren",
    companyName: "Looren",
    logoUrl: "https://www.looren.nl/wp-content/uploads/2025/01/2025_LOOREN_LOGO_BREED.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  complementair: {
    id: "complementair",
    companyName: "Complementair",
    logoUrl: "https://media-01.imu.nl/storage/complementair.net/26059/logo-complementair.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  companyofgifts: {
    id: "companyofgifts",
    companyName: "Company of Gifts",
    logoUrl: "https://www.companyofgifts.nl/images/company-of-gifts.svg",
    accentColor: "#14b8a6",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  kamppromogifts: {
    id: "kamppromogifts",
    companyName: "Kamp Promogifts",
    logoUrl: "https://kamppromogifts.nl/wp-content/uploads/2024/02/KAMPPromogifts-web.png",
    accentColor: "#1a1a1a",
    email: "info@kamppromogifts.nl",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Logo is a white-on-transparent variant (unreadable on our white header) →
  // name fallback in their orange accent.
  zeeuwsewaardering: {
    id: "zeeuwsewaardering",
    companyName: "Zeeuwse Waardering",
    logoUrl: "https://primary.jwwb.nl/public/u/n/y/temp-zspkjswwbukkhcolbyio/mbc1q4/logo_white_large.png?enable-io=true&enable=upscale&height=70",
    logoInvert: true,
    accentColor: "#d97706",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "cadeau-architecten": {
    id: "cadeau-architecten",
    companyName: "Cadeau Architecten",
    logoUrl: "https://www.cadeau-architecten.nl/assets/files/logo-ca-en-bh-zwart.1920x1920.png",
    accentColor: "#000000",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "kerstpakket-nl": {
    id: "kerstpakket-nl",
    companyName: "Kerstpakket.nl",
    logoUrl: "https://www.kerstpakket.nl/cdn/shop/files/kerstpakket_logo_payoff.svg?v=1758208460&width=250",
    accentColor: "#991b1b",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  jadoe: {
    id: "jadoe",
    companyName: "JADOE geschenkenmakers",
    logoUrl: "https://jadoe.nl/assets/img/site/logo.svg",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  totaalgeschenk: {
    id: "totaalgeschenk",
    companyName: "Totaal Geschenk",
    logoUrl: "https://totaalgeschenk.nl/themes/totaalgeschenk2020/images/logo_totaalgeschenk.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // NOTE: Zustaina (manonvanleeuwen.nl/zustaina) ceased operations in April
  // 2025 per their own site — intentionally skipped.

  // Logo is a white-on-transparent variant → name fallback.
  kekke: {
    id: "kekke",
    companyName: "Kekke Kerstpakketten",
    logoUrl: "https://kekkekerstpakketten.nl/wp-content/uploads/2023/08/kekkekerstpakketten_WIT-2.png",
    logoInvert: true,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // The discovered logo URL points to "lege_px" (an empty placeholder pixel),
  // so we use the name fallback until a real logo file is provided.
  loyaltymakers: {
    id: "loyaltymakers",
    companyName: "Loyalty Makers",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "2bxclusive": {
    id: "2bxclusive",
    companyName: "2B-Xclusive",
    logoUrl: "https://www.2b-xclusive.nl/images/2B-Xclusive_creatief%20in%20geschenken%20en%20kleding%20-2-.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "kerstpakket-com": {
    id: "kerstpakket-com",
    companyName: "Kerstpakket.com",
    logoUrl: "https://kerstpakket.com/wp-content/uploads/2020/10/Logo-Kerstpakket.com-transparante-achtergrond-1600-x-304-px.png",
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  promotools: {
    id: "promotools",
    companyName: "Promotools",
    logoUrl: "https://www.promotools.nl/wp-content/uploads/2017/02/Promotools_logo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  goalpromotions: {
    id: "goalpromotions",
    companyName: "Goalpromotions",
    logoUrl: "https://128.wpcdnnode.com/goalpromotions.com/wp-content/uploads/2021/04/LogoGoalpromotions.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  communicationpartners: {
    id: "communicationpartners",
    companyName: "Communication Partners",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  lavista: {
    id: "lavista",
    companyName: "Lavista Relatiegeschenken",
    logoUrl: "https://www.lavistarelatiegeschenken.nl/images/logo/lavista.svg?v=35",
    accentColor: "#ca8a04",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  benito: {
    id: "benito",
    companyName: "Benito",
    logoUrl: "https://benito.nl/wp-content/uploads/2022/12/benitologo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // ── Wave 2 batch ────────────────────────────────────────────────────────
  // Same defaults as wave 1: Art + Jersey off, email omitted (IZY only),
  // STD_STAFFEL pricing. logoUrl = null falls back to the company name.

  kerstpakketnet: {
    id: "kerstpakketnet",
    companyName: "Kerstpakket.net",
    logoUrl: "https://www.kerstpakket.net/files/logo-kerstpakket-aangepast-01.png",
    accentColor: "#b8860b",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Their logo is white-on-transparent (unreadable on white header) → name fallback.
  promarsales: {
    id: "promarsales",
    companyName: "Promar Sales International",
    logoUrl: "https://promarsales.nl/wp-content/themes/promarsales/cdn/images/logo-promar-sales_white.png",
    logoInvert: true,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  prikkels: {
    id: "prikkels",
    companyName: "Prikkels",
    logoUrl: "https://dc0df59e3d2476fcb76e-2587be0da220b9577730bd9ec11628fd.ssl.cf1.rackcdn.com/1668508894_1631792957_prikkel.png",
    accentColor: "#ff6b35",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  vosensetz: {
    id: "vosensetz",
    companyName: "Vos en Setz",
    logoUrl: "https://www.vosensetz.nl/wp-content/uploads/2022/02/vos-en-setz-logo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  hekon: {
    id: "hekon",
    companyName: "Hekon",
    logoUrl: "https://www.hekon.nl/Portals/_default/Skins/Customer/img/hekon_logo.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // kerstenrelatie.nl is the webshop of "Homminga's Fijne Winkeltje".
  kerstenrelatie: {
    id: "kerstenrelatie",
    companyName: "Homminga's Kerst & Relatie",
    logoUrl: "https://www.kerstenrelatie.nl/wp-content/uploads/2024/05/hommingas-kerst-en-relatie.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Their available logo is the "negatief" variant (white-on-dark) → name fallback.
  fabulousgifts: {
    id: "fabulousgifts",
    companyName: "Fabulous G!fts",
    logoUrl: "https://www.fabulousgifts.nl/wp-content/uploads/2020/08/cropped-Logo-negatief.png",
    logoInvert: true,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  multigift: {
    id: "multigift",
    companyName: "MultiGift",
    logoUrl: "https://multigift.com/images/logos/37/MGLOGO.com.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Pink/magenta brand (hex extracted from logo URL parameters).
  "eco-gift": {
    id: "eco-gift",
    companyName: "Eco-Gift",
    logoUrl: "https://eco-gift.nl/302/0/0/1/ffffff00/ef619c50/82900e377edae74e4e4265931b506d2d639103a34a6f7f51b584d70d2653a6d1/header-logo.svg",
    accentColor: "#ef619c",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Branding fetch failed (TLS) — minimal entry; add logo + accent when available.
  florisgifts: {
    id: "florisgifts",
    companyName: "Floris Gifts",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  origineelpakket: {
    id: "origineelpakket",
    companyName: "OrigineelPakket.nl",
    logoUrl: "https://www.origineelpakket.nl/wp-content/uploads/2024/05/logo-origineelpakket.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  vankeulen: {
    id: "vankeulen",
    companyName: "Van Keulen Geschenken",
    logoUrl: "https://vankeulengeschenken.nl/wp-content/uploads/2021/01/logo-van-Keulen-geschenken.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  q2be: {
    id: "q2be",
    companyName: "Q2Be",
    logoUrl: "https://q2be.nl/wp-content/themes/q2be/img/logo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Branding fetch failed (TLS cert mismatch) — minimal entry.
  "seaside-pg": {
    id: "seaside-pg",
    companyName: "Seaside Promotion Group",
    logoUrl: "https://www.seaside-pg.nl/wp-content/uploads/2016/08/SEA_logoPMS-e1456775896275.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  viveledon: {
    id: "viveledon",
    companyName: "ViveleDon",
    logoUrl: "/assets/images/viveledon-logo.png",
    accentColor: "#b91c1c",
    email: "info@viveledon.com",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: {}, // "op aanvraag" — no prices shown
  },

  // No usable logo on their site (placeholder SVG only) → name fallback.
  rmskerstpakketten: {
    id: "rmskerstpakketten",
    companyName: "RMS Kerst- en Themapakketten",
    logoUrl: "https://www.rmskerstpakketten.nl/wp-content/uploads/2022/03/cropped-Logo-RMS-Kadootje-tbv-Favicon-rmskerstpakketten-site-192x192.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Logo host returned no response → name fallback.
  xmasgiftsonline: {
    id: "xmasgiftsonline",
    companyName: "Xmasgiftsonline",
    logoUrl: null,
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Discovered logo URL returned 404 → name fallback.
  atmrgifts: {
    id: "atmrgifts",
    companyName: "AtmR Gifts",
    logoUrl: "https://atmrgifts.nl/uploads/editor/1761823364_1706878646_atmr-newlogo.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No clear primary logo URL on the site → name fallback.
  mooierr: {
    id: "mooierr",
    companyName: "Mooierr",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  xmaspresents: {
    id: "xmaspresents",
    companyName: "Xmas Presents",
    logoUrl: "https://www.xmaspresents.nl/storage/images/LogoGroot.jpg?hash=b69eef0cd452b4a8e6a82dd4243162f820ebea32&shop=91590776",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // ── Wave 3 batch ────────────────────────────────────────────────────────
  // Same defaults: Art + Jersey off, email omitted (IZY only), STD_STAFFEL.

  // Skipped: the malformed source URL "https://https://arnoldverwiel.nl/promotions.nl/"
  // — arnoldverwiel.nl appears separately later in the list.

  keiretsu: {
    id: "keiretsu",
    companyName: "Keiretsu Europe",
    logoUrl: "https://keiretsu-europe.nl/wp-content/uploads/2021/06/LogoKeiretsu-zwart.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "promo-concepts": {
    id: "promo-concepts",
    companyName: "Promo Concepts",
    logoUrl: "https://promo-concepts.nl/media/image/54/e4/52/logo-ppp.png",
    accentColor: "#ff6b35",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  worldpresent: {
    id: "worldpresent",
    companyName: "World Present",
    logoUrl: "https://worldpresent.nl/media/be/94/c2/1777541576/Logo-World-Present-2023-transparant.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "cadeau-atelier": {
    id: "cadeau-atelier",
    companyName: "Cadeau Atelier",
    logoUrl: "https://cadeau-atelier.nl/wp-content/uploads/2023/09/Logo_Cadeau-Atelier_-1.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "kerstpakketten-professionals": {
    id: "kerstpakketten-professionals",
    companyName: "Kerstpakketten Professionals",
    logoUrl: "https://kerstpakketten-professionals.nl/wp-content/uploads/2022/08/Logo-Kerstpakketten-Professionals-1024x251.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Site rate-limited the fetch (HTTP 429) — minimal entry; add logo + accent later.
  goedkooppennenbedrukken: {
    id: "goedkooppennenbedrukken",
    companyName: "Goedkoop Pennen Bedrukken",
    logoUrl: "https://static.goedkooppennenbedrukken.nl/media/17/51/85/1763709657/dpb-logo.svg?ts=1763709657",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  kranen: {
    id: "kranen",
    companyName: "Kranen Kerstpakketten",
    logoUrl: "https://www.kranenkerstpakketten.nl/wp-content/uploads/2026/03/Logo-Kranen-kerstpakketten.webp",
    accentColor: "#0f766e",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No standalone logo URL in the page HTML → name fallback.
  dewitteraaf: {
    id: "dewitteraaf",
    companyName: "De Witte Raaf Ermelo",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "promo-trade": {
    id: "promo-trade",
    companyName: "Promo Trade",
    logoUrl: "https://promo-trade.nl/wp-content/uploads/2018/08/Logo2016-klein.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  reprotex: {
    id: "reprotex",
    companyName: "Reprotex",
    logoUrl: "https://reprotex.nl/media/d9/e2/8d/1734017738/REPROTEX%20Website%2024-1.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  cntrading: {
    id: "cntrading",
    companyName: "CN Trading",
    logoUrl: "https://cntrading.nl/wp-content/themes/crossmediahouse/assets/images/cntrading-logo.svg",
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  businessgifts4you: {
    id: "businessgifts4you",
    companyName: "Businessgifts4you",
    logoUrl: "https://www.businessgifts4you.nl/cdn/shop/files/Logo_Businessgifts4you.nl.jpg?v=1779952113&width=500",
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Page only exposes a data-URI placeholder for the logo → name fallback.
  kerstpakkettenwwg: {
    id: "kerstpakkettenwwg",
    companyName: "Kerstpakketten WWG",
    logoUrl: "https://www.kerstpakkettenwwg.nl/wp-content/uploads/WWG-Logo-Big.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  gogive: {
    id: "gogive",
    companyName: "GoGive",
    logoUrl: "https://www.gogive.nl/images/gogive.png",
    accentColor: "#16a34a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  amiko: {
    id: "amiko",
    companyName: "Amiko Relatiegeschenken",
    logoUrl: "https://www.amikorelatiegeschenken.nl/storage/images/Amiko2019%20(002).jpg?hash=e77fb62a8ce90153d25a9d86514ed961452e8a38&shop=92296832",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  kadokeus: {
    id: "kadokeus",
    companyName: "Kadokeus",
    logoUrl: "https://shop.kadokeus.nl/templates/kadokeus/images/logos/kadokeus.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  hiephiepkado: {
    id: "hiephiepkado",
    companyName: "HiepHiepKado",
    logoUrl: "https://a91cab056df3db239b7f-9ee529d01c4b4b4d557bf4f9862d5bee.ssl.cf1.rackcdn.com/1760080224_hhk-new-logo-mobile.png",
    accentColor: "#ca8a04",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  helloworldgifts: {
    id: "helloworldgifts",
    companyName: "Hello World Gifts",
    logoUrl: "https://www.helloworldgifts.nl/images/hwg_logo_full.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // The discovered image was a "Supplier of the Year" award badge, not their
  // primary logo → name fallback.
  zaakado: {
    id: "zaakado",
    companyName: "ZaaKado",
    logoUrl: null,
    accentColor: "#16a34a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Only a white-on-transparent logo variant ("APD-Logo_RGB-wit.svg") was
  // available → name fallback in their orange accent.
  artpoetrydesign: {
    id: "artpoetrydesign",
    companyName: "Art Poetry & Design",
    logoUrl: "https://www.artpoetrydesign.nl/wp-content/uploads/2022/06/APD-Logo_RGB-wit.svg",
    logoInvert: true,
    accentColor: "#ea580c",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // ── Wave 4 batch ────────────────────────────────────────────────────────
  // Same defaults: Art + Jersey off, email omitted (IZY only), STD_STAFFEL.

  denley: {
    id: "denley",
    companyName: "Denley",
    logoUrl: "https://denley.nl/wp-content/uploads/2024/08/logo-denley.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  lamoustache: {
    id: "lamoustache",
    companyName: "La Moustache",
    logoUrl: "https://89daa2d84fdaba289a36-9373b407b2c2cd2adeb78d65d777e9a5.ssl.cf1.rackcdn.com/1727872134_lamoustache-mobile.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  alertpromotie: {
    id: "alertpromotie",
    companyName: "Alert Promotie",
    logoUrl: "https://www.alertpromotie.nl/wp-content/uploads/2022/04/ap-logo.svg",
    accentColor: "#ff6b35",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // The image at the site was a PPP certification badge, not their company
  // logo → name fallback.
  arnoldverwiel: {
    id: "arnoldverwiel",
    companyName: "Arnold Verwiel",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Site responded with empty content to the branding fetch → name fallback.
  promofit: {
    id: "promofit",
    companyName: "PromoFit",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  gifts4business: {
    id: "gifts4business",
    companyName: "Gifts4Business",
    logoUrl: "https://gifts4business.nl/media/f0/0a/3b/1737387122/logo%20in%20pms.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No direct logo image URL exposed on the homepage → name fallback.
  ctspromo: {
    id: "ctspromo",
    companyName: "CTS Promo",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  unigear: {
    id: "unigear",
    companyName: "UniGear",
    logoUrl: "https://unigear.eu/media/logo/websites/17/Unigear_logo.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  pronkgeschenken: {
    id: "pronkgeschenken",
    companyName: "Pronk Geschenken",
    logoUrl: "https://pronkgeschenken.nl/wp-content/themes/pronkgeschenken/assets/img/logo-pronk-geschenken.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  promoshoponline: {
    id: "promoshoponline",
    companyName: "PromoShopOnline",
    logoUrl: "https://promoshoponline.nl/Portals/_default/Skins/PromoShopOnline/Images/logo-promoshop-online-300.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  yippenco: {
    id: "yippenco",
    companyName: "Yipp & Co",
    logoUrl: "https://yippenco.nl/wp-content/uploads/2019/06/logo.png",
    accentColor: "#0d9488",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No direct logo image URL exposed on the homepage → name fallback.
  feelingz: {
    id: "feelingz",
    companyName: "Feelingz",
    logoUrl: null,
    accentColor: "#0d9488",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  tbtb: {
    id: "tbtb",
    companyName: "TBTB Relatiegeschenken",
    logoUrl: "https://www.tbtb.nl/uploads/editor/1743412328_TBTB-Relatiegeschenken-logo.png",
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  arnauld: {
    id: "arnauld",
    companyName: "Arnauld Geschenken",
    logoUrl: "https://9da4b9b24cc5716b9d96-5aa5edac3b00b159eda420b0fe35939a.ssl.cf1.rackcdn.com/1754403085_arnauld-logo-mobile.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Logo source was a data-URI placeholder, no real image URL → name fallback.
  xstyles: {
    id: "xstyles",
    companyName: "XStyles",
    logoUrl: "https://xstyles.nl/wp-content/uploads/2020/11/xstyles_logo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  denbesten: {
    id: "denbesten",
    companyName: "Den Besten Kerst- en Relatiegeschenken",
    logoUrl: "https://www.denbesten.nl/templates/buro26/img/logo-den-besten.png",
    accentColor: "#7c3aed",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  robitex: {
    id: "robitex",
    companyName: "Robitex",
    logoUrl: "https://cdn.prod.website-files.com/68dfc5df942514fbc267b5f2/68ecb083f52b293ce26caebd_robitex-logo.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  prezend: {
    id: "prezend",
    companyName: "Prezend",
    logoUrl: "https://www.prezend.nl/wp-content/uploads/2026/01/Prezend-logo-zonder-achtergrond-3-350x76.png",
    accentColor: "#16a34a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  promotie: {
    id: "promotie",
    companyName: "Promotie.nl",
    logoUrl: "https://www.promotie.nl/media/9b/fa/dc/1773929785/promotie%20nl%20logo%20minder%20whitespace.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  pinkcube: {
    id: "pinkcube",
    companyName: "Pinkcube",
    logoUrl: "https://www.pinkcube.nl/_ipx/s_224x48/images/logo.svg",
    accentColor: "#ec4899",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // ── Wave 5 batch ────────────────────────────────────────────────────────
  // Same defaults: Art + Jersey off, email omitted (IZY only), STD_STAFFEL.

  yokado: {
    id: "yokado",
    companyName: "YoKado",
    logoUrl: "https://yokado.nl/wp-content/uploads/2024/05/logo-2.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Logo is a data:gif placeholder on their site → name fallback.
  beglobal: {
    id: "beglobal",
    companyName: "BeGlobal",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  socialgoodz: {
    id: "socialgoodz",
    companyName: "SocialGoodz",
    logoUrl: "https://socialgoodz.nl/media/f9/af/9c/1741768619/socialgoodz_DEF.png",
    accentColor: "#16a34a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  hollandkadopakket: {
    id: "hollandkadopakket",
    companyName: "Holland Kadopakket",
    logoUrl: "https://hollandkadopakket.nl/wp-content/uploads/2025/06/cf32154741ccff00e6afe77b735852b6.webp",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Discovered logo URL was a language-flag icon, not the company logo →
  // name fallback.
  hoek21: {
    id: "hoek21",
    companyName: "Hoek 21",
    logoUrl: "https://www.hoek21.nl/wp-content/uploads/2021/08/hoek21-logo.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Discovered logo URL returned 404 → name fallback in their red accent.
  primarelatiegeschenken: {
    id: "primarelatiegeschenken",
    companyName: "PrimaRelatiegeschenken.nl",
    logoUrl: "https://www.primarelatiegeschenken.nl/uploads/editor/1552911837_1447161404_logorelatiegeschenkne.jpg",
    accentColor: "#dc2626",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  gifthouse: {
    id: "gifthouse",
    companyName: "Gifthouse",
    logoUrl: "https://a2c43a03dd55070814a6-46b5c8367ce2482c24c29c66399b8bc9.ssl.cf1.rackcdn.com/1749818896_mobile-logo-gifthouse.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  rochus: {
    id: "rochus",
    companyName: "Rochus Relatiegeschenken",
    logoUrl: "https://www.rochusrelatiegeschenken.nl/app/uploads/2015/07/rochus.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  koster: {
    id: "koster",
    companyName: "Koster Special Gifts",
    logoUrl: "https://www.koster-specialgifts.nl/mvc/public/frontend/images/site-logo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Discovered logo URL was a banner image, not their main logo → name fallback.
  hsg: {
    id: "hsg",
    companyName: "HSG Nederland",
    logoUrl: null,
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  ideeplus: {
    id: "ideeplus",
    companyName: "IdeePlus",
    logoUrl: "https://www.ideeplus.nl/wp-content/uploads/2017/02/logo-ideeplus.png",
    accentColor: "#ff6b35",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  giftsdirect: {
    id: "giftsdirect",
    companyName: "GiftsDirect.nl",
    logoUrl: "https://www.giftsdirect.nl/.wh/ea/uc/i7302551e0103d700000056b9fa03bdf16ead6686e5f40301c000/logo-giftsdirect.png",
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Site responded 403 to the branding fetch → name fallback.
  leukbv: {
    id: "leukbv",
    companyName: "Leuk BV",
    logoUrl: "https://leukbv.nl/wp-content/uploads/Logo-Leuk.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  presention: {
    id: "presention",
    companyName: "PreSention",
    logoUrl: "https://presention.nl/wp-content/uploads/2020/11/logo-presention-horizontaal-rgb-1.svg",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Only a white-on-transparent logo variant ("Wit") was available → name fallback.
  batach: {
    id: "batach",
    companyName: "Batach Relatiegeschenken",
    logoUrl: "https://catalogus.batach.nl/uploads/Logo-Batach-Relatiegeschenken-Wit.svg",
    logoInvert: true,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  morethangifts: {
    id: "morethangifts",
    companyName: "More Than Gifts",
    logoUrl: "https://www.morethangifts.nl/wp-content/uploads/2022/11/cropped-cropped-cropped-MTG-logo.webp",
    accentColor: "#16a34a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Site responded 403 to the branding fetch → name fallback.
  stravers: {
    id: "stravers",
    companyName: "Stravers",
    logoUrl: "https://www.stravers.nl/media/logo/stores/3/Stravers_Logo.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Discovered logo URL was the PPP "keurmerk" badge, not the company logo →
  // name fallback.
  forallpromotions: {
    id: "forallpromotions",
    companyName: "For All Promotions",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  promohouse: {
    id: "promohouse",
    companyName: "Promohouse",
    logoUrl: "https://8057d2046379a70b68f8-6718033aedfc0652b1ae234d1d4d0d08.ssl.cf1.rackcdn.com/1702475210_promohouse_mobile.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  promoworld: {
    id: "promoworld",
    companyName: "Promoworld Relatiegeschenken",
    logoUrl: "https://promoworld.nl/media/image/6c/bf/3d/promoworld1.png",
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // ── Wave 6 batch ────────────────────────────────────────────────────────
  // Same defaults: Art + Jersey off, email omitted (IZY only), STD_STAFFEL.
  // Skipped: compacon.com — same company as the existing `compacon` entry (.nl).

  thomassengifts: {
    id: "thomassengifts",
    companyName: "Thomassen Gifts",
    logoUrl: "https://www.thomassengifts.nl/images/logo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Available logo was the "wit" (white) variant → name fallback.
  aboriginal: {
    id: "aboriginal",
    companyName: "Aboriginal",
    logoUrl: "https://www.aboriginal.nl/assets/files/2021-logo-aboriginal-wit.png",
    logoInvert: true,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  cadeaukompas: {
    id: "cadeaukompas",
    companyName: "CadeauKompas",
    logoUrl: "https://cadeaukompas.nl/wp-content/uploads/2021/03/logo-Cadeau-Kompas-rood-goud-1.png",
    accentColor: "#b91c1c",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  kadoburo: {
    id: "kadoburo",
    companyName: "Kadoburo",
    logoUrl: "https://kadoburo.nl/wp-content/uploads/2022/11/logo.png",
    accentColor: "#ff6b35",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  kopenschouders: {
    id: "kopenschouders",
    companyName: "Kop & Schouders",
    logoUrl: "https://kopenschouders.nl/wp-content/uploads/2023/03/kopeschouderslogo.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  limegifts: {
    id: "limegifts",
    companyName: "Limegifts",
    logoUrl: "https://www.limegifts.nl/images/limegifts.jpg",
    accentColor: "#65a30d",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  zakengeschenken: {
    id: "zakengeschenken",
    companyName: "Zakengeschenken.nl",
    logoUrl: "https://www.zakengeschenken.nl/uploads/editor/1660654682_1472741307_Zakengeschenken-logo.png",
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  lifeisagift: {
    id: "lifeisagift",
    companyName: "Life is a Gift",
    logoUrl: "https://cdn.webshopapp.com/shops/315016/themes/118088/v/2434393/assets/logo.png?20241001095238",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  pollpromotion: {
    id: "pollpromotion",
    companyName: "Poll Promotion",
    logoUrl: "https://www.pollpromotion.nl/assets/files/logo-ss-3.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Available logo was the "white" variant → name fallback in their teal accent.
  maatkado: {
    id: "maatkado",
    companyName: "Maatkado",
    // Use the colour variant (the white one would need CSS invert and would
    // flip any non-white accents).
    logoUrl: "https://www.maatkado.nl/uploads/editor/1718100498_maatkado-logo.png",
    accentColor: "#0d9488",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  cow: {
    id: "cow",
    companyName: "the COW company",
    logoUrl: "https://cow.nl/wp-content/uploads/2025/05/cowlogo-multishop.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No logo URL exposed in the page HTML → name fallback.
  "12trade": {
    id: "12trade",
    companyName: "12TRADE",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  kusterspromogifts: {
    id: "kusterspromogifts",
    companyName: "Kusters Promogifts",
    logoUrl: "https://kusterspromogifts.nl/wp-content/uploads/2021/07/logo-150x150-1.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  iqp: {
    id: "iqp",
    companyName: "IQP",
    logoUrl: "https://www.iqp.nl/images/logo/iqp-logo.svg",
    accentColor: "#16a34a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No img-src logo on the homepage — site uses a text-based identity →
  // name fallback in their green accent.
  "p-p": {
    id: "p-p",
    companyName: "P&P",
    logoUrl: null,
    accentColor: "#16a34a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  vanpol: {
    id: "vanpol",
    companyName: "Vanpol",
    logoUrl: "https://vanpol.nl/wp-content/uploads/2022/06/vanpol-logo.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  laparada: {
    id: "laparada",
    companyName: "La Parada",
    logoUrl: "https://42785ac46dcce6c04cee-ab48781f499fe0f9e766d5346b159e2d.ssl.cf1.rackcdn.com/1687504348_mobile-logo-lp.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  hedi: {
    id: "hedi",
    companyName: "Hedi International",
    logoUrl: "https://c64e3711e325331d78e4-fc81a618ce47e41b481141a55278da9f.ssl.cf1.rackcdn.com/1718202685_hedi-logo-mobile.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  promofessionals: {
    id: "promofessionals",
    companyName: "Promofessionals",
    logoUrl: "https://promofessionals.nl/wp-content/uploads/2025/12/Promofessionals-logo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  snelbraber: {
    id: "snelbraber",
    companyName: "Snel Braber",
    logoUrl: "https://www.snelbraber.nl/uploads/editor/1505219177_1503485598_logo.png",
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // ── Wave 7 batch ────────────────────────────────────────────────────────
  // Same defaults: Art + Jersey off, email omitted (IZY only), STD_STAFFEL.
  // Skipped from source list:
  //   - multigift.nl (same company as existing `multigift` from multigift.com)
  //   - socialgoodz.nl (already added in wave 5)
  //   - lamoustache.nl (already added in wave 4)

  strikenstralend: {
    id: "strikenstralend",
    companyName: "Strik & Stralend",
    logoUrl: "https://www.strikenstralend.nl/cdn/shop/files/Logo_Strik_Stralend.png?v=1715171372&width=600",
    accentColor: "#65a30d",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  marvon: {
    id: "marvon",
    companyName: "Marvon",
    logoUrl: "https://marvon.nl/wp-content/themes/marvon/images/logo.svg",
    accentColor: "#0d9488",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  topgiving: {
    id: "topgiving",
    companyName: "Topgiving",
    logoUrl: "https://www.topgiving.nl/templates/prem_2017/img/logo_topgiving.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  relatiegeschenken: {
    id: "relatiegeschenken",
    companyName: "Relatiegeschenken.nl",
    logoUrl: "https://www.relatiegeschenken.nl/img/DN2g9Bsmep2O34wO04ENQBpIoCXBB5Qub5sWyX7YikA/resize:fit:0:0/aHR0cHM6Ly93d3cucmVsYXRpZWdlc2NoZW5rZW4ubmwvc3RhdGljL3ZlcnNpb24yMDI2MDUyMTEwMTYzNS9mcm9udGVuZC9WZW5kaWMvaHl2YS1yZWxhdGllZ2VzY2hlbmtlbi9ubF9OTC9pbWFnZXMvbG9nby5zdmc.svg",
    accentColor: "#0d9488",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  bgpromotions: {
    id: "bgpromotions",
    companyName: "BG Workwear & Gifts",
    logoUrl: "https://bgpromotions.nl/media/3c/6a/c4/1773058761/logo%20bg%202026.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "11cideas": {
    id: "11cideas",
    companyName: "11C Ideas",
    logoUrl: "https://11cideas.com/media/38/2a/dd/1741855864/11c-2-Color-TekstsJZrAwaCNlnDS.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  zintuig: {
    id: "zintuig",
    companyName: "Zintuig",
    logoUrl: "https://www.zintuig.nl/website_logos/1/logo_zintuig-relatiegeschenken%20en%20drukkerij.svg",
    accentColor: "#0284c7",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  sierhuis: {
    id: "sierhuis",
    companyName: "Sierhuis",
    logoUrl: "https://sierhuis.nl/wp-content/themes/raadhuis/dist/assets/img/sierhuis_logo.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No img-src logo on the homepage → name fallback.
  sandersgifts: {
    id: "sandersgifts",
    companyName: "Sanders Gifts",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  joinz: {
    id: "joinz",
    companyName: "Joinz Relatiegeschenken",
    logoUrl: "https://joinz.nl/bundles/joinztheme/img/svg/logo-joinz.svg?1741682789",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  easie: {
    id: "easie",
    companyName: "Easie",
    logoUrl: "https://www.easie.nl/wp-content/uploads/2022/06/easie_logo_2022.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  carmako: {
    id: "carmako",
    companyName: "Carmako",
    logoUrl: "https://carmako-relatiegeschenken.nl/uploads/logosvgcarmako.svg",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No img-src logo on the homepage → name fallback.
  kuperrelatiegeschenken: {
    id: "kuperrelatiegeschenken",
    companyName: "Kuper Relatiegeschenken",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  mprelatiegeschenken: {
    id: "mprelatiegeschenken",
    companyName: "MP Relatiegeschenken",
    logoUrl: "https://cms.mprelatiegeschenken.nl/assets/general/logo.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  promotijgers: {
    id: "promotijgers",
    companyName: "Promotijgers",
    logoUrl: "https://www.promotijgers.nl/bundles/promotijgers/assets/img/logo-promotijgers.svg",
    accentColor: "#ff6b35",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Available logo was the "wit" (white) variant → name fallback in their blue accent.
  bamq: {
    id: "bamq",
    companyName: "BAMQ",
    logoUrl: "https://bamq.nl/wp-content/uploads/2024/08/Logo_BAMQ_wit_v2.png",
    logoInvert: true,
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "ddg-promotions": {
    id: "ddg-promotions",
    companyName: "DDG Promotions",
    logoUrl: "https://ddg-promotions.com/wp-content/uploads/2025/09/Website-23.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  koornneef: {
    id: "koornneef",
    companyName: "Koornneef",
    logoUrl: "https://koornneef.nl/wp-content/uploads/2020/05/Koornneef-LOGO.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No img-src logo on the homepage → name fallback.
  "pps-nuenen": {
    id: "pps-nuenen",
    companyName: "PPS Nuenen",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  justpromo: {
    id: "justpromo",
    companyName: "Justpromo",
    logoUrl: "https://justpromo.nl/media/83/93/78/1732608537/Webp-net-resizeimageQzstkY8B5xheD.png",
    accentColor: "#ff6b35",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // ── Wave 8 batch ────────────────────────────────────────────────────────
  // Same defaults: Art + Jersey off, email omitted (IZY only), STD_STAFFEL.

  presentforgifts: {
    id: "presentforgifts",
    companyName: "Present! for Gifts",
    logoUrl: "https://static.wixstatic.com/media/711bb0_6474a15677fd424e9d67ada7ea8c92ca~mv2.png/v1/fill/w_289,h_121,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/711bb0_6474a15677fd424e9d67ada7ea8c92ca~mv2.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  progive: {
    id: "progive",
    companyName: "Progive",
    logoUrl: "https://progive.nl/wp-content/uploads/2023/02/Logo-Progive-EPS_.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  keymerch: {
    id: "keymerch",
    companyName: "KeyMerch",
    logoUrl: "https://cdn.prod.website-files.com/66d9a36f8955b4e690fa2c92/66daa94a001906f240341dd8_logo_type.svg",
    accentColor: "#16a34a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Discovered logo URL returned 404 → name fallback in their teal accent.
  igopromo: {
    id: "igopromo",
    companyName: "IGO Promo",
    logoUrl: "/assets/images/igopromo-logo.png",
    accentColor: "#0d9488",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  grabagift: {
    id: "grabagift",
    companyName: "Grab a Gift",
    logoUrl: "/assets/images/grabagift-logo.png",
    accentColor: "#ff6b35",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  one2gifts: {
    id: "one2gifts",
    companyName: "One2gifts",
    logoUrl: "https://one2gifts.nl/wp-content/uploads/2024/04/One2gifts-Premiums-en-Relatiegeschenken-sinds-2008.webp",
    accentColor: "#0d9488",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  frezon: {
    id: "frezon",
    companyName: "FREZON",
    logoUrl: "https://frezon.nl/content/uploads/2025/07/wfefvf.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Site refused the connection (ECONNREFUSED) → name fallback.
  youhoo: {
    id: "youhoo",
    companyName: "Youhoo",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  degeneughten: {
    id: "degeneughten",
    companyName: "De Geneughten",
    logoUrl: "https://www.degeneughten.nl/media/a3/13/ed/1741351547/Logo%20De%20Geneughten%20zwart.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  doegoods: {
    id: "doegoods",
    companyName: "DOEGOODS",
    logoUrl: "https://doegoods.nl/wp-content/uploads/2023/05/logo-doegoods.svg",
    accentColor: "#16a34a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No img-src logo on the homepage → name fallback in a sustainability-green accent.
  giftswithimpact: {
    id: "giftswithimpact",
    companyName: "Gifts with Impact",
    logoUrl: null,
    accentColor: "#16a34a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Discovered logo URL returned 404 → name fallback in their blue accent.
  b55: {
    id: "b55",
    companyName: "B55",
    logoUrl: "https://www.b55.nl/uploads/editor/1761663935_b55-logo.png",
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Logo on the site is a data-URI placeholder → name fallback.
  kerstmakelaar: {
    id: "kerstmakelaar",
    companyName: "Kerstmakelaar",
    logoUrl: "https://kerstmakelaar.nl/wp-content/uploads/2024/03/kerstpakketten-cadeau-logo-makelaar.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  kerstmania: {
    id: "kerstmania",
    companyName: "Kerstmania",
    logoUrl: "https://kerstmania.nl/wp-content/uploads/2022/08/kerstmania_logo_FC-1-svg.svg",
    accentColor: "#166534",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  bedankjes: {
    id: "bedankjes",
    companyName: "Bedankjes.nl",
    logoUrl: "https://bedankjes.nl/cdn/shop/files/7c37so0hjwk6byhr78p183jd1m9f.png?v=1775021983",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  aditio: {
    id: "aditio",
    companyName: "Aditio Gifts",
    logoUrl: "https://www.aditio-gifts.nl/media/71/c5/44/1716464678/logo-desktop.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "sasla-concepts": {
    id: "sasla-concepts",
    companyName: "Sasla Concepts",
    logoUrl: "https://primary.jwwb.nl/public/u/o/p/temp-ldfkcxsoottaonntshwo/sasla_concepts_logo_2024-removebg-preview-high.png?enable-io=true&enable=upscale&height=70",
    accentColor: "#16a34a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Site fetch failed with a TLS certificate error → name fallback.
  hokra: {
    id: "hokra",
    companyName: "Hokra",
    logoUrl: "https://hokra.nl/wp-content/uploads/2021/06/logo-los-1.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Site responded 403 to the branding fetch → name fallback.
  attentives: {
    id: "attentives",
    companyName: "Attentives",
    logoUrl: "https://attentives.nl/wp-content/uploads/2022/08/Attentives-logo-FC-1-e1662045286732.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  wivapromotions: {
    id: "wivapromotions",
    companyName: "Wivapromotions",
    logoUrl: "https://wivapromotions.nl/lib/images/website/logo-wivapromotions.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // ── Wave 9 batch ────────────────────────────────────────────────────────
  // Same defaults: Art + Jersey off, email omitted (IZY only), STD_STAFFEL.

  greenmotion: {
    id: "greenmotion",
    companyName: "Greenmotion",
    logoUrl: "https://f6a1e7968e74dbe7db58-1ce3ae72ccbd299bcbc79de658e419e8.ssl.cf1.rackcdn.com/Greenmotion/design2023/Greenmotion-Logo-PayOff-RGB.svg",
    accentColor: "#16a34a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No img-src logo on the homepage → name fallback.
  promotionalz: {
    id: "promotionalz",
    companyName: "Promotionalz",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No img-src logo on the homepage → name fallback.
  "vg-geschenken": {
    id: "vg-geschenken",
    companyName: "VG-Geschenken",
    logoUrl: "https://vg-geschenken.nl/wp-content/uploads/2025/08/logo-outlined.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  secretgifters: {
    id: "secretgifters",
    companyName: "Secret Gifters",
    logoUrl: "https://secretgifters.nl/cdn/shop/files/66b104f0b99e54ac4cc4b42d_Sin_titulo-3.webp?v=1764425608&width=600",
    accentColor: "#0d9488",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Logos on the site are base64 data URIs → name fallback.
  screenpromotion: {
    id: "screenpromotion",
    companyName: "Screen Promotion",
    logoUrl: "https://screenpromotion.nl/wp-content/uploads/2023/08/screen-logo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  gimmeconcepts: {
    id: "gimmeconcepts",
    companyName: "Gimmeconcepts",
    logoUrl: "https://static.wixstatic.com/media/ecff7b_c523482bdad6411f9d63cf9ac721bca9~mv2.png/v1/fill/w_204,h_84,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Gimmeconcepts%20logo.png",
    accentColor: "#0d9488",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  inofuit: {
    id: "inofuit",
    companyName: "INofUIT",
    logoUrl: "https://inofuit.nl/wp-content/uploads/2023/11/LogoInofUit.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  golfrebels: {
    id: "golfrebels",
    companyName: "GolfRebels",
    logoUrl: "https://golfrebels.com/cdn/shop/files/Weblogo_Golfrebels.png?v=1697203301&width=225",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No direct logo URL exposed on the homepage → name fallback.
  "promo-xl": {
    id: "promo-xl",
    companyName: "PromoXL",
    logoUrl: null,
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Logos on the site are base64 data URIs → name fallback.
  buropromo: {
    id: "buropromo",
    companyName: "buropromo",
    logoUrl: "https://www.buropromo.nl/wp-content/uploads/2023/09/logo-buro-60.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  interimage: {
    id: "interimage",
    companyName: "Interimage",
    logoUrl: "https://interimage.com/wp-content/uploads/2023/05/cropped-Interimage_Logos_RGB_Orangje.png",
    accentColor: "#ea580c",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Available logo was the "wit" (white) variant → name fallback.
  "man-d-sign": {
    id: "man-d-sign",
    companyName: "MAN-D-SIGN",
    logoUrl: "https://man-d-sign.nl/wp-content/uploads/2023/10/MAN-D-SIGN-LOGO-wit.png",
    logoInvert: true,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  premiumconcepts: {
    id: "premiumconcepts",
    companyName: "Premium Concepts",
    logoUrl: "https://premiumconcepts.nl/wp-content/uploads/2020/02/logo-Premium-Concepts.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  promokopen: {
    id: "promokopen",
    companyName: "Promokopen",
    logoUrl: "https://www.promokopen.nl/media/5a/f2/64/1725890188/Logo_afgeronde_rand.png",
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  amigopromotion: {
    id: "amigopromotion",
    companyName: "Amigo Promotion",
    logoUrl: "https://dxz3nml5p1dnr.cloudfront.net/f7a92a58-d002-4b50-9be1-356b666d0d30/images/logo/amigo-promotion-logo.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  orangesmile: {
    id: "orangesmile",
    companyName: "OrangeSmile",
    logoUrl: "https://orangesmile.nl/uploads/editor/1645532615_1613992971_1554887282_orangesmile_logo.png",
    accentColor: "#f97316",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No img-src logo found in the page HTML → name fallback in their blue accent.
  helloprint: {
    id: "helloprint",
    companyName: "HelloPrint",
    logoUrl: "https://images.ctfassets.net/wm1n7oady8a5/7uTNXDiVdg4IhMLX2Ca76q/aa638209ce19626a76fceb2336f969d1/Helloprint-logo-2.png?w=512",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Available logo was the "wit" (white) variant → name fallback.
  bigsmilegroep: {
    id: "bigsmilegroep",
    companyName: "BIGsmilegroep",
    logoUrl: "https://www.bigsmilegroep.nl/uploads/1/1/7/3/117348067/logo-wit-pgn-jun-2021.png",
    logoInvert: true,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  fourtynine: {
    id: "fourtynine",
    companyName: "FourtyNine",
    logoUrl: "https://www.fourtynine.nl/media/67/7f/be/1751443726/logoFN2.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Available logo was the "WIT" (white) variant → name fallback in their blue accent.
  crystalpromotions: {
    id: "crystalpromotions",
    companyName: "Crystal Promotions",
    // Use the colour variant (CP_LOGO_23.png) — the "WIT" white variant
    // combined with CSS invert would flip the blue accent to red.
    logoUrl: "https://crystalpromotions.nl/wp-content/uploads/2023/10/CP_LOGO_23.png",
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // ── Wave 10 batch (final) ───────────────────────────────────────────────
  // Same defaults: Art + Jersey off, email omitted (IZY only), STD_STAFFEL.
  // Skipped from source list:
  //   - staples.nl (large general retailer, not a promo reseller)
  //   - 123inkt.nl (printer-cartridge retailer, not a promo reseller)

  grabaweb: {
    id: "grabaweb",
    companyName: "Grab a Web",
    logoUrl: "https://grabaweb.nl/wp-content/themes/grabaweb2020/images/logo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "d-d-international": {
    id: "d-d-international",
    companyName: "D&D International",
    logoUrl: "https://d-d-international.com/wp-content/themes/bnftheme07/img/D&D-international-logo-groen.svg",
    accentColor: "#16a34a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  louterpromotions: {
    id: "louterpromotions",
    companyName: "Louter Promotions",
    logoUrl: "https://louterpromotions.nl/media/62/6e/29/1737550290/LP_LOGO.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Site fetch failed with a TLS certificate error → name fallback.
  schepersgeschenken: {
    id: "schepersgeschenken",
    companyName: "Schepers Geschenken",
    logoUrl: "https://schepersgeschenken.nl/wp-content/uploads/2025/01/schepers_logo.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Available logo was the white-on-transparent variant → name fallback.
  brandpremiums: {
    id: "brandpremiums",
    companyName: "BrandPremiums",
    logoUrl: "https://brandpremiums.com/wp-content/uploads/2023/11/BP_logo_wit_achtergrond_transparant-300x18.png",
    logoInvert: true,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Site responded 403 to the branding fetch → name fallback.
  eventgoodz: {
    id: "eventgoodz",
    companyName: "Eventgoodz",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  promocompany: {
    id: "promocompany",
    companyName: "PromoCompany",
    logoUrl: "https://32f147cef9c043b7cc67-dfe4789395f70785c3aed2aa4b0a83c4.ssl.cf1.rackcdn.com/1758100460_promocompany-logo-mobile.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  giftsbyliz: {
    id: "giftsbyliz",
    companyName: "GIFTS by Liz",
    logoUrl: "https://www.giftsbyliz.com/wp-content/uploads/2023/12/Logo_Gifts_V2-1.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  promo: {
    id: "promo",
    companyName: "Promo.nl",
    logoUrl: "https://www.promo.nl/wp-content/uploads/2019/05/logo_promo.nl_-156x53.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  allgolf: {
    id: "allgolf",
    companyName: "Allgolf",
    logoUrl: "https://www.allgolf.nl/wp-content/uploads/2022/02/allgolf-logo-1.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  vdvenbusinessgifts: {
    id: "vdvenbusinessgifts",
    companyName: "Vd Ven Business Gifts",
    logoUrl: "https://www.vdvenbusinessgifts.nl/wp-content/themes/Untitled/images/81ecfe3ca71e4a46bf1340c6a759e878_Ven_bg_liggend_3165_382_C.png",
    accentColor: "#1e3a8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "erikkuiper-relatiegeschenken": {
    id: "erikkuiper-relatiegeschenken",
    companyName: "Erik Kuiper Relatiegeschenken",
    logoUrl: "https://www.erikkuiper-relatiegeschenken.nl/media/7b/38/a2/1736159466/Logo-EKRB-op-wit-2023.png",
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  perrypromotions: {
    id: "perrypromotions",
    companyName: "Perry Promotions",
    logoUrl: "https://perrypromotions.nl/wp-content/themes/perrypromotions/assets/images/logo/logo.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No img-src logo on the homepage → name fallback.
  mondaymerch: {
    id: "mondaymerch",
    companyName: "Monday Merch",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  loopper: {
    id: "loopper",
    companyName: "Loopper",
    logoUrl: "https://www.loopper.com/storage/logo/Loopper_logo_default.svg",
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Available logo was the "wit" (white) variant → name fallback in their teal accent.
  "shine-marketing": {
    id: "shine-marketing",
    companyName: "Shine Marketing & more",
    logoUrl: "https://shine-marketing.nl/wp-content/uploads/2024/09/cropped-Shine-Marketing-More-Wit-125x101.png",
    logoInvert: true,
    accentColor: "#0d9488",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Available logo appears to be a white-on-dark variant → name fallback.
  markado: {
    id: "markado",
    companyName: "Markado",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  blinckk: {
    id: "blinckk",
    companyName: "Blinckk",
    logoUrl: "https://www.blinckk.nl/cdn/shop/files/logo_7429897c-c719-4457-b91d-da480d2264b2.png?v=1751875439&width=600",
    accentColor: "#0d9488",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  custom95: {
    id: "custom95",
    companyName: "Custom95",
    logoUrl: "https://cdn.prod.website-files.com/68ece4e78328b7f0781019da/68eceb2d199e7f756fbe9ad5_Company%20Logo.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "sme-concepts": {
    id: "sme-concepts",
    companyName: "SME Concepts",
    logoUrl: "https://sme-concepts.nl/wp-content/themes/sme-concepts-v1/assets/img/logo.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // No direct logo URL exposed on the homepage → name fallback.
  "q-promotions": {
    id: "q-promotions",
    companyName: "Q-Promotions",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  tempoprint: {
    id: "tempoprint",
    companyName: "Tempo Print",
    logoUrl: "https://tempoprint.nl/img/images/tempoprint_logo.jpg",
    accentColor: "#1d4ed8",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Available logo appears to be a white-on-dark variant → name fallback in their green accent.
  ecoconceptgroup: {
    id: "ecoconceptgroup",
    companyName: "Eco Concept Group",
    logoUrl: null,
    accentColor: "#16a34a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Site responded 403 to the branding fetch → name fallback.
  maxilia: {
    id: "maxilia",
    companyName: "Maxilia",
    logoUrl: "https://media.maxilia.eu/public/media/f5/3f/9d/1720516226/Maxilia%20logo.svg?ts=1720516226",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  giftsandnature: {
    id: "giftsandnature",
    companyName: "Gifts and Nature",
    logoUrl: "/assets/images/giftsandnature-logo.jpg",
    accentColor: "#7c3aed",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // ── Wave 10 follow-up: large retailers added on request ────────────────

  // staples.nl returned 403 to the branding fetch → name fallback. Their well-
  // known brand colour is red.
  staples: {
    id: "staples",
    companyName: "Staples",
    logoUrl: "https://staples.nl/wp-content/themes/123zakelijk/media/images/spls_logo_red_new.png",
    accentColor: "#cc0000",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "123inkt": {
    id: "123inkt",
    companyName: "123inkt.nl",
    logoUrl: "https://www.123inkt.nl/images/homepage/123inkt_nl_logo.png",
    accentColor: "#f97316",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Demo / reference reseller — used for testing the white-label flow.
  demo: {
    id: "demo",
    companyName: "AquaForm",
    logoUrl: null,
    accentColor: "#0d9488", // teal
    email: "demo-reseller@example.com",
    stripPrefix: "IZY ",
    // Example: this reseller has City Map + Brand disabled.
    features: { map: true, brand: false },
    pricing: {
      "IZY Bottle": {
        retail: 34.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 24.99 },
          { label: "100-249", min: 100, max: 249, price: 23.49 },
          { label: "250-499", min: 250, max: 499, price: 22.49 },
          { label: "500-999", min: 500, max: 999, price: 21.49 },
        ],
      },
      "IZY Travel Bottle": {
        retail: 39.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 28.99 },
          { label: "100-249", min: 100, max: 249, price: 27.99 },
          { label: "250-499", min: 250, max: 499, price: 26.99 },
          { label: "500-999", min: 500, max: 999, price: 25.99 },
        ],
      },
      "IZY Mug": {
        retail: 34.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 24.99 },
          { label: "100-249", min: 100, max: 249, price: 23.49 },
          { label: "250-499", min: 250, max: 499, price: 22.49 },
          { label: "500-999", min: 500, max: 999, price: 21.49 },
        ],
      },
      "IZY Tumbler": {
        retail: 37.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 26.99 },
          { label: "100-249", min: 100, max: 249, price: 25.99 },
          { label: "250-499", min: 250, max: 499, price: 24.99 },
          { label: "500-999", min: 500, max: 999, price: 23.99 },
        ],
      },
    },
  },

  // ─── EU resellers (added 2026-06-02 from Google Sheet, 192 entries) ─────────
  // Logos + accent colours auto-extracted from each homepage; review individual
  // entries via /admin/resellers and tweak where the fallback was wrong.
  // Pricing defaults to STD_STAFFEL until the reseller confirms their own prices.
  "10mwomen": {
    id: "10mwomen",
    companyName: "10 Million Women",
    logoUrl: "https://www.10mwomen.com/cdn/shop/files/10MW_Logo_A.png?crop=center&height=125&v=1727360891&width=620",
    accentColor: "#14283c",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "1visionprint": {
    id: "1visionprint",
    companyName: "1Vision Print",
    logoUrl: "https://www.1visionprint.co.uk/Themes/Nitro/Content/img/bpma-logo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "1worldprint": {
    id: "1worldprint",
    companyName: "1WorldPrint",
    logoUrl: "https://www.google.com/s2/favicons?domain=1worldprint.co.uk&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "7active": {
    id: "7active",
    companyName: "7Active UK",
    logoUrl: "https://www.google.com/s2/favicons?domain=7active.co.uk&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "abiszet-werbung": {
    id: "abiszet-werbung",
    companyName: "ABISZET-Werbung",
    logoUrl: "https://www.google.com/s2/favicons?domain=abiszet-werbung.de&sz=128",
    accentColor: "#0866ff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "acorn-printing": {
    id: "acorn-printing",
    companyName: "Acorn Printing Services Ltd",
    logoUrl: "https://www.acorn-printing.co.uk/rshared/ssc/i/riq/5415828/400/120/t/0/0/logo.png",
    accentColor: "#2d4156",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "acrobatpromotions": {
    id: "acrobatpromotions",
    companyName: "ACROBAT PROMOTIONS LIMITED",
    logoUrl: "https://pinpoint-production-bucket.s3.amazonaws.com/website-settings/December2021/pttLUsqtmNcjV4gsVy1s.png",
    accentColor: "#008393",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "activate-branding": {
    id: "activate-branding",
    companyName: "Activate Branding",
    logoUrl: "https://activate-branding.com/cdn/shop/files/AB---Logo-Animation.gif?v=1697121474&width=786",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "adaptbranding": {
    id: "adaptbranding",
    companyName: "Adapt Branding Limited",
    logoUrl: "https://adaptbranding.co.uk/wp-content/uploads/2023/11/favicon.png",
    accentColor: "#9f8f81",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "agproducts": {
    id: "agproducts",
    companyName: "AG Promotional Products",
    logoUrl: "https://pinpoint-production-bucket.s3.amazonaws.com/website-settings/May2022/E0QEOLQ8t0JNaab6XXog.jpg",
    accentColor: "#1b6cb0",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "allwag": {
    id: "allwag",
    companyName: "Allwag Promotions",
    logoUrl: "https://www.allwag.co.uk/images/top_logo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "amazingpm": {
    id: "amazingpm",
    companyName: "Amazing Promotional Merchandise Limited",
    logoUrl: "https://www.amazingpm.co.uk/wp-content/uploads/2020/04/cropped-am1-180x180.png",
    accentColor: "#2ea3f2",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "apaya": {
    id: "apaya",
    companyName: "Apaya",
    logoUrl: "/assets/images/apaya-logo.jpg",
    accentColor: "#1a1a1a",
    email: "a.schlederer@apaya.ag",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "applegreenpromotions": {
    id: "applegreenpromotions",
    companyName: "Applegreen Promotions",
    logoUrl: "https://www.applegreenpromotions.co.uk/route/images/logo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "aquatint": {
    id: "aquatint",
    companyName: "Aquatint",
    logoUrl: "https://www.aquatint.co.uk/wp-content/uploads/2020/03/logo-c680bab1d57fd5ad451f3727adc2208633e2676162060c6cdef6ff47379909f1.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "arcadiaonline": {
    id: "arcadiaonline",
    companyName: "Arcadia Branded Merchandise",
    logoUrl: "https://arcadiaonline.co.uk/media/logo/stores/1/Arc_New_Logo_2.png",
    accentColor: "#0a3d54",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "artsurprise": {
    id: "artsurprise",
    companyName: "Art Surprise",
    logoUrl: "https://artsurprise.de/media/image/eb/e6/7d/as_fav_icon_2.jpg",
    accentColor: "#36b7a5",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "asabrands": {
    id: "asabrands",
    companyName: "ASA Brands",
    logoUrl: "https://www.asabrands.ie/wp-content/uploads/2021/08/asa-1.png",
    accentColor: "#f5f5f5",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "asapuk": {
    id: "asapuk",
    companyName: "ASAP UK LTD",
    logoUrl: "https://www.asapuk.net/wp-content/themes/asap/furniture/images/photos/logo_panel_1.gif",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "asp-promotions": {
    id: "asp-promotions",
    companyName: "ASP Promotions Limited",
    logoUrl: "https://www.asp-promotions.co.uk/wp-content/uploads/2022/09/cropped-A-for-ASP-Fac-1-180x180.png",
    accentColor: "#7ebec5",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "aspectmerchandise": {
    id: "aspectmerchandise",
    companyName: "Aspect CPM",
    logoUrl: "https://www.aspectmerchandise.co.uk/wp-content/uploads/2016/07/cropped-Aspect-Site-Identity-300x300.png",
    accentColor: "#009ee2",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "aspinline": {
    id: "aspinline",
    companyName: "ASPINLINE",
    logoUrl: "https://www.aspinline.co.uk/static/version1775032163/frontend/Vortex/aspinline/en_GB/images/logo.svg",
    accentColor: "#40b9e3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "ateliers-ame": {
    id: "ateliers-ame",
    companyName: "Ateliers AME",
    logoUrl: "https://www.ateliers-ame.com/favicons/apple-touch-icon.png",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "badgerdesign": {
    id: "badgerdesign",
    companyName: "Badger Design Ltd",
    logoUrl: "https://badgerdesign.com/wp-content/uploads/2021/06/logo-white.png",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "baylissprint": {
    id: "baylissprint",
    companyName: "Bayliss Print",
    logoUrl: "https://www.baylissprint.co.uk/index-files/5aebfd7dd0dbd4fdac500ddd_linkedin-logo.png",
    accentColor: "#427fed",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "bdp": {
    id: "bdp",
    companyName: "BDP Wales",
    logoUrl: "https://www.bdp.wales/wp-content/uploads/2024/07/cropped-Untitled-design-180x180.png",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "2becom": {
    id: "2becom",
    companyName: "BECOM",
    logoUrl: "https://static.wixstatic.com/media/cf3d19_f5ed2995e2254bc7a383e07d796149c0~mv2.png/v1/crop/x_1,y_0,w_459,h_391/fill/w_114,h_97,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/becom_logo_cmjn.png",
    accentColor: "#116dff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "beechleighpromotions": {
    id: "beechleighpromotions",
    companyName: "Beechleigh Promotions Limited",
    logoUrl: "https://www.beechleighpromotions.com/wp-content/uploads/2026/03/cropped-Beechleigh-monogram_colour-flat_rgb_2-180x180.png",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "bequestrian": {
    id: "bequestrian",
    companyName: "Bequestrian",
    logoUrl: "https://bequestrian.uk/wp-content/uploads/2019/12/cropped-BEQ_logo_blue_400-180x180.png",
    accentColor: "#75aa95",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "biblioproducts": {
    id: "biblioproducts",
    companyName: "Biblio Products Limited",
    logoUrl: "https://www.google.com/s2/favicons?domain=biblioproducts.com&sz=128",
    accentColor: "#cc0000",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "bidbi": {
    id: "bidbi",
    companyName: "BIDBI",
    logoUrl: "https://www.google.com/s2/favicons?domain=bidbi.co.uk&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "birchprint": {
    id: "birchprint",
    companyName: "Birch Print",
    logoUrl: "https://www.birchprint.co.uk/wp-content/uploads/2024/12/fav.webp",
    accentColor: "#153d8a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "blackdogdigital": {
    id: "blackdogdigital",
    companyName: "Blackdog Digital",
    logoUrl: "https://static.wixstatic.com/media/f674d1_f4ae79c97e1841f5b26b6dc2c3aa9ded%7Emv2.png/v1/fill/w_180%2Ch_180%2Clg_1%2Cusm_0.66_1.00_0.01/f674d1_f4ae79c97e1841f5b26b6dc2c3aa9ded%7Emv2.png",
    accentColor: "#116dff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "blueprintgb": {
    id: "blueprintgb",
    companyName: "Blueprint Creative Media",
    logoUrl: "https://static.wixstatic.com/media/c8f8e7_7f0d833d7c1a4eccb9f384f111760a04%7Emv2.png/v1/fill/w_180%2Ch_180%2Clg_1%2Cusm_0.66_1.00_0.01/c8f8e7_7f0d833d7c1a4eccb9f384f111760a04%7Emv2.png",
    accentColor: "#116dff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "boosters": {
    id: "boosters",
    companyName: "Boosters Limited",
    logoUrl: "https://boosters.co.uk/wp-content/uploads/2025/05/cropped-Boosters-Icon-1-180x180.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "brandndeliver": {
    id: "brandndeliver",
    companyName: "Brand n Deliver Ltd",
    logoUrl: "https://www.brandndeliver.co.uk/img/logo.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "brand-alchemists": {
    id: "brand-alchemists",
    companyName: "Brand Alchemists",
    logoUrl: "https://brand-alchemists.com/wp-content/uploads/2022/01/cropped-Brand-Alchemists-Site-Logo-512-x-512-White-3-180x180.png",
    accentColor: "#475569",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "brandelite": {
    id: "brandelite",
    companyName: "Brand Elite",
    logoUrl: "https://www.brandelite.co.uk/wp-content/uploads/2018/03/icon.jpg",
    accentColor: "#435085",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "branded4uk": {
    id: "branded4uk",
    companyName: "Branded4UK",
    logoUrl: "https://www.branded4uk.com/wp-content/uploads/2023/03/B4UKFav-_180.png",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "brandily": {
    id: "brandily",
    companyName: "Brandily UK",
    logoUrl: "https://www.brandily.co.uk/images/og-logo.jpg",
    accentColor: "#000000",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "brandkube": {
    id: "brandkube",
    companyName: "BrandKube Ltd",
    logoUrl: "https://img1.wsimg.com/isteam/ip/f4477cfd-3f90-47b7-88ee-753b6a500373/logo/0b87f226-c062-49a4-b489-89e9ca839566.png/:/rs=h:80,cg:true,m/qt=q:100/ll",
    accentColor: "#ec008c",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "brandtbedrijfskleding": {
    id: "brandtbedrijfskleding",
    companyName: "Brandt Bedrijfskleding",
    logoUrl: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/da508c04-b94d-4e0d-af9f-7506bf19fccb/id-preview-f41a4c7e--1d6e661a-a945-4cbe-b47e-606367a17761.lovable.app-1773242174623.png",
    accentColor: "#1a8a4a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "brightways": {
    id: "brightways",
    companyName: "Brightways",
    logoUrl: "http://www.brightway.co.uk/blog/wp-content/uploads/2015/08/logo-site.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "broadsworduk": {
    id: "broadsworduk",
    companyName: "Broadsword UK Ltd",
    logoUrl: "https://broadsworduk.co.uk/wp-content/uploads/2026/02/cropped-Broadsword-Badge-300dpi-RBG-180x180.jpg",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "bsquared": {
    id: "bsquared",
    companyName: "BSquared",
    logoUrl: "https://images.squarespace-cdn.com/content/v1/65bf268989bcf53dfe50c70d/cd67a0ba-aed1-4c0f-a6fa-73270b36ea63/Logo2.png?format=1500w",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "busheypromo": {
    id: "busheypromo",
    companyName: "Bushey Promotions",
    logoUrl: "https://www.busheypromo.com/images/d_161/ybc-logo-1584x396-1.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "buypromoproducts": {
    id: "buypromoproducts",
    companyName: "Buypromoproducts",
    logoUrl: "https://www.buypromoproducts.co.uk/images/apple-icon-57x57.png",
    accentColor: "#ff5e00",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "cadolino": {
    id: "cadolino",
    companyName: "cadolino.com",
    logoUrl: "https://cadolino-werbeartikel.ch/wp-content/uploads/2020/09/cropped-cropped-Masche-ok-180x180.png",
    accentColor: "#e5945f",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "cawthornes": {
    id: "cawthornes",
    companyName: "Cawthornes",
    logoUrl: "https://img1.wsimg.com/isteam/stock/nypRn5w",
    accentColor: "#9c1a21",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "chromagroup": {
    id: "chromagroup",
    companyName: "Chroma",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "clearwaypromo": {
    id: "clearwaypromo",
    companyName: "Clearway Sales",
    logoUrl: "https://www.clearwaypromo.co.uk/images/fav/apple-touch-icon.png",
    accentColor: "#ffffff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "clone-media": {
    id: "clone-media",
    companyName: "Clone",
    logoUrl: "https://clone-media.co.uk/wp-content/uploads/2023/04/clone-favicon.jpg",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "coprom": {
    id: "coprom",
    companyName: "Co Prom Ltd",
    logoUrl: "https://www.coprom.co.uk/wp-content/uploads/2023/05/coprom-fav-300x300.png",
    accentColor: "#f00480",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "coasttocoastdirect": {
    id: "coasttocoastdirect",
    companyName: "Coast to Coast Direct Ltd",
    logoUrl: "https://www.coasttocoastdirect.co.uk/ws_content/custom/logo.png?1780414903",
    accentColor: "#262d35",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "cbgltd": {
    id: "cbgltd",
    companyName: "Complete Business Gifts",
    logoUrl: null,
    accentColor: "#1e6665",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "csmgb": {
    id: "csmgb",
    companyName: "Complete Service Management Ltd",
    logoUrl: "https://static.wixstatic.com/media/b76b3e_394aa04e0aec486bb45664b096cb038e%7Emv2.png/v1/fill/w_180%2Ch_180%2Clg_1%2Cusm_0.66_1.00_0.01/b76b3e_394aa04e0aec486bb45664b096cb038e%7Emv2.png",
    accentColor: "#ff4040",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "conceptpm": {
    id: "conceptpm",
    companyName: "Concept Promotional Merchandise",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "daneswood": {
    id: "daneswood",
    companyName: "Daneswood",
    logoUrl: "https://cdn-ildpafg.nitrocdn.com/bjUtjjIdoRFxdntzsOpMfmzaTAXSWxqF/assets/images/optimized/rev-bed2130/daneswood.co.uk/wp-content/uploads/2024/04/Favicon.png",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "derriese": {
    id: "derriese",
    companyName: "DER RIESE",
    logoUrl: "https://www.derriese.de/_media/themes/1/layout/apple-touch-icon.png?version=20260415172438",
    accentColor: "#dffb02",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "designandpersonalise": {
    id: "designandpersonalise",
    companyName: "Design and Personalise",
    logoUrl: "https://www.designandpersonalise.co.uk/web/image/495-b2d7f399/SD4U.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "dialledin": {
    id: "dialledin",
    companyName: "Dialled In",
    logoUrl: "https://dialledin.com/wp-content/uploads/2026/04/cropped-cropped-dialled-in-logo-mark-full-color-rgb-900px-w-72ppi-180x180.png",
    accentColor: "#2ea3f2",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "didybranding": {
    id: "didybranding",
    companyName: "Didy Branding",
    logoUrl: "https://www.google.com/s2/favicons?domain=didybranding.com&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "die-werber": {
    id: "die-werber",
    companyName: "Die Werber",
    logoUrl: "https://die-werber.ch/wp-content/uploads/2025/08/die-werber-logo.png",
    accentColor: "#0ace90",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "dwdesignandprint": {
    id: "dwdesignandprint",
    companyName: "DW Design and Print",
    logoUrl: "https://www.dwdesignandprint.co.uk/wp-content/uploads/2022/03/cropped-favicon-32x32-RGB-01.png",
    accentColor: "#555d66",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "eicdirect": {
    id: "eicdirect",
    companyName: "EiC Direct",
    logoUrl: "https://eicdirect.co.uk/wp-content/uploads/2025/04/favi-300x300.webp",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "einkaufsclub": {
    id: "einkaufsclub",
    companyName: "einkaufsclub.ch",
    logoUrl: null,
    accentColor: "#2b98f0",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "evergreenbranding": {
    id: "evergreenbranding",
    companyName: "Evergreen Branding",
    logoUrl: "https://www.evergreenbranding.co.uk/wp-content/uploads/fbrfg/apple-touch-icon.png",
    accentColor: "#ffffff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "eliteoffsetprinters": {
    id: "eliteoffsetprinters",
    companyName: "Fred the Printer",
    logoUrl: "https://eliteoffsetprinters.co.uk/wp-content/uploads/2019/08/cropped-favicon-180x180.jpg",
    accentColor: "#eea11f",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "gba-stoeter": {
    id: "gba-stoeter",
    companyName: "gba Werbeartikel",
    logoUrl: "https://www.gba-stoeter.de/media/image/63/54/8c/favicon.png",
    accentColor: "#5a4c41",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "gemini-print": {
    id: "gemini-print",
    companyName: "Gemini Print Solutions",
    logoUrl: "https://gemini-print.co.uk/wp-content/uploads/2026/01/cropped-Icon_RGB-32x32-1.png",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "giftpoint": {
    id: "giftpoint",
    companyName: "Giftpoint",
    logoUrl: "https://giftpoint.co.uk/wp-content/uploads/2024/01/cropped-siteicon-180x180.jpg",
    accentColor: "#d9cec6",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "gifts": {
    id: "gifts",
    companyName: "gifts.ie",
    logoUrl: "https://a.gifts.ie/images/cache20260428A/favicon/apple-touch-icon.png",
    accentColor: "#bd0000",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "globalinnovations": {
    id: "globalinnovations",
    companyName: "Global Innovations Germany",
    logoUrl: "https://www.globalinnovations.de/apple-touch-icon.png",
    accentColor: "#ffffff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "globalpromotionalsolutions": {
    id: "globalpromotionalsolutions",
    companyName: "Global Promotional Solutions",
    logoUrl: "https://www.globalpromotionalsolutions.co.uk/wp-content/uploads/2024/03/GPS-icon-blue.svg",
    accentColor: "#485563",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "gorillapromo": {
    id: "gorillapromo",
    companyName: "Gorilla Promo",
    // Site is Cloudflare-gated; favicon fallback until they supply a real logo.
    logoUrl: "https://www.google.com/s2/favicons?domain=gorillapromo.co.uk&sz=128",
    accentColor: "#1a1a1a",
    email: "adam@gorillapromo.co.uk",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "halcyon-uk": {
    id: "halcyon-uk",
    companyName: "Halcyon Print Management",
    logoUrl: "https://www.halcyon-uk.com/_assets/logo-halcyon.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "handelsloewen": {
    id: "handelsloewen",
    companyName: "Handelslowen",
    logoUrl: "https://handelsloewen.de/templates/shaper_helixultimate/images/presets/preset1/logo.svg",
    accentColor: "#ff5e00",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "happysmile": {
    id: "happysmile",
    companyName: "Happysmile",
    logoUrl: "https://happysmile.co.uk/wp-content/uploads/2018/03/Happysmile-Favicon.png",
    accentColor: "#7ebec5",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "harrisprinters": {
    id: "harrisprinters",
    companyName: "Harris Printers",
    logoUrl: "https://www.google.com/s2/favicons?domain=harrisprinters.co.uk&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "hudsongroupltd": {
    id: "hudsongroupltd",
    companyName: "Hudson Group",
    logoUrl: "https://hudson-regent.transforms.svdcdn.com/production/assets/images/group-logo/logo_2020-11-04-122721.png?w=244&h=72&auto=compress%2Cformat&fit=crop&dm=1612976175&s=c6e833bb9d881f965e113d4b5a0cbcc2",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "hypebranding": {
    id: "hypebranding",
    companyName: "HYPE Branding",
    logoUrl: "https://images.squarespace-cdn.com/content/v1/52f53adce4b0030add82ab9f/1547481171629-VVKGVDYVWXF8911AAIYG/Hype-Logo.jpg?format=1500w",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "ibrandeverything": {
    id: "ibrandeverything",
    companyName: "Ibrand",
    logoUrl: "https://www.ibrandeverything.co.uk/cdn/shop/files/favicon-32x32.jpg?v=1645462333&width=180",
    accentColor: "#7396a2",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "ideasbynet": {
    id: "ideasbynet",
    companyName: "Ideas By Net",
    logoUrl: "https://www.google.com/s2/favicons?domain=ideasbynet.com&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "ideendusche": {
    id: "ideendusche",
    companyName: "Ideendusche",
    logoUrl: "https://ideendusche.de/wp-content/uploads/2023/06/cropped-adress1-e1688131634563.gif",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "identitymerchandise": {
    id: "identitymerchandise",
    companyName: "Identity Merchandise",
    logoUrl: "https://identitymerchandise.co.uk/favicon.jpg",
    accentColor: "#2299dd",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "ifsol": {
    id: "ifsol",
    companyName: "IF Solutions",
    logoUrl: "https://ifsol.co.uk/public/frontend_assets/images/IFSOL-Logo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "impamark-promotional-merchandise": {
    id: "impamark-promotional-merchandise",
    companyName: "Impamark",
    logoUrl: "https://www.impamark-promotional-merchandise.co.uk/image/cache/catalog/Logos/Carbon-Impamark%20Logo-CMYK-2125x533.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "imprintandimpress": {
    id: "imprintandimpress",
    companyName: "Imprint and Impress",
    logoUrl: "https://www.imprintandimpress.co.uk/images/main-logo.png",
    accentColor: "#ff1e56",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "werbemittelagentur": {
    id: "werbemittelagentur",
    companyName: "Impuls Marketing",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "infinityinc": {
    id: "infinityinc",
    companyName: "Infinity Incorporated",
    logoUrl: "https://www.infinityinc.co.uk/hs-fs/hubfs/Banner%20Logo2_White.png?width=180&height=73&name=Banner%20Logo2_White.png",
    accentColor: "#0199ff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "innovation1st": {
    id: "innovation1st",
    companyName: "Innovation 1st",
    logoUrl: "https://static.wixstatic.com/media/cd06df_04ddad33c3d9433b89c4583f62635ad2%7Emv2.png/v1/fill/w_180%2Ch_180%2Clg_1%2Cusm_0.66_1.00_0.01/cd06df_04ddad33c3d9433b89c4583f62635ad2%7Emv2.png",
    accentColor: "#116dff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "myinspirations": {
    id: "myinspirations",
    companyName: "Inspirations Business Gifts",
    logoUrl: "https://www.myinspirations.co.uk/wp-content/themes/myins/images/logo.jpg",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "javelinasgroup": {
    id: "javelinasgroup",
    companyName: "Javelinas Group",
    logoUrl: "https://www.google.com/s2/favicons?domain=javelinasgroup.com&sz=128",
    accentColor: "#2271b1",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "jdrbrandingltd": {
    id: "jdrbrandingltd",
    companyName: "JDR Branding",
    logoUrl: "https://www.google.com/s2/favicons?domain=jdrbrandingltd.com&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "jpp-business-gifts": {
    id: "jpp-business-gifts",
    companyName: "JPP MK Ltd",
    logoUrl: "https://www.jpp-business-gifts.co.uk/wp-content/uploads/fbrfg/apple-touch-icon.png",
    accentColor: "#ffffff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "juniperproducts": {
    id: "juniperproducts",
    companyName: "Juniper Trading",
    logoUrl: "https://www.google.com/s2/favicons?domain=juniperproducts.co.uk&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "k-m-werbemittel": {
    id: "k-m-werbemittel",
    companyName: "K+M Werbemittel",
    logoUrl: "https://k-m-werbemittel.com/wp-content/uploads/2024/01/k-m-service@4x-600x600.png",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "kloetzner-werbemittel": {
    id: "kloetzner-werbemittel",
    companyName: "Klotzner Werbemittel",
    logoUrl: "https://www.kloetzner-werbemittel.de/media/90/bd/40/1732632710/kloetzner-werbemittelcsn10Bhkma1fL.png",
    accentColor: "#009ca6",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "konkretwerbung": {
    id: "konkretwerbung",
    companyName: "konkretwerbung.de",
    logoUrl: "https://www.konkretwerbung.de/images/logo.jpg-positiv.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "kukwerbemittel": {
    id: "kukwerbemittel",
    companyName: "KuK",
    logoUrl: "https://www.kuk-direkt.de/wp-content/uploads/2019/03/cropped-KUK-Direkt-Icon-180x180.png",
    accentColor: "#666666",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "kuk-direkt": {
    id: "kuk-direkt",
    companyName: "KUK-Direkt",
    logoUrl: "https://www.kuk-direkt.de/wp-content/uploads/2019/03/cropped-KUK-Direkt-Icon-180x180.png",
    accentColor: "#666666",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "level-up-print": {
    id: "level-up-print",
    companyName: "Level Up Print",
    logoUrl: "https://www.google.com/s2/favicons?domain=level-up-print.co.uk&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "tobrand": {
    id: "tobrand",
    companyName: "Love to Brand",
    logoUrl: "https://love.tobrand.co.uk/wp-content/uploads/2018/08/SmallV3_L2B.gif",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "mb-trading": {
    id: "mb-trading",
    companyName: "m+b trading",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "manroof": {
    id: "manroof",
    companyName: "MANROOF Werbeartikel",
    logoUrl: "https://www.manroof.ch/wp-content/uploads/manroof-favicon-150x150-c-default.webp",
    accentColor: "#007aff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "marigoldgrey": {
    id: "marigoldgrey",
    companyName: "Marigold and Grey",
    logoUrl: "https://marigoldgrey.com/cdn/shop/t/31/assets/marigold-grey-logo.svg?v=153771541277696939521682351524",
    accentColor: "#d8dfc6",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "marketing-und-mehr": {
    id: "marketing-und-mehr",
    companyName: "marketing-und-mehr",
    logoUrl: "https://www.marketing-und-mehr.de/s/misc/logo.jpg?t=1780241018",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "mbd": {
    id: "mbd",
    companyName: "MBD OBJET PUB",
    logoUrl: "https://www.mbd.fr/images/icon180.png",
    accentColor: "#92278f",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "mcsquaredprint": {
    id: "mcsquaredprint",
    companyName: "MC Squared Print",
    logoUrl: "https://www.google.com/s2/favicons?domain=mcsquaredprint.co.uk&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "mcrmedia": {
    id: "mcrmedia",
    companyName: "MCR MEDIA SOLUTIONS",
    logoUrl: "https://cdn.prod.website-files.com/617806bb289b1b5b4c01e6bd/61e937b58821f30b995ad3bf_MCR-LOGOS-02.webp",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "mehrpunkt": {
    id: "mehrpunkt",
    companyName: "mehrpunkt Eventagentur",
    logoUrl: "https://images.squarespace-cdn.com/content/v1/63c8ffa65713015e7a86510a/5fd32926-eb03-4cd3-a51f-5fe183d93b65/1688111433561.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "merakipromotions": {
    id: "merakipromotions",
    companyName: "Meraki Promotions",
    logoUrl: "https://static.wixstatic.com/media/9a51b9_6fd9ecda6dd74967a4178374782f9abb%7Emv2.jpg/v1/fit/w_2500,h_1330,al_c/9a51b9_6fd9ecda6dd74967a4178374782f9abb%7Emv2.jpg",
    accentColor: "#116dff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "merchandisebranded": {
    id: "merchandisebranded",
    companyName: "Merchandise Branded",
    logoUrl: "https://www.sourcingmachine.co.uk/sites/www.sourcingmachine.co.uk/franchiseefiles/12103/imageleft_12103.jpg?time=1777521910",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "panek-werbeartikel": {
    id: "panek-werbeartikel",
    companyName: "Michaela PANEK Werbeartikel",
    logoUrl: "https://image.jimcdn.com/app/cms/image/transf/dimension=485x10000:format=png/path/s93b33efad622a21a/image/i823c619e4f299e3d/version/1603995375/image.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "mintobranding": {
    id: "mintobranding",
    companyName: "Minto",
    logoUrl: "https://cdn.prod.website-files.com/65b6193123169546f9ebea8d/65b630508af1f0ac6990e797_minto-logo-light.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "moll-konzept": {
    id: "moll-konzept",
    companyName: "Moll KONZEPT",
    logoUrl: "https://mollkonzept.de/wp-content/uploads/2023/01/cropped-Element-5-1-180x180.png",
    accentColor: "#21759b",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "multigate-plus": {
    id: "multigate-plus",
    companyName: "Multigate Plus",
    logoUrl: "https://www.multigate-plus.com/media/01/d9/e3/1759132810/apple-touch-icon.png?ts=1759132810",
    accentColor: "#f7f7f7",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "print-gifts": {
    id: "print-gifts",
    companyName: "NAVILLUS PRINT GIFTS",
    logoUrl: "https://agptxipylp.cloudimg.io/v7/storage.googleapis.com/creativecms-london--printgifts9/assets/navillus-print-gifts-logo-122152.png?width=200",
    accentColor: "#ffffff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "nlr-uk": {
    id: "nlr-uk",
    companyName: "NLR Promotions",
    logoUrl: "https://www.nlr-uk.com/img/logo-edf.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "nonvision": {
    id: "nonvision",
    companyName: "NonvisioN",
    logoUrl: "https://nonvision.de/wp-content/uploads/2023/10/cropped-Nonvision-Logo-2023-180x180.png",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "officeworx": {
    id: "officeworx",
    companyName: "Officeworx",
    logoUrl: "https://officeworx.co.uk/wp-content/uploads/2024/09/cropped-Officeworx-logo-roundel-blue-e1725368884504-180x180.png",
    accentColor: "#fb8e28",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "okavengo": {
    id: "okavengo",
    companyName: "OKAVENGO",
    logoUrl: "https://www.google.com/s2/favicons?domain=okavengo.fr&sz=128",
    accentColor: "#ad1aa3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "oneboxbusinesssupplies": {
    id: "oneboxbusinesssupplies",
    companyName: "Onebox Business Supplies",
    logoUrl: "https://www.oneboxbusinesssupplies.co.uk/ws_content/custom/logo.png?1780414907",
    accentColor: "#262d35",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "goy-werbemittel": {
    id: "goy-werbemittel",
    companyName: "Onlinezeitung",
    logoUrl: "https://www.goy-werbemittel.de/produkte/ostern/logofrucht-weihnachten.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "mypdm": {
    id: "mypdm",
    companyName: "PDM Print",
    logoUrl: "https://mypdm.co.uk/wp-content/uploads/2025/01/cropped-PDM-Web-Icon-180x180.png",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "perfectprintpromotions": {
    id: "perfectprintpromotions",
    companyName: "Perfect Print and Promotions",
    logoUrl: "https://www.google.com/s2/favicons?domain=perfectprintpromotions.co.uk&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "pgbranding": {
    id: "pgbranding",
    companyName: "PG Branding",
    logoUrl: "https://cdn-ilcmiol.nitrocdn.com/DIEjyPDIlRFOZymvgajaBbOWGZmXKhBA/assets/images/optimized/rev-c511867/pgbranding.com/wp-content/uploads/2024/10/favicon.png",
    accentColor: "#5b919e",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "pinksheep": {
    id: "pinksheep",
    companyName: "Pinksheep",
    logoUrl: "https://www.google.com/s2/favicons?domain=pinksheep.co.uk&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "piranhaprint": {
    id: "piranhaprint",
    companyName: "Piranha Print",
    logoUrl: "https://www.piranhaprint.com/cdn/shop/files/Piranha_Print_Logo_2023.png?v=1672843397",
    accentColor: "#719ad1",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "praesent-werbung": {
    id: "praesent-werbung",
    companyName: "praesent-werbung",
    logoUrl: "https://www.praesent-werbung.de/skin/MEdiaApp_Praesent-Werbung/img/fav/apple-icon-57x57.png",
    accentColor: "#ffffff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "premierimpressions": {
    id: "premierimpressions",
    companyName: "Premier Impressions",
    logoUrl: "https://premierimpressions.co.uk/wp-content/uploads/2021/07/cropped-PI-180x180.png",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "primepromotion": {
    id: "primepromotion",
    companyName: "Prime Promotion",
    logoUrl: "https://www.primepromotion.at/wp-content/uploads/2024/04/Prime-Promotion-Wien-300x300.png",
    accentColor: "#f2f4f7",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "p4biz": {
    id: "p4biz",
    companyName: "PRINT 4 BUSINESS",
    logoUrl: "https://www.p4biz.co.uk/wp-content/uploads/2023/10/favicon-300x300.png",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "print-co": {
    id: "print-co",
    companyName: "Print Co",
    logoUrl: "https://print-co.com/wp-content/uploads/2024/01/cropped-print-co-print-signage-solutions-180x180.png",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "printalicious": {
    id: "printalicious",
    companyName: "Printalicious",
    logoUrl: "https://www.printalicious.co.uk/wp-content/uploads/2022/09/Icon.png",
    accentColor: "#7ebec5",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "proad": {
    id: "proad",
    companyName: "Pro-Ad",
    logoUrl: "https://www.google.com/s2/favicons?domain=proad.co.uk&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "promomemento": {
    id: "promomemento",
    companyName: "Promo Memento",
    logoUrl: "https://www.google.com/s2/favicons?domain=promomemento.co.uk&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "promocorp": {
    id: "promocorp",
    companyName: "PROMOCORP",
    logoUrl: "https://static.wixstatic.com/media/e18c08_89e33205e35d4183bb8d920e09006630%7Emv2.png/v1/fill/w_180%2Ch_180%2Clg_1%2Cusm_0.66_1.00_0.01/e18c08_89e33205e35d4183bb8d920e09006630%7Emv2.png",
    accentColor: "#116dff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "promolabmerchandise": {
    id: "promolabmerchandise",
    companyName: "PromoLab Merchandise",
    logoUrl: "https://static.wixstatic.com/media/642476_bc28e6dd53cf467f9b4bf50597e1ca57%7Emv2.png/v1/fill/w_180%2Ch_180%2Clg_1%2Cusm_0.66_1.00_0.01/642476_bc28e6dd53cf467f9b4bf50597e1ca57%7Emv2.png",
    accentColor: "#004fff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "promotionsonlygroup": {
    id: "promotionsonlygroup",
    companyName: "PromotionsOnly Group",
    logoUrl: "https://promotionsonlylanyards.co.uk/wp-content/uploads/2025/11/promotions-only-lanyards-favicon-promotions-only-lanyards-300x300.png",
    accentColor: "#4169e1",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "prontaprint247": {
    id: "prontaprint247",
    companyName: "Prontaprint",
    logoUrl: "https://cdn-jobgn.nitrocdn.com/EwAvbWguatnjtKmcstkHQhXUAOUZuZoV/assets/images/optimized/rev-d0da80a/prontaprint247.com/wp-content/uploads/2023/07/FAVI-NEW.png",
    accentColor: "#f5f5f5",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "proservegroup": {
    id: "proservegroup",
    companyName: "Proserve UK",
    logoUrl: "https://cdn.ecommercedns.uk/files/0/249970/9/56406369/logo.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "purelydigital": {
    id: "purelydigital",
    companyName: "Purely Digital",
    logoUrl: "https://pws-cdn.b-cdn.net/purelydigital.co.uk/favicons/24bf4314-ae36-4b70-89de-8c6a12ff7535-180x180.png",
    accentColor: "#e4003b",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "quinnstheprinters": {
    id: "quinnstheprinters",
    companyName: "Quinns the Printers",
    logoUrl: "https://www.quinnstheprinters.com/themes/whitelabel/img/logo.png",
    accentColor: "#82a5ba",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "rdp-creative": {
    id: "rdp-creative",
    companyName: "RDP Creative",
    logoUrl: "https://static.wixstatic.com/shapes/0d4962_d6acba7acc9d48bfa96226d15232f1c2.svg",
    accentColor: "#116dff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "redbows": {
    id: "redbows",
    companyName: "Redbows",
    logoUrl: "https://assets-cf.redbows.co.uk/assets/thumbed-template-images/original_size_0/logo.svg?",
    accentColor: "#eb433c",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "redfishpromo": {
    id: "redfishpromo",
    companyName: "Redfish Promotions",
    logoUrl: "https://www.redfishpromo.co.uk/_webedit/cached-images/69.png",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "reflexprint": {
    id: "reflexprint",
    companyName: "Reflex Print",
    logoUrl: "https://reflexprint.com/wp-content/uploads/2025/08/Reflex-Favicon-01.png",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "resourceprint": {
    id: "resourceprint",
    companyName: "Resource Print",
    logoUrl: "https://resourceprint.co.uk/wp-content/uploads/2024/11/cropped-Resource-Favicon-180x180.png",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "rheinmail": {
    id: "rheinmail",
    companyName: "RheinMail",
    logoUrl: "https://static.wixstatic.com/media/32efdb_13d61012836a43e290397477c310a574%7Emv2.jpg/v1/fill/w_180%2Ch_180%2Clg_1%2Cusm_0.66_1.00_0.01/32efdb_13d61012836a43e290397477c310a574%7Emv2.jpg",
    accentColor: "#116dff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "ronset": {
    id: "ronset",
    companyName: "Ronset Printers",
    logoUrl: "https://www.ronset.co.uk/wp-content/uploads/2023/02/Ronset-Squared-Logo.png",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "rowtype": {
    id: "rowtype",
    companyName: "Rowtype Printers",
    logoUrl: "https://www.google.com/s2/favicons?domain=rowtype.co.uk&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "rtpromotions": {
    id: "rtpromotions",
    companyName: "RT Promotions",
    logoUrl: "https://rtpromotions.co.uk/wp-content/uploads/2025/06/cropped-Adobe-Express-file-180x180.png",
    accentColor: "#3e1740",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "sbprint": {
    id: "sbprint",
    companyName: "SB Print",
    logoUrl: "https://www.sbprint.co.uk/wp-content/themes/sb-print/library/images/apple-touch-icon.png",
    accentColor: "#121212",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "sftaylor": {
    id: "sftaylor",
    companyName: "SF Taylor",
    logoUrl: "https://sftaylor.com/wp-content/uploads/2026/01/cropped-SFTaylor_100_Icon-1-scaled-1-180x180.png",
    accentColor: "#b4975a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "shopboxd": {
    id: "shopboxd",
    companyName: "SHOPBOXD",
    logoUrl: "https://shopboxd.co.uk/cdn/shop/files/Untitled_design_9f603cc9-725a-4ae3-87b4-c7a37689498d.png?crop=center&height=360&v=1765354318&width=240",
    accentColor: "#c9c5ba",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "sichtbar-media": {
    id: "sichtbar-media",
    companyName: "sichtbar-media",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "snapproducts": {
    id: "snapproducts",
    companyName: "Snap Products",
    logoUrl: "https://static.snapproducts.co.uk/media/eternal/venedor/default/SNAPLOGO_ipad.jpg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "soarvalleypress": {
    id: "soarvalleypress",
    companyName: "Soar Valley Press",
    logoUrl: "https://static.wixstatic.com/media/08b293_68b662ce9911447b98c6774076ca5adf%7Emv2.jpg/v1/fill/w_180%2Ch_180%2Clg_1%2Cusm_0.66_1.00_0.01/08b293_68b662ce9911447b98c6774076ca5adf%7Emv2.jpg",
    accentColor: "#116dff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "socialsupermarket": {
    id: "socialsupermarket",
    companyName: "Social Supermarket",
    logoUrl: "https://www.socialsupermarket.org/logo.png",
    accentColor: "#2faeaf",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "standrewspress": {
    id: "standrewspress",
    companyName: "ST ANDREWS PRESS",
    logoUrl: "https://standrewspress.co.uk/wp-content/uploads/2025/09/cropped-website-icon-png-180x180.png",
    accentColor: "#00baaa",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "stamppromotions": {
    id: "stamppromotions",
    companyName: "STAMP PROMOTIONS",
    logoUrl: "https://ukvs.customerfocus.com/view.logo/ebc21840.ca",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "steelemedia": {
    id: "steelemedia",
    companyName: "Steele Media",
    logoUrl: "https://www.steelemedia.co.uk/wp-content/uploads/2024/01/cropped-S_Favicon-180x180.png",
    accentColor: "#000000",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "stickerei-limbach": {
    id: "stickerei-limbach",
    companyName: "Stickerei Limbach",
    logoUrl: "https://www.google.com/s2/favicons?domain=stickerei-limbach.de&sz=128",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "brandedbystreamline": {
    id: "brandedbystreamline",
    companyName: "Streamline Corporate",
    logoUrl: "https://www.brandedbystreamline.com/wp-content/uploads/cropped-favicon-streamline-180x180.png",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "surfworks": {
    id: "surfworks",
    companyName: "Surf Works",
    logoUrl: "https://surfworks.co.uk/wp-content/uploads/2020/09/Surf-Works-Print-Display-Work-Wear-Kidderminster.png",
    accentColor: "#f4ad24",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "swag-box": {
    id: "swag-box",
    companyName: "Swag Box",
    logoUrl: "https://swag-box.co.uk/image/cache/catalog/Swag%20Box%20Brand%20Files/Sticker%20Logo-500x217.png",
    accentColor: "#337ab7",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "taylormadedesigns": {
    id: "taylormadedesigns",
    companyName: "Taylor Made Designs",
    logoUrl: "https://www.taylormadedesigns.co.uk/wp-content/uploads/2023/06/cropped-TMD-Favicon-2022-6-curved-180x180.png",
    accentColor: "#c20f2f",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "askagency": {
    id: "askagency",
    companyName: "The Ask Agency",
    logoUrl: "https://static.wixstatic.com/media/bae9d6_682b3d666ac047daae4d01ba8b0affcc%7Emv2.jpg/v1/fill/w_180%2Ch_180%2Clg_1%2Cusm_0.66_1.00_0.01/bae9d6_682b3d666ac047daae4d01ba8b0affcc%7Emv2.jpg",
    accentColor: "#2f2b36",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "thebrandedcompany": {
    id: "thebrandedcompany",
    companyName: "The Branded Company",
    logoUrl: "https://www.thebrandedcompany.co.uk/images/favicon/branded-180.png",
    accentColor: "#cc0000",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "thefunkypeach": {
    id: "thefunkypeach",
    companyName: "The Funky Peach",
    logoUrl: "https://www.thefunkypeach.com/dist/images/favicon/apple-touch-icon.png",
    accentColor: "#000000",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "thegreatmerch": {
    id: "thegreatmerch",
    companyName: "The Great Merch Co",
    logoUrl: "https://www.thegreatmerch.com/web/image/197180-6e04d0ea/GMC%20Mug.webp",
    accentColor: "#12a84d",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "theoutdoorscompany": {
    id: "theoutdoorscompany",
    companyName: "The Outdoors Company",
    logoUrl: "https://theoutdoorscompany.co.uk/wp-content/uploads/2025/03/cropped-Favicon-2025-180x180.png",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "thepresentfinder": {
    id: "thepresentfinder",
    companyName: "The Present Finder",
    logoUrl: "https://www.thepresentfinder.co.uk/thepresentfinder/i/bnr/logo2024.webp?_t=25721142813&w=600&h=82&format=jpeg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "thevisualsafari": {
    id: "thevisualsafari",
    companyName: "The Visual Safari",
    logoUrl: "https://www.thevisualsafari.com/wp-content/uploads/2020/10/cropped-fav1-180x180.png",
    accentColor: "#737b35",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "thisiseffective": {
    id: "thisiseffective",
    companyName: "This is Effective",
    logoUrl: "https://thisiseffective.uk/wp-content/uploads/2024/01/cropped-ei-1-180x180.png",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "touchofginger": {
    id: "touchofginger",
    companyName: "Touch of Ginger",
    logoUrl: "https://www.touchofginger.com/wp-content/uploads/2023/06/touch-of-ginger-FAV-300x300.png",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "tramondi": {
    id: "tramondi",
    companyName: "Tramondi",
    logoUrl: "https://www.tramondi.com/cache/650ceec94ded848b/d92a6f2c3129f9fb/tramondi_logo_4c_farbig.png?d=20230203075844",
    accentColor: "#df011b",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "wearetrident": {
    id: "wearetrident",
    companyName: "Trident",
    logoUrl: "https://wearetrident.co.uk/wp-content/uploads/2026/02/Favicon.jpg",
    accentColor: "#a2dd45",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "ukcorporategifts": {
    id: "ukcorporategifts",
    companyName: "UK Corporate Gifts",
    logoUrl: "https://www.ukcorporategifts.co.uk/assets/ico/ukcorporategifts-144.png",
    accentColor: "#f7a02e",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "usbflash": {
    id: "usbflash",
    companyName: "USB Flash",
    logoUrl: "https://www.usbflash.co.uk/wp-content/uploads/Home/cropped-Browser-Icon-180x180.png",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "webrand4you": {
    id: "webrand4you",
    companyName: "We Brand 4 You",
    logoUrl: "https://www.webrand4you.co.uk/images/WeBrand4You/favi/final-favi-180.png",
    accentColor: "#b01da2",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "wensumprint": {
    id: "wensumprint",
    companyName: "Wensum Print",
    logoUrl: "https://www.wensumprint.co.uk/wp-content/uploads/2018/09/cropped-new-logo-300x300.png",
    accentColor: "#ffffff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "werbe-werkstatt": {
    id: "werbe-werkstatt",
    companyName: "Werbe-Werkstatt",
    logoUrl: "https://werbe-werkstatt.de/wp-content/uploads/2021/05/favicon_werbe-werkstatt.png",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "werbeartikel-lange": {
    id: "werbeartikel-lange",
    companyName: "werbeartikel-lange",
    logoUrl: "https://www.google.com/s2/favicons?domain=werbeartikel-lange.de&sz=128",
    accentColor: "#b16286",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "werbemittel-wilker": {
    id: "werbemittel-wilker",
    companyName: "Werbemittelagentur Wilker",
    logoUrl: "https://www.google.com/s2/favicons?domain=werbemittel-wilker.de&sz=128",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "westcoastworkwear": {
    id: "westcoastworkwear",
    companyName: "Westcoast Workwear",
    logoUrl: "https://www.westcoastworkwear.co.uk/rshared/ssc/i/riq/11559561/400/120/t/0/0/logo.png?1761102769",
    accentColor: "#1f478c",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "whitelightpromo": {
    id: "whitelightpromo",
    companyName: "WHITELIGHT",
    logoUrl: "https://static.wixstatic.com/media/fbd334_4e54e66182dc4568b566b6b08bbbbab2%7Emv2.png/v1/fill/w_180%2Ch_180%2Clg_1%2Cusm_0.66_1.00_0.01/fbd334_4e54e66182dc4568b566b6b08bbbbab2%7Emv2.png",
    accentColor: "#116dff",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "whittakerworkplace": {
    id: "whittakerworkplace",
    companyName: "Whittaker Workplace Solutions",
    logoUrl: "https://www.whittakerworkplace.co.uk/wp-content/uploads/2023/03/cropped-favicon-180x180.png",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "wurlin": {
    id: "wurlin",
    companyName: "Wurlin",
    logoUrl: "https://www.wurlin.com/wp-content/uploads/2025/07/cropped-WURLIN-180x180.jpg",
    accentColor: "#abb8c3",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "xic": {
    id: "xic",
    companyName: "XIC",
    logoUrl: "https://www.xic.com/wp-content/uploads/2022/12/cropped-xicicon-180x180.png",
    accentColor: "#555d66",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "zell-em": {
    id: "zell-em",
    companyName: "Zell-Em Branding",
    logoUrl: "https://images.squarespace-cdn.com/content/v1/687a555bb14cb270dab6c6dd/c66d3699-5e30-4f22-83a1-50e086bda5cd/Asset+8%401080x.png?format=1500w",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "good-way": {
    id: "good-way",
    companyName: "Goodway Werbedesign",
    logoUrl: "https://good-way.de/wp-content/themes/goodway/img/logo_start.jpg",
    accentColor: "#7a00df",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "procomm": {
    id: "procomm",
    companyName: "ProComm Partners",
    logoUrl: "https://procomm.eu/wp-content/uploads/2023/02/Procomm_www_rood_PMS1807-2.jpg",
    accentColor: "#a6192e",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "bauchgefuehl": {
    id: "bauchgefuehl",
    companyName: "bauchgefühl",
    logoUrl: "https://www.bauchgefuehl.com/wp-content/uploads/2024/06/agentur-bauchgefuehl-kommunikation-2021.svg",
    accentColor: "#ce0037",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "fluidbranding": {
    id: "fluidbranding",
    companyName: "Fluid Branding",
    logoUrl: "https://www.fluidbranding.nl/static/version1779260750/frontend/DevTeamRedesign/hyva/nl_NL/images/logo.svg",
    accentColor: "#c3996c",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  "killerkoozys": {
    id: "killerkoozys",
    companyName: "Killer Koozys",
    logoUrl: null,
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    supportUrl: "mailto:Sales@killerkoozys.com",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
    packaging: [
      { name: "Sleeve the Giftbox", tiers: [
        { min: 50, max: 99, price: 1.39 },
        { min: 100, max: 249, price: 1.29 },
        { min: 250, max: 499, price: 1.19 },
        { min: 500, max: 999, price: 1.09 },
        { min: 1000, max: null, price: 0.99 },
      ]},
    ],
  },

  // AZAP (azap.lu) — Luxembourg promotional-products reseller, French/English
  // site, tagline "Brand your items". Primary brand red = #E30613.
  "azap": {
    id: "azap",
    companyName: "AZAP",
    logoUrl: "https://www.azap.lu/assets/img/header/azap-brand-your-items-objets-publicitaires-luxembourg-logo-azap.svg",
    accentColor: "#E30613",
    email: "info@azap.lu",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },

  // Kick And Rush (shop.kickandrush.com) — Promotional products reseller
  // Brand: bright blue accent (#5555FF), local logo
  "kickandrush": {
    id: "kickandrush",
    companyName: "Kick And Rush",
    logoUrl: "/assets/images/kickandrush-logo.png",
    accentColor: "#5555FF",
    stripPrefix: "IZY ",
    features: { art: false, jersey: false },
    pricing: STD_STAFFEL,
  },
  "grupobillingham": {
    id: "grupobillingham",
    companyName: "Grupo Billingham",
    logoUrl: "/assets/images/grupobillingham-logo.png",
    accentColor: "#1a75bb",
    stripPrefix: "IZY ",
    pricing: STD_STAFFEL,
  },
  "in1st": {
    id: "in1st",
    companyName: "Innovation 1st",
    logoUrl: "/assets/images/in1st-logo.png",
    accentColor: "#FF8C00",
    stripPrefix: "IZY ",
    pricing: STD_STAFFEL,
  },
  "anderzson": {
    id: "anderzson",
    companyName: "Anderzson",
    logoUrl: "/assets/images/anderzson-logo.svg",
    accentColor: "#1a1a1a",
    stripPrefix: "IZY ",
    pricing: STD_STAFFEL,
  },
  "reuseheroes": {
    id: "reuseheroes",
    companyName: "ReUse Heroes",
    logoUrl: "/assets/images/reuseheroes-logo.png",
    accentColor: "#FF6B6B",
    stripPrefix: "IZY ",
    pricing: STD_STAFFEL,
  },
  "giftpunk": {
    id: "giftpunk",
    companyName: "gift-PUNK",
    logoUrl: "/assets/images/giftpunk-logo.png",
    accentColor: "#000000",
    stripPrefix: "IZY ",
    pricing: STD_STAFFEL,
  },
};

/** Look up a reseller by id. Returns null for unknown / missing id. */
export function getReseller(id: string | null | undefined): ResellerConfig | null {
  if (!id) return null;
  return RESELLERS[id.trim().toLowerCase()] ?? null;
}

/** Apply a reseller's product-name transform to an IZY product name. */
export function resellerProductName(reseller: ResellerConfig | null, izyName: string): string {
  if (!reseller) return izyName;
  if (reseller.productNames?.[izyName]) return reseller.productNames[izyName];
  const prefix = reseller.stripPrefix ?? "IZY ";
  return izyName.startsWith(prefix) ? izyName.slice(prefix.length) : izyName;
}
