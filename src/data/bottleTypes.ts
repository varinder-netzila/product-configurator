let cache: any = null;

export async function getBottleTypes() {
  if (cache) {
    return cache;
  }

  const response = await fetch("/api/bottle-types", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load bottle types");
  }

  const data = await response.json();

  cache = data;

  return data;
}

export function clearBottleTypesCache() {
  cache = null;
}