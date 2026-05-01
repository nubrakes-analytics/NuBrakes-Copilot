import type {
  MetricDefinition,
  DatasetRow,
  TimeGrain,
  ScopedLoadedDataset,
  DriverObservation,
  DriverRelationship,
  AnalyzeBusinessQuestionResult,
  AnalyzeMarketPerformanceResult,
  AnalyzeMixChangeResult,
  QueryMetricValueResult,
  AnalyzeMetricTrendResult,
  AnalyzeContributionToChangeResult,
  CompareSegmentsResult,
  ParsedBusinessScope,
} from "./types";
import {
  normalize,
  canonicalMetricId,
  PRIMARY_DATASET_MAP,
  ADDITIVE_METRICS,
  MAX_TREND_POINTS,
  formatMetricValue,
  formatDeltaValue,
  inferFormatType,
  capitalize,
  prettifyMetricLabel,
} from "./utils";
import {
  computeMetricValue,
  maybeProjectMetricValue,
  computeDelta,
  isAdditiveMetric,
  getBucketDateFieldCandidates,
  getBucketKey,
  isLatestBucketForGrain,
} from "./compute";
import {
  datasetSupportsAnyField,
  rowMatchesOptionalFilters,
  rowMatchesPointInTimeFilters,
  splitRowsCurrentVsPrior,
  filterRowsToTargetBucket,
  parseBusinessQuestionScopeFromRows,
  parsePointInTimeScopeFromRows,
  uniqueDimensionValues,
  findComparedSegments,
} from "./filters";
import { loadJsonFromUrl, loadMetricRegistry } from "./data-loader";
import { buildConfidenceScore, buildBusinessQuestionDriverPlan, findMetricDefinition, findDatasetsByIds } from "./lookup";

function filterScopedLoadedByDataset(
  scopedLoaded: ScopedLoadedDataset[],
  datasetName: string
): ScopedLoadedDataset[] {
  const wanted = normalize(datasetName).replace(/\.json$/, "");
  return scopedLoaded.filter((d) => normalize(d.dataset).replace(/\.json$/, "") === wanted);
}

function deriveMetricChangeDirection(
  currentValue: number | null,
  priorValue: number | null
): "up" | "down" | "flat" | "unknown" {
  if (currentValue === null || priorValue === null) return "unknown";
  const delta = currentValue - priorValue;
  if (Math.abs(delta) < 1e-9) return "flat";
  return delta > 0 ? "up" : "down";
}

function getDriverRelationship(metricId: string, driverId: string): DriverRelationship {
  const m = canonicalMetricId(metricId);
  const d = canonicalMetricId(driverId);

  const negativePairs = new Set([
    "jobs_completed|cancel_rate",
    "jobs_completed|customer_cancel_rate",
    "jobs_completed|hq_cancel_rate",
    "jobs_completed|reschedule_rate",
    "jobs_completed|customer_reschedule_rate",
    "jobs_completed|hq_reschedule_rate",
    "conversion_rate|cancel_rate",
    "conversion_rate|customer_cancel_rate",
    "conversion_rate|hq_cancel_rate",
    "conversion_rate|reschedule_rate",
    "booking_rate|cancel_rate",
    "booking_rate|customer_cancel_rate",
    "booking_rate|hq_cancel_rate",
    "revenue|cancel_rate",
    "revenue|customer_cancel_rate",
    "revenue|hq_cancel_rate",
  ]);

  const contextualDrivers = new Set([
    "technician_utilization",
    "ft_tech_utilization",
    "pt_tech_utilization",
    "available_slots",
    "utilized_slots",
    "marketing_spend",
    "cpc",
    "cost_per_inquiry",
    "mac",
  ]);

  if (negativePairs.has(`${m}|${d}`)) return "negative";
  if (contextualDrivers.has(d)) return "contextual";
  return "positive";
}

function classifyDriverEffect(args: {
  relationship: DriverRelationship;
  deltaValue: number | null;
  metricChangeDirection: "up" | "down" | "flat" | "unknown";
}): {
  direction: "supports" | "hurts" | "mixed" | "context" | "unknown";
  score: number;
} {
  const { relationship, deltaValue, metricChangeDirection } = args;
  if (deltaValue === null || metricChangeDirection === "unknown") return { direction: "unknown", score: 0 };
  if (relationship === "contextual") return { direction: "context", score: Math.abs(deltaValue) };
  if (metricChangeDirection === "flat") return { direction: "mixed", score: Math.abs(deltaValue) * 0.25 };

  const driverMovedUp = deltaValue > 0;
  const driverMovedDown = deltaValue < 0;

  const helpsMetric =
    relationship === "positive" ? driverMovedUp :
    relationship === "negative" ? driverMovedDown : false;

  const hurtsMetric =
    relationship === "positive" ? driverMovedDown :
    relationship === "negative" ? driverMovedUp : false;

  if (metricChangeDirection === "up") {
    if (helpsMetric) return { direction: "supports", score: Math.abs(deltaValue) };
    if (hurtsMetric) return { direction: "hurts", score: Math.abs(deltaValue) };
  }

  if (metricChangeDirection === "down") {
    if (hurtsMetric) return { direction: "hurts", score: Math.abs(deltaValue) };
    if (helpsMetric) return { direction: "supports", score: Math.abs(deltaValue) };
  }

  return { direction: "mixed", score: Math.abs(deltaValue) * 0.5 };
}

function rankDriverObservations(drivers: DriverObservation[]): DriverObservation[] {
  const bucketRank: Record<DriverObservation["explanatoryDirection"], number> = {
    hurts: 4,
    supports: 3,
    context: 2,
    mixed: 1,
    unknown: 0,
  };

  return [...drivers].sort((a, b) => {
    const bucketDiff = bucketRank[b.explanatoryDirection] - bucketRank[a.explanatoryDirection];
    if (bucketDiff !== 0) return bucketDiff;
    return Math.abs(b.explanatoryScore) - Math.abs(a.explanatoryScore);
  });
}

function buildDriverObservationText(
  obs: DriverObservation,
  label: "headwind" | "tailwind" | "context",
  metricChangeDirection?: "up" | "down" | "flat" | "unknown"
): string {
  if (obs.currentValue === null && obs.priorValue === null) {
    return `${prettifyMetricLabel(obs.driverId)} is not directly computable from ${obs.datasetUsed}.`;
  }

  const metricLabel = prettifyMetricLabel(obs.driverId);
  const current = formatMetricValue(obs.currentValue, obs.formatType);
  const prior = formatMetricValue(obs.priorValue, obs.formatType);
  const delta = formatDeltaValue(obs.deltaValue, obs.formatType);

  if (label === "headwind") {
    if (metricChangeDirection === "up") {
      return `${metricLabel} moved from ${prior} to ${current} (${delta}), which acted as a headwind against the increase.`;
    }
    return `${metricLabel} moved from ${prior} to ${current} (${delta}), which looks like a headwind.`;
  }

  if (label === "tailwind") {
    if (metricChangeDirection === "down") {
      return `${metricLabel} moved from ${prior} to ${current} (${delta}), which partially offset the decline.`;
    }
    if (metricChangeDirection === "up") {
      return `${metricLabel} moved from ${prior} to ${current} (${delta}), which contributed to the increase.`;
    }
    return `${metricLabel} moved from ${prior} to ${current} (${delta}), which looks supportive.`;
  }

  return `${metricLabel} moved from ${prior} to ${current} (${delta}), which looks more like context than a direct driver.`;
}

function buildAnalysisSummary(args: {
  metric: MetricDefinition;
  currentMetricValue: number | null;
  priorMetricValue: number | null;
  deltaMetricValue: number | null;
  rankedDrivers: DriverObservation[];
  currentLabel: string;
  priorLabel: string;
}): string {
  const {
    metric,
    currentMetricValue,
    priorMetricValue,
    deltaMetricValue,
    rankedDrivers,
    currentLabel,
    priorLabel,
  } = args;

  const formatType = metric.format_type || inferFormatType(metric.metric_id);

  if (currentMetricValue === null || priorMetricValue === null) {
    return `${metric.metric_name} could not be fully computed for ${currentLabel} versus ${priorLabel}.`;
  }

  const metricDirection = deriveMetricChangeDirection(currentMetricValue, priorMetricValue);
  const primarySupport = rankedDrivers.find((d) => d.explanatoryDirection === "supports");
  const primaryHeadwind = rankedDrivers.find((d) => d.explanatoryDirection === "hurts");

  let summary = `${metric.metric_name} was ${formatMetricValue(
    currentMetricValue,
    formatType
  )} in ${currentLabel} versus ${formatMetricValue(
    priorMetricValue,
    formatType
  )} in ${priorLabel} (${formatDeltaValue(deltaMetricValue, formatType)}).`;

  if (metricDirection === "up") {
    if (primarySupport) {
      summary += ` Primary contributing factor: ${prettifyMetricLabel(primarySupport.driverId)}.`;
    }
    if (primaryHeadwind) {
      summary += ` Headwind: ${prettifyMetricLabel(primaryHeadwind.driverId)}.`;
    }
  } else if (metricDirection === "down") {
    if (primaryHeadwind) {
      summary += ` Primary driver of the decline: ${prettifyMetricLabel(primaryHeadwind.driverId)}.`;
    }
    if (primarySupport) {
      summary += ` Partial offset: ${prettifyMetricLabel(primarySupport.driverId)}.`;
    }
  } else {
    if (primarySupport) {
      summary += ` Supporting factor: ${prettifyMetricLabel(primarySupport.driverId)}.`;
    }
    if (primaryHeadwind) {
      summary += ` Headwind: ${prettifyMetricLabel(primaryHeadwind.driverId)}.`;
    }
  }

  return summary;
}

function isUnderperformingMetric(
  metric: MetricDefinition,
  currentValue: number | null,
  priorValue: number | null
): boolean {
  if (currentValue === null || priorValue === null) return false;
  const direction = normalize(metric.good_direction || "up");
  if (direction === "down") return currentValue > priorValue;
  if (direction === "neutral") return false;
  return currentValue < priorValue;
}

function underperformanceScore(
  metric: MetricDefinition,
  currentValue: number | null,
  priorValue: number | null
): number {
  if (currentValue === null || priorValue === null) return 0;
  const direction = normalize(metric.good_direction || "up");
  return direction === "down" ? currentValue - priorValue : priorValue - currentValue;
}

function groupRowsByMarket(rows: DatasetRow[]): Map<string, DatasetRow[]> {
  const map = new Map<string, DatasetRow[]>();

  for (const row of rows) {
    const market = String(row["market"] || row["Market"] || "").trim();
    if (!market) continue;

    const key = normalize(market);
    const existing = map.get(key);
    if (existing) {
      existing.push(row);
    } else {
      map.set(key, [row]);
    }
  }

  return map;
}

function buildClearTrendSummary(
  points: Array<{
    period: string;
    value: string;
    raw_value: number | null;
    is_projected: boolean;
  }>,
  metricName: string,
  formatType: string,
  grain: TimeGrain
): string {
  const valid = points.filter(
    (p): p is { period: string; value: string; raw_value: number; is_projected: boolean } =>
      p.raw_value !== null
  );

  if (valid.length < 2) {
    if (valid.length === 1) {
      return `${metricName} is ${valid[0].value} in ${valid[0].period}.`;
    }
    return `Not enough data to determine the ${metricName} trend.`;
  }

  let up = 0;
  let down = 0;
  let flat = 0;

  for (let i = 1; i < valid.length; i++) {
    const delta = valid[i].raw_value - valid[i - 1].raw_value;
    if (Math.abs(delta) < 1e-9) flat++;
    else if (delta > 0) up++;
    else down++;
  }

  const first = valid[0];
  const last = valid[valid.length - 1];
  const overallDelta = last.raw_value - first.raw_value;

  const totalMoves = up + down + flat;
  const upShare = totalMoves ? up / totalMoves : 0;
  const downShare = totalMoves ? down / totalMoves : 0;

  let shape = "mixed";
  if (upShare >= 0.7) shape = "generally upward";
  else if (downShare >= 0.7) shape = "generally downward";
  else if (Math.abs(overallDelta) < 1e-9) shape = "relatively flat";
  else shape = "volatile";

  const recent = valid.slice(-3);
  const priorRecent = valid.slice(-6, -3);

  let recentText = "";
  if (recent.length > 0 && priorRecent.length > 0) {
    const recentAvg = recent.reduce((sum, p) => sum + p.raw_value, 0) / recent.length;
    const priorAvg = priorRecent.reduce((sum, p) => sum + p.raw_value, 0) / priorRecent.length;
    const recentDelta = recentAvg - priorAvg;

    if (recentDelta > 0) {
      recentText = ` Recent performance is improving versus the prior 3 ${grain}s (${formatDeltaValue(
        recentDelta,
        formatType
      )}).`;
    } else if (recentDelta < 0) {
      recentText = ` Recent performance is softer versus the prior 3 ${grain}s (${formatDeltaValue(
        recentDelta,
        formatType
      )}).`;
    } else {
      recentText = ` Recent performance is flat versus the prior 3 ${grain}s.`;
    }
  }

  return `${metricName} shows a ${shape} trend over the last ${valid.length} ${grain} periods, moving from ${first.value} in ${first.period} to ${last.value} in ${last.period} (${formatDeltaValue(
    overallDelta,
    formatType
  )}).${recentText}`;
}

export async function analyzeBusinessQuestion(
  businessQuestion: string
): Promise<AnalyzeBusinessQuestionResult> {
  const plan = await buildBusinessQuestionDriverPlan(businessQuestion);

  if (!plan.found) return { found: false, message: plan.message };

  const registry = await loadMetricRegistry();
  const metric = plan.metric;
  const metricEntry = registry.get(canonicalMetricId(metric.metric_id));
  const candidateDrivers = (metricEntry?.candidateDrivers || metric.candidate_drivers || []).filter(
    (d) => !["channel_mix", "market_mix"].includes(normalize(d))
  );
  const datasets = plan.datasets.filter((d) => d.link);

  if (!datasets.length) {
    return { found: false, message: `No linked datasets found for metric: ${metric.metric_id}` };
  }

  const rawLoaded = await Promise.all(
    datasets.map(async (d) => ({
      dataset: String(d.dataset || d.sheet_name || ""),
      link: d.link,
      rows: await loadJsonFromUrl<DatasetRow[]>(String(d.link)),
    }))
  );

  const scope = parseBusinessQuestionScopeFromRows(
    businessQuestion,
    rawLoaded.flatMap((d) => d.rows)
  );

  const scopedLoaded: ScopedLoadedDataset[] = rawLoaded.map((d) => {
    const supportsMarket = datasetSupportsAnyField(d.rows, ["market", "Market"]);
    const supportsChannel = datasetSupportsAnyField(d.rows, [
      "channel_category", "Channel Category", "channel", "Channel",
    ]);

    const filteredRows = d.rows.filter((row) =>
      rowMatchesOptionalFilters(row, scope, supportsMarket, supportsChannel)
    );

    const scoped = splitRowsCurrentVsPrior(filteredRows, scope.time_grain, scope.target_bucket);

    return {
      dataset: d.dataset,
      link: d.link,
      filteredRows,
      currentRows: scoped.current,
      priorRows: scoped.prior,
      currentLabel: scoped.current_label,
      priorLabel: scoped.prior_label,
      supportsMarket,
      supportsChannel,
    };
  });

  const primaryDataset = metricEntry?.primaryDatasetId || PRIMARY_DATASET_MAP[canonicalMetricId(metric.metric_id)];
  const kpiLoaded = primaryDataset ? filterScopedLoadedByDataset(scopedLoaded, primaryDataset) : scopedLoaded;

  if (!kpiLoaded.length) {
    return { found: false, message: `Primary dataset not found for metric: ${metric.metric_id}` };
  }

  const allCurrentRows = kpiLoaded.flatMap((d) => d.currentRows);
  const allPriorRows = kpiLoaded.flatMap((d) => d.priorRows);
  const kpiAllRows = kpiLoaded.flatMap((d) => d.filteredRows);
  const comparisonSource = kpiLoaded[0];

  if (!allCurrentRows.length) {
    return { found: false, message: `No rows found for current ${scope.time_grain} period for metric: ${metric.metric_id}` };
  }

  if (!allPriorRows.length) {
    return { found: false, message: `No rows found for prior ${scope.time_grain} comparison period for metric: ${metric.metric_id}` };
  }

  const currentMetricValue = maybeProjectMetricValue({
    metricId: metric.metric_id,
    grain: scope.time_grain,
    allDatasetRows: kpiAllRows,
    scopedBucketRows: allCurrentRows,
    targetBucket: comparisonSource?.currentLabel,
  });

  const priorMetricValue = computeMetricValue(metric.metric_id, allPriorRows);
  const deltaMetricValue = computeDelta(currentMetricValue, priorMetricValue);
  const metricChangeDirection = deriveMetricChangeDirection(currentMetricValue, priorMetricValue);

  const driverObservations: DriverObservation[] = candidateDrivers.map((driverId) => {
    const driverPrimaryDataset = PRIMARY_DATASET_MAP[canonicalMetricId(driverId)];
    const relationship = getDriverRelationship(metric.metric_id, driverId);

    const driverLoaded = driverPrimaryDataset
      ? filterScopedLoadedByDataset(scopedLoaded, driverPrimaryDataset)
      : scopedLoaded;

    const driverDatasetMeta = driverLoaded[0];

    if (!driverLoaded.length) {
      return {
        driverId,
        currentValue: null,
        priorValue: null,
        deltaValue: null,
        formatType: inferFormatType(driverId),
        datasetUsed: driverPrimaryDataset || "mixed",
        currentRowsCount: 0,
        priorRowsCount: 0,
        relationship,
        explanatoryDirection: "unknown" as const,
        explanatoryScore: 0,
        missingReason: "driver dataset was not loaded",
      };
    }

    if (scope.channel && !driverDatasetMeta?.supportsChannel) {
      return {
        driverId,
        currentValue: null,
        priorValue: null,
        deltaValue: null,
        formatType: inferFormatType(driverId),
        datasetUsed: driverPrimaryDataset || "mixed",
        currentRowsCount: 0,
        priorRowsCount: 0,
        relationship,
        explanatoryDirection: "unknown" as const,
        explanatoryScore: 0,
        missingReason: `dataset ${driverPrimaryDataset || "mixed"} does not support channel slicing`,
      };
    }

    if (scope.market && !driverDatasetMeta?.supportsMarket) {
      return {
        driverId,
        currentValue: null,
        priorValue: null,
        deltaValue: null,
        formatType: inferFormatType(driverId),
        datasetUsed: driverPrimaryDataset || "mixed",
        currentRowsCount: 0,
        priorRowsCount: 0,
        relationship,
        explanatoryDirection: "unknown" as const,
        explanatoryScore: 0,
        missingReason: `dataset ${driverPrimaryDataset || "mixed"} does not support market slicing`,
      };
    }

    const driverCurrentRows = driverLoaded.flatMap((d) => d.currentRows);
    const driverPriorRows = driverLoaded.flatMap((d) => d.priorRows);

    const currentValue = maybeProjectMetricValue({
      metricId: driverId,
      grain: scope.time_grain,
      allDatasetRows: driverLoaded.flatMap((d) => d.filteredRows),
      scopedBucketRows: driverCurrentRows,
      targetBucket: driverLoaded[0]?.currentLabel,
    });

    const priorValue = computeMetricValue(driverId, driverPriorRows);
    const deltaValue = computeDelta(currentValue, priorValue);
    const explanatory = classifyDriverEffect({
      relationship,
      deltaValue,
      metricChangeDirection,
    });

    return {
      driverId,
      currentValue,
      priorValue,
      deltaValue,
      formatType: inferFormatType(driverId),
      datasetUsed: driverPrimaryDataset || "mixed",
      currentRowsCount: driverCurrentRows.length,
      priorRowsCount: driverPriorRows.length,
      relationship,
      explanatoryDirection: explanatory.direction,
      explanatoryScore: explanatory.score,
    };
  });

  const rankedDrivers = rankDriverObservations(driverObservations);
  const observations: string[] = [];

  if (currentMetricValue === null || priorMetricValue === null) {
    observations.push(
      `${metric.metric_name} could not be fully computed from the scoped rows for ${comparisonSource?.currentLabel || "current period"} versus ${comparisonSource?.priorLabel || "prior period"}.`
    );
  }

  const primaryHeadwind = rankedDrivers.find((d) => d.explanatoryDirection === "hurts");
  const secondaryHeadwind = rankedDrivers.filter((d) => d.explanatoryDirection === "hurts").slice(1, 2)[0];
  const support = rankedDrivers.find((d) => d.explanatoryDirection === "supports");
  const contextSignal = rankedDrivers.find((d) => d.explanatoryDirection === "context");

  if (metricChangeDirection === "up") {
    if (support) {
      observations.push(
        `Primary contributing factor: ${buildDriverObservationText(support, "tailwind", metricChangeDirection)}`
      );
    }
    if (primaryHeadwind) {
      observations.push(
        `Headwind: ${buildDriverObservationText(primaryHeadwind, "headwind", metricChangeDirection)}`
      );
    }
    if (secondaryHeadwind) {
      observations.push(
        `Secondary headwind: ${buildDriverObservationText(secondaryHeadwind, "headwind", metricChangeDirection)}`
      );
    }
  } else {
    if (primaryHeadwind) {
      observations.push(
        `Primary driver: ${buildDriverObservationText(primaryHeadwind, "headwind", metricChangeDirection)}`
      );
    }
    if (secondaryHeadwind) {
      observations.push(
        `Secondary driver: ${buildDriverObservationText(secondaryHeadwind, "headwind", metricChangeDirection)}`
      );
    }
    if (support) {
      observations.push(
        `Offsetting factor: ${buildDriverObservationText(support, "tailwind", metricChangeDirection)}`
      );
    }
  }

  if (!primaryHeadwind && !support && contextSignal) {
    observations.push(
      `Context: ${buildDriverObservationText(contextSignal, "context", metricChangeDirection)}`
    );
  }

  if (scope.market) observations.push(`Scope: market = ${scope.market}.`);
  if (scope.channel) observations.push(`Scope: channel = ${scope.channel}.`);
  if (primaryDataset) observations.push(`Dataset used: ${primaryDataset}.`);

  const uncomputableDrivers = rankedDrivers.filter((obs) => obs.currentValue === null && obs.priorValue === null);

  const summary = buildAnalysisSummary({
    metric,
    currentMetricValue,
    priorMetricValue,
    deltaMetricValue,
    rankedDrivers,
    currentLabel: comparisonSource?.currentLabel || "current period",
    priorLabel: comparisonSource?.priorLabel || "prior period",
  });

  const usableDrivers = rankedDrivers.filter((d) => d.currentValue !== null || d.priorValue !== null).length;
  const confidence = buildConfidenceScore({
    metricMatched: true,
    metricScore: plan.confidence.score,
    datasetCount: scopedLoaded.length,
    currentRows: allCurrentRows.length,
    priorRows: allPriorRows.length,
    totalDrivers: candidateDrivers.length,
    usableDrivers,
    explicitScope: Boolean(scope.market || scope.channel || scope.target_bucket),
  });

  return {
    found: true,
    metric,
    scope,
    datasets_used: scopedLoaded.map((d) => ({
      dataset: d.dataset,
      link: d.link,
      row_count: d.filteredRows.length,
      current_row_count: d.currentRows.length,
      prior_row_count: d.priorRows.length,
    })),
    analysis: {
      business_question: businessQuestion,
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      current_value: formatMetricValue(currentMetricValue, metric.format_type || inferFormatType(metric.metric_id)),
      prior_value: formatMetricValue(priorMetricValue, metric.format_type || inferFormatType(metric.metric_id)),
      delta_value: formatDeltaValue(deltaMetricValue, metric.format_type || inferFormatType(metric.metric_id)),
      candidate_drivers: candidateDrivers,
      summary,
      observations,
      confidence,
      debug: {
        uncomputable_drivers: uncomputableDrivers.slice(0, 5).map((obs) => ({
          driver_id: obs.driverId,
          dataset_used: obs.datasetUsed,
          missing_reason: obs.missingReason,
          current_rows_count: obs.currentRowsCount,
          prior_rows_count: obs.priorRowsCount,
        })),
      },
    },
  };
}

