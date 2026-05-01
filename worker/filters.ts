import type { DatasetRow, TimeGrain, ParsedBusinessScope, ParsedPointInTimeScope, ScopedRows } from "./types";
import { normalize, MONTH_MAP, MONTH_NAMES } from "./utils";
import { getBucketDateFieldCandidates, getBucketKey, getLatestBucket, getLatestAndPriorBucket } from "./compute";

export function extractAvailableYears(rows: DatasetRow[], fields: string[]): number[] {
  const years = new Set<number>();

  for (const row of rows) {
    for (const field of fields) {
      const raw = row[field];
      if (!raw) continue;

      const value = String(raw).trim();
      const directYear = value.match(/^(\d{4})[-/]/);
      if (directYear) {
        years.add(Number(directYear[1]));
        continue;
      }

      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        years.add(parsed.getFullYear());
      }
    }
  }

  return Array.from(years);
}

export function uniqueDimensionValues(rows: DatasetRow[], fields: string[]): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    for (const field of fields) {
      const value = String(row[field] || "").trim();
      if (value) values.add(value);
    }
  }
  return Array.from(values);
}

export function findComparedSegments(normalizedQuestion: string, values: string[]): string[] {
  const matched: Array<{ raw: string; score: number }> = [];
  for (const raw of values) {
    const v = normalize(raw);
    if (!v) continue;
    let score = 0;
    if (normalizedQuestion.includes(v)) score += 100;
    const words = v.split(" ").filter(Boolean);
    for (const word of words) {
      if (word.length >= 3 && normalizedQuestion.includes(word)) score += 10;
    }
    if (score >= 20) matched.push({ raw, score });
  }
  return matched.sort((a, b) => b.score - a.score).map((m) => m.raw);
}

export function findBestMentionedDimensionValue(normalizedQuestion: string, values: string[]): string | undefined {
  const matches = findComparedSegments(normalizedQuestion, values);
  return matches[0];
}

export function datasetSupportsAnyField(rows: DatasetRow[], fields: string[]): boolean {
  for (const row of rows) {
    for (const field of fields) {
      if (row[field] !== undefined && row[field] !== null && String(row[field]).trim() !== "") {
        return true;
      }
    }
  }
  return false;
}

export function rowMatchesOptionalFilters(
  row: DatasetRow,
  scope: ParsedBusinessScope,
  supportsMarket = true,
  supportsChannel = true
): boolean {
  if (scope.market && supportsMarket) {
    const marketValue = String(row["market"] || row["Market"] || "").trim();
    if (normalize(marketValue) !== normalize(scope.market)) return false;
  }

  if (scope.channel && supportsChannel) {
    const channelValue = String(
      row["channel_category"] ||
        row["Channel Category"] ||
        row["channel"] ||
        row["Channel"] ||
        ""
    ).trim();

    if (normalize(channelValue) !== normalize(scope.channel)) return false;
  }

  return true;
}

export function rowMatchesPointInTimeFilters(
  row: DatasetRow,
  scope: ParsedPointInTimeScope,
  supportsMarket = true,
  supportsChannel = true
): boolean {
  if (scope.market && supportsMarket) {
    const marketValue = String(row["market"] || row["Market"] || "").trim();
    if (normalize(marketValue) !== normalize(scope.market)) return false;
  }

  if (scope.channel && supportsChannel) {
    const channelValue = String(
      row["channel_category"] ||
        row["Channel Category"] ||
        row["channel"] ||
        row["Channel"] ||
        ""
    ).trim();

    if (normalize(channelValue) !== normalize(scope.channel)) return false;
  }

  return true;
}

export function splitRowsCurrentVsPrior(
  rows: DatasetRow[],
  grain: TimeGrain,
  targetBucket?: string
): ScopedRows {
  const fieldCandidates = getBucketDateFieldCandidates(grain);
  const bucketMap = new Map<string, DatasetRow[]>();

  for (const row of rows) {
    const key = getBucketKey(row, fieldCandidates);
    if (!key) continue;
    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key)!.push(row);
  }

  const sortedKeys = Array.from(bucketMap.keys()).sort((a, b) => Date.parse(a) - Date.parse(b));

  if (!sortedKeys.length) {
    return {
      current: [],
      prior: [],
      current_label: "current period",
      prior_label: "prior period",
    };
  }

  let currentKey = sortedKeys[sortedKeys.length - 1];
  if (targetBucket && bucketMap.has(targetBucket)) currentKey = targetBucket;
  const currentIndex = sortedKeys.indexOf(currentKey);
  const priorKey = currentIndex > 0 ? sortedKeys[currentIndex - 1] : "";

  return {
    current: bucketMap.get(currentKey) || [],
    prior: priorKey ? bucketMap.get(priorKey) || [] : [],
    current_label: currentKey,
    prior_label: priorKey || "previous period unavailable",
  };
}

