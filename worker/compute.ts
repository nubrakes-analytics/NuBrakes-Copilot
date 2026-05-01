import type { DatasetRow, TimeGrain } from "./types";
import { METRIC_FIELD_MAP, ADDITIVE_METRICS, RATE_METRICS, canonicalMetricId, canonicalFieldName } from "./utils";

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const str = String(value).trim();
  if (!str) return null;

  const isPercent = str.includes("%");
  const stripped = str.replace(/[$,\s]/g, "");
  if (!stripped) return null;

  const n = Number(stripped.replace(/%/g, ""));
  if (!Number.isFinite(n)) return null;

  return isPercent ? n / 100 : n;
}

export function collectNumericValues(rows: DatasetRow[], fieldNames: string[]): number[] {
  const normalizedTargets = new Set(fieldNames.map(canonicalFieldName));
  const values: number[] = [];

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (!normalizedTargets.has(canonicalFieldName(key))) continue;
      const n = toNumberOrNull(value);
      if (n !== null) values.push(n);
      break;
    }
  }

  return values;
}

export function sumFieldNullable(rows: DatasetRow[], fieldNames: string[]): number | null {
  const values = collectNumericValues(rows, fieldNames);
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0);
}

export function avgFieldNullable(rows: DatasetRow[], fieldNames: string[]): number | null {
  const values = collectNumericValues(rows, fieldNames);
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function safeDivide(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null) return null;
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function addNullable(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}

export function computeMetricValue(metricId: string, rows: DatasetRow[]): number | null {
  const id = canonicalMetricId(metricId);
  const directMetricSum = sumFieldNullable(rows, METRIC_FIELD_MAP[id] || [metricId]);
  const directMetricAvg = avgFieldNullable(rows, METRIC_FIELD_MAP[id] || [metricId]);

  if (ADDITIVE_METRICS.has(id)) {
    return directMetricSum ?? null;
  }

  const leads = sumFieldNullable(rows, METRIC_FIELD_MAP["leads"]);
  const jobsBooked = sumFieldNullable(rows, METRIC_FIELD_MAP["jobs_booked"]);
  const jobsCompleted = sumFieldNullable(rows, METRIC_FIELD_MAP["jobs_completed"]);
  const canceledJobs = sumFieldNullable(rows, METRIC_FIELD_MAP["canceled_jobs"]);
  const revenue = sumFieldNullable(rows, METRIC_FIELD_MAP["revenue"]);
  const clicks = sumFieldNullable(rows, METRIC_FIELD_MAP["clicks"]);
  const impressions = sumFieldNullable(rows, METRIC_FIELD_MAP["impressions"]);
  const marketingSpend = sumFieldNullable(rows, METRIC_FIELD_MAP["marketing_spend"]);
  const availableSlots = sumFieldNullable(rows, METRIC_FIELD_MAP["available_slots"]);
  const utilizedSlots = sumFieldNullable(rows, METRIC_FIELD_MAP["utilized_slots"]);
  const customerCancels = sumFieldNullable(rows, METRIC_FIELD_MAP["customer_cancels"]);
  const hqCancels = sumFieldNullable(rows, METRIC_FIELD_MAP["hq_cancels"]);
  const customerReschedules = sumFieldNullable(rows, METRIC_FIELD_MAP["customer_reschedules"]);
  const hqReschedules = sumFieldNullable(rows, METRIC_FIELD_MAP["hq_reschedules"]);

  switch (id) {
    case "booking_rate":
      return safeDivide(jobsBooked, leads) ?? directMetricAvg;
    case "conversion_rate":
      return safeDivide(jobsCompleted, leads) ?? directMetricAvg;
    case "cancel_rate":
      return safeDivide(canceledJobs, jobsBooked) ?? directMetricAvg;
    case "cancel_outcome_rate":
      return safeDivide(canceledJobs, addNullable(jobsCompleted, canceledJobs)) ?? directMetricAvg;
    case "aov":
      return safeDivide(revenue, jobsCompleted) ?? directMetricAvg;
    case "ctr":
      return safeDivide(clicks, impressions) ?? directMetricAvg;
    case "cpc":
      return safeDivide(marketingSpend, clicks) ?? directMetricAvg;
    case "cost_per_inquiry":
      return safeDivide(marketingSpend, leads) ?? directMetricAvg;
    case "mac":
      return safeDivide(marketingSpend, jobsCompleted) ?? directMetricAvg;
    case "technician_utilization":
      return safeDivide(utilizedSlots, availableSlots) ?? directMetricAvg;
    case "customer_cancel_rate":
      return safeDivide(customerCancels, jobsBooked) ?? directMetricAvg;
    case "hq_cancel_rate":
      return safeDivide(hqCancels, jobsBooked) ?? directMetricAvg;
    case "reschedule_rate":
      return safeDivide(addNullable(customerReschedules, hqReschedules), jobsBooked) ?? directMetricAvg;
    case "customer_reschedule_rate":
      return safeDivide(customerReschedules, jobsBooked) ?? directMetricAvg;
    case "hq_reschedule_rate":
      return safeDivide(hqReschedules, jobsBooked) ?? directMetricAvg;
    default:
      return RATE_METRICS.has(id) ? directMetricAvg : directMetricSum;
  }
}

export function isAdditiveMetric(metricId: string): boolean {
  return ADDITIVE_METRICS.has(canonicalMetricId(metricId));
}

export function computeDelta(currentValue: number | null, priorValue: number | null): number | null {
  if (currentValue === null || priorValue === null) return null;
  return currentValue - priorValue;
}

export function getBucketDateFieldCandidates(grain: TimeGrain): string[] {
  return grain === "day" ? ["day", "Day"] : grain === "month" ? ["month", "Month"] : ["week", "Week"];
}

export function getBucketKey(row: DatasetRow, fieldCandidates: string[]): string {
  for (const field of fieldCandidates) {
    const raw = row[field];
    if (raw === null || raw === undefined || raw === "") continue;

    const value = String(raw).trim();
    if (!value) continue;

    const cf = canonicalFieldName(field);

    if (cf === "month") {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return `${value.slice(0, 7)}-01`;
      const ym = value.match(/^(\d{4})[-/](\d{1,2})$/);
      if (ym) {
        const y = ym[1];
        const m = ym[2].padStart(2, "0");
        return `${y}-${m}-01`;
      }
    }

    if (cf === "week" || cf === "day") {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return cf === "month" ? `${y}-${m}-01` : `${y}-${m}-${d}`;
    }
  }

  return "";
}

export function getLatestBucket(rows: DatasetRow[], grain: TimeGrain): string | undefined {
  const fieldCandidates = getBucketDateFieldCandidates(grain);
  const buckets = Array.from(new Set(rows.map((row) => getBucketKey(row, fieldCandidates)).filter(Boolean)))
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  return buckets.length ? buckets[buckets.length - 1] : undefined;
}

export function getLatestAndPriorBucket(
  rows: DatasetRow[],
  grain: TimeGrain
): { latest?: string; prior?: string } {
  const fieldCandidates = getBucketDateFieldCandidates(grain);
  const buckets = Array.from(new Set(rows.map((row) => getBucketKey(row, fieldCandidates)).filter(Boolean)))
    .sort((a, b) => Date.parse(a) - Date.parse(b));

  return {
    latest: buckets[buckets.length - 1],
    prior: buckets.length >= 2 ? buckets[buckets.length - 2] : undefined,
  };
}

export function isLatestBucketForGrain(rows: DatasetRow[], grain: TimeGrain, bucket: string | undefined): boolean {
  if (!bucket) return false;
  const latest = getLatestBucket(rows, grain);
  return !!latest && latest === bucket;
}

export function getRowDateForPacing(row: DatasetRow): Date | null {
  const raw =
    row["day"] ||
    row["Day"] ||
    row["date"] ||
    row["Date"] ||
    row["week"] ||
    row["Week"] ||
    row["month"] ||
    row["Month"];

  if (!raw) return null;

  const value = String(raw).trim();
  if (!value) return null;

  const d = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);

  return Number.isFinite(d.getTime()) ? d : null;
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function getPeriodStartDateFromBucket(bucket: string, grain: TimeGrain): Date | null {
  if (!bucket) return null;

  if (grain === "week") {
    const d = new Date(`${bucket}T12:00:00`);
    if (!Number.isFinite(d.getTime())) return null;
    return startOfLocalDay(d);
  }

  if (grain === "month") {
    const parts = bucket.slice(0, 10).split("-");
    if (parts.length < 2) return null;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
    return new Date(y, m - 1, 1);
  }

  return null;
}

export function getPeriodEndDateFromBucket(bucket: string, grain: TimeGrain): Date | null {
  const start = getPeriodStartDateFromBucket(bucket, grain);
  if (!start) return null;

  if (grain === "week") {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  }

  if (grain === "month") {
    return new Date(start.getFullYear(), start.getMonth() + 1, 0);
  }

  return null;
}

export function countWeekdaysBetweenLocal(startDate: Date | null, endDate: Date | null): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  if (!startDate || !endDate || endDate.getTime() < startDate.getTime()) return counts;

  const d = startOfLocalDay(startDate);
  const end = startOfLocalDay(endDate);

  while (d.getTime() <= end.getTime()) {
    counts[d.getDay()] += 1;
    d.setDate(d.getDate() + 1);
  }

  return counts;
}

export function sumNumberArray(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function getMetricTotalByWeekdayForWorker(rows: DatasetRow[], metricId: string): number[] {
  const totals = [0, 0, 0, 0, 0, 0, 0];

  for (const row of rows) {
    const d = getRowDateForPacing(row);
    if (!d) continue;

    const rowValue = computeMetricValue(metricId, [row]);
    if (rowValue === null) continue;

    totals[d.getDay()] += rowValue;
  }

  return totals;
}

export function calcHistoricalPacingForWorker(
  grain: TimeGrain,
  rows: DatasetRow[],
  metricId: string,
  targetBucket?: string,
  lookbackDays = 30
): {
  projected: number;
  actual: number;
  pct: number;
  historicalPctRaw?: number | null;
  method: "historical" | "fallback";
  sampleSize: number;
} | null {
  if (!rows.length) return null;
  if (grain !== "week" && grain !== "month") return null;
  if (!isAdditiveMetric(metricId)) return null;

  const fieldCandidates = getBucketDateFieldCandidates(grain);
  const grouped = new Map<string, DatasetRow[]>();

  for (const row of rows) {
    const key = getBucketKey(row, fieldCandidates);
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  const keys = Array.from(grouped.keys()).sort((a, b) => Date.parse(a) - Date.parse(b));
  if (!keys.length) return null;

  const currentBucket =
    targetBucket && grouped.has(targetBucket) ? targetBucket : keys[keys.length - 1];

  const currentRows = grouped.get(currentBucket) || [];
  if (!currentRows.length) return null;

  const currentActual = computeMetricValue(metricId, currentRows);
  if (currentActual === null) return null;

  const currentMaxDate = currentRows
    .map(getRowDateForPacing)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())
    .slice(-1)[0];

  if (!currentMaxDate) return null;

  const currentPeriodStart = getPeriodStartDateFromBucket(currentBucket, grain);
  const currentPeriodEnd = getPeriodEndDateFromBucket(currentBucket, grain);
  if (!currentPeriodStart || !currentPeriodEnd) return null;

  const lookbackStart = new Date(currentMaxDate);
  lookbackStart.setDate(lookbackStart.getDate() - lookbackDays);
  const lookbackStartDay = startOfLocalDay(lookbackStart);

  const currentElapsedWeekdayCounts = countWeekdaysBetweenLocal(
    currentPeriodStart,
    currentMaxDate
  );

  const fullCurrentPeriodWeekdayCounts = countWeekdaysBetweenLocal(
    currentPeriodStart,
    currentPeriodEnd
  );

  const elapsedDays = sumNumberArray(currentElapsedWeekdayCounts);
  const totalDays = sumNumberArray(fullCurrentPeriodWeekdayCounts);

  const historicalKeys = keys.filter((k) => {
    if (k === currentBucket) return false;
    const bucketStart = getPeriodStartDateFromBucket(k, grain);
    if (!bucketStart) return false;
    return bucketStart.getTime() >= lookbackStartDay.getTime();
  });

  const shares = historicalKeys
    .map((bucket) => {
      const bucketRows = grouped.get(bucket) || [];
      if (!bucketRows.length) return null;

      const bucketStart = getPeriodStartDateFromBucket(bucket, grain);
      const bucketEnd = getPeriodEndDateFromBucket(bucket, grain);
      if (!bucketStart || !bucketEnd) return null;

      const fullWeekdayCounts = countWeekdaysBetweenLocal(bucketStart, bucketEnd);
      const weekdayTotals = getMetricTotalByWeekdayForWorker(bucketRows, metricId);
      const total = weekdayTotals.reduce((a, b) => a + b, 0);

      if (!total) return null;

      let expectedElapsed = 0;

      for (let i = 0; i < 7; i++) {
        const fullCount = fullWeekdayCounts[i] || 0;
        const elapsedCountRaw = currentElapsedWeekdayCounts[i] || 0;
        const elapsedCount = Math.min(elapsedCountRaw, fullCount);

        if (!fullCount || !elapsedCount) continue;

        const avgPerOccurrence = (weekdayTotals[i] || 0) / fullCount;
        expectedElapsed += avgPerOccurrence * elapsedCount;
      }

      const share = expectedElapsed / total;
      if (!share || share <= 0 || share > 1.25) return null;

      return share;
    })
    .filter((v): v is number => v !== null);

  if (!shares.length) {
    const fallbackPct = totalDays > 0 ? elapsedDays / totalDays : 0;
    const projectedRaw = fallbackPct > 0 ? currentActual / fallbackPct : currentActual;
    const projected = Math.max(currentActual, projectedRaw);

    return {
      actual: currentActual,
      projected,
      pct: fallbackPct,
      historicalPctRaw: null,
      method: "fallback",
      sampleSize: 0,
    };
  }

  const historicalPctRaw = shares.reduce((a, b) => a + b, 0) / shares.length;
  const historicalPct = Math.max(0, Math.min(historicalPctRaw, 1));
  const projectedRaw = historicalPct > 0 ? currentActual / historicalPct : currentActual;
  const projected = Math.max(currentActual, projectedRaw);

  return {
    actual: currentActual,
    projected,
    pct: historicalPct,
    historicalPctRaw,
    method: "historical",
    sampleSize: shares.length,
  };
}

export function maybeProjectMetricValue(args: {
  metricId: string;
  grain: TimeGrain;
  allDatasetRows: DatasetRow[];
  scopedBucketRows: DatasetRow[];
  targetBucket?: string;
}): number | null {
  const { metricId, grain, allDatasetRows, scopedBucketRows, targetBucket } = args;
  const rawValue = computeMetricValue(metricId, scopedBucketRows);
  if (rawValue === null) return null;

  if (grain !== "week" && grain !== "month") return rawValue;
  if (!isAdditiveMetric(metricId)) return rawValue;
  if (!isLatestBucketForGrain(allDatasetRows, grain, targetBucket)) return rawValue;

  const pacing = calcHistoricalPacingForWorker(grain, allDatasetRows, metricId, targetBucket);
  if (!pacing || !pacing.pct || pacing.pct <= 0) return rawValue;

  return rawValue / pacing.pct;
}
