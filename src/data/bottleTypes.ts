let bottleTypesPromise: Promise<any> | null = null;

export async function getBottleTypes() {
  if (bottleTypesPromise) {
    return bottleTypesPromise;
  }

  const shop = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL;

  bottleTypesPromise = fetch(
    `/api/bottle-types?shop=${encodeURIComponent(shop || "")}`,
    {
      cache: "no-store",
    }
  )
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Failed to load bottle types");
      }

      return response.json();
    })
    .catch((error) => {
      // Allow another attempt if the request failed
      bottleTypesPromise = null;
      throw error;
    });

  return bottleTypesPromise;
}

export function clearBottleTypesCache() {
  bottleTypesPromise = null;
}