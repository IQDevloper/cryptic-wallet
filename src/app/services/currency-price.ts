import { redis } from './redis';
import { fetchPricesFromAPI } from './price-provider';

const CACHE_TTL = 300; // 5 minutes

export async function getCachedPrices(codes: string[]) {
  // Check cache first
  const cachedPrices = await redis.mget(codes);
  const missingCodes = codes.filter((_, index) => !cachedPrices[index]);

  let prices = Object.fromEntries(
    codes.map((code, index) => [code, parseFloat(cachedPrices[index] || '0')]),
  );

  // If any codes are missing from cache, fetch from API
  if (missingCodes.length > 0) {
    const freshPrices = await fetchPricesFromAPI(missingCodes);
    // Update cache
    await Promise.all(
      Object.entries(freshPrices).map(([code, price]) =>
        redis.set(code, price.toString(), 'EX', CACHE_TTL),
      ),
    );

    // Merge fresh prices with cached ones
    prices = { ...prices, ...freshPrices };
  }

  return prices;
}
