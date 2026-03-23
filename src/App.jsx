import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

const DATA_URL = "https://ai-data.jonathan-libiran.workers.dev/data-ai.json";
const AI_MODEL = "gpt-4.1";
const AI_ENDPOINT = "/api/ai";

const COPILOT_AI_ENDPOINT =
  "https://nubrakes-copilot.jonathan-libiran.workers.dev/api/ai";

const COPILOT_DATASET_LIST_URL =
  "https://nubrakes-analytics.github.io/NuBrakes-Copilot/data/dataset_list.json";

const COPILOT_STORAGE_KEY = "nubrakes-ai-copilot-chat-v1";

const FEEDBACK_FORM_BASE =
  "https://docs.google.com/forms/d/e/1FAIpQLSfJz0oYRvkk6_TtIJWRd9KZ_JUENCyZXR3yHFc8I7ILMbDVzg/viewform?usp=pp_url&entry.1556088005=";

const COPILOT_EXAMPLES = [
  "What does average order value mean?",
  "Where can I find the ops dashboard?",
  "Which dataset should I use for supply and demand by market?",
  "Why is conversion rate down this March?",
  "What was the referral revenue in February 2026?",
  "Why are completed jobs up/down?",
  "Which markets are underperforming?",
  "What changed in lead mix this week?"
];

const METRICS = [
  { key: "leads", label: "Leads", fmt: v => Math.round(v).toLocaleString(), color: "#6366f1" },
  { key: "booked", label: "Bookings", fmt: v => Math.round(v).toLocaleString(), color: "#0ea5e9" },
  { key: "canceled", label: "Canceled Jobs", fmt: v => Math.round(v).toLocaleString(), color: "#f43f5e", invert: true },
  { key: "completed", label: "Completed Jobs", fmt: v => Math.round(v).toLocaleString(), color: "#10b981" },
  { key: "revenue", label: "Revenue", fmt: v => "$" + Math.round(v).toLocaleString(), color: "#f59e0b" },
  { key: "bookingRate", label: "Booking Rate", fmt: v => (v * 100).toFixed(1) + "%", color: "#8b5cf6" },
  { key: "cancelRate", label: "Cancel Rate", fmt: v => (v * 100).toFixed(1) + "%", color: "#ef4444", invert: true },
  { key: "conversionRate", label: "Conversion Rate", fmt: v => (v * 100).toFixed(1) + "%", color: "#14b8a6" },
  { key: "aov", label: "AOV", fmt: v => "$" + Math.round(v).toLocaleString(), color: "#f97316" }
];

const SHARE_INCOMPATIBLE = new Set(["bookingRate", "cancelRate", "conversionRate", "aov"]);
const ADDITIVE_METRICS = new Set(["leads", "booked", "canceled", "completed", "revenue"]);

const CAT_COLORS = {
  Core: "#6366f1",
  Brand: "#0ea5e9",
  GBL: "#f59e0b",
  Referral: "#10b981",
  Fleet: "#8b5cf6",
  Other: "#94a3b8"
};

const FALLBACK = [
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Atlanta", "Channel Category": "Core", leads: 54, jobs_booked: 12, canceled_jobs: 2, invoiced_customer_price: 4087, jobs_completed: 9 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Austin", "Channel Category": "Core", leads: 36, jobs_booked: 13, canceled_jobs: 0, invoiced_customer_price: 5766, jobs_completed: 10 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Dallas", "Channel Category": "Core", leads: 86, jobs_booked: 22, canceled_jobs: 1, invoiced_customer_price: 6318, jobs_completed: 14 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Dallas", "Channel Category": "GBL", leads: 8, jobs_booked: 1, canceled_jobs: 0, invoiced_customer_price: 0, jobs_completed: 0 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Dallas", "Channel Category": "Referral", leads: 6, jobs_booked: 3, canceled_jobs: 0, invoiced_customer_price: 0, jobs_completed: 0 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Houston", "Channel Category": "Core", leads: 53, jobs_booked: 13, canceled_jobs: 1, invoiced_customer_price: 3884, jobs_completed: 10 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Nashville", "Channel Category": "Core", leads: 22, jobs_booked: 9, canceled_jobs: 1, invoiced_customer_price: 3541, jobs_completed: 7 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Orlando", "Channel Category": "Core", leads: 21, jobs_booked: 7, canceled_jobs: 2, invoiced_customer_price: 1885, jobs_completed: 4 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "San Antonio", "Channel Category": "Core", leads: 23, jobs_booked: 6, canceled_jobs: 1, invoiced_customer_price: 2169, jobs_completed: 5 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Tampa", "Channel Category": "Core", leads: 17, jobs_booked: 5, canceled_jobs: 2, invoiced_customer_price: 1987, jobs_completed: 4 }
];

const TARGET_DATA = [
  { month_start: "2026-08-01", month_label: "Aug-26 F", metric: "aov", segment: "core", value: 495 },
  { month_start: "2026-08-01", month_label: "Aug-26 F", metric: "aov", segment: "gbl", value: 477 },
  { month_start: "2026-08-01", month_label: "Aug-26 F", metric: "aov", segment: "brand", value: 478 },
  { month_start: "2026-08-01", month_label: "Aug-26 F", metric: "aov", segment: "referral", value: 473 },
  { month_start: "2026-08-01", month_label: "Aug-26 F", metric: "aov", segment: "fleet", value: 552 },
  { month_start: "2026-08-01", month_label: "Aug-26 F", metric: "aov", segment: "total", value: 494 },

  { month_start: "2026-09-01", month_label: "Sep-26 F", metric: "aov", segment: "core", value: 496 },
  { month_start: "2026-09-01", month_label: "Sep-26 F", metric: "aov", segment: "gbl", value: 477 },
  { month_start: "2026-09-01", month_label: "Sep-26 F", metric: "aov", segment: "brand", value: 481 },
  { month_start: "2026-09-01", month_label: "Sep-26 F", metric: "aov", segment: "referral", value: 473 },
  { month_start: "2026-09-01", month_label: "Sep-26 F", metric: "aov", segment: "fleet", value: 548 },
  { month_start: "2026-09-01", month_label: "Sep-26 F", metric: "aov", segment: "total", value: 493 }
];

const VS_TARGET_CHANNELS = ["Core", "GBL", "Brand", "Referral", "Fleet"];
const SEGMENT_TO_CAT = {
  core: "Core",
  gbl: "GBL",
  brand: "Brand",
  referral: "Referral",
  fleet: "Fleet",
  total: "Total"
};
const CAT_TO_SEGMENT = {
  Core: "core",
  GBL: "gbl",
  Brand: "brand",
  Referral: "referral",
  Fleet: "fleet",
  Total: "total"
};

function fmtMoneyCompact(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toFixed(2).replace(/\.00$/, "") + "M";
  if (Math.abs(n) >= 1000) return "$" + Math.round(n / 1000) + "K";
  return "$" + Math.round(n).toLocaleString();
}

function fmtMoney(v) {
  return "$" + Math.round(Number(v) || 0).toLocaleString();
}

function fmtNum(v) {
  return Math.round(Number(v) || 0).toLocaleString();
}

function pctToTarget(actual, target) {
  if (!target) return null;
  return Math.round((actual / target) * 100);
}

function deltaFmt(delta, prefix = "") {
  const n = Math.round(Number(delta) || 0);
  return (n >= 0 ? "+" : "-") + prefix + Math.abs(n).toLocaleString();
}

function barColor(pct) {
  if (pct === null || pct === undefined) return "#94a3b8";
  if (pct >= 100) return "#1d9e75";
  if (pct >= 75) return "#ba7517";
  return "#a32d2d";
}

function pillStyle(delta) {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 7px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    background: delta >= 0 ? "#eaf3de" : "#fcebeb",
    color: delta >= 0 ? "#27500a" : "#791f1f",
    whiteSpace: "nowrap"
  };
}

function getLatestMonthKey(rows) {
  const keys = rows
    .map(r => (r.Month || "").slice(0, 7))
    .filter(Boolean)
    .sort();
  return keys.length ? keys[keys.length - 1] : "";
}

function getMonthRows(rows, monthKey) {
  return rows.filter(r => (r.Month || "").slice(0, 7) === monthKey);
}

function buildMetricTargetMap(targetRows, monthKey) {
  const scoped = targetRows.filter(r => (r.month_start || "").slice(0, 7) === monthKey);
  const out = {};
  scoped.forEach(r => {
    const metric = (r.metric || "").toLowerCase();
    const segment = (r.segment || "").toLowerCase();
    if (!out[metric]) out[metric] = {};
    out[metric][segment] = Number(r.value) || 0;
  });
  return out;
}

function getMetricValue(obj, metric) {
  if (!obj) return 0;
  if (metric === "revenue") return obj.revenue || 0;
  if (metric === "leads") return obj.leads || 0;
  if (metric === "completed") return obj.completed || 0;
  if (metric === "aov") return obj.aov || 0;
  return 0;
}

function sumK(arr, key) {
  return arr.reduce((a, r) => a + (Number(r[key]) || 0), 0);
}

function aggregate(rows) {
  const leads = sumK(rows, "leads");
  const booked = sumK(rows, "booked");
  const canceled = sumK(rows, "canceled");
  const completed = sumK(rows, "completed");
  const revenue = sumK(rows, "revenue");

  return {
    leads,
    booked,
    canceled,
    completed,
    revenue,
    bookingRate: leads ? booked / leads : 0,
    cancelRate: (canceled + completed) ? canceled / (canceled + completed) : 0,
    conversionRate: leads ? completed / leads : 0,
    aov: completed ? revenue / completed : 0
  };
}

function getSheetStyleDow(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const jsDay = d.getDay();
  return jsDay === 0 ? 1 : jsDay + 1;
}

function getAllDatesInMonth(monthKey) {
  if (!monthKey) return [];

  const [year, month] = monthKey.split("-").map(Number);
  const days = new Date(year, month, 0).getDate();

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(year, month - 1, i + 1, 12, 0, 0);
    return {
      dateKey: d.toISOString().slice(0, 10),
      dow: d.getDay() === 0 ? 1 : d.getDay() + 1
    };
  });
}

function buildDailyRevenueSeries(rows) {
  const grouped = {};

  rows.forEach(r => {
    const dateKey = (r.date || "").slice(0, 10);
    if (!dateKey) return;
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(r);
  });

  return Object.keys(grouped)
    .sort()
    .map(dateKey => {
      const agg = aggregate(grouped[dateKey]);
      return {
        dateKey,
        dow: getSheetStyleDow(dateKey),
        value: Number(agg.revenue) || 0
      };
    });
}

function buildRevenueDowPattern(rows, excludeMonthKey = null) {
  const daily = buildDailyRevenueSeries(rows).filter(d => {
    if (!excludeMonthKey) return true;
    return d.dateKey.slice(0, 7) !== excludeMonthKey;
  });

  if (!daily.length) return null;

  const avgDaily =
    daily.reduce((sum, d) => sum + d.value, 0) / daily.length;

  if (!avgDaily) return null;

  const buckets = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };

  daily.forEach(d => {
    buckets[d.dow].push(d.value / avgDaily);
  });

  const factors = {};
  for (let dow = 1; dow <= 7; dow++) {
    const vals = buckets[dow];
    factors[dow] = vals.length
      ? vals.reduce((a, b) => a + b, 0) / vals.length
      : 1;
  }

  return {
    avgDaily,
    factors,
    sampleSize: daily.length
  };
}

function calcMonthlyRevenueDowPacing(rows, monthlyForecast) {
  if (!rows?.length || !monthlyForecast) return null;

  const monthKey = getLatestMonthKey(rows);
  if (!monthKey) return null;

  const monthRows = getMonthRows(rows, monthKey);
  if (!monthRows.length) return null;

  const pattern = buildRevenueDowPattern(rows, monthKey);
  if (!pattern) return null;

  const allDates = getAllDatesInMonth(monthKey);

  const avgFactor =
    allDates.reduce((sum, d) => sum + (pattern.factors[d.dow] || 1), 0) /
    allDates.length;

  if (!avgFactor) return null;

  const forecastDays = allDates.map(d => {
    const factor = pattern.factors[d.dow] || 1;
    return {
      ...d,
      factor,
      forecast: (monthlyForecast / avgFactor) * factor
    };
  });

  const maxDate = getMaxDataDate(monthRows);
  const todayKey = maxDate.toISOString().slice(0, 10);

  const mtdForecast = forecastDays
    .filter(d => d.dateKey <= todayKey)
    .reduce((sum, d) => sum + d.forecast, 0);

  const mtdActual = Number(aggregate(monthRows).revenue) || 0;
  const pct = mtdForecast > 0 ? mtdActual / mtdForecast : null;
  const projected = pct !== null ? monthlyForecast * pct : mtdActual;

  return {
    method: "dow_pattern",
    label: `Day ${maxDate.getDate()} of ${allDates.length}`,
    elapsed: maxDate.getDate(),
    total: allDates.length,
    pct,
    projected,
    actual: mtdActual,
    mtdForecast,
    monthlyForecast,
    sampleSize: pattern.sampleSize
  };
}

function getMonthlyForecast(targetMap, metricKey, segment = "total") {
  return Number(targetMap?.[metricKey]?.[segment]) || 0;
}

function buildProjectedActualByChannel(rows, period = "month", targetRows = []) {
  const out = {};

  const monthKey = getLatestMonthKey(rows);
  const targetMap = buildMetricTargetMap(targetRows, monthKey);

  VS_TARGET_CHANNELS.forEach(ch => {
    const chRows = rows.filter(r => r.cat === ch);
    const agg = aggregate(chRows);
    const segment = CAT_TO_SEGMENT[ch];

    const pacingByMetric = {
      leads: calcHistoricalPacing(period, chRows, "leads"),
      completed: calcHistoricalPacing(period, chRows, "completed"),
      revenue:
        period === "month"
          ? calcMonthlyRevenueDowPacing(
              chRows,
              getMonthlyForecast(targetMap, "revenue", segment)
            ) || calcHistoricalPacing(period, chRows, "revenue")
          : calcHistoricalPacing(period, chRows, "revenue")
    };

    const projectedLeads = getProjectedMetricValue("leads", agg.leads, pacingByMetric.leads);
    const projectedCompleted = getProjectedMetricValue("completed", agg.completed, pacingByMetric.completed);
    const projectedRevenue = getProjectedMetricValue("revenue", agg.revenue, pacingByMetric.revenue);
    const projectedAov = projectedCompleted ? projectedRevenue / projectedCompleted : 0;

    out[ch] = {
      ...agg,
      leads: projectedLeads,
      completed: projectedCompleted,
      revenue: projectedRevenue,
      aov: projectedAov
    };
  });

  const totalAgg = aggregate(rows);

  const totalPacing = {
    leads: calcHistoricalPacing(period, rows, "leads"),
    completed: calcHistoricalPacing(period, rows, "completed"),
    revenue:
      period === "month"
        ? calcMonthlyRevenueDowPacing(
            rows,
            getMonthlyForecast(targetMap, "revenue", "total")
          ) || calcHistoricalPacing(period, rows, "revenue")
        : calcHistoricalPacing(period, rows, "revenue")
  };

  const totalProjectedLeads = getProjectedMetricValue("leads", totalAgg.leads, totalPacing.leads);
  const totalProjectedCompleted = getProjectedMetricValue("completed", totalAgg.completed, totalPacing.completed);
  const totalProjectedRevenue = getProjectedMetricValue("revenue", totalAgg.revenue, totalPacing.revenue);
  const totalProjectedAov = totalProjectedCompleted ? totalProjectedRevenue / totalProjectedCompleted : 0;

  out.Total = {
    ...totalAgg,
    leads: totalProjectedLeads,
    completed: totalProjectedCompleted,
    revenue: totalProjectedRevenue,
    aov: totalProjectedAov
  };

  return out;
}

async function callAPI(messages) {
  const response = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: AI_MODEL, messages })
  });

  const text = await response.text();
  console.log("AI STATUS:", response.status);
  console.log("AI RAW RESPONSE:", text);

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status} ${text}`);
  }

  return JSON.parse(text);
}

function useViewport() {
  const getState = () => {
    if (typeof window === "undefined") {
      return {
        width: 1280,
        height: 800,
        isPhone: false,
        isTablet: false,
        isDesktop: true
      };
    }

    const vv = window.visualViewport;
    const width = Math.round(vv?.width || window.innerWidth || 1280);
    const height = Math.round(vv?.height || window.innerHeight || 800);

    return {
      width,
      height,
      isPhone: width < 640,
      isTablet: width >= 640 && width < 1024,
      isDesktop: width >= 1024
    };
  };

  const [state, setState] = useState(getState);

  useEffect(() => {
    const update = () => setState(getState());

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  return state;
}

function useLockBodyScroll(active) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [active]);
}

function getOverlayShellStyle({ isPhone, isTablet }) {
  if (isPhone) {
    return {
      position: "fixed",
      inset: 0,
      zIndex: 1100,
      display: "flex",
      alignItems: "stretch",
      justifyContent: "stretch"
    };
  }

  if (isTablet) {
    return {
      position: "fixed",
      inset: 0,
      zIndex: 1100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    };
  }

  return {
    position: "fixed",
    right: 20,
    bottom: 88,
    width: 420,
    maxWidth: "min(420px, calc(100vw - 32px))",
    zIndex: 1100,
    animation: "slideUp 0.22s ease"
  };
}

function getOverlayCardStyle({ isPhone, isTablet, maxWidth = 430 }) {
  if (isPhone) {
    return {
      width: "100%",
      height: "100%",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      borderRadius: 0
    };
  }

  if (isTablet) {
    return {
      width: "100%",
      maxWidth,
      height: "min(88vh, 760px)",
      background: "#fff",
      borderRadius: 20,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      border: "1px solid #e5e7eb",
      boxShadow: "0 16px 50px rgba(0,0,0,0.18)"
    };
  }

  return {
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 10px 40px rgba(0,0,0,0.18)",
    border: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    maxHeight: "74vh"
  };
}

function getBackdropStyle() {
  return {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.38)",
    backdropFilter: "blur(3px)"
  };
}

function getFilteredRows(rows, market, chanCat) {
  return rows.filter(
    r =>
      (market === "All Markets" || r.market === market) &&
      (chanCat === "All Channels" || r.cat === chanCat)
  );
}

function getMaxDataDate(rows) {
  const dates = rows
    .map(r => r.date || r.Week || r.Month)
    .filter(Boolean)
    .map(v => new Date(v))
    .filter(d => !isNaN(d.getTime()));

  if (!dates.length) return new Date();
  return new Date(Math.max(...dates.map(d => d.getTime())));
}

function getPeriodKey(row, period) {
  if (period === "week") return (row.Week || "").slice(0, 10);
  if (period === "month") return (row.Month || "").slice(0, 7);
  return (row.date || "").slice(0, 10);
}

function getPointInPeriod(row, period) {
  const raw = row.date || row.Week || row.Month;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;

  if (period === "week") {
    const dow = d.getDay();
    return dow === 0 ? 7 : dow;
  }

  if (period === "month") {
    return d.getDate();
  }

  return null;
}

function getPeriodLengthFromKey(periodKey, period) {
  if (period === "week") return 7;
  if (period === "month") {
    const [y, m] = periodKey.split("-");
    return new Date(Number(y), Number(m), 0).getDate();
  }
  return null;
}

function buildTimeSeries(rows, period) {
  const groups = {};

  rows.forEach(r => {
    const key =
      period === "day"
        ? (r.date || "").slice(0, 10)
        : period === "week"
        ? (r.Week || "").slice(0, 10)
        : (r.Month || "").slice(0, 7);

    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  const keys = Object.keys(groups).sort().slice(period === "day" ? -60 : -12);

  return keys.map(k => {
    const g = groups[k];
    const leads = sumK(g, "leads");
    const booked = sumK(g, "booked");
    const canceled = sumK(g, "canceled");
    const completed = sumK(g, "completed");
    const revenue = sumK(g, "revenue");

    return {
      label: k,
      leads,
      booked,
      canceled,
      completed,
      revenue,
      bookingRate: leads ? booked / leads : 0,
      cancelRate: (canceled + completed) ? canceled / (canceled + completed) : 0,
      conversionRate: leads ? completed / leads : 0,
      aov: completed ? revenue / completed : 0
    };
  });
}

function aggregateSeriesByToggle(rows, period) {
  const normalizedPeriod = period === "week" ? "week" : "month";
  const groups = {};

  rows.forEach(r => {
    const key =
      normalizedPeriod === "week"
        ? (r.Week || "").slice(0, 10)
        : (r.Month || "").slice(0, 7);

    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  return Object.keys(groups)
    .sort()
    .map(key => {
      const g = groups[key];
      const leads = sumK(g, "leads");
      const booked = sumK(g, "booked");
      const canceled = sumK(g, "canceled");
      const completed = sumK(g, "completed");
      const revenue = sumK(g, "revenue");

      return {
        label: key,
        leads,
        booked,
        canceled,
        completed,
        revenue,
        bookingRate: leads ? booked / leads : 0,
        cancelRate: (canceled + completed) ? canceled / (canceled + completed) : 0,
        conversionRate: leads ? completed / leads : 0,
        aov: completed ? revenue / completed : 0
      };
    });
}

function buildSeriesBreakdown(rows, period, groupKey) {
  const normalizedPeriod = period === "week" ? "week" : "month";
  const grouped = {};

  rows.forEach(r => {
    const group = r[groupKey] || "Unknown";
    const timeKey =
      normalizedPeriod === "week"
        ? (r.Week || "").slice(0, 10)
        : (r.Month || "").slice(0, 7);

    if (!timeKey) return;

    if (!grouped[group]) grouped[group] = {};
    if (!grouped[group][timeKey]) grouped[group][timeKey] = [];
    grouped[group][timeKey].push(r);
  });

  return Object.keys(grouped)
    .sort()
    .map(group => {
      const points = Object.keys(grouped[group])
        .sort()
        .map(label => {
          const g = grouped[group][label];
          const leads = sumK(g, "leads");
          const booked = sumK(g, "booked");
          const canceled = sumK(g, "canceled");
          const completed = sumK(g, "completed");
          const revenue = sumK(g, "revenue");

          return {
            label,
            leads,
            booked,
            canceled,
            completed,
            revenue,
            bookingRate: leads ? booked / leads : 0,
            cancelRate: (canceled + completed) ? canceled / (canceled + completed) : 0,
            conversionRate: leads ? completed / leads : 0,
            aov: completed ? revenue / completed : 0
          };
        });

      return { group, points };
    });
}

function getScopedAggregates(rows, period, market, chanCat) {
  const filteredRows = getFilteredRows(rows, market, chanCat);
  const series = aggregateSeriesByToggle(filteredRows, period);
  const latestLabel = series.length ? series[series.length - 1].label : null;

  const currentPeriodRows = latestLabel
    ? filteredRows.filter(r => getPeriodKey(r, period) === latestLabel)
    : [];

  const overall = aggregate(
    period === "week" || period === "month" || period === "day"
      ? currentPeriodRows
      : filteredRows
  );

  const result = {
    rowCount: filteredRows.length,
    market,
    channel: chanCat,
    period,
    overall,
    series
  };

  if (period === "week" || period === "month") {
    const pacingByMetric = {};
    METRICS.forEach(m => {
      pacingByMetric[m.key] = calcHistoricalPacing(period, filteredRows, m.key);
    });

    result.overall = applyProjectionToAggregate(overall, pacingByMetric);
    result.series = applyProjectionToSeries(series, pacingByMetric);
  }

  if (market === "All Markets" && chanCat === "All Channels") {
    result.seriesByMarket =
      period === "week" || period === "month"
        ? applyProjectionToBreakdownSeriesFromRaw(filteredRows, period, "market")
        : buildSeriesBreakdown(filteredRows, period, "market");

    result.seriesByChannel =
      period === "week" || period === "month"
        ? applyProjectionToBreakdownSeriesFromRaw(filteredRows, period, "cat")
        : buildSeriesBreakdown(filteredRows, period, "cat");
  }

  return result;
}

function shouldUseFullDataset(question) {
  const q = (question || "").toLowerCase();

  const broadTerms = [
    "overall",
    "all markets",
    "all channels",
    "full dataset",
    "entire dataset",
    "whole dataset",
    "company-wide",
    "across all markets",
    "across all channels",
    "national",
    "global view",
    "total business",
    "entire business"
  ];

  return broadTerms.some(term => q.includes(term));
}

function buildGroupedShareSeries(rows, period, metricKey, groupKey) {
  const timeKey = r =>
    period === "day"
      ? (r.date || "").slice(0, 10)
      : period === "week"
      ? (r.Week || "").slice(0, 10)
      : (r.Month || "").slice(0, 7);

  const allKeys = [...new Set(rows.map(timeKey).filter(Boolean))]
    .sort()
    .slice(period === "day" ? -60 : -12);

  const groups = [...new Set(rows.map(r => r[groupKey]).filter(Boolean))].sort();
  const rawMap = {};

  allKeys.forEach(t => {
    rawMap[t] = {};
    groups.forEach(g => {
      rawMap[t][g] = [];
    });
  });

  rows.forEach(r => {
    const t = timeKey(r);
    const g = r[groupKey];
    if (t && g && rawMap[t] && rawMap[t][g]) {
      rawMap[t][g].push(r);
    }
  });

  const series = allKeys.map(t => {
    const point = { label: t };
    const totalRows = Object.values(rawMap[t]).flat();
    const totalAgg = aggregate(totalRows);

    groups.forEach(g => {
      const gRows = rawMap[t][g] || [];
      const gAgg = aggregate(gRows);
      const totalVal = totalAgg[metricKey] || 0;
      point[g] = totalVal > 0 ? (gAgg[metricKey] / totalVal) * 100 : 0;
    });

    return point;
  });

  return { series, groups };
}

function fmtLabel(label, period) {
  if (period === "day") {
    return new Date(label + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (period === "week") {
    return "W" + new Date(label + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  const [y, m] = label.split("-");
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(m, 10) - 1] + " '" + y.slice(2);
}

function mapRows(d) {
  return d.map(r => ({
    date: r.Day || r.date || r.Month || "",
    Week: r.Week || r.Day || r.date || "",
    Month: r.Month || r.Day || r.date || "",
    market: r.market || "",
    cat: r["Channel Category"] || "Other",
    leads: Number(r.leads) || 0,
    booked: Number(r.jobs_booked) || 0,
    canceled: Number(r.canceled_jobs) || 0,
    completed: Number(r.jobs_completed) || 0,
    revenue: Number(r.invoiced_customer_price) || 0
  }));
}

function calcHistoricalPacing(period, rows, metricKey = "revenue") {
  if (!rows?.length) return null;
  if (period !== "week" && period !== "month") return null;
  if (!ADDITIVE_METRICS.has(metricKey)) return null;

  const currentPeriodKey = rows
    .map(r => getPeriodKey(r, period))
    .filter(Boolean)
    .sort()
    .slice(-1)[0];

  if (!currentPeriodKey) return null;

  const maxDate = getMaxDataDate(rows);
  const currentPoint = period === "week"
    ? maxDate.getDay() === 0 ? 7 : maxDate.getDay()
    : maxDate.getDate();

  const grouped = {};
  rows.forEach(r => {
    const key = getPeriodKey(r, period);
    if (!key) return;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  const currentRows = grouped[currentPeriodKey] || [];
  const currentActual = currentRows
    .filter(r => {
      const p = getPointInPeriod(r, period);
      return p !== null && p <= currentPoint;
    })
    .reduce((sum, r) => sum + (Number(r[metricKey]) || 0), 0);

  const historicalKeys = Object.keys(grouped)
    .sort()
    .filter(k => k !== currentPeriodKey);

  const shares = historicalKeys
    .map(key => {
      const group = grouped[key];
      const total = group.reduce((sum, r) => sum + (Number(r[metricKey]) || 0), 0);
      if (!total) return null;

      const periodLength = getPeriodLengthFromKey(key, period);
      const maxPoint = Math.max(...group.map(r => getPointInPeriod(r, period) || 0));
      const isComplete = maxPoint >= periodLength;
      if (!isComplete) return null;

      const cumulative = group
        .filter(r => {
          const p = getPointInPeriod(r, period);
          return p !== null && p <= currentPoint;
        })
        .reduce((sum, r) => sum + (Number(r[metricKey]) || 0), 0);

      const share = cumulative / total;
      if (!share || share <= 0 || share > 1.25) return null;
      return share;
    })
    .filter(Boolean);

  const total = getPeriodLengthFromKey(currentPeriodKey, period);

  if (!shares.length) {
    const fallbackPct = period === "week" ? currentPoint / 7 : currentPoint / total;
    return {
      elapsed: currentPoint,
      total,
      pct: fallbackPct,
      historicalPct: null,
      label: "Day " + currentPoint + " of " + total,
      projected: fallbackPct > 0 ? currentActual / fallbackPct : currentActual,
      actual: currentActual,
      method: "fallback",
      sampleSize: 0
    };
  }

  const historicalPct = shares.reduce((a, b) => a + b, 0) / shares.length;
  const projected = historicalPct > 0 ? currentActual / historicalPct : currentActual;

  return {
    elapsed: currentPoint,
    total,
    pct: historicalPct,
    historicalPct,
    label: "Day " + currentPoint + " of " + total,
    projected,
    actual: currentActual,
    method: "historical",
    sampleSize: shares.length
  };
}

function applyProjectionToAggregate(agg, pacingByMetric) {
  if (!agg) return agg;

  const projected = { ...agg };

  Object.keys(projected).forEach(key => {
    projected[key] = getProjectedMetricValue(key, projected[key], pacingByMetric[key]);
  });

  return projected;
}

function applyProjectionToSeries(series, pacingByMetric) {
  if (!Array.isArray(series) || !series.length) return series;

  return series.map((point, idx) => {
    if (idx !== series.length - 1) return point;

    const projectedPoint = { ...point };

    Object.keys(projectedPoint).forEach(key => {
      if (key === "label") return;
      projectedPoint[key] = getProjectedMetricValue(key, projectedPoint[key], pacingByMetric[key]);
    });

    return projectedPoint;
  });
}

function applyProjectionToBreakdownSeriesFromRaw(rows, period, groupKey) {
  if (period !== "week" && period !== "month") {
    return buildSeriesBreakdown(rows, period, groupKey);
  }

  const baseSeries = buildSeriesBreakdown(rows, period, groupKey);

  return baseSeries.map(groupItem => {
    const groupRows = rows.filter(r => (r[groupKey] || "Unknown") === groupItem.group);

    const pacingByMetric = {};
    METRICS.forEach(m => {
      pacingByMetric[m.key] = calcHistoricalPacing(period, groupRows, m.key);
    });

    return {
      ...groupItem,
      points: applyProjectionToSeries(groupItem.points || [], pacingByMetric)
    };
  });
}

async function loadData() {
  const dataUrls = ["/data.json", DATA_URL];
  const targetUrls = ["/target.json", "target.json"];

  let mainData = null;
  let targetData = [];

  for (const url of dataUrls) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      const d = JSON.parse(await r.text());
      if (!Array.isArray(d) || !d.length) throw new Error("empty");
      mainData = d;
      break;
    } catch (e) {
      console.error("main data load failed:", url, e);
    }
  }

  for (const url of targetUrls) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      const d = JSON.parse(await r.text());
      if (!Array.isArray(d)) throw new Error("invalid target data");
      targetData = d;
      break;
    } catch (e) {
      console.error("target data load failed:", url, e);
    }
  }

  if (!mainData) {
    throw new Error("all main data sources failed");
  }

  return {
    mainData,
    targetData
  };
}

function getProjectedMetricValue(metricKey, value, pacing) {
  const isRateOrAov = metricKey.includes("Rate") || metricKey === "aov";
  if (!pacing || isRateOrAov) return value;
  return pacing.projected ?? value;
}

function createCopilotMessage(role, content, meta = null) {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    meta,
    createdAt: new Date().toISOString()
  };
}

function isValidHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatCopilotTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

function Sparkline({ data, metricKey, color, pacing }) {
  const isRateOrAov = metricKey.includes("Rate") || metricKey === "aov";

  const vals = data.map((d, i) => {
    const raw = d[metricKey] || 0;
    if (i === data.length - 1 && pacing && !isRateOrAov) {
      return pacing.projected ?? raw;
    }
    return raw;
  });

  if (vals.length < 2) return null;

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 80;
  const h = 28;

  const pts = vals
    .map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(" ");

  return React.createElement(
    "svg",
    { width: w, height: h, style: { display: "block" } },
    React.createElement("polyline", {
      points: pts,
      fill: "none",
      stroke: color,
      strokeWidth: "1.5",
      strokeLinejoin: "round"
    })
  );
}

function getSeriesColor(label, dimension) {
  if (dimension === "channel") {
    return CAT_COLORS[label] || "#94a3b8";
  }

  const palette = [
    "#2563eb",
    "#7c3aed",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#14b8a6",
    "#8b5cf6",
    "#f97316",
    "#64748b",
    "#e11d48",
    "#22c55e"
  ];

  let hash = 0;
  const s = String(label || "");
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

function MultiLineShareChart({ data, groups, period, dimension = "channel" }) {
  if (!data.length) return null;

  const maxShare = dimension === "market" ? 50 : 100;

  const W = 680;
  const H = 230;
  const pL = 44;
  const pB = 36;
  const pT = 16;
  const pR = 16;
  const cW = W - pL - pR;
  const cH = H - pB - pT;
  const n = data.length;
  const xP = i => pL + (n > 1 ? i / (n - 1) : 0.5) * cW;
  const yP = v => pT + cH - (Math.min(Math.max(v, 0), maxShare) / maxShare) * cH;
  const step = Math.ceil(n / 10);
  const active = groups.filter(g => data.some(d => (d[g] || 0) > 0));
  const ticks = dimension === "market" ? [0, 10, 20, 30, 40, 50] : [0, 25, 50, 75, 100];

  return React.createElement(
    "svg",
    { viewBox: `0 0 ${W} ${H}`, style: { width: "100%", height: "auto" } },
    React.createElement(
      "defs",
      null,
      active.map(g =>
        React.createElement(
          "linearGradient",
          { key: "g_" + g, id: "sg_" + g, x1: "0", y1: "0", x2: "0", y2: "1" },
          React.createElement("stop", {
            offset: "0%",
            stopColor: getSeriesColor(g, dimension),
            stopOpacity: "0.12"
          }),
          React.createElement("stop", {
            offset: "100%",
            stopColor: getSeriesColor(g, dimension),
            stopOpacity: "0.01"
          })
        )
      )
    ),
    ticks.map(t => {
      const y = pT + cH * (1 - t / maxShare);
      return React.createElement(
        "g",
        { key: t },
        React.createElement("line", {
          x1: pL,
          x2: W - pR,
          y1: y,
          y2: y,
          stroke: "#e5e7eb",
          strokeWidth: "1"
        }),
        React.createElement(
          "text",
          {
            x: pL - 5,
            y: y + 4,
            textAnchor: "end",
            fontSize: "9",
            fill: "#9ca3af"
          },
          t + "%"
        )
      );
    }),
    active.map(g => {
      const color = getSeriesColor(g, dimension);
      const pts = data
        .map((d, i) => xP(i).toFixed(1) + "," + yP(d[g] || 0).toFixed(1))
        .join(" ");

      return React.createElement(
        "g",
        { key: g },
        React.createElement("polygon", {
          points:
            xP(0).toFixed(1) +
            "," +
            (pT + cH) +
            " " +
            pts +
            " " +
            xP(n - 1).toFixed(1) +
            "," +
            (pT + cH),
          fill: `url(#sg_${g})`
        }),
        React.createElement("polyline", {
          points: pts,
          fill: "none",
          stroke: color,
          strokeWidth: "2",
          strokeLinejoin: "round",
          strokeLinecap: "round"
        })
      );
    }),
    active.map(g =>
      data.map((d, i) =>
        React.createElement("circle", {
          key: g + "_" + i,
          cx: xP(i),
          cy: yP(d[g] || 0),
          r: 2.5,
          fill: getSeriesColor(g, dimension),
          stroke: "#fff",
          strokeWidth: "1"
        })
      )
    ),
    data.map((d, i) =>
      i % step === 0
        ? React.createElement(
            "text",
            {
              key: i,
              x: xP(i),
              y: H - 4,
              textAnchor: "middle",
              fontSize: "9",
              fill: "#9ca3af"
            },
            fmtLabel(d.label, period)
          )
        : null
    )
  );
}