export async function analyzeMarketPerformance(
  businessQuestion: string
): Promise<AnalyzeMarketPerformanceResult> {
  const metricResult = await findMetricDefinition(businessQuestion);
  if (!metricResult.found) return { found: false, message: metricResult.message };
  return await analyzeMarketPerformanceWithMetric(
    businessQuestion,
    metricResult.metric,
    metricResult.score
  );
}

async function analyzeMarketPerformanceWithMetric(
  businessQuestion: string,
  metric: MetricDefinition,
  metricScore: number
): Promise<AnalyzeMarketPerformanceResult> {
  const primaryDatasetId = PRIMARY_DATASET_MAP[canonicalMetricId(metric.metric_id)];
  if (!primaryDatasetId) {
    return {
      found: false,
      message: `No primary dataset mapping found for metric: ${metric.metric_id}`,
    };
  }

  const datasets = await findDatasetsByIds([primaryDatasetId]);
  const dataset = datasets.find((d) => d.link);

  if (!dataset?.link) {
    return {
      found: false,
      message: `No linked dataset found for metric: ${metric.metric_id}`,
    };
  }

  const loadedRows = await loadJsonFromUrl<DatasetRow[]>(String(dataset.link));
  const scope = parseBusinessQuestionScopeFromRows(businessQuestion, loadedRows);

  const supportsMarket = datasetSupportsAnyField(loadedRows, ["market", "Market"]);
  const supportsChannel = datasetSupportsAnyField(loadedRows, [
    "channel_category",
    "Channel Category",
    "channel",
    "Channel",
  ]);

  if (!supportsMarket) {
    return {
      found: false,
      message: `Dataset ${primaryDatasetId} does not support market analysis.`,
    };
  }

  const filtered = loadedRows.filter((row) =>
    rowMatchesOptionalFilters(
      row,
      { ...scope, market: undefined },
      true,
      supportsChannel
    )
  );

  const scoped = splitRowsCurrentVsPrior(filtered, scope.time_grain, scope.target_bucket);

  if (!scoped.current.length || !scoped.prior.length) {
    return {
      found: false,
      message: `Insufficient current versus prior market rows for ${metric.metric_name}.`,
    };
  }

  const currentByMarket = groupRowsByMarket(scoped.current);
  const priorByMarket = groupRowsByMarket(scoped.prior);
  const markets = Array.from(new Set([...currentByMarket.keys(), ...priorByMarket.keys()]));
  const formatType = metric.format_type || inferFormatType(metric.metric_id);

  const results = markets
    .map((marketKey) => {
      const currentRows = currentByMarket.get(marketKey) || [];
      const priorRows = priorByMarket.get(marketKey) || [];

      const currentValue = computeMetricValue(metric.metric_id, currentRows);
      const priorValue = computeMetricValue(metric.metric_id, priorRows);
      const deltaValue = computeDelta(currentValue, priorValue);

      const marketLabel =
        currentRows[0]
          ? String(currentRows[0]["market"] || currentRows[0]["Market"] || "").trim()
          : priorRows[0]
          ? String(priorRows[0]["market"] || priorRows[0]["Market"] || "").trim()
          : marketKey;

      return {
        market: marketLabel,
        currentValue,
        priorValue,
        deltaValue,
      };
    })
    .filter((r) => r.currentValue !== null || r.priorValue !== null);

  if (!results.length) {
    return {
      found: false,
      message: `No market-level results found for ${metric.metric_name}.`,
    };
  }

  const underperforming = results
    .filter((r) => isUnderperformingMetric(metric, r.currentValue, r.priorValue))
    .sort(
      (a, b) =>
        underperformanceScore(metric, b.currentValue, b.priorValue) -
        underperformanceScore(metric, a.currentValue, a.priorValue)
    );

  const top = underperforming.slice(0, 5);

  const observations = top.map(
    (row) =>
      `${row.market}: ${formatMetricValue(row.currentValue, formatType)} vs ${formatMetricValue(
        row.priorValue,
        formatType
      )} (${formatDeltaValue(row.deltaValue, formatType)}).`
  );

  const summary = top.length
    ? `Most underperforming markets for ${metric.metric_name} in ${scoped.current_label} versus ${scoped.prior_label}: ${top
        .map((r) => r.market)
        .join(", ")}.`
    : `No markets appear to be underperforming for ${metric.metric_name} in ${scoped.current_label} versus ${scoped.prior_label}.`;

  const confidence = buildConfidenceScore({
    metricMatched: true,
    metricScore,
    datasetCount: 1,
    currentRows: scoped.current.length,
    priorRows: scoped.prior.length,
    explicitScope: Boolean(scope.channel || scope.target_bucket),
  });

  return {
    found: true,
    metric,
    scope: { ...scope, market: undefined } as ParsedBusinessScope,
    datasets_used: [
      {
        dataset: String(dataset.dataset || dataset.sheet_name || ""),
        link: dataset.link,
        row_count: filtered.length,
      },
    ],
    analysis: {
      business_question: businessQuestion,
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      period: scoped.current_label,
      comparison_period: scoped.prior_label,
      summary,
      underperforming_markets: top.map((r) => ({
        market: r.market,
        current_value: formatMetricValue(r.currentValue, formatType),
        prior_value: formatMetricValue(r.priorValue, formatType),
        delta_value: formatDeltaValue(r.deltaValue, formatType),
        raw_current_value: r.currentValue,
        raw_prior_value: r.priorValue,
        raw_delta_value: r.deltaValue,
      })),
      observations,
      confidence,
    },
  };
}

export async function analyzeMixChange(
  businessQuestion: string
): Promise<AnalyzeMixChangeResult> {
  const normalized = normalize(businessQuestion);
  const mixDimension: "channel" | "market" =
    normalized.includes("market mix") ? "market" : "channel";

  const baseMetric =
    normalized.includes("job mix") || normalized.includes("completed")
      ? "jobs_completed"
      : "leads";

  const primaryDatasetId = PRIMARY_DATASET_MAP[canonicalMetricId(baseMetric)];
  if (!primaryDatasetId) {
    return { found: false, message: `No primary dataset mapping found for mix base metric: ${baseMetric}` };
  }

  const datasets = await findDatasetsByIds([primaryDatasetId]);
  const dataset = datasets.find((d) => d.link);

  if (!dataset?.link) {
    return { found: false, message: `No linked dataset found for mix analysis.` };
  }

  const loadedRows = await loadJsonFromUrl<DatasetRow[]>(String(dataset.link));
  const scope = parseBusinessQuestionScopeFromRows(businessQuestion, loadedRows);

  const supportsMarket = datasetSupportsAnyField(loadedRows, ["market", "Market"]);
  const supportsChannel = datasetSupportsAnyField(loadedRows, [
    "channel_category", "Channel Category", "channel", "Channel",
  ]);

  if (mixDimension === "market" && !supportsMarket) {
    return { found: false, message: `Dataset ${primaryDatasetId} does not support market mix analysis.` };
  }

  if (mixDimension === "channel" && !supportsChannel) {
    return { found: false, message: `Dataset ${primaryDatasetId} does not support channel mix analysis.` };
  }

  const filtered = loadedRows.filter((row) =>
    rowMatchesOptionalFilters(
      row,
      {
        ...scope,
        channel: mixDimension === "channel" ? undefined : scope.channel,
        market: mixDimension === "market" ? undefined : scope.market,
      },
      supportsMarket,
      supportsChannel
    )
  );

  const scoped = splitRowsCurrentVsPrior(filtered, scope.time_grain, scope.target_bucket);

  if (!scoped.current.length || !scoped.prior.length) {
    return { found: false, message: `Insufficient current versus prior rows for ${mixDimension} mix analysis.` };
  }

  const dimAccessor =
    mixDimension === "channel"
      ? (row: DatasetRow) =>
          String(
            row["channel_category"] ||
              row["Channel Category"] ||
              row["channel"] ||
              row["Channel"] ||
              ""
          ).trim()
      : (row: DatasetRow) => String(row["market"] || row["Market"] || "").trim();

  const currentTotal = computeMetricValue(baseMetric, scoped.current) ?? 0;
  const priorTotal = computeMetricValue(baseMetric, scoped.prior);

  if (priorTotal === null || currentTotal === 0 || priorTotal === 0) {
    return { found: false, message: `Unable to compute totals for ${mixDimension} mix analysis.` };
  }

  const allValues = Array.from(new Set([...scoped.current, ...scoped.prior].map(dimAccessor).filter(Boolean)));

  const changes = allValues
    .map((value) => {
      const currentRows = scoped.current.filter((r) => normalize(dimAccessor(r)) === normalize(value));
      const priorRows = scoped.prior.filter((r) => normalize(dimAccessor(r)) === normalize(value));

      const currentValue = computeMetricValue(baseMetric, currentRows) ?? 0;
      const priorValue = computeMetricValue(baseMetric, priorRows) ?? 0;
      const currentShare = currentTotal > 0 ? currentValue / currentTotal : 0;
      const priorShare = priorTotal > 0 ? priorValue / priorTotal : 0;
      const shareDelta = currentShare - priorShare;

      return {
        dimension_value: value,
        current_value: formatMetricValue(currentValue, "number"),
        prior_value: formatMetricValue(priorValue, "number"),
        current_share: formatMetricValue(currentShare, "percent"),
        prior_share: formatMetricValue(priorShare, "percent"),
        share_delta: formatDeltaValue(shareDelta, "percent"),
        raw_current_value: currentValue,
        raw_prior_value: priorValue,
        raw_current_share: currentShare,
        raw_prior_share: priorShare,
        raw_share_delta: shareDelta,
      };
    })
    .sort((a, b) => Math.abs(b.raw_share_delta) - Math.abs(a.raw_share_delta));

  const top = changes.slice(0, 6);
  const observations = top.map(
    (row) =>
      `${row.dimension_value}: ${row.current_share} vs ${row.prior_share} (${row.share_delta}), volume ${row.current_value} vs ${row.prior_value}.`
  );

  const summary = top.length
    ? `${capitalize(baseMetric.replace(/_/g, " "))} ${mixDimension} changed in ${scoped.current_label} versus ${scoped.prior_label}. Biggest share shifts: ${top
        .slice(0, 3)
        .map((r) => `${r.dimension_value} (${r.share_delta})`)
        .join(", ")}.`
    : `No meaningful ${mixDimension} mix changes found in ${scoped.current_label} versus ${scoped.prior_label}.`;

  const confidence = buildConfidenceScore({
    metricMatched: true,
    metricScore: 80,
    datasetCount: 1,
    currentRows: scoped.current.length,
    priorRows: scoped.prior.length,
    explicitScope: Boolean(scope.market || scope.channel || scope.target_bucket),
  });

  return {
    found: true,
    scope: { ...scope },
    datasets_used: [
      {
        dataset: String(dataset.dataset || dataset.sheet_name || ""),
        link: dataset.link,
        row_count: filtered.length,
      },
    ],
    analysis: {
      business_question: businessQuestion,
      mix_dimension: mixDimension,
      base_metric: baseMetric,
      period: scoped.current_label,
      comparison_period: scoped.prior_label,
      summary,
      changes: top,
      observations,
      confidence,
    },
  };
}

export async function queryMetricValue(question: string): Promise<QueryMetricValueResult> {
  const metricResult = await findMetricDefinition(question);
  if (!metricResult.found) return { found: false, message: metricResult.message };

  const registry = await loadMetricRegistry();
  const metric = metricResult.metric;
  const entry = registry.get(canonicalMetricId(metric.metric_id));

  const primaryDataset = entry?.primaryDatasetId || PRIMARY_DATASET_MAP[canonicalMetricId(metric.metric_id)];
  const relevantDatasets = entry?.relevantDatasets || metric.relevant_datasets || [];
  const linkedDatasets = await findDatasetsByIds(relevantDatasets.length ? relevantDatasets : primaryDataset ? [primaryDataset] : []);

  const datasetsToUse = linkedDatasets.filter((d) => d.link);
  const preferredDatasets = primaryDataset
    ? datasetsToUse.filter(
        (d) => normalize(String(d.dataset || d.sheet_name || "")).replace(/\.json$/, "") === normalize(primaryDataset)
      )
    : datasetsToUse;

  const finalDatasets = preferredDatasets.length ? preferredDatasets : datasetsToUse;

  if (!finalDatasets.length) {
    return { found: false, message: `No linked datasets found for metric: ${metric.metric_id}` };
  }

  const loaded = await Promise.all(
    finalDatasets.map(async (d) => ({
      dataset: String(d.dataset || d.sheet_name || ""),
      link: d.link,
      rows: await loadJsonFromUrl<DatasetRow[]>(String(d.link)),
    }))
  );

  const scope = parsePointInTimeScopeFromRows(question, loaded.flatMap((d) => d.rows));

  const scopedLoaded = loaded.map((d) => {
    const supportsMarket = datasetSupportsAnyField(d.rows, ["market", "Market"]);
    const supportsChannel = datasetSupportsAnyField(d.rows, [
      "channel_category", "Channel Category", "channel", "Channel",
    ]);

    const filteredByDimensions = d.rows.filter((row) =>
      rowMatchesPointInTimeFilters(row, scope, supportsMarket, supportsChannel)
    );

    const bucketRows = filterRowsToTargetBucket(filteredByDimensions, scope.time_grain, scope.target_bucket);

    return {
      dataset: d.dataset,
      link: d.link,
      filteredRows: filteredByDimensions,
      bucketRows,
    };
  });

  const usable = scopedLoaded.filter((d) => d.bucketRows.length > 0);

  if (!usable.length) {
    return {
      found: false,
      message: `No rows found for ${scope.period_label}${scope.market ? ` in ${scope.market}` : ""}${scope.channel ? ` for ${scope.channel}` : ""}.`,
    };
  }

  const allRows = usable.flatMap((d) => d.bucketRows);
  const fullDatasetRows = loaded.flatMap((d) => d.rows);
  const formatType = entry?.formatType || metric.format_type || inferFormatType(metric.metric_id);

  const rawValue = maybeProjectMetricValue({
    metricId: metric.metric_id,
    grain: scope.time_grain,
    allDatasetRows: fullDatasetRows,
    scopedBucketRows: allRows,
    targetBucket: scope.target_bucket,
  });

  if (rawValue === null) {
    return { found: false, message: `Unable to compute ${metric.metric_name} for ${scope.period_label}.` };
  }

  const value = formatMetricValue(rawValue, formatType);
  const scopeParts = [scope.market ? `market ${scope.market}` : "", scope.channel ? `channel ${scope.channel}` : "", scope.period_label].filter(Boolean);

  const confidence = buildConfidenceScore({
    metricMatched: true,
    metricScore: metricResult.score,
    datasetCount: usable.length,
    currentRows: allRows.length,
    explicitScope: Boolean(scope.market || scope.channel || scope.target_bucket),
  });

  return {
    found: true,
    metric,
    scope,
    datasets_used: scopedLoaded.map((d) => ({
      dataset: d.dataset,
      link: d.link,
      row_count: d.bucketRows.length,
    })),
    result: {
      question,
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      value,
      raw_value: rawValue,
      period: scope.period_label,
      market: scope.market,
      channel: scope.channel,
      summary: `${metric.metric_name} was ${value} for ${scopeParts.join(", ")}.`,
      confidence,
    },
  };
}

export async function analyzeMetricTrend(
  businessQuestion: string
): Promise<AnalyzeMetricTrendResult> {
  const metricResult = await findMetricDefinition(businessQuestion);
  if (!metricResult.found) return { found: false, message: metricResult.message };

  const registry = await loadMetricRegistry();
  const metric = metricResult.metric;
  const entry = registry.get(canonicalMetricId(metric.metric_id));
  const primaryDatasetId = entry?.primaryDatasetId || PRIMARY_DATASET_MAP[canonicalMetricId(metric.metric_id)];

  if (!primaryDatasetId) {
    return { found: false, message: `No primary dataset mapping found for metric: ${metric.metric_id}` };
  }

  const datasets = await findDatasetsByIds([primaryDatasetId]);
  const dataset = datasets.find((d) => d.link);
  if (!dataset?.link) return { found: false, message: `No linked dataset found for metric trend.` };

  const rows = await loadJsonFromUrl<DatasetRow[]>(String(dataset.link));
  const pointScope = parsePointInTimeScopeFromRows(businessQuestion, rows);

  const supportsMarket = datasetSupportsAnyField(rows, ["market", "Market"]);
  const supportsChannel = datasetSupportsAnyField(rows, ["channel_category", "Channel Category", "channel", "Channel"]);

  const filtered = rows.filter((row) =>
    rowMatchesPointInTimeFilters(row, pointScope, supportsMarket, supportsChannel)
  );

  const fieldCandidates = getBucketDateFieldCandidates(pointScope.time_grain);
  const bucketKeys = Array.from(new Set(filtered.map((row) => getBucketKey(row, fieldCandidates)).filter(Boolean)))
    .sort((a, b) => Date.parse(a) - Date.parse(b))
    .slice(-MAX_TREND_POINTS);

  if (!bucketKeys.length) {
    return { found: false, message: `No rows found for trend analysis.` };
  }

  const formatType = entry?.formatType || metric.format_type || inferFormatType(metric.metric_id);
  const latestBucket = bucketKeys[bucketKeys.length - 1];

  const points = bucketKeys.map((bucket) => {
    const bucketRows = filtered.filter((row) => getBucketKey(row, fieldCandidates) === bucket);
    const isProjected =
      ADDITIVE_METRICS.has(canonicalMetricId(metric.metric_id)) &&
      isLatestBucketForGrain(filtered, pointScope.time_grain, bucket);

    const rawValue = isProjected
      ? maybeProjectMetricValue({
          metricId: metric.metric_id,
          grain: pointScope.time_grain,
          allDatasetRows: filtered,
          scopedBucketRows: bucketRows,
          targetBucket: bucket,
        })
      : computeMetricValue(metric.metric_id, bucketRows);

    return {
      period: bucket,
      value: formatMetricValue(rawValue, formatType),
      raw_value: rawValue,
      is_projected: Boolean(isProjected),
    };
  });

  const last = points[points.length - 1];

  const summary = buildClearTrendSummary(
    points,
    metric.metric_name,
    formatType,
    pointScope.time_grain
  );

  const observations: string[] = [];
  if (last.is_projected) {
    observations.push(`Latest period ${latestBucket} uses pacing-aware projection.`);
  }
  observations.push(`Trend covers ${points.length} ${pointScope.time_grain} periods.`);
  if (pointScope.market) observations.push(`Scope: market = ${pointScope.market}.`);
  if (pointScope.channel) observations.push(`Scope: channel = ${pointScope.channel}.`);

  const confidence = buildConfidenceScore({
    metricMatched: true,
    metricScore: metricResult.score,
    datasetCount: 1,
    currentRows: filtered.length,
    explicitScope: Boolean(pointScope.market || pointScope.channel),
  });

  return {
    found: true,
    metric,
    scope: {
      time_grain: pointScope.time_grain,
      market: pointScope.market,
      channel: pointScope.channel,
    },
    datasets_used: [
      {
        dataset: String(dataset.dataset || dataset.sheet_name || ""),
        link: dataset.link,
        row_count: filtered.length,
      },
    ],
    analysis: {
      business_question: businessQuestion,
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      summary,
      points,
      observations,
      confidence,
    },
  };
}

export async function analyzeContributionToChange(
  businessQuestion: string
): Promise<AnalyzeContributionToChangeResult> {
  const metricResult = await findMetricDefinition(businessQuestion);
  if (!metricResult.found) return { found: false, message: metricResult.message };

  const registry = await loadMetricRegistry();
  const metric = metricResult.metric;
  const entry = registry.get(canonicalMetricId(metric.metric_id));

  if (entry?.kind !== "additive" && !ADDITIVE_METRICS.has(canonicalMetricId(metric.metric_id))) {
    return {
      found: false,
      message: `Contribution to change is best supported for additive metrics. ${metric.metric_name} is not additive.`,
    };
  }

  const primaryDatasetId = entry?.primaryDatasetId || PRIMARY_DATASET_MAP[canonicalMetricId(metric.metric_id)];
  if (!primaryDatasetId) {
    return { found: false, message: `No primary dataset mapping found for metric: ${metric.metric_id}` };
  }

  const datasets = await findDatasetsByIds([primaryDatasetId]);
  const dataset = datasets.find((d) => d.link);
  if (!dataset?.link) return { found: false, message: `No linked dataset found.` };

  const rows = await loadJsonFromUrl<DatasetRow[]>(String(dataset.link));
  const scope = parseBusinessQuestionScopeFromRows(businessQuestion, rows);

  const dimension: "market" | "channel" =
    normalize(businessQuestion).includes("channel") ? "channel" : "market";

  const supportsMarket = datasetSupportsAnyField(rows, ["market", "Market"]);
  const supportsChannel = datasetSupportsAnyField(rows, ["channel_category", "Channel Category", "channel", "Channel"]);

  if (dimension === "market" && !supportsMarket) {
    return { found: false, message: `Dataset ${primaryDatasetId} does not support market contribution analysis.` };
  }
  if (dimension === "channel" && !supportsChannel) {
    return { found: false, message: `Dataset ${primaryDatasetId} does not support channel contribution analysis.` };
  }

  const filtered = rows.filter((row) =>
    rowMatchesOptionalFilters(
      row,
      {
        ...scope,
        market: dimension === "market" ? undefined : scope.market,
        channel: dimension === "channel" ? undefined : scope.channel,
      },
      supportsMarket,
      supportsChannel
    )
  );

  const scoped = splitRowsCurrentVsPrior(filtered, scope.time_grain, scope.target_bucket);
  if (!scoped.current.length || !scoped.prior.length) {
    return { found: false, message: `Insufficient current versus prior rows for contribution analysis.` };
  }

  const dimensionValue = (row: DatasetRow) =>
    dimension === "market"
      ? String(row["market"] || row["Market"] || "").trim()
      : String(row["channel_category"] || row["Channel Category"] || row["channel"] || row["Channel"] || "").trim();

  const values = Array.from(new Set([...scoped.current, ...scoped.prior].map(dimensionValue).filter(Boolean)));
  const formatType = entry?.formatType || metric.format_type || inferFormatType(metric.metric_id);

  const contributions = values
    .map((segment) => {
      const currentRows = scoped.current.filter((r) => normalize(dimensionValue(r)) === normalize(segment));
      const priorRows = scoped.prior.filter((r) => normalize(dimensionValue(r)) === normalize(segment));

      const currentValue = maybeProjectMetricValue({
        metricId: metric.metric_id,
        grain: scope.time_grain,
        allDatasetRows: filtered,
        scopedBucketRows: currentRows,
        targetBucket: scoped.current_label,
      });

      const priorValue = computeMetricValue(metric.metric_id, priorRows);
      const contribution = computeDelta(currentValue, priorValue);

      return {
        segment,
        current_value: formatMetricValue(currentValue, formatType),
        prior_value: formatMetricValue(priorValue, formatType),
        contribution_to_change: formatDeltaValue(contribution, formatType),
        raw_current_value: currentValue,
        raw_prior_value: priorValue,
        raw_contribution_to_change: contribution,
      };
    })
    .sort((a, b) => Math.abs(b.raw_contribution_to_change || 0) - Math.abs(a.raw_contribution_to_change || 0))
    .slice(0, 8);

  const observations = contributions.slice(0, 5).map(
    (r) => `${r.segment}: contribution ${r.contribution_to_change} (${r.current_value} vs ${r.prior_value}).`
  );

  const summary = contributions.length
    ? `${dimension === "market" ? "Markets" : "Channels"} contributing most to ${metric.metric_name} change in ${scoped.current_label} versus ${scoped.prior_label}: ${contributions
        .slice(0, 3)
        .map((r) => `${r.segment} (${r.contribution_to_change})`)
        .join(", ")}.`
    : `No segment contributions found.`;

  const confidence = buildConfidenceScore({
    metricMatched: true,
    metricScore: metricResult.score,
    datasetCount: 1,
    currentRows: scoped.current.length,
    priorRows: scoped.prior.length,
    explicitScope: Boolean(scope.market || scope.channel || scope.target_bucket),
  });

  return {
    found: true,
    metric,
    scope,
    datasets_used: [
      {
        dataset: String(dataset.dataset || dataset.sheet_name || ""),
        link: dataset.link,
        row_count: filtered.length,
      },
    ],
    analysis: {
      business_question: businessQuestion,
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      dimension,
      period: scoped.current_label,
      comparison_period: scoped.prior_label,
      summary,
      contributions,
      observations,
      confidence,
    },
  };
}

