import type {
  MetricDefinition,
  DashboardDefinition,
  DatasetDefinition,
  MetricLookupResult,
  DashboardLookupResult,
  DatasetLookupResult,
  BusinessQuestionDriverResult,
  ConfidenceScore,
  ConfidenceLabel,
} from "./types";
import { normalize, canonicalMetricId, PRIMARY_DATASET_MAP } from "./utils";
import {
  loadDashboardDefinitions,
  loadDatasetDefinitions,
  loadMetricDefinitions,
  loadMetricRegistry,
} from "./data-loader";

export function buildConfidenceScore(args: {
  metricMatched?: boolean;
  metricScore?: number;
  datasetCount?: number;
  currentRows?: number;
  priorRows?: number;
  usableDrivers?: number;
  totalDrivers?: number;
  explicitScope?: boolean;
}): ConfidenceScore {
  let score = 0;
  const reasons: string[] = [];

  if (args.metricMatched) {
    score += Math.min(25, Math.max(10, Math.floor((args.metricScore || 0) / 5)));
    reasons.push("metric match resolved");
  } else {
    reasons.push("metric match weak");
  }

  if ((args.datasetCount || 0) > 0) {
    score += Math.min(20, (args.datasetCount || 0) * 5);
    reasons.push("linked dataset found");
  } else {
    reasons.push("no linked dataset found");
  }

  if ((args.currentRows || 0) > 0) {
    score += Math.min(20, Math.floor(Math.log10((args.currentRows || 0) + 1) * 10));
    reasons.push("current period has rows");
  } else {
    reasons.push("current period sparse");
  }

  if ((args.priorRows || 0) > 0) {
    score += Math.min(15, Math.floor(Math.log10((args.priorRows || 0) + 1) * 8));
    reasons.push("prior period has rows");
  } else if (args.priorRows !== undefined) {
    reasons.push("prior period sparse");
  }

  if ((args.totalDrivers || 0) > 0) {
    const ratio = (args.usableDrivers || 0) / Math.max(1, args.totalDrivers || 0);
    score += Math.round(ratio * 15);
    reasons.push(`${args.usableDrivers || 0}/${args.totalDrivers || 0} drivers computable`);
  }

  if (args.explicitScope) {
    score += 5;
    reasons.push("scope explicitly identified");
  }

  const normalized = Math.max(0, Math.min(100, score));
  const label: ConfidenceLabel =
    normalized >= 75 ? "high" : normalized >= 45 ? "medium" : "low";

  return {
    score: normalized,
    label,
    reasons,
  };
}

export async function tryDirectDatasetShortcut(userMessage: string): Promise<DatasetDefinition | null> {
  const q = normalize(userMessage);
  const datasets = await loadDatasetDefinitions();

  const shortcutMatchers: Array<{ patterns: string[]; sheetName: string }> = [
    {
      patterns: [
        "supply and demand by market",
        "supply demand by market",
        "supply and demand",
        "supply demand",
        "market level supply demand",
      ],
      sheetName: "fact nubrakes supply demand daily",
    },
    {
      patterns: [
        "channel market kpi",
        "leads booked completed revenue by market and channel",
        "conversion by market and channel",
      ],
      sheetName: "fact nubrakes channel market kpi daily",
    },
    {
      patterns: ["marketing performance", "impressions clicks ctr marketing spend"],
      sheetName: "fact nubrakes marketing performance daily",
    },
  ];

  for (const shortcut of shortcutMatchers) {
    if (shortcut.patterns.some((p) => q.includes(normalize(p)))) {
      const match = datasets.find(
        (d) => normalize(String(d.sheet_name || "")) === shortcut.sheetName
      );
      if (match?.link) return match;
    }
  }

  return null;
}

function extractDescriptionAliases(description: string): string[] {
  const raw = String(description || "").trim();
  if (!raw) return [];
  const match = raw.match(/other terms:\s*(.+)$/i);
  if (!match) return [];
  return match[1].split(",").map((s) => s.trim()).filter(Boolean);
}

function scoreDashboardEntry(query: string, entry: DashboardDefinition): number {
  const q = normalize(query);
  if (!q) return -1;

  const STOPWORDS = new Set([
    "a", "an", "the", "for", "of", "to", "in", "on", "by", "and", "or", "with", "from",
    "link", "need", "show", "give", "me", "where", "can", "i", "find",
  ]);

  const queryWords = q.split(/\s+/).map((w) => w.trim()).filter((w) => w && !STOPWORDS.has(w));
  const dashboardName = normalize(String(entry.dashboard_name || ""));
  const category = normalize(String(entry.category || ""));
  const description = normalize(String(entry.description || ""));
  const aliases = extractDescriptionAliases(String(entry.description || "")).map(normalize);

  let score = 0;
  if (dashboardName === q) score += 120;
  if (aliases.includes(q)) score += 115;
  if (category === q) score += 60;

  if (q.length >= 3) {
    if (dashboardName.includes(q)) score += 85;
    if (description.includes(q)) score += 30;
    if (category.includes(q)) score += 20;
    for (const alias of aliases) {
      if (alias.includes(q)) score += 75;
    }
  }

  for (const word of queryWords) {
    if (dashboardName.includes(word)) score += 25;
    if (category.includes(word)) score += 8;
    if (description.includes(word)) score += 8;
    for (const alias of aliases) {
      if (alias.includes(word)) score += 22;
    }
  }

  return score;
}

function scoreDatasetEntry(query: string, entry: DatasetDefinition): number {
  const q = normalize(query);
  if (!q) return -1;

  const STOPWORDS = new Set([
    "a", "an", "the", "for", "of", "to", "in", "on", "by", "and", "or", "with", "from", "data",
    "dataset", "json", "link", "file", "need", "show", "give", "me", "where", "can", "i",
    "find", "should", "use", "best",
  ]);

  const queryWords = q.split(/\s+/).map((w) => w.trim()).filter((w) => w && !STOPWORDS.has(w));
  const sheetName = normalize(String(entry.sheet_name || ""));
  const datasetName = normalize(String(entry.dataset || ""));
  const description = normalize(String(entry.description || ""));

  let score = 0;
  if (sheetName === q) score += 100;
  if (datasetName === q) score += 110;
  if (description === q) score += 60;

  if (q.length >= 3) {
    if (sheetName.includes(q)) score += 70;
    if (datasetName.includes(q)) score += 80;
    if (description.includes(q)) score += 35;
  }

  for (const word of queryWords) {
    if (sheetName.includes(word)) score += 20;
    if (datasetName.includes(word)) score += 22;
    if (description.includes(word)) score += 8;
  }

  return score;
}

export async function findDashboardLink(dashboardQuery: string): Promise<DashboardLookupResult> {
  const dashboards = await loadDashboardDefinitions();

  let bestMatch: DashboardDefinition | null = null;
  let bestScore = -1;

  for (const dashboard of dashboards) {
    const url = String(dashboard.url || "").trim();
    if (!url) continue;
    const score = scoreDashboardEntry(dashboardQuery, dashboard);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = dashboard;
    }
  }

  if (!bestMatch || bestScore < 20) {
    return { found: false, message: `No confident dashboard link found for query: ${dashboardQuery}` };
  }

  return {
    found: true,
    dashboard: bestMatch,
    confidence: buildConfidenceScore({
      metricMatched: true,
      metricScore: bestScore,
      datasetCount: 1,
      explicitScope: true,
    }),
  };
}

export async function findDatasetLink(datasetQuery: string): Promise<DatasetLookupResult> {
  const datasets = await loadDatasetDefinitions();

  let bestMatch: DatasetDefinition | null = null;
  let bestScore = -1;

  for (const dataset of datasets) {
    const link = String(dataset.link || "").trim();
    if (!link) continue;
    const score = scoreDatasetEntry(datasetQuery, dataset);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = dataset;
    }
  }

  if (!bestMatch || bestScore < 20) {
    return { found: false, message: `No confident dataset link found for query: ${datasetQuery}` };
  }

  return {
    found: true,
    dataset: bestMatch,
    confidence: buildConfidenceScore({
      metricMatched: true,
      metricScore: bestScore,
      datasetCount: 1,
      explicitScope: true,
    }),
  };
}

export async function findMetricDefinition(metricQuery: string): Promise<MetricLookupResult> {
  const metrics = await loadMetricDefinitions();
  const q = normalize(metricQuery);

  if (!q) {
    return { found: false, message: "Metric query is empty" };
  }

  const STOPWORDS = new Set([
    "a", "an", "the", "for", "of", "to", "in", "on", "by", "and", "or", "with", "from", "what", "why",
    "how", "did", "does", "is", "are", "was", "were", "show", "tell", "me", "about", "metric", "kpi",
    "driver", "drivers", "business", "question", "drop", "dropped", "increase", "increased", "decrease",
    "decreased", "change", "changed", "trend", "performing", "performance", "last", "this", "week",
    "month", "day", "during", "compare", "vs", "versus",
  ]);

  const queryWords = q.split(/\s+/).map((w) => w.trim()).filter((w) => w && !STOPWORDS.has(w));

  let bestMatch: MetricDefinition | null = null;
  let bestScore = -1;

  for (const metric of metrics) {
    const metricId = normalize(metric.metric_id || "");
    const metricName = normalize(metric.metric_name || "");
    const definition = normalize(metric.definition || "");
    const tags = Array.isArray(metric.tags) ? metric.tags.map((t) => normalize(String(t))) : [];

    let score = 0;

    if (metricId === q) score += 120;
    if (metricName === q) score += 115;
    if (tags.includes(q)) score += 110;
    if (definition === q) score += 60;

    if (q.length >= 3) {
      if (metricId.includes(q)) score += 80;
      if (metricName.includes(q)) score += 90;
      if (definition.includes(q)) score += 30;
      for (const tag of tags) {
        if (tag.includes(q)) score += 70;
      }
    }

    for (const word of queryWords) {
      if (metricId.includes(word)) score += 25;
      if (metricName.includes(word)) score += 30;
      if (definition.includes(word)) score += 8;
      for (const tag of tags) {
        if (tag.includes(word)) score += 18;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = metric;
    }
  }

  if (!bestMatch || bestScore < 25) {
    return { found: false, message: `No metric definition found for query: ${metricQuery}` };
  }

  return {
    found: true,
    metric: bestMatch,
    score: bestScore,
    confidence: buildConfidenceScore({
      metricMatched: true,
      metricScore: bestScore,
      explicitScope: true,
    }),
  };
}

export async function findDatasetsByIds(datasetIds: string[]): Promise<DatasetDefinition[]> {
  if (!datasetIds?.length) return [];
  const datasets = await loadDatasetDefinitions();
  const wanted = new Set(datasetIds.map((d) => normalize(String(d)).replace(/\.json$/, "")));

  return datasets.filter((dataset) => {
    const datasetName = normalize(String(dataset.dataset || "")).replace(/\.json$/, "");
    const sheetName = normalize(String(dataset.sheet_name || "")).replace(/\.json$/, "");
    return wanted.has(datasetName) || wanted.has(sheetName);
  });
}

export async function buildBusinessQuestionDriverPlan(
  businessQuestion: string
): Promise<BusinessQuestionDriverResult> {
  const metricResult = await findMetricDefinition(businessQuestion);

  if (!metricResult.found) {
    return { found: false, message: metricResult.message };
  }

  const registry = await loadMetricRegistry();
  const metric = metricResult.metric;
  const entry = registry.get(canonicalMetricId(metric.metric_id));

  const relevantDatasets = entry?.relevantDatasets || metric.relevant_datasets || [];
  const candidateDrivers = entry?.candidateDrivers || metric.candidate_drivers || [];
  const allMetrics = await loadMetricDefinitions();

  const driverDefinitions = candidateDrivers
    .map((driverId) => allMetrics.find((m) => normalize(m.metric_id || "") === normalize(driverId)))
    .filter((m): m is MetricDefinition => Boolean(m));

  const driverPrimaryDatasetIds = candidateDrivers
    .map((driverId) => PRIMARY_DATASET_MAP[canonicalMetricId(driverId)])
    .filter((d): d is string => Boolean(d));

  const mergedDatasetIds = Array.from(new Set([...relevantDatasets, ...driverPrimaryDatasetIds]));
  const datasets = await findDatasetsByIds(mergedDatasetIds);

  return {
    found: true,
    metric,
    datasets,
    analysis_plan: {
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      good_direction: metric.good_direction,
      candidate_drivers: candidateDrivers,
      driver_definitions: driverDefinitions,
      relevant_datasets: mergedDatasetIds,
      business_question: businessQuestion,
      suggested_steps: [
        `Identify the KPI: ${metric.metric_name} (${metric.metric_id})`,
        metric.formula_logic ? `Validate formula: ${metric.formula_logic}` : `Review KPI logic and aggregation`,
        mergedDatasetIds.length ? `Inspect relevant datasets: ${mergedDatasetIds.join(", ")}` : `No linked datasets found in metric definition`,
        candidateDrivers.length ? `Analyze candidate drivers: ${candidateDrivers.join(", ")}` : `No candidate drivers defined for this metric`,
        `Slice trend by time period`,
        `Slice performance by market and channel where available`,
        `Classify driver movements into contributing factors, headwinds, and context signals`,
      ],
    },
    confidence: buildConfidenceScore({
      metricMatched: true,
      metricScore: metricResult.score,
      datasetCount: datasets.length,
      totalDrivers: candidateDrivers.length,
      usableDrivers: driverDefinitions.length,
      explicitScope: true,
    }),
  };
}