function TrendChart({ data, metricKey, metric, period, chartType, pacing }) {
  const [hoveredIndex, setHoveredIndex] = React.useState(null);

  const isRateOrAov = metricKey.includes("Rate") || metricKey === "aov";
  const hasProjection = pacing && !isRateOrAov && (period === "week" || period === "month");

  const vals = data.map((d, i) => {
    const raw = Number(d[metricKey]) || 0;
    if (i === data.length - 1 && hasProjection) {
      return pacing.projected ?? raw;
    }
    return raw;
  });

  const actuals = data.map(d => Number(d[metricKey]) || 0);

  if (!vals.length) return null;

  const fmtFullValue = v => {
    if (metricKey === "revenue" || metricKey === "aov") {
      return "$" + Math.round(v).toLocaleString();
    }
    if (metricKey.includes("Rate")) {
      return (v * 100).toFixed(1) + "%";
    }
    return Math.round(v).toLocaleString();
  };

  const fmtY = v => {
    if (metricKey === "revenue" || metricKey === "aov") {
      if (Math.abs(v) >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
      return "$" + Math.round(v);
    }
    if (metricKey.includes("Rate")) {
      return (v * 100).toFixed(0) + "%";
    }
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + "k";
    return Math.round(v).toString();
  };

  const minValRaw = Math.min(...vals);
  const maxValRaw = Math.max(...vals);

  let yMin = 0;
  let yMax = maxValRaw || 1;

  if (metricKey.includes("Rate")) {
    const range = Math.max(maxValRaw - minValRaw, 0.01);
    const pad = range * 0.18;
    yMin = Math.max(0, minValRaw - pad);
    yMax = Math.min(1, maxValRaw + pad);
    if (yMax - yMin < 0.04) {
      const mid = (yMax + yMin) / 2;
      yMin = Math.max(0, mid - 0.02);
      yMax = Math.min(1, mid + 0.02);
    }
  } else {
    const range = Math.max(maxValRaw - minValRaw, Math.abs(maxValRaw) * 0.08, 1);
    const pad = range * 0.18;

    if (metricKey === "aov") {
      yMin = Math.max(0, minValRaw - pad);
      yMax = maxValRaw + pad;
    } else {
      const startAtZero = maxValRaw > 0 && minValRaw / maxValRaw < 0.65;
      yMin = startAtZero ? 0 : Math.max(0, minValRaw - pad);
      yMax = maxValRaw + pad;
    }

    if (yMax <= yMin) yMax = yMin + 1;
  }

  const W = 680;
  const H = 250;
  const pL = 64;
  const pB = 44;
  const pT = 18;
  const pR = 18;
  const cW = W - pL - pR;
  const cH = H - pB - pT;
  const bW = Math.min(cW / vals.length - 4, 28);
  const step = Math.ceil(vals.length / 10);
  const lastIdx = vals.length - 1;
  const gId = "lg_" + metricKey;

  const yRange = yMax - yMin || 1;
  const xP = i => pL + (vals.length === 1 ? cW / 2 : (i / (vals.length - 1)) * cW);
  const yP = v => pT + cH - ((v - yMin) / yRange) * cH;

  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (yRange * i) / 4);

  const tooltipIndex = hoveredIndex;
  const tooltipValue = tooltipIndex !== null ? vals[tooltipIndex] : null;
  const tooltipX = tooltipIndex !== null ? xP(tooltipIndex) : null;
  const tooltipY = tooltipIndex !== null ? yP(tooltipValue) : null;
  const tooltipLabel =
    tooltipIndex !== null
      ? `${fmtLabel(data[tooltipIndex].label, period)} • ${fmtFullValue(tooltipValue)}`
      : "";

  const tooltipWidth = Math.max(92, Math.min(170, tooltipLabel.length * 6.3));
  let tooltipLeft = tooltipX !== null ? tooltipX - tooltipWidth / 2 : 0;
  if (tooltipLeft < 8) tooltipLeft = 8;
  if (tooltipLeft + tooltipWidth > W - 8) tooltipLeft = W - tooltipWidth - 8;

  let tooltipTop = tooltipY !== null ? tooltipY - 34 : 0;
  if (tooltipTop < 6) tooltipTop = tooltipY + 12;

  return React.createElement(
    "svg",
    {
      viewBox: `0 0 ${W} ${H}`,
      style: { width: "100%", height: "auto", overflow: "visible" },
      onMouseLeave: () => setHoveredIndex(null)
    },

    yTicks.map((tick, idx) => {
      const y = yP(tick);
      return React.createElement(
        "g",
        { key: idx },
        React.createElement("line", {
          x1: pL,
          x2: W - pR,
          y1: y,
          y2: y,
          stroke: "#e5e7eb",
          strokeWidth: "1"
        }),
        React.createElement("text", {
          x: pL - 6,
          y: y + 4,
          textAnchor: "end",
          fontSize: "10",
          fill: "#9ca3af"
        }, fmtY(tick))
      );
    }),

    tooltipIndex !== null
      ? React.createElement(
          "g",
          null,
          React.createElement("line", {
            x1: tooltipX,
            x2: tooltipX,
            y1: pT,
            y2: pT + cH,
            stroke: "#cbd5e1",
            strokeWidth: "1",
            strokeDasharray: "4,4"
          }),
          React.createElement("rect", {
            x: tooltipLeft,
            y: tooltipTop,
            width: tooltipWidth,
            height: 22,
            rx: "6",
            fill: "#111827",
            opacity: 0.96
          }),
          React.createElement("text", {
            x: tooltipLeft + tooltipWidth / 2,
            y: tooltipTop + 14,
            textAnchor: "middle",
            fontSize: "9.5",
            fill: "#fff",
            fontWeight: "600"
          }, tooltipLabel)
        )
      : null,

    chartType === "line"
      ? React.createElement(
          "g",
          null,
          React.createElement(
            "defs",
            null,
            React.createElement(
              "linearGradient",
              { id: gId, x1: "0", y1: "0", x2: "0", y2: "1" },
              React.createElement("stop", {
                offset: "0%",
                stopColor: metric.color,
                stopOpacity: "0.18"
              }),
              React.createElement("stop", {
                offset: "100%",
                stopColor: metric.color,
                stopOpacity: "0.01"
              })
            )
          ),

          React.createElement("polygon", {
            points:
              `${xP(0).toFixed(1)},${(pT + cH).toFixed(1)} ` +
              vals.map((v, i) => `${xP(i).toFixed(1)},${yP(v).toFixed(1)}`).join(" ") +
              ` ${xP(lastIdx).toFixed(1)},${(pT + cH).toFixed(1)}`,
            fill: `url(#${gId})`
          }),

          React.createElement("polyline", {
            points: vals.map((v, i) => `${xP(i).toFixed(1)},${yP(v).toFixed(1)}`).join(" "),
            fill: "none",
            stroke: metric.color,
            strokeWidth: "2",
            strokeLinejoin: "round",
            strokeLinecap: "round"
          }),

          hasProjection && vals.length > 1
            ? React.createElement("line", {
                x1: xP(lastIdx - 1).toFixed(1),
                y1: yP(actuals[lastIdx - 1]).toFixed(1),
                x2: xP(lastIdx).toFixed(1),
                y2: yP(vals[lastIdx]).toFixed(1),
                stroke: metric.color,
                strokeWidth: "2",
                strokeDasharray: "5,4",
                opacity: "0.7"
              })
            : null,

          vals.map((v, i) =>
            React.createElement(
              "g",
              { key: i },
              React.createElement("circle", {
                cx: xP(i),
                cy: yP(v),
                r: hoveredIndex === i ? 5 : (i === lastIdx && hasProjection ? 4 : 3),
                fill: hoveredIndex === i ? "#111827" : (i === lastIdx && hasProjection ? "#3b82f6" : metric.color),
                stroke: "#fff",
                strokeWidth: "1.5"
              }),
              React.createElement("circle", {
                cx: xP(i),
                cy: yP(v),
                r: 16,
                fill: "transparent",
                style: { cursor: "pointer" },
                onMouseEnter: () => setHoveredIndex(i),
                onMouseMove: () => setHoveredIndex(i)
              })
            )
          ),

          hasProjection
            ? React.createElement(
                "g",
                null,
                React.createElement("rect", {
                  x: xP(lastIdx) - 32,
                  y: yP(vals[lastIdx]) - 24,
                  width: 64,
                  height: 18,
                  rx: "4",
                  fill: "#3b82f6"
                }),
                React.createElement("text", {
                  x: xP(lastIdx),
                  y: yP(vals[lastIdx]) - 12,
                  textAnchor: "middle",
                  fontSize: "9",
                  fill: "#fff",
                  fontWeight: "700"
                }, "Proj " + fmtY(vals[lastIdx]))
              )
            : null,

          vals.map((v, i) =>
            i % step === 0
              ? React.createElement("text", {
                  key: "x_" + i,
                  x: xP(i),
                  y: H - 6,
                  textAnchor: "middle",
                  fontSize: "9",
                  fill: "#9ca3af"
                }, fmtLabel(data[i].label, period))
              : null
          )
        )
      : React.createElement(
          "g",
          null,
          vals.map((v, i) => {
            const x = pL + (i / vals.length) * cW + cW / vals.length / 2;
            const barH = Math.max(((v - yMin) / yRange) * cH, 1.5);
            const y = yP(v);
            const isProj = i === lastIdx && hasProjection;

            return React.createElement(
              "g",
              { key: i },
              React.createElement("rect", {
                x: x - bW / 2,
                y,
                width: bW,
                height: Math.max(barH, 0),
                rx: "3",
                fill: hoveredIndex === i ? "#111827" : (isProj ? "#3b82f6" : metric.color),
                opacity: isProj ? 1 : 0.88
              }),
              React.createElement("rect", {
                x: x - Math.max(bW, 22) / 2,
                y: pT,
                width: Math.max(bW, 22),
                height: cH,
                fill: "transparent",
                style: { cursor: "pointer" },
                onMouseEnter: () => setHoveredIndex(i),
                onMouseMove: () => setHoveredIndex(i)
              }),
              isProj
                ? React.createElement(
                    "g",
                    null,
                    React.createElement("rect", {
                      x: x - 28,
                      y: y - 20,
                      width: 56,
                      height: 16,
                      rx: "4",
                      fill: "#3b82f6"
                    }),
                    React.createElement("text", {
                      x,
                      y: y - 9,
                      textAnchor: "middle",
                      fontSize: "9",
                      fill: "#fff",
                      fontWeight: "700"
                    }, "Proj")
                  )
                : null,
              i % step === 0
                ? React.createElement("text", {
                    x,
                    y: H - 6,
                    textAnchor: "middle",
                    fontSize: "9",
                    fill: "#9ca3af"
                  }, fmtLabel(data[i].label, period))
                : null
            );
          })
        )
  );
}

