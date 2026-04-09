import { getClaimsFilterOptionsData } from "@/lib/claims-page-data";

type ClaimsFilterOptionsData = Awaited<ReturnType<typeof getClaimsFilterOptionsData>>;

type CacheEntry = {
  expiresAt: number;
  value: ClaimsFilterOptionsData;
};

type GetCachedClaimsFilterOptionsDataOptions = {
  load?: () => Promise<ClaimsFilterOptionsData>;
  now?: number;
  ttlMs?: number;
};

const DEFAULT_FILTER_OPTIONS_TTL_MS = 60_000;

let filterOptionsCache: CacheEntry | null = null;
let inFlightRequest: Promise<ClaimsFilterOptionsData> | null = null;

export async function getCachedClaimsFilterOptionsData(
  options: GetCachedClaimsFilterOptionsDataOptions = {},
) {
  const now = options.now ?? Date.now();
  const ttlMs = options.ttlMs ?? DEFAULT_FILTER_OPTIONS_TTL_MS;

  if (filterOptionsCache && filterOptionsCache.expiresAt > now) {
    return filterOptionsCache.value;
  }

  if (inFlightRequest) {
    return inFlightRequest;
  }

  const load = options.load ?? getClaimsFilterOptionsData;
  inFlightRequest = load()
    .then((value) => {
      filterOptionsCache = {
        value,
        expiresAt: now + ttlMs,
      };
      return value;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

export function clearClaimsFilterOptionsCache() {
  filterOptionsCache = null;
  inFlightRequest = null;
}
