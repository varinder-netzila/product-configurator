export interface PricingTier {
  label: string;
  min: number;
  max: number | null;
  price: number;
}

export interface ProductPricing {
  retail: number;
  tiers: PricingTier[];
}

/**
 * Pricing per product. `retail` = original retail price (RRP).
 * `tiers[].price` = suggested selling price per quantity tier (what the agent
 * is recommended to charge their customers, NOT the wholesale/purchasing price).
 * Special agent/wholesale pricing is on request — see the contact note shown
 * in the configurator UI.
 */
export const B2B_PRICING: Record<string, ProductPricing> = {
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

/** Get the suggested-retail price per piece for a given product and quantity */
export function getB2BPrice(productName: string, quantity: number): number | null {
  const pricing = B2B_PRICING[productName];
  if (!pricing) return null;
  const tier = pricing.tiers.find((t) =>
    quantity >= t.min && (t.max === null || quantity <= t.max)
  );
  if (!tier || tier.price === 0) return null;
  return tier.price;
}