function FunnelChart({ curr, prev, period, pacingByMetric }) {
  const steps = [
    { key: "leads", label: "Leads", color: "#6366f1" },
    { key: "booked", label: "Booked", color: "#0ea5e9" },
    { key: "completed", label: "Completed", color: "#10b981" }
  ];

  const projectedCurr = {
    leads: getProjectedMetricValue("leads", curr.leads || 0, pacingByMetric.leads),
    booked: getProjectedMetricValue("booked", curr.booked || 0, pacingByMetric.booked),
    completed: getProjectedMetricValue("completed", curr.completed || 0, pacingByMetric.completed)
  };

  const maxVal = Math.max(projectedCurr.leads || 1, 1);
  const pl = period === "day" ? "day" : period === "week" ? "week" : "month";

  return React.createElement(
    "div",
    {
      style: {
        background: "#fff",
        borderRadius: 12,
        padding: "16px 18px 20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        border: "1px solid #f1f5f9"
      }
    },
    React.createElement(
      "div",
      {
        style: {
          fontSize: 11,
          fontWeight: 600,
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 16
        }
      },
      "Conversion Funnel — Projected Current " + pl
    ),
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 6 } },
      steps.map(step => {
        const val = projectedCurr[step.key] || 0;
        const pctWidth = maxVal ? val / maxVal : 0;
        const prevVal = prev[step.key] || 0;

        const pctOfLeads =
          projectedCurr.leads > 0 && step.key !== "leads"
            ? ((val / projectedCurr.leads) * 100).toFixed(1)
            : null;

        const change = prevVal ? ((val - prevVal) / prevVal) * 100 : 0;
        const good = change >= 0;

        return React.createElement(
          "div",
          { key: step.key },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 5
              }
            },
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8 } },
              React.createElement("div", {
                style: {
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: step.color,
                  flexShrink: 0
                }
              }),
              React.createElement("span", {
                style: { fontSize: 13, fontWeight: 700, color: "#111827" }
              }, step.label),
              pctOfLeads !== null
                ? React.createElement("span", {
                    style: { fontSize: 11, color: "#9ca3af", marginLeft: 2 }
                  }, "(" + pctOfLeads + "% of Leads)")
                : null
            ),
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8 } },
              React.createElement("span", {
                style: { fontSize: 13, fontWeight: 700, color: "#111827" }
              }, Math.round(val).toLocaleString()),
              prevVal > 0
                ? React.createElement("span", {
                    style: {
                      fontSize: 11,
                      fontWeight: 600,
                      color: good ? "#10b981" : "#f43f5e",
                      background: good ? "#ecfdf5" : "#fff1f2",
                      padding: "1px 6px",
                      borderRadius: 20,
                      whiteSpace: "nowrap"
                    }
                  }, (good ? "▲" : "▼") + Math.abs(change).toFixed(1) + "%")
                : null
            )
          ),
          React.createElement(
            "div",
            {
              style: {
                position: "relative",
                height: 10,
                background: "#f1f5f9",
                borderRadius: 6,
                overflow: "hidden"
              }
            },
            React.createElement("div", {
              style: {
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: pctWidth * 100 + "%",
                background: step.color,
                borderRadius: 6
              }
            }),
            prevVal > 0
              ? React.createElement("div", {
                  style: {
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: ((maxVal ? prevVal / maxVal : 0) * 100) + "%",
                    background: "none",
                    borderRight: "2px dashed " + step.color,
                    opacity: 0.4
                  }
                })
              : null
          )
        );
      })
    )
  );
}

function ComparisonChart({ curr, prev, period, pacingByMetric }) {
  const KPIs = [
    { key: "leads", label: "Leads", color: "#6366f1" },
    { key: "booked", label: "Bookings", color: "#0ea5e9" },
    { key: "completed", label: "Completed", color: "#10b981" },
    { key: "revenue", label: "Revenue", color: "#f59e0b" },
    { key: "bookingRate", label: "Booking Rate", color: "#8b5cf6" },
    { key: "conversionRate", label: "Conv. Rate", color: "#14b8a6" }
  ];

  const pl = period === "day" ? "day" : period === "week" ? "week" : "month";
  const W = 560;
  const H = 220;
  const pL = 16;
  const pR = 16;
  const pT = 16;
  const pB = 32;
  const cW = W - pL - pR;
  const cH = H - pT - pB;
  const n = KPIs.length;
  const groupW = cW / n;
  const bW = Math.min(groupW * 0.32, 22);
  const gap = bW * 0.6;
  const xCenter = i => pL + i * groupW + groupW / 2;

  return React.createElement(
    "div",
    {
      style: {
        background: "#fff",
        borderRadius: 12,
        padding: "16px 18px 20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        border: "1px solid #f1f5f9"
      }
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 8
        }
      },
      React.createElement(
        "div",
        {
          style: {
            fontSize: 11,
            fontWeight: 600,
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }
        },
        "Projected Current vs Prior Period — Core KPIs"
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 14, fontSize: 11 } },
        React.createElement(
          "span",
          { style: { display: "flex", alignItems: "center", gap: 5 } },
          React.createElement("span", {
            style: {
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "#6366f1",
              display: "inline-block"
            }
          }),
          React.createElement("span", {
            style: { color: "#6b7280", fontWeight: 600 }
          }, "Projected current " + pl)
        ),
        React.createElement(
          "span",
          { style: { display: "flex", alignItems: "center", gap: 5 } },
          React.createElement("span", {
            style: {
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "#e5e7eb",
              border: "1.5px dashed #9ca3af",
              display: "inline-block"
            }
          }),
          React.createElement("span", {
            style: { color: "#9ca3af", fontWeight: 600 }
          }, "Prior " + pl)
        )
      )
    ),
    React.createElement(
      "svg",
      { viewBox: `0 0 ${W} ${H}`, style: { width: "100%", height: "auto" } },
      [0, 0.5, 1].map(t => {
        const y = pT + cH * (1 - t);
        return React.createElement(
          "g",
          { key: t },
          React.createElement("line", {
            x1: pL,
            x2: W - pR,
            y1: y,
            y2: y,
            stroke: "#f1f5f9",
            strokeWidth: "1"
          })
        );
      }),
      KPIs.map((kpi, i) => {
        const cx = xCenter(i);
        const cVal = getProjectedMetricValue(kpi.key, curr[kpi.key] || 0, pacingByMetric[kpi.key]);
        const pVal = prev[kpi.key] || 0;
        const localMax = Math.max(cVal, pVal, 1);
        const cH2 = Math.max((cVal / localMax) * cH, 0);
        const pH2 = Math.max((pVal / localMax) * cH, 0);
        const cy = pT + cH - cH2;
        const py = pT + cH - pH2;
        const change = pVal ? ((cVal - pVal) / pVal) * 100 : 0;
        const good = change >= 0;

        return React.createElement(
          "g",
          { key: kpi.key },
          React.createElement("rect", {
            x: cx - gap / 2 - bW,
            y: py,
            width: bW,
            height: pH2,
            rx: "3",
            fill: "#e5e7eb",
            opacity: 0.8
          }),
          React.createElement("rect", {
            x: cx + gap / 2,
            y: cy,
            width: bW,
            height: cH2,
            rx: "3",
            fill: kpi.color,
            opacity: 0.9
          }),
          React.createElement("text", {
            x: cx,
            y: H - 4,
            textAnchor: "middle",
            fontSize: "9",
            fill: "#9ca3af"
          }, kpi.label),
          pVal > 0
            ? React.createElement("text", {
                x: cx,
                y: Math.min(cy, py) - 5,
                textAnchor: "middle",
                fontSize: "8.5",
                fill: good ? "#10b981" : "#f43f5e",
                fontWeight: "700"
              }, (good ? "▲" : "▼") + Math.abs(change).toFixed(1) + "%")
            : null
        );
      })
    )
  );
}