export function filterRowsToTargetBucket(
  rows: DatasetRow[],
  grain: TimeGrain,
  targetBucket?: string
): DatasetRow[] {
  const fieldCandidates = getBucketDateFieldCandidates(grain);

  if (!targetBucket) {
    const latest = getLatestBucket(rows, grain);
    if (!latest) return [];
    return rows.filter((row) => getBucketKey(row, fieldCandidates) === latest);
  }

  return rows.filter((row) => getBucketKey(row, fieldCandidates) === targetBucket);
}

export function parseBusinessQuestionScopeFromRows(
  businessQuestion: string,
  rows: DatasetRow[]
): ParsedBusinessScope {
  const q = normalize(businessQuestion);
  let time_grain: TimeGrain = "week";
  let target_bucket: string | undefined;

  if (q.includes("today") || q.includes("yesterday") || q.includes("daily")) {
    time_grain = "day";
  } else if (
    q.includes("month") ||
    q.includes("monthly") ||
    q.includes("mtd") ||
    MONTH_NAMES.some((m) => q.includes(m))
  ) {
    time_grain = "month";
  }

  const matchedMonth = Object.keys(MONTH_MAP).find((m) => q.includes(m));
  if (matchedMonth) {
    const candidateYears = extractAvailableYears(rows, ["month", "Month", "day", "Day", "week", "Week"]);
    const explicitYearMatch = q.match(/\b(20\d{2})\b/);
    const explicitYear = explicitYearMatch ? Number(explicitYearMatch[1]) : undefined;
    const year = explicitYear ?? (candidateYears.length ? Math.max(...candidateYears) : new Date().getFullYear());
    target_bucket = `${year}-${MONTH_MAP[matchedMonth]}-01`;
  }

  const markets = uniqueDimensionValues(rows, ["market", "Market"]);
  const channels = uniqueDimensionValues(rows, ["channel_category", "Channel Category", "channel", "Channel"]);
  const market = findBestMentionedDimensionValue(q, markets);
  const channel = findBestMentionedDimensionValue(q, channels);

  return {
    time_grain,
    compare_mode: "current_vs_prior",
    market,
    channel,
    target_bucket,
  };
}

export function parsePointInTimeScopeFromRows(
  question: string,
  rows: DatasetRow[]
): ParsedPointInTimeScope {
  const q = normalize(question);
  let time_grain: TimeGrain = "month";

  if (q.includes("today") || q.includes("yesterday") || q.includes("daily")) {
    time_grain = "day";
  } else if (q.includes("week") || q.includes("weekly")) {
    time_grain = "week";
  }

  const markets = uniqueDimensionValues(rows, ["market", "Market"]);
  const channels = uniqueDimensionValues(rows, ["channel_category", "Channel Category", "channel", "Channel"]);
  const market = findBestMentionedDimensionValue(q, markets);
  const channel = findBestMentionedDimensionValue(q, channels);

  const monthName = MONTH_NAMES.find((m) => q.includes(m));
  const explicitYearMatch = q.match(/\b(20\d{2})\b/);
  const explicitYear = explicitYearMatch ? explicitYearMatch[1] : null;

  let target_bucket: string | undefined;
  let period_label = "latest available period";

  if (monthName) {
    const monthNum = MONTH_MAP[monthName];
    const availableYears = extractAvailableYears(rows, ["month", "Month", "day", "Day", "week", "Week"]);

    let yearToUse: string;
    if (explicitYear) {
      yearToUse = explicitYear;
    } else {
      const yearsWithMonth = availableYears.filter((y) =>
        rows.some((row) => {
          const key = getBucketKey(row, ["month", "Month", "day", "Day", "week", "Week"]);
          return key.startsWith(`${y}-${monthNum}-`);
        })
      );
      yearToUse = String(yearsWithMonth.length ? Math.max(...yearsWithMonth) : new Date().getFullYear());
    }

    target_bucket = `${yearToUse}-${monthNum}-01`;
    period_label = `${capitalize(monthName)} ${yearToUse}`;
    time_grain = "month";
  } else if (q.includes("this month") || q.includes("monthly trend")) {
    const latest = getLatestBucket(rows, "month");
    if (latest) {
      target_bucket = latest;
      period_label = latest;
      time_grain = "month";
    }
  } else if (q.includes("last month")) {
    const latestAndPrior = getLatestAndPriorBucket(rows, "month");
    if (latestAndPrior.prior) {
      target_bucket = latestAndPrior.prior;
      period_label = latestAndPrior.prior;
      time_grain = "month";
    }
  } else if (q.includes("this week") || q.includes("weekly trend")) {
    const latest = getLatestBucket(rows, "week");
    if (latest) {
      target_bucket = latest;
      period_label = latest;
      time_grain = "week";
    }
  } else if (q.includes("last week")) {
    const latestAndPrior = getLatestAndPriorBucket(rows, "week");
    if (latestAndPrior.prior) {
      target_bucket = latestAndPrior.prior;
      period_label = latestAndPrior.prior;
      time_grain = "week";
    }
  } else {
    const latest = getLatestBucket(rows, time_grain);
    if (latest) {
      target_bucket = latest;
      period_label = latest;
    }
  }

  return {
    time_grain,
    market,
    channel,
    target_bucket,
    period_label,
  };
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
