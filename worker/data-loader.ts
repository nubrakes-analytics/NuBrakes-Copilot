import type { MetricDefinition, DashboardDefinition, DatasetDefinition, MetricRegistryEntry } from "./types";
import {
  DASHBOARD_LINKS_URL,
  DATASET_LIST_URL,
  METRIC_DEFINITIONS_URL,
  CACHE_TTL_MS,
  DATASET_TTL_MS,
  METRIC_FIELD_MAP,
  PRIMARY_DATASET_MAP,
  ADDITIVE_METRICS,
  canonicalMetricId,
  normalize,
  prettifyMetricLabel,
  inferFormatType,
} from "./utils";

const memoryCache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlight = new Map<string, Promise<unknown>>();

export async function fetchJsonCached<T = unknown>(
  url: string,
  ttlMs = CACHE_TTL_MS
): Promise<T> {
  const now = Date.now();
  const mem = memoryCache.get(url);
  if (mem && mem.expiresAt > now) {
    return mem.value as T;
  }

  const existing = inFlight.get(url);
  if (existing) {
    return (await existing) as T;
  }

  const promise = (async () => {
    const cache = (caches as unknown as { default: Cache }).default;
    const cacheKey = new Request(url, { method: "GET" });

    const cachedResp = await cache.match(cacheKey);
    if (cachedResp) {
      const value = (await cachedResp.json()) as T;
      memoryCache.set(url, {
        value,
        expiresAt: now + ttlMs,
      });
      return value;
    }

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Cache-Control": `public, max-age=${Math.floor(ttlMs / 1000)}`,
      },
      cf: {
        cacheTtl: Math.floor(ttlMs / 1000),
        cacheEverything: true,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to load ${url}: ${res.status}`);
    }

    const cloned = res.clone();
    const value = (await cloned.json()) as T;

    memoryCache.set(url, {
      value,
      expiresAt: Date.now() + ttlMs,
    });

    await cache.put(
      cacheKey,
      new Response(JSON.stringify(value), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${Math.floor(ttlMs / 1000)}`,
        },
      })
    );

    return value;
  })();

  inFlight.set(url, promise);

  try {
    return (await promise) as T;
  } finally {
    inFlight.delete(url);
  }
}

export async function loadDashboardDefinitions(): Promise<DashboardDefinition[]> {
  return await fetchJsonCached<DashboardDefinition[]>(DASHBOARD_LINKS_URL, CACHE_TTL_MS);
}

export async function loadDatasetDefinitions(): Promise<DatasetDefinition[]> {
  return await fetchJsonCached<DatasetDefinition[]>(DATASET_LIST_URL, CACHE_TTL_MS);
}

export async function loadMetricDefinitions(): Promise<MetricDefinition[]> {
  return await fetchJsonCached<MetricDefinition[]>(METRIC_DEFINITIONS_URL, CACHE_TTL_MS);
}

export async function loadJsonFromUrl<T = unknown>(url: string): Promise<T> {
  return await fetchJsonCached<T>(url, DATASET_TTL_MS);
}

export async function loadMetricRegistry(): Promise<Map<string, MetricRegistryEntry>> {
  const cacheKey = "__metric_registry__";
  const mem = memoryCache.get(cacheKey);
  if (mem && mem.expiresAt > Date.now()) {
    return mem.value as Map<string, MetricRegistryEntry>;
  }

  const defs = await loadMetricDefinitions();
  const map = new Map<string, MetricRegistryEntry>();

  for (const metric of defs) {
    const metricId = canonicalMetricId(metric.metric_id);
    const formatType = metric.format_type || inferFormatType(metricId);
    const entry: MetricRegistryEntry = {
      metric,
      metricId,
      metricName: metric.metric_name || prettifyMetricLabel(metricId),
      fieldNames: METRIC_FIELD_MAP[metricId] || [metric.metric_id],
      primaryDatasetId: PRIMARY_DATASET_MAP[metricId] || null,
      formatType,
      goodDirection: normalize(metric.good_direction || "up"),
      candidateDrivers: metric.candidate_drivers || [],
      relevantDatasets: metric.relevant_datasets || [],
      kind: ADDITIVE_METRICS.has(metricId) ? "additive" : "rate",
    };
    map.set(metricId, entry);
  }

  memoryCache.set(cacheKey, {
    value: map,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return map;
}