export async function compareSegments(
  businessQuestion: string
): Promise<CompareSegmentsResult> {
  const metricResult = await findMetricDefinition(businessQuestion);
  if (!metricResult.found) return { found: false, message: metricResult.message };

  const registry = await loadMetricRegistry();
  const metric = metricResult.metric;
  const entry = registry.get(canonicalMetricId(metric.metric_id));
  const primaryDatasetId = entry?.primaryDatasetId || PRIMARY_DATASET_MAP[canonicalMetricId(metric.metric_id)];

  if (!primaryDatasetId) {
    return { found: false, message: `No primary dataset mapping found for metric: ${metric.metric_id}` };
  }

  const datasets = await findDatasetsByIds([primaryDatasetId]);
  const dataset = datasets.find((d) => d.link);
  if (!dataset?.link) return { found: false, message: `No linked dataset found.` };

  const rows = await loadJsonFromUrl<DatasetRow[]>(String(dataset.link));
  const scope = parsePointInTimeScopeFromRows(businessQuestion, rows);
  const supportsMarket = datasetSupportsAnyField(rows, ["market", "Market"]);
  const supportsChannel = datasetSupportsAnyField(rows, ["channel_category", "Channel Category", "channel", "Channel"]);

  const allMarkets = uniqueDimensionValues(rows, ["market", "Market"]);
  const allChannels = uniqueDimensionValues(rows, ["channel_category", "Channel Category", "channel", "Channel"]);

  const dimension: "market" | "channel" =
    findComparedSegments(normalize(businessQuestion), allMarkets).length >= 2
      ? "market"
      : "channel";

  const candidates = dimension === "market" ? allMarkets : allChannels;
  const matches = findComparedSegments(normalize(businessQuestion), candidates);

  if (matches.length < 2) {
    return { found: false, message: `Could not confidently identify two ${dimension} segments to compare.` };
  }

  const [segmentA, segmentB] = matches.slice(0, 2);
  const baseFiltered = rows.filter((row) =>
    rowMatchesPointInTimeFilters(
      row,
      { ...scope, market: dimension === "market" ? undefined : scope.market, channel: dimension === "channel" ? undefined : scope.channel },
      supportsMarket,
      supportsChannel
    )
  );

  const bucketRows = filterRowsToTargetBucket(baseFiltered, scope.time_grain, scope.target_bucket);
  if (!bucketRows.length) {
    return { found: false, message: `No rows found for ${scope.period_label}.` };
  }

  const getSegmentValue = (segment: string): number | null => {
    const rowsForSegment = bucketRows.filter((row) => {
      const value =
        dimension === "market"
          ? String(row["market"] || row["Market"] || "").trim()
          : String(row["channel_category"] || row["Channel Category"] || row["channel"] || row["Channel"] || "").trim();
      return normalize(value) === normalize(segment);
    });

    return maybeProjectMetricValue({
      metricId: metric.metric_id,
      grain: scope.time_grain,
      allDatasetRows: baseFiltered,
      scopedBucketRows: rowsForSegment,
      targetBucket: scope.target_bucket,
    });
  };

  const a = getSegmentValue(segmentA);
  const b = getSegmentValue(segmentB);
  const delta = computeDelta(a, b);
  const formatType = entry?.formatType || metric.format_type || inferFormatType(metric.metric_id);

  const confidence = buildConfidenceScore({
    metricMatched: true,
    metricScore: metricResult.score,
    datasetCount: 1,
    currentRows: bucketRows.length,
    explicitScope: true,
  });

  return {
    found: true,
    metric,
    scope: {
      time_grain: scope.time_grain,
      period_label: scope.period_label,
      dimension,
      segment_a: segmentA,
      segment_b: segmentB,
    },
    datasets_used: [
      {
        dataset: String(dataset.dataset || dataset.sheet_name || ""),
        link: dataset.link,
        row_count: bucketRows.length,
      },
    ],
    comparison: {
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      summary: `${metric.metric_name} in ${scope.period_label}: ${segmentA} = ${formatMetricValue(a, formatType)}, ${segmentB} = ${formatMetricValue(b, formatType)}, delta = ${formatDeltaValue(delta, formatType)}.`,
      segment_a: { name: segmentA, value: formatMetricValue(a, formatType), raw_value: a },
      segment_b: { name: segmentB, value: formatMetricValue(b, formatType), raw_value: b },
      delta: formatDeltaValue(delta, formatType),
      raw_delta: delta,
      confidence,
    },
  };
}