function ChatOverlay({ open, onClose, rawData, period, market, chanCat }) {
  const { isPhone, isTablet } = useViewport();
  const [chatHistory, setChatHistory] = useState([]);
  const [userQuestion, setUserQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useLockBodyScroll(open && (isPhone || isTablet));

  useEffect(() => {
    if (!open) return;

    const onKey = e => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, aiLoading]);

  const sendMessage = useCallback((question) => {
    if (aiLoading || !question.trim()) return;

    setAiLoading(true);

    const useFullDataset = shouldUseFullDataset(question);
    const aiMarket = useFullDataset ? "All Markets" : market;
    const aiChannel = useFullDataset ? "All Channels" : chanCat;
    const scopedAgg = getScopedAggregates(rawData, period, aiMarket, aiChannel);

    const systemCtx = `
You are a business analyst for NuBrakes.

Use the aggregated dataset below as the only source of truth.

Scope mode:
- ${useFullDataset ? "Full dataset override triggered by user question" : "Respect current dashboard filters"}

Scope:
- Period: ${period}
- Market: ${aiMarket}
- Channel: ${aiChannel}
- Row count: ${scopedAgg.rowCount}

Formatting rules for chat:
- Maximum 6 lines unless the user asks for more detail.
- No markdown bold, no headings, no tables.
- Keep each bullet to one short sentence.
- Start with the answer immediately.
- Use plain text only.
- Use numbers only when supported by the data.
- For rates use percentage (%).

Style rules:
- Concise
- Quantitative
- Business-focused
- No fluff
- No invented facts

Answer template:
<direct answer>
- <supporting point>
- <supporting point>
- <supporting point>

Data:
Overall summary:
${JSON.stringify(scopedAgg.overall)}

Main time series:
${JSON.stringify(scopedAgg.series)}

${scopedAgg.seriesByMarket ? `Time series by market:\n${JSON.stringify(scopedAgg.seriesByMarket)}\n` : ""}
${scopedAgg.seriesByChannel ? `Time series by channel:\n${JSON.stringify(scopedAgg.seriesByChannel)}\n` : ""}
`;

    setChatHistory(h => [...h, { role: "user", text: question }]);

    callAPI([
      { role: "system", content: systemCtx },
      {
        role: "user",
        content: `Question: ${question}\n\nAnswer clearly and concisely using the scoped aggregated data.`
      }
    ])
      .then(d => {
        const t =
          d.output_text ||
          (d.output || [])
            .flatMap(item => item.content || [])
            .map(c => c.text || "")
            .join("");

        setChatHistory(h => [...h, { role: "assistant", text: t || "No response." }]);
      })
      .catch(err => {
        console.error(err);
        setChatHistory(h => [...h, { role: "assistant", text: `Error: ${err.message}` }]);
      })
      .finally(() => {
        setAiLoading(false);
      });
  }, [aiLoading, rawData, period, market, chanCat]);

  if (!open) return null;

  const shellStyle = getOverlayShellStyle({ isPhone, isTablet });
  const cardStyle = getOverlayCardStyle({ isPhone, isTablet, maxWidth: 460 });
  const compact = isPhone;
  const examples = compact
    ? ["Top market?", "Revenue trend?", "Best conversion channel?"]
    : ["What's the top performing market?", "How is revenue trending?", "Which channel has the best conversion rate?"];

  return React.createElement(
    "div",
    { style: shellStyle },
    (isPhone || isTablet) ? React.createElement("div", { style: getBackdropStyle(), onClick: onClose }) : null,
    React.createElement(
      "div",
      {
        style: {
          ...cardStyle,
          position: isPhone || isTablet ? "relative" : "static",
          marginLeft: isPhone || isTablet ? "auto" : 0,
          marginTop: isPhone || isTablet ? "auto" : 0
        }
      },
      React.createElement(
        "div",
        {
          style: {
            padding: compact ? "12px 14px" : "12px 16px",
            background: "#111827",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexShrink: 0
          }
        },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } },
          React.createElement("div", {
            style: { width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0 }
          }),
          React.createElement(
            "div",
            { style: { minWidth: 0 } },
            React.createElement("div", {
              style: {
                fontSize: compact ? 14 : 13,
                fontWeight: 700,
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }
            }, "AI Insights"),
            React.createElement("div", {
              style: {
                fontSize: 11,
                color: "#9ca3af",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }
            }, `${period} · ${market} · ${chanCat}`)
          )
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 6, alignItems: "center", flexShrink: 0 } },
          chatHistory.length > 0
            ? React.createElement(
                "button",
                {
                  onClick: () => setChatHistory([]),
                  style: {
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    color: "#fff",
                    padding: "5px 8px",
                    borderRadius: 8
                  }
                },
                "Clear"
              )
            : null,
          React.createElement(
            "button",
            {
              onClick: onClose,
              style: {
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                color: "#fff",
                fontSize: 16,
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }
            },
            "×"
          )
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            flex: 1,
            overflowY: "auto",
            padding: compact ? "10px 12px" : "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minHeight: compact ? 0 : 180,
            background: "#fcfcfd"
          }
        },
        chatHistory.length === 0
          ? React.createElement(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: 8, marginTop: compact ? 0 : 8 } },
              React.createElement(
                "p",
                {
                  style: {
                    fontSize: 12,
                    color: "#9ca3af",
                    margin: 0,
                    textAlign: "center",
                    marginBottom: 4
                  }
                },
                "Ask anything about your current dashboard scope"
              ),
              examples.map(q =>
                React.createElement(
                  "button",
                  {
                    key: q,
                    onClick: () => {
                      setUserQuestion("");
                      sendMessage(q);
                    },
                    style: {
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: compact ? "9px 11px" : "8px 12px",
                      fontSize: 12,
                      color: "#374151",
                      cursor: "pointer",
                      textAlign: "left",
                      lineHeight: 1.4
                    }
                  },
                  q
                )
              )
            )
          : null,
        chatHistory.map((msg, i) => {
          const isUser = msg.role === "user";
          return React.createElement(
            "div",
            {
              key: i,
              style: {
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start"
              }
            },
            React.createElement(
              "div",
              {
                style: {
                  maxWidth: compact ? "92%" : "88%",
                  padding: compact ? "9px 11px" : "8px 12px",
                  borderRadius: 14,
                  fontSize: 12,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  background: isUser ? "#6366f1" : "#f1f5f9",
                  color: isUser ? "#fff" : "#374151",
                  borderBottomRightRadius: isUser ? 4 : 14,
                  borderBottomLeftRadius: isUser ? 14 : 4
                }
              },
              msg.text
            )
          );
        }),
        aiLoading
          ? React.createElement(
              "div",
              { style: { display: "flex", justifyContent: "flex-start" } },
              React.createElement(
                "div",
                {
                  style: {
                    padding: "8px 12px",
                    borderRadius: 12,
                    background: "#f1f5f9",
                    fontSize: 12,
                    color: "#9ca3af",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }
                },
                React.createElement("div", {
                  style: {
                    width: 14,
                    height: 14,
                    border: "2px solid #d1d5db",
                    borderTop: "2px solid #6366f1",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                  }
                }),
                "Thinking..."
              )
            )
          : null,
        React.createElement("div", { ref: messagesEndRef })
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: compact ? "10px 12px calc(10px + env(safe-area-inset-bottom))" : "10px 12px",
            borderTop: "1px solid #f1f5f9",
            flexShrink: 0,
            display: "flex",
            gap: 8,
            background: "#fff",
            flexDirection: compact ? "column" : "row"
          }
        },
        React.createElement("input", {
          ref: inputRef,
          type: "text",
          value: userQuestion,
          onChange: e => setUserQuestion(e.target.value),
          onKeyDown: e => {
            if (e.key === "Enter" && userQuestion.trim() && !aiLoading) {
              const q = userQuestion.trim();
              setUserQuestion("");
              sendMessage(q);
            }
          },
          placeholder: "Ask a question...",
          style: {
            flex: 1,
            width: "100%",
            padding: compact ? "11px 12px" : "9px 12px",
            borderRadius: 10,
            border: "1.5px solid #e5e7eb",
            fontSize: 13,
            color: "#374151",
            outline: "none",
            background: "#f8fafc"
          }
        }),
        React.createElement(
          "button",
          {
            onClick: () => {
              if (userQuestion.trim() && !aiLoading) {
                const q = userQuestion.trim();
                setUserQuestion("");
                sendMessage(q);
              }
            },
            disabled: aiLoading || !userQuestion.trim(),
            style: {
              padding: compact ? "11px 14px" : "8px 12px",
              borderRadius: 10,
              border: "none",
              background: "#6366f1",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              opacity: aiLoading || !userQuestion.trim() ? 0.45 : 1,
              flexShrink: 0,
              width: compact ? "100%" : "auto"
            }
          },
          "Send"
        )
      )
    )
  );
}

function CopilotOverlay({ open, onClose }) {
  const { isPhone, isTablet } = useViewport();
  const [messages, setMessages] = useState(() => {
    if (typeof window === "undefined") {
      return [
        createCopilotMessage(
          "assistant",
          "Hi — I’m your NuBrakes AI Copilot. Ask about metrics, markets, dashboards, business drivers, or which dataset to use."
        )
      ];
    }

    try {
      const raw = window.localStorage.getItem(COPILOT_STORAGE_KEY);
      if (!raw) {
        return [
          createCopilotMessage(
            "assistant",
            "Hi — I’m your NuBrakes AI Copilot. Ask about metrics, markets, dashboards, business drivers, or which dataset to use."
          )
        ];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length
        ? parsed
        : [
            createCopilotMessage(
              "assistant",
              "Hi — I’m your NuBrakes AI Copilot. Ask about metrics, markets, dashboards, business drivers, or which dataset to use."
            )
          ];
    } catch {
      return [
        createCopilotMessage(
          "assistant",
          "Hi — I’m your NuBrakes AI Copilot. Ask about metrics, markets, dashboards, business drivers, or which dataset to use."
        )
      ];
    }
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState([]);
  const [datasetLoadError, setDatasetLoadError] = useState(null);
  const [lastQuestion, setLastQuestion] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const askAbortRef = useRef(null);

  useLockBodyScroll(open && (isPhone || isTablet));

  useEffect(() => {
    if (!open) return;

    const onKey = e => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    try {
      window.localStorage.setItem(COPILOT_STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();

    async function loadDatasets() {
      try {
        setDatasetLoadError(null);
        const r = await fetch(COPILOT_DATASET_LIST_URL, { signal: controller.signal });
        if (!r.ok) throw new Error(`Failed to load dataset list: ${r.status}`);
        const d = await r.json();
        const parsed = Array.isArray(d)
          ? d
          : d && Array.isArray(d.datasets)
          ? d.datasets
          : [];
        setDatasets(parsed);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("dataset_list.json load failed", err);
        setDatasets([]);
        setDatasetLoadError("Could not load dataset list.");
      }
    }

    loadDatasets();
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    return () => {
      askAbortRef.current?.abort();
    };
  }, []);

  async function handleAsk(questionText) {
    const question = (questionText ?? input).trim();
    if (!question || loading) return;

    askAbortRef.current?.abort();
    const controller = new AbortController();
    askAbortRef.current = controller;

    const userMessage = createCopilotMessage("user", question);

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setLastQuestion(question);

    try {
      const res = await fetch(COPILOT_AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage = createCopilotMessage(
        "assistant",
        data.answer || "No answer returned.",
        {
          dataset: data.dataset || data.dataset_used || "Approved dataset",
          rows: data.rows || data.supporting_rows || [],
          dataset_link: data.dataset_link || data.link || null,
          dashboard_link: data.dashboard_link || data.url || null
        }
      );

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      if (error.name === "AbortError") return;

      console.error("Copilot request failed", error);

      const failedMessage = createCopilotMessage(
        "assistant",
        "I couldn’t get a response right now. Please try again. Check whether the Worker and /api/ai endpoint are live and returning valid JSON.",
        {
          dataset: "Connection error",
          rows: [],
          dataset_link: null,
          dashboard_link: null,
          error: true
        }
      );

      setMessages(prev => [...prev, failedMessage]);
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    if (!lastQuestion || loading) return;
    handleAsk(lastQuestion);
  }

  function clearChat() {
    const starter = createCopilotMessage(
      "assistant",
      "Hi — I’m your NuBrakes AI Copilot. Ask about metrics, markets, dashboards, business drivers, or which dataset to use."
    );
    setMessages([starter]);
    setLastQuestion("");
    try {
      window.localStorage.setItem(COPILOT_STORAGE_KEY, JSON.stringify([starter]));
    } catch {}
  }

  if (!open) return null;

  const shellStyle = isPhone
    ? {
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "flex"
      }
    : isTablet
    ? {
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20
      }
    : {
        position: "fixed",
        bottom: 88,
        right: 84,
        width: 430,
        maxWidth: "min(430px, calc(100vw - 32px))",
        zIndex: 1200,
        animation: "slideUp 0.22s ease"
      };

  const cardStyle = getOverlayCardStyle({ isPhone, isTablet, maxWidth: 460 });
  const compact = isPhone;
  const exampleButtons = compact ? COPILOT_EXAMPLES.slice(0, 3) : COPILOT_EXAMPLES.slice(0, 4);

  return React.createElement(
    "div",
    { style: shellStyle },
    (isPhone || isTablet) ? React.createElement("div", { style: getBackdropStyle(), onClick: onClose }) : null,
    React.createElement(
      "div",
      {
        style: {
          ...cardStyle,
          position: isPhone || isTablet ? "relative" : "static",
          width: isPhone ? "100%" : cardStyle.width,
          height: isPhone ? "100%" : cardStyle.height,
          marginLeft: isPhone || isTablet ? "auto" : 0,
          marginTop: isPhone || isTablet ? "auto" : 0
        }
      },
      React.createElement(
        "div",
        {
          style: {
            padding: compact ? "12px 14px" : "12px 16px",
            background: "#0E2468",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10
          }
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0
            }
          },
          React.createElement("img", {
            src: "/nubrakes-ai-copilot.svg",
            alt: "NuBrakes AI Copilot",
            style: {
              width: compact ? 30 : 34,
              height: compact ? 30 : 34,
              objectFit: "contain",
              background: "#fff",
              padding: 4,
              borderRadius: 8,
              flexShrink: 0
            }
          }),
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 } },
            React.createElement(
              "div",
              {
                style: {
                  fontSize: compact ? 14 : 13,
                  fontWeight: 700,
                  color: "#fff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }
              },
              "NuBrakes AI Copilot"
            ),
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 11,
                  color: "rgba(255,255,255,0.75)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }
              },
              "Metrics, dashboards, datasets, and business questions"
            )
          )
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 6, alignItems: "center", flexShrink: 0 } },
          React.createElement(
            "button",
            {
              onClick: clearChat,
              style: {
                background: "rgba(255,255,255,0.12)",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                color: "#fff",
                fontSize: 11,
                padding: "5px 8px"
              }
            },
            "Clear"
          ),
          React.createElement(
            "button",
            {
              onClick: onClose,
              style: {
                background: "rgba(255,255,255,0.12)",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                color: "#fff",
                fontSize: 16,
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }
            },
            "×"
          )
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: compact ? "8px 10px" : "10px 12px",
            borderBottom: "1px solid #f1f5f9",
            background: "#f8fafc"
          }
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexWrap: "wrap",
              gap: 8
            }
          },
          exampleButtons.map(example =>
            React.createElement(
              "button",
              {
                key: example,
                onClick: () => handleAsk(example),
                disabled: loading,
                style: {
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 999,
                  padding: compact ? "7px 10px" : "6px 10px",
                  fontSize: 11,
                  color: "#374151",
                  cursor: "pointer",
                  opacity: loading ? 0.6 : 1,
                  maxWidth: "100%",
                  textAlign: "left"
                }
              },
              example
            )
          )
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            flex: 1,
            overflowY: "auto",
            padding: compact ? "10px" : "12px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minHeight: compact ? 0 : 220,
            background: "#fcfcfd"
          }
        },
        datasetLoadError
          ? React.createElement(
              "div",
              {
                style: {
                  fontSize: 11,
                  color: "#b45309",
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderRadius: 10,
                  padding: "8px 10px"
                }
              },
              datasetLoadError
            )
          : null,
        messages.map(msg => {
          const isUser = msg.role === "user";
          const firstRow = msg.meta?.rows?.[0] || null;

          const datasetLinkRaw = msg.meta?.dataset_link || firstRow?.dataset_link;
          const dashboardLinkRaw =
            msg.meta?.dashboard_link ||
            firstRow?.dashboard_link ||
            firstRow?.dashboard_url;

          const datasetLink = isValidHttpUrl(datasetLinkRaw) ? datasetLinkRaw : null;
          const dashboardLink = isValidHttpUrl(dashboardLinkRaw) ? dashboardLinkRaw : null;
          const rowsCount = Array.isArray(msg.meta?.rows) ? msg.meta.rows.length : 0;

          return React.createElement(
            "div",
            {
              key: msg.id,
              style: {
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start"
              }
            },
            React.createElement(
              "div",
              {
                style: {
                  maxWidth: compact ? "94%" : "88%",
                  borderRadius: 16,
                  padding: compact ? "10px 11px" : "10px 12px",
                  background: isUser ? "#0E2468" : "#fff",
                  color: isUser ? "#fff" : "#0E2468",
                  border: isUser ? "none" : "1px solid #e5e7eb",
                  boxShadow: isUser ? "none" : "0 1px 3px rgba(0,0,0,0.04)"
                }
              },
              React.createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 6
                  }
                },
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      opacity: 0.7
                    }
                  },
                  isUser ? "You" : "NuBrakes AI Copilot"
                ),
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 10,
                      opacity: 0.55,
                      whiteSpace: "nowrap"
                    }
                  },
                  formatCopilotTime(msg.createdAt)
                )
              ),
              React.createElement(
                "div",
                {
                  style: {
                    whiteSpace: "pre-wrap",
                    fontSize: 12,
                    lineHeight: 1.6
                  }
                },
                msg.content
              ),
              !isUser && (msg.meta?.dataset || rowsCount > 0)
                ? React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 8
                      }
                    },
                    msg.meta?.dataset
                      ? React.createElement(
                          "span",
                          {
                            style: {
                              fontSize: 10,
                              padding: "3px 8px",
                              borderRadius: 999,
                              background: "#f8fafc",
                              border: "1px solid #e5e7eb",
                              color: "#334155"
                            }
                          },
                          "Dataset: " + msg.meta.dataset
                        )
                      : null,
                    rowsCount > 0
                      ? React.createElement(
                          "span",
                          {
                            style: {
                              fontSize: 10,
                              padding: "3px 8px",
                              borderRadius: 999,
                              background: "#f8fafc",
                              border: "1px solid #e5e7eb",
                              color: "#334155"
                            }
                          },
                          "Rows: " + rowsCount
                        )
                      : null
                  )
                : null,
              !isUser && (datasetLink || dashboardLink)
                ? React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 10
                      }
                    },
                    datasetLink
                      ? React.createElement(
                          "a",
                          {
                            href: datasetLink,
                            target: "_blank",
                            rel: "noreferrer",
                            style: {
                              textDecoration: "none",
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#fff",
                              background: "#0E2468",
                              padding: "7px 10px",
                              borderRadius: 10
                            }
                          },
                          "Open dataset"
                        )
                      : null,
                    dashboardLink
                      ? React.createElement(
                          "a",
                          {
                            href: dashboardLink,
                            target: "_blank",
                            rel: "noreferrer",
                            style: {
                              textDecoration: "none",
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#fff",
                              background: "#E63F2B",
                              padding: "7px 10px",
                              borderRadius: 10
                            }
                          },
                          "Open dashboard"
                        )
                      : null
                  )
                : null,
              !isUser && msg.meta?.error
                ? React.createElement(
                    "div",
                    { style: { marginTop: 10 } },
                    React.createElement(
                      "button",
                      {
                        onClick: handleRetry,
                        style: {
                          background: "#f8fafc",
                          border: "1px solid #e5e7eb",
                          borderRadius: 10,
                          cursor: "pointer",
                          color: "#0E2468",
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "7px 10px"
                        }
                      },
                      "Retry"
                    )
                  )
                : null
            )
          );
        }),
        loading
          ? React.createElement(
              "div",
              { style: { display: "flex", justifyContent: "flex-start" } },
              React.createElement(
                "div",
                {
                  style: {
                    padding: "8px 12px",
                    borderRadius: 12,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                    color: "#6b7280"
                  }
                },
                "Thinking..."
              )
            )
          : null,
        React.createElement("div", { ref: messagesEndRef })
      ),
      React.createElement(
        "div",
        {
          style: {
            borderTop: "1px solid #f1f5f9",
            padding: compact ? "10px 12px calc(10px + env(safe-area-inset-bottom))" : "10px 12px",
            background: "#fff"
          }
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 8,
              alignItems: "stretch",
              flexDirection: compact ? "column" : "row"
            }
          },
          React.createElement("textarea", {
            ref: inputRef,
            value: input,
            onChange: e => setInput(e.target.value),
            onKeyDown: e => {
              if (e.nativeEvent && e.nativeEvent.isComposing) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAsk(input);
              }
            },
            placeholder: "Ask about metrics, datasets, dashboards, or business drivers...",
            rows: compact ? 2 : 2,
            style: {
              flex: 1,
              resize: "none",
              borderRadius: 12,
              border: "1.5px solid #e5e7eb",
              padding: "10px 12px",
              fontSize: 13,
              color: "#374151",
              outline: "none",
              background: "#f8fafc",
              width: "100%"
            }
          }),
          React.createElement(
            "button",
            {
              onClick: () => handleAsk(input),
              disabled: loading || !input.trim(),
              style: {
                padding: "10px 14px",
                borderRadius: 12,
                border: "none",
                background: "#0E2468",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                opacity: loading || !input.trim() ? 0.5 : 1,
                flexShrink: 0,
                width: compact ? "100%" : "auto"
              }
            },
            "Send"
          )
        ),
        React.createElement(
          "div",
          {
            style: {
              marginTop: 6,
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              fontSize: 10,
              color: "#6b7280",
              flexWrap: "wrap"
            }
          },
          React.createElement("span", null, "Press Enter to send. Shift+Enter for new line."),
          React.createElement("span", null, "Datasets: " + datasets.length)
        )
      )
    )
  );
}

function VsTargetTab({ filtered, rawData, targetRows, isPhone, isTablet }) {
  const h = React.createElement;

  const monthKey = getLatestMonthKey(filtered.length ? filtered : rawData);
  const actualByChannel = buildProjectedActualByChannel(filtered.length ? filtered : rawData, "month", targetRows);
  const targetMap = buildMetricTargetMap(targetRows, monthKey);

  const monthLabel =
    monthKey
      ? new Date(monthKey + "-01T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : "Current Month";

  const topMetrics = [
    { key: "revenue", label: "Total revenue", formatter: fmtMoneyCompact },
    { key: "leads", label: "Total leads", formatter: fmtNum },
    { key: "completed", label: "Completed jobs", formatter: fmtNum },
    { key: "aov", label: "Avg order value", formatter: fmtMoney }
  ];

  const overallActual = actualByChannel.Total || {};
  const revenueActual = getMetricValue(overallActual, "revenue");
  const revenueTarget = targetMap.revenue?.total || 0;
  const revenuePct = pctToTarget(revenueActual, revenueTarget);

  const rowCardStyle = {
    background: "#fff",
    border: "0.5px solid #e5e7eb",
    borderRadius: 16,
    padding: "18px 20px"
  };

  const kpiGridCols = isPhone ? "1fr" : isTablet ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))";
  const row2Cols = isPhone ? "1fr" : "repeat(2,minmax(0,1fr))";
  const row3Cols = isPhone ? "1fr" : "repeat(2,minmax(0,1fr))";

  function renderKpi(metric) {
    const actual = getMetricValue(overallActual, metric.key);
    const target = targetMap[metric.key]?.total || 0;
    const delta = actual - target;

    return h(
      "div",
      {
        key: metric.key,
        style: {
          background: "#f8fafc",
          borderRadius: 12,
          padding: "16px"
        }
      },
      h("div", {
        style: {
          fontSize: 11,
          color: "#6b7280",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: ".04em"
        }
      }, metric.label),
      h("div", {
        style: {
          fontSize: 26,
          fontWeight: 600,
          lineHeight: 1,
          marginBottom: 6,
          color: "#111827"
        }
      }, metric.formatter(actual)),
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11
          }
        },
        h(
          "span",
          { style: pillStyle(delta) },
          deltaFmt(delta, metric.key === "revenue" || metric.key === "aov" ? "$" : "")
        ),
        h("span", { style: { color: "#9ca3af" } }, "vs " + metric.formatter(target) + " target")
      )
    );
  }

  function renderTable(metricKey, title) {
    const rows = [...VS_TARGET_CHANNELS, "Total"].map(ch => {
      const segment = CAT_TO_SEGMENT[ch];
      const actual = getMetricValue(actualByChannel[ch], metricKey);
      const target = targetMap[metricKey]?.[segment] || 0;
      const pct = pctToTarget(actual, target);
      const delta = actual - target;
      return { ch, actual, target, pct, delta };
    });

    const isMoneyMetric = metricKey === "aov" || metricKey === "revenue";

    return h(
      "div",
      { style: rowCardStyle },
      h(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14
          }
        },
        h("h3", {
          style: {
            fontSize: 13,
            fontWeight: 600,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: ".04em",
            margin: 0
          }
        }, title)
      ),
      h(
        "div",
        { style: { overflowX: "auto" } },
        h(
          "table",
          { style: { width: "100%", borderCollapse: "collapse" } },
          h(
            "thead",
            null,
            h(
              "tr",
              null,
              ["Channel", "Pacing", "Target", "% to target", "Delta"].map((col, i) =>
                h("th", {
                  key: col,
                  style: {
                    fontSize: 11,
                    color: "#6b7280",
                    fontWeight: 600,
                    textAlign: i === 0 ? "left" : "right",
                    padding: "0 0 8px",
                    borderBottom: "0.5px solid #e5e7eb"
                  }
                }, col)
              )
            )
          ),
          h(
            "tbody",
            null,
            rows.map(r =>
              h(
                "tr",
                { key: r.ch },
                h(
                  "td",
                  {
                    style: {
                      padding: "8px 0",
                      borderBottom: "0.5px solid #e5e7eb"
                    }
                  },
                  h("div", { style: { fontSize: 12, color: "#111827", marginBottom: 4 } }, r.ch),
                  h(
                    "div",
                    {
                      style: {
                        height: 5,
                        background: "#f1f5f9",
                        borderRadius: 3,
                        overflow: "hidden"
                      }
                    },
                    h("div", {
                      style: {
                        height: "100%",
                        width: Math.min(r.pct || 0, 100) + "%",
                        background: barColor(r.pct),
                        borderRadius: 3
                      }
                    })
                  )
                ),
                h(
                  "td",
                  {
                    style: {
                      textAlign: "right",
                      padding: "8px 0",
                      borderBottom: "0.5px solid #e5e7eb",
                      fontSize: 12
                    }
                  },
                  isMoneyMetric ? fmtMoney(r.actual) : fmtNum(r.actual)
                ),
                h(
                  "td",
                  {
                    style: {
                      textAlign: "right",
                      padding: "8px 0",
                      borderBottom: "0.5px solid #e5e7eb",
                      fontSize: 12,
                      color: "#6b7280"
                    }
                  },
                  isMoneyMetric ? fmtMoney(r.target) : fmtNum(r.target)
                ),
                h(
                  "td",
                  {
                    style: {
                      textAlign: "right",
                      padding: "8px 0",
                      borderBottom: "0.5px solid #e5e7eb",
                      fontSize: 12
                    }
                  },
                  r.pct !== null ? r.pct + "%" : "—"
                ),
                h(
                  "td",
                  {
                    style: {
                      textAlign: "right",
                      padding: "8px 0",
                      borderBottom: "0.5px solid #e5e7eb",
                      fontSize: 12
                    }
                  },
                  h(
                    "span",
                    { style: pillStyle(r.delta) },
                    deltaFmt(r.delta, isMoneyMetric ? "$" : "")
                  )
                )
              )
            )
          )
        )
      )
    );
  }

  function renderAov() {
    return h(
      "div",
      null,
      VS_TARGET_CHANNELS.map(ch => {
        const actual = getMetricValue(actualByChannel[ch], "aov");
        const target = targetMap.aov?.[CAT_TO_SEGMENT[ch]] || 0;
        const delta = actual - target;
        const pct = pctToTarget(actual, target);

        return h(
          "div",
          { key: ch, style: { marginBottom: 14 } },
          h(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 8,
                marginBottom: 4
              }
            },
            h("span", { style: { fontSize: 12, color: "#111827" } }, ch),
            h(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: "flex-end"
                }
              },
              h("span", { style: { fontSize: 14, fontWeight: 600 } }, actual ? fmtMoney(actual) : "—"),
              h("span", { style: { fontSize: 11, color: "#6b7280" } }, "target " + fmtMoney(target)),
              h("span", { style: pillStyle(delta) }, deltaFmt(delta, "$"))
            )
          ),
          h(
            "div",
            {
              style: {
                height: 5,
                background: "#f1f5f9",
                borderRadius: 3,
                overflow: "hidden"
              }
            },
            h("div", {
              style: {
                height: "100%",
                width: Math.min(pct || 0, 100) + "%",
                background: actual ? barColor(pct) : "#d3d1c7",
                borderRadius: 3
              }
            })
          )
        );
      })
    );
  }

  function renderHealth() {
    return h(
      "div",
      null,
      VS_TARGET_CHANNELS.map(ch => {
        const revenuePct = pctToTarget(
          getMetricValue(actualByChannel[ch], "revenue"),
          targetMap.revenue?.[CAT_TO_SEGMENT[ch]] || 0
        );
        const leadPct = pctToTarget(
          getMetricValue(actualByChannel[ch], "leads"),
          targetMap.leads?.[CAT_TO_SEGMENT[ch]] || 0
        );
        const jobPct = pctToTarget(
          getMetricValue(actualByChannel[ch], "completed"),
          targetMap.completed?.[CAT_TO_SEGMENT[ch]] || 0
        );
        const vals = [revenuePct, leadPct, jobPct].filter(v => v !== null);
        const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;

        return h(
          "div",
          { key: ch, style: { marginBottom: 12 } },
          h(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4
              }
            },
            h("span", { style: { fontSize: 12, color: "#111827" } }, ch),
            h("span", {
              style: {
                fontSize: 12,
                fontWeight: 600,
                color: barColor(avg)
              }
            }, avg !== null ? avg + "%" : "—")
          ),
          h(
            "div",
            {
              style: {
                height: 8,
                background: "#f1f5f9",
                borderRadius: 4,
                overflow: "hidden"
              }
            },
            h("div", {
              style: {
                height: "100%",
                width: Math.min(avg || 0, 100) + "%",
                background: barColor(avg),
                borderRadius: 4
              }
            })
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                gap: 10,
                fontSize: 11,
                color: "#6b7280",
                marginTop: 4,
                flexWrap: "wrap"
              }
            },
            h("span", null, "Rev " + (revenuePct !== null ? revenuePct + "%" : "—")),
            h("span", null, "Leads " + (leadPct !== null ? leadPct + "%" : "—")),
            h("span", null, "Jobs " + (jobPct !== null ? jobPct + "%" : "—"))
          )
        );
      })
    );
  }

  return h(
    "div",
    { style: { padding: "4px 0 10px" } },
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: isPhone ? "flex-start" : "center",
          flexDirection: isPhone ? "column" : "row",
          gap: 10,
          marginBottom: 18,
          paddingBottom: 14,
          borderBottom: "0.5px solid #e5e7eb"
        }
      },
      h(
        "div",
        null,
        h("h1", {
          style: {
            fontSize: 20,
            fontWeight: 500,
            margin: 0,
            color: "#111827"
          }
        }, "Performance overview"),
        h("p", {
          style: {
            fontSize: 12,
            color: "#6b7280",
            margin: "2px 0 0"
          }
        }, monthLabel + " — projected pacing vs target")
      ),
      h(
        "span",
        {
          style: {
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 20,
            fontWeight: 600,
            background: "#faeeda",
            color: "#633806",
            whiteSpace: "nowrap"
          }
        },
        revenuePct !== null ? revenuePct + "% to revenue target" : "No revenue target"
      )
    ),

    h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: kpiGridCols,
          gap: 12,
          marginBottom: 16
        }
      },
      topMetrics.map(renderKpi)
    ),

    h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: row2Cols,
          gap: 12,
          marginBottom: 16
        }
      },
      renderTable("revenue", "Revenue vs target by channel"),
      renderTable("completed", "Completed jobs vs target")
    ),

    h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: row3Cols,
          gap: 12,
          marginBottom: 16
        }
      },
      h(
        "div",
        { style: rowCardStyle },
        h("div", { style: { marginBottom: 12 } },
          h("h3", {
            style: {
              fontSize: 13,
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: ".04em",
              margin: 0
            }
          }, "AOV by channel")
        ),
        renderAov()
      ),
      h(
        "div",
        { style: rowCardStyle },
        h("div", { style: { marginBottom: 12 } },
          h("h3", {
            style: {
              fontSize: 13,
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: ".04em",
              margin: 0
            }
          }, "Channel health snapshot")
        ),
        renderHealth()
      )
    ),

    h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12
        }
      },
      renderTable("leads", "Leads vs target by channel")
    )
  );
}

const baseCardStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: "16px 18px 14px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  border: "1px solid #f1f5f9"
};

function Dashboard() {
  const { isPhone, isTablet } = useViewport();
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [period, setPeriod] = useState("month");
  const [market, setMarket] = useState("All Markets");
  const [chanCat, setChanCat] = useState("All Channels");
  const [tab, setTab] = useState("overview");
  const [trendKey, setTrendKey] = useState("revenue");
  const [chartType, setChartType] = useState("line");
  const [trendView, setTrendView] = useState("absolute");
  const [shareDimension, setShareDimension] = useState("channel");
  const [chatOpen, setChatOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [targetData, setTargetData] = useState(TARGET_DATA);

  useEffect(() => {
    if (SHARE_INCOMPATIBLE.has(trendKey) && trendView === "share") {
      setTrendView("absolute");
    }
  }, [trendKey, trendView]);

  useEffect(() => {
    loadData()
      .then(({ mainData, targetData }) => {
        setRawData(mapRows(mainData));
        if (Array.isArray(targetData) && targetData.length) {
          setTargetData(targetData);
        }
        setUsingFallback(false);
        setLoading(false);
      })
      .catch(() => {
        setRawData(mapRows(FALLBACK));
        setUsingFallback(true);
        setLoading(false);
      });
  }, []);

  const markets = useMemo(() => {
    const s = {};
    rawData.forEach(r => {
      if (r.market) s[r.market] = 1;
    });
    return Object.keys(s).sort();
  }, [rawData]);

  const chanCats = useMemo(() => {
    const s = {};
    rawData.forEach(r => {
      if (r.cat) s[r.cat] = 1;
    });
    return Object.keys(s).sort();
  }, [rawData]);

  const filtered = useMemo(
    () => rawData.filter(r => (market === "All Markets" || r.market === market) && (chanCat === "All Channels" || r.cat === chanCat)),
    [rawData, market, chanCat]
  );

  const series = useMemo(() => buildTimeSeries(filtered, period), [filtered, period]);

  const shareRows =
    market === "All Markets" && chanCat === "All Channels" ? rawData : filtered;

  const channelShareData = useMemo(
    () => buildGroupedShareSeries(shareRows, period, trendKey, "cat"),
    [shareRows, period, trendKey]
  );

  const marketShareData = useMemo(
    () => buildGroupedShareSeries(shareRows, period, trendKey, "market"),
    [shareRows, period, trendKey]
  );

  const getRowsForLabel = useCallback(
    label =>
      filtered.filter(r => {
        const key = period === "day" ? r.date.slice(0, 10) : period === "week" ? r.Week.slice(0, 10) : r.Month.slice(0, 7);
        return key === label;
      }),
    [filtered, period]
  );

  const curr = useMemo(() => {
    if (!series.length) return {};
    return aggregate(getRowsForLabel(series[series.length - 1].label));
  }, [series, getRowsForLabel]);

  const prev = useMemo(() => {
    if (series.length < 2) return {};
    return aggregate(getRowsForLabel(series[series.length - 2].label));
  }, [series, getRowsForLabel]);

  const pacingByMetric = useMemo(() => {
    const result = {};
    const monthKey = getLatestMonthKey(filtered);
    const targetMap = buildMetricTargetMap(targetData, monthKey);

    METRICS.forEach(m => {
      if (period === "month" && m.key === "revenue") {
        const revenueForecast = getMonthlyForecast(targetMap, "revenue", "total");
        result[m.key] =
          calcMonthlyRevenueDowPacing(filtered, revenueForecast) ||
          calcHistoricalPacing(period, filtered, m.key);
      } else {
        result[m.key] = calcHistoricalPacing(period, filtered, m.key);
      }
    });

    return result;
  }, [period, filtered, targetData]);

  const defaultPacing = pacingByMetric.revenue || null;
  const pct = (c, p) => (p ? ((c - p) / p) * 100 : 0);
  const periodLabel = period === "day" ? "Last 60 Days" : period === "week" ? "Last 12 Weeks" : "Last 12 Months";
  const isRateOrAov = key => key.includes("Rate") || key === "aov";
  const selMetric = METRICS.find(m => m.key === trendKey) || METRICS[0];
  const shareBlocked = SHARE_INCOMPATIBLE.has(trendKey);
  const selectedMetricPacing = pacingByMetric[trendKey] || null;

  const activeChannels = channelShareData.groups.filter(c =>
    channelShareData.series.some(d => (d[c] || 0) > 0)
  );

  const activeMarkets = marketShareData.groups.filter(m =>
    marketShareData.series.some(d => (d[m] || 0) > 0)
  );

  const activeShareData = shareDimension === "market" ? marketShareData : channelShareData;
  const activeShareGroups = shareDimension === "market" ? activeMarkets : activeChannels;

  const overviewLabel = useMemo(() => {
    if (!series.length) return "";
    const latest = series[series.length - 1].label;

    if (period === "day") {
      return new Date(latest + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    }

    if (period === "week") {
      const s = new Date(latest + "T12:00:00");
      const e = new Date(s);
      e.setDate(e.getDate() + 6);
      return s.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " – " + e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    return new Date(latest + "-01T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [series, period]);

  const openFeedbackForm = useCallback(() => {
    const currentUrl =
      typeof window !== "undefined"
        ? window.location.href
        : "https://kpidashboard.jonathan-libiran.workers.dev/";
    const feedbackUrl = `${FEEDBACK_FORM_BASE}${encodeURIComponent(currentUrl)}`;
    window.open(feedbackUrl, "_blank", "noopener,noreferrer");
  }, []);

  if (loading) {
    return React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "system-ui",
          color: "#6b7280",
          flexDirection: "column",
          gap: 12
        }
      },
      React.createElement("div", {
        style: {
          width: 32,
          height: 32,
          border: "3px solid #e5e7eb",
          borderTop: "3px solid #6366f1",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }
      }),
      React.createElement("span", null, "Loading live data...")
    );
  }

  const containerStyle = {
    fontFamily: "system-ui,sans-serif",
    background: "#f8fafc",
    minHeight: "100vh",
    padding: isPhone ? "12px" : isTablet ? "16px" : "20px 16px"
  };

  const selectStyle = {
    padding: "9px 12px",
    borderRadius: 8,
    border: "1.5px solid #e5e7eb",
    fontSize: 13,
    color: "#374151",
    background: "#fff",
    cursor: "pointer",
    minWidth: isPhone ? "100%" : 150,
    width: isPhone ? "100%" : "auto",
    maxWidth: "100%"
  };

  const pacingBanner =
    defaultPacing && (period === "week" || period === "month")
      ? React.createElement(
          "div",
          {
            style: {
              marginBottom: 12,
              padding: isPhone ? "10px 12px" : "10px 14px",
              borderRadius: 12,
              background: "#fff",
              border: "1px solid #e5e7eb",
              display: "flex",
              alignItems: isPhone ? "flex-start" : "center",
              justifyContent: "space-between",
              gap: 10,
              flexDirection: isPhone ? "column" : "row"
            }
          },
          React.createElement(
            "div",
            { style: { minWidth: 0 } },
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 2
                }
              },
              period === "month"
                ? "Overview cards show projected pacing"
                : "Overview cards show projected pacing"
            ),
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 11,
                  color: "#6b7280",
                  lineHeight: 1.45
                }
              },
              period === "month" && defaultPacing.method === "dow_pattern"
                ? `${defaultPacing.label} · ${((defaultPacing.pct || 0) * 100).toFixed(0)}% to MTD forecast`
                : defaultPacing.method === "historical"
                ? `${defaultPacing.label} · ${(defaultPacing.pct * 100).toFixed(0)}% of a typical completed ${period}`
                : `${defaultPacing.label} · ${(defaultPacing.pct * 100).toFixed(0)}% elapsed pacing fallback`
            )
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 9px",
                borderRadius: 999,
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
                flexShrink: 0
              }
            },
            React.createElement("div", {
              style: {
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#3b82f6"
              }
            }),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#3b82f6",
                  whiteSpace: "nowrap"
                }
              },
              period === "month" ? "Projected" : "Projected"
            )
          )
        )
      : null;

  const floatingBase = {
    position: "fixed",
    width: isPhone ? 50 : 52,
    height: isPhone ? 50 : 52,
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
    zIndex: 1001,
    transition: "background 0.2s, transform 0.2s"
  };

  const safeBottom = isPhone ? "calc(16px + env(safe-area-inset-bottom))" : 20;
  const primaryRight = isPhone ? 16 : 20;
  const phoneGap = 62;

  return React.createElement(
    "div",
    { style: containerStyle },
    React.createElement(
      "div",
      { style: { maxWidth: 1240, margin: "0 auto" } },
      React.createElement(
        "div",
        { style: { marginBottom: 20 } },
        React.createElement("h1", { style: { margin: 0, fontSize: isPhone ? 18 : 20, fontWeight: 700, color: "#111827" } }, "NuBrakes KPI Dashboard"),
        React.createElement(
          "p",
          { style: { margin: "3px 0 0", fontSize: 12, color: "#6b7280" } },
          "NuBrakes · " +
            market +
            " · " +
            chanCat +
            " · " +
            (tab === "overview"
              ? overviewLabel
              : tab === "vsTarget"
              ? (getLatestMonthKey(filtered || rawData)
                  ? new Date(getLatestMonthKey(filtered || rawData) + "-01T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })
                  : "Current Month")
              : periodLabel)
        ),
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 6 } },
          React.createElement(
            "div",
            {
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                borderRadius: 20,
                background: usingFallback ? "#fff7ed" : "#ecfdf5",
                border: "1px solid " + (usingFallback ? "#fed7aa" : "#6ee7b7")
              }
            },
            React.createElement("div", { style: { width: 6, height: 6, borderRadius: "50%", background: usingFallback ? "#f97316" : "#10b981" } }),
            React.createElement("span", { style: { fontSize: 11, fontWeight: 600, color: usingFallback ? "#c2410c" : "#065f46" } }, usingFallback ? "Sample Data" : "Live Data")
          ),
          usingFallback ? React.createElement("span", { style: { fontSize: 11, color: "#c2410c" } }, "⚠️ Live data unavailable") : null
        )
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "center" } },
        ["day", "week", "month"].map(p =>
          React.createElement(
            "button",
            {
              key: p,
              onClick: () => setPeriod(p),
              style: {
                padding: "6px 16px",
                borderRadius: 20,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: period === p ? "#111827" : "#fff",
                color: period === p ? "#fff" : "#6b7280",
                boxShadow: period === p ? "none" : "0 1px 3px rgba(0,0,0,0.08)"
              }
            },
            p.charAt(0).toUpperCase() + p.slice(1)
          )
        ),
        React.createElement("select", { value: market, onChange: e => setMarket(e.target.value), style: selectStyle }, React.createElement("option", null, "All Markets"), ...markets.map(m => React.createElement("option", { key: m }, m))),
        React.createElement("select", { value: chanCat, onChange: e => setChanCat(e.target.value), style: selectStyle }, React.createElement("option", null, "All Channels"), ...chanCats.map(c => React.createElement("option", { key: c }, c)))
      ),
      React.createElement(
        "div",
        { style: { display: "flex", marginBottom: 22, borderBottom: "1.5px solid #e5e7eb", overflowX: "auto" } },
        [["overview", "Overview"], ["trends", "Trends"], ["vsTarget", "vs Target"]].map(([t, label]) =>
          React.createElement(
            "button",
            {
              key: t,
              onClick: () => setTab(t),
              style: {
                padding: "8px 20px",
                border: "none",
                background: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: tab === t ? "#111827" : "#9ca3af",
                borderBottom: tab === t ? "2px solid #111827" : "2px solid transparent",
                marginBottom: -1.5,
                whiteSpace: "nowrap"
              }
            },
            label
          )
        )
      ),
      tab === "overview"
        ? React.createElement(
            "div",
            null,
            pacingBanner,
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: isPhone ? "1fr" : isTablet ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fill,minmax(190px,1fr))", gap: 12, marginBottom: 20 } },
              METRICS.map(m => {
                const actual = curr[m.key] || 0;
                const pacing = pacingByMetric[m.key] || null;
                const projectedValue = getProjectedMetricValue(m.key, actual, pacing);
                const prior = prev[m.key] || 0;
                const displayValue = pacing && !isRateOrAov(m.key) ? projectedValue : actual;
                const change = pct(displayValue, prior);
                const good = m.invert ? change <= 0 : change >= 0;

                return React.createElement(
                  "div",
                  { key: m.key, style: { ...baseCardStyle, padding: "14px 16px" } },
                  React.createElement("div", { style: { fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 } }, m.label),
                  React.createElement("div", { style: { fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 8 } }, m.fmt(displayValue)),
                  React.createElement(
                    "div",
                    { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 8 } },
                    React.createElement("span", { style: { fontSize: 11, fontWeight: 600, color: good ? "#10b981" : "#f43f5e", background: good ? "#ecfdf5" : "#fff1f2", padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" } }, (good ? "▲" : "▼") + " " + Math.abs(change).toFixed(1) + "%"),
                    React.createElement(Sparkline, { data: series, metricKey: m.key, color: m.color, pacing })
                  ),
                  pacing && !isRateOrAov(m.key)
                    ? React.createElement(
                        "div",
                        {
                          style: {
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: "1px dashed #e5e7eb",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }
                        },
                        React.createElement("span", { style: { fontSize: 10, color: "#9ca3af" } }, "Actual to date"),
                        React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "#6b7280" } }, m.fmt(actual))
                      )
                    : null
                );
              })
            ),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: isPhone ? "1fr" : isTablet ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 16 } },
              React.createElement(FunnelChart, { curr, prev, period, pacingByMetric }),
              React.createElement(ComparisonChart, { curr, prev, period, pacingByMetric })
            )
          )
        : null,
      tab === "trends"
        ? React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { style: { display: "flex", justifyContent: "space-between", alignItems: isPhone ? "stretch" : "center", flexDirection: isPhone ? "column" : "row", gap: 12, marginBottom: 16 } },
              React.createElement(
                "div",
                { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
                METRICS.map(m =>
                  React.createElement(
                    "button",
                    {
                      key: m.key,
                      onClick: () => setTrendKey(m.key),
                      style: {
                        padding: "5px 13px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1.5px solid " + (trendKey === m.key ? m.color : "#e5e7eb"),
                        background: trendKey === m.key ? m.color : "#fff",
                        color: trendKey === m.key ? "#fff" : "#6b7280"
                      }
                    },
                    m.label
                  )
                )
              ),
              React.createElement(
                "div",
                { style: { display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 8, padding: 3 } },
                [["line", "╱ Line"], ["bar", "▬ Bar"]].map(([t, lbl]) =>
                  React.createElement(
                    "button",
                    {
                      key: t,
                      onClick: () => setChartType(t),
                      style: {
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        background: chartType === t ? "#fff" : "transparent",
                        color: chartType === t ? "#111827" : "#9ca3af",
                        boxShadow: chartType === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                      }
                    },
                    lbl
                  )
                )
              )
            ),
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" } },
              React.createElement(
                "div",
                { style: { display: "flex", gap: 4, background: shareBlocked ? "#f8fafc" : "#f1f5f9", borderRadius: 8, padding: 3, opacity: shareBlocked ? 0.5 : 1 } },
                [["absolute", "Absolute"], ["share", "% Share"]].map(([v, lbl]) =>
                  React.createElement(
                    "button",
                    {
                      key: v,
                      onClick: () => {
                        if (!shareBlocked || v === "absolute") setTrendView(v);
                      },
                      disabled: shareBlocked && v === "share",
                      style: {
                        padding: "5px 14px",
                        borderRadius: 6,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: shareBlocked && v === "share" ? "not-allowed" : "pointer",
                        background: trendView === v && !(shareBlocked && v === "share") ? "#fff" : "transparent",
                        color: trendView === v && !(shareBlocked && v === "share") ? "#111827" : "#9ca3af",
                        boxShadow: trendView === v && !(shareBlocked && v === "share") ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        whiteSpace: "nowrap"
                      }
                    },
                    lbl
                  )
                )
              ),
              trendView === "share" && !shareBlocked
                ? React.createElement(
                    "div",
                    { style: { display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 8, padding: 3 } },
                    [["channel", "By Channel"], ["market", "By Market"]].map(([v, lbl]) =>
                      React.createElement(
                        "button",
                        {
                          key: v,
                          onClick: () => setShareDimension(v),
                          style: {
                            padding: "5px 14px",
                            borderRadius: 6,
                            border: "none",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            background: shareDimension === v ? "#fff" : "transparent",
                            color: shareDimension === v ? "#111827" : "#9ca3af",
                            boxShadow: shareDimension === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            whiteSpace: "nowrap"
                          }
                        },
                        lbl
                      )
                    )
                  )
                : null,
              shareBlocked
                ? React.createElement(
                    "span",
                    { style: { fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4 } },
                    React.createElement(
                      "svg",
                      { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "#9ca3af", strokeWidth: "2", strokeLinecap: "round" },
                      React.createElement("circle", { cx: "12", cy: "12", r: "10" }),
                      React.createElement("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
                      React.createElement("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })
                    ),
                    "% share is not meaningful for rate and average metrics"
                  )
                : null
            ),
            trendView === "absolute"
              ? React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    { style: { ...baseCardStyle, marginBottom: 12 } },
                    React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2 } }, selMetric.label + " — " + periodLabel),
                    React.createElement("div", { style: { fontSize: 11, color: "#9ca3af", marginBottom: 14 } }, market + " · " + chanCat),
                    React.createElement(TrendChart, { data: series, metricKey: trendKey, metric: selMetric, period, chartType, pacing: selectedMetricPacing })
                  ),
                  React.createElement(
                    "div",
                    { style: { display: "grid", gridTemplateColumns: isPhone ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fill,minmax(140px,1fr))", gap: 10 } },
                    ["Peak", "Average", "Latest", "Projected"].map((lbl, li) => {
                      const vals = series.map(d => d[trendKey] || 0);
                      const latest2 = vals.length ? vals[vals.length - 1] : 0;
                      let v = null;

                      if (li === 0) v = vals.length ? Math.max(...vals) : 0;
                      else if (li === 1) v = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                      else if (li === 2) v = latest2;
                      else {
                        if (!selectedMetricPacing || (period !== "week" && period !== "month") || isRateOrAov(trendKey)) return null;
                        v = selectedMetricPacing.projected ?? latest2;
                      }

                      return React.createElement(
                        "div",
                        { key: lbl, style: { ...baseCardStyle, borderTop: li === 3 ? "2px solid #3b82f6" : "" } },
                        React.createElement("div", { style: { fontSize: 10, color: li === 3 ? "#3b82f6" : "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 } }, lbl + (li === 3 && selectedMetricPacing ? " (hist)" : "")),
                        React.createElement("div", { style: { fontSize: isPhone ? 18 : 20, fontWeight: 700, color: li === 3 ? "#3b82f6" : selMetric.color } }, v !== null ? selMetric.fmt(v) : "—")
                      );
                    })
                  )
                )
              : null,
            trendView === "share" && !shareBlocked
              ? React.createElement(
                  "div",
                  { style: { ...baseCardStyle, padding: "16px 18px 20px" } },
                  React.createElement(
                    "div",
                    { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 } },
                    React.createElement(
                      "div",
                      null,
                      React.createElement(
                        "div",
                        { style: { fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2 } },
                        selMetric.label + " — % Share by " + (shareDimension === "market" ? "Market" : "Channel")
                      ),
                      React.createElement("div", { style: { fontSize: 11, color: "#9ca3af" } }, periodLabel + " · " + market)
                    ),
                    React.createElement(
                      "div",
                      { style: { display: "flex", flexWrap: "wrap", gap: 10 } },
                      activeShareGroups.map(g =>
                        React.createElement(
                          "span",
                          { key: g, style: { display: "flex", alignItems: "center", gap: 5, fontSize: 12 } },
                          React.createElement("span", {
                            style: {
                              width: 24,
                              height: 3,
                              borderRadius: 2,
                              background: getSeriesColor(g, shareDimension),
                              display: "inline-block"
                            }
                          }),
                          React.createElement("span", { style: { color: "#374151", fontWeight: 600 } }, g)
                        )
                      )
                    )
                  ),
                  React.createElement(MultiLineShareChart, {
                    data: activeShareData.series,
                    groups: activeShareData.groups,
                    period,
                    dimension: shareDimension
                  }),
                  activeShareGroups.length > 0
                    ? React.createElement(
                        "div",
                        { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8, marginTop: 16 } },
                        activeShareGroups.map(g => {
                          const vals = activeShareData.series.map(d => d[g] || 0);
                          const latest = vals.length ? vals[vals.length - 1] : 0;
                          const prev2 = vals.length > 1 ? vals[vals.length - 2] : 0;
                          const chg = prev2 ? ((latest - prev2) / prev2) * 100 : 0;
                          const good = chg >= 0;

                          return React.createElement(
                            "div",
                            { key: g, style: { background: "#f8fafc", borderRadius: 10, padding: "10px 12px", border: "1px solid #f1f5f9" } },
                            React.createElement(
                              "div",
                              { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 } },
                              React.createElement("div", {
                                style: {
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: getSeriesColor(g, shareDimension)
                                }
                              }),
                              React.createElement("span", { style: { fontSize: 11, fontWeight: 600, color: "#6b7280" } }, g)
                            ),
                            React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: "#111827" } }, latest.toFixed(1) + "%"),
                            React.createElement("div", {
                              style: {
                                fontSize: 11,
                                fontWeight: 600,
                                color: good ? "#10b981" : "#f43f5e",
                                marginTop: 2
                              }
                            }, (good ? "▲" : "▼") + Math.abs(chg).toFixed(1) + "% vs prior")
                          );
                        })
                      )
                    : null
                )
              : null
          )
        : null,
      tab === "vsTarget"
        ? React.createElement(VsTargetTab, {
            filtered,
            rawData,
            targetRows: targetData,
            isPhone,
            isTablet
          })
        : null
    ),
    React.createElement(ChatOverlay, {
      open: chatOpen,
      onClose: () => setChatOpen(false),
      rawData,
      period,
      market,
      chanCat
    }),
    React.createElement(CopilotOverlay, {
      open: copilotOpen,
      onClose: () => setCopilotOpen(false)
    }),

    React.createElement(
      "button",
      {
        onClick: openFeedbackForm,
        title: "Send Feedback",
        style: {
          ...floatingBase,
          bottom: isPhone ? `calc(${safeBottom} + ${phoneGap * 2}px)` : 20,
          right: isPhone ? primaryRight : 148,
          background: "#fff",
          border: "none"
        }
      },
      React.createElement("img", {
        src: "/forms.png",
        alt: "forms",
        style: {
          width: 28,
          height: 28,
          objectFit: "contain",
          display: "block"
        }
      })
    ),

    React.createElement(
      "button",
      {
        onClick: () => {
          setCopilotOpen(o => {
            const next = !o;
            if (next && isPhone) setChatOpen(false);
            return next;
          });
        },
        style: {
          ...floatingBase,
          bottom: isPhone ? `calc(${safeBottom} + ${phoneGap}px)` : 20,
          right: isPhone ? primaryRight : 84,
          background: "#fff",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          padding: 0
        }
      },
      copilotOpen
        ? React.createElement(
            "svg",
            {
              width: 18,
              height: 18,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "#111827",
              strokeWidth: "2.5",
              strokeLinecap: "round"
            },
            React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
            React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
          )
        : React.createElement("img", {
            src: "/nubrakes-ai-copilot.svg",
            alt: "Copilot",
            style: {
              width: 28,
              height: 28,
              objectFit: "contain",
              display: "block"
            }
          })
    ),

    React.createElement(
      "button",
      {
        className: "chat-bubble-btn",
        onClick: () => {
          setChatOpen(o => {
            const next = !o;
            if (next && isPhone) setCopilotOpen(false);
            return next;
          });
        },
        style: {
          ...floatingBase,
          bottom: safeBottom,
          right: primaryRight,
          background: chatOpen ? "#374151" : "#111827",
          border: "none"
        }
      },
      chatOpen
        ? React.createElement(
            "svg",
            {
              width: 18,
              height: 18,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "#fff",
              strokeWidth: "2.5",
              strokeLinecap: "round"
            },
            React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
            React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
          )
        : React.createElement(
            "svg",
            {
              width: 22,
              height: 22,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "#fff",
              strokeWidth: "2",
              strokeLinecap: "round",
              strokeLinejoin: "round"
            },
            React.createElement("path", { d: "M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" }),
            React.createElement("path", { d: "M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16z" }),
            React.createElement("path", { d: "M5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14z" })
          )
    )
  );
}

export default Dashboard;
