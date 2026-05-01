import type { OpenAIResponse } from "./types";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export const DASHBOARD_LINKS_URL =
  "https://raw.githubusercontent.com/nubrakes-analytics/NuBrakes-Copilot/main/data/dashboard_links.json";

export const DATASET_LIST_URL =
  "https://raw.githubusercontent.com/nubrakes-analytics/NuBrakes-Copilot/main/data/dataset_list.json";

export const METRIC_DEFINITIONS_URL =
  "https://raw.githubusercontent.com/nubrakes-analytics/NuBrakes-Copilot/main/data/metric_definitions.json";

export const CACHE_TTL_MS = 5 * 60 * 1000;
export const DATASET_TTL_MS = 10 * 60 * 1000;
export const MAX_TREND_POINTS = 12;

export const METRIC_FIELD_MAP: Record<string, string[]> = {
  leads: ["leads", "Leads", "lead_count", "Lead Count"],
  jobs_booked: ["jobs_booked", "Jobs Booked", "booked_jobs", "jobs booked"],
  jobs_completed: ["jobs_completed", "Jobs Completed", "completed_jobs", "jobs completed"],
  canceled_jobs: ["canceled_jobs", "Canceled Jobs", "cancelled_jobs", "canceled jobs"],
  revenue: ["revenue", "Revenue", "invoiced_customer_price", "Invoiced Customer Price"],
  impressions: ["impressions", "Impressions"],
  clicks: ["clicks", "Clicks"],
  marketing_spend: ["marketing_spend", "Marketing Spend"],
  available_slots: [
    "available_slots",
    "Available Slots",
    "available slots",
    "available_slot",
    "Available Slot",
    "slots_available",
    "Slots Available",
    "availableSlots",
    "slots",
  ],
  utilized_slots: [
    "utilized_slots",
    "Utilized Slots",
    "utilized slots",
    "utilized_slot",
    "Utilized Slot",
    "slots_utilized",
    "Slots Utilized",
    "utilizedSlots",
  ],
  technician_utilization: ["technician_utilization", "Technician Utilization"],
  ft_tech_utilization: ["ft_tech_utilization", "FT Tech Utilization"],
  pt_tech_utilization: ["pt_tech_utilization", "PT Tech Utilization"],
  customer_cancels: ["customer_cancels", "Customer Cancels"],
  hq_cancels: ["hq_cancels", "HQ Cancels"],
  customer_reschedules: ["customer_reschedules", "Customer Reschedules"],
  hq_reschedules: ["hq_reschedules", "HQ Reschedules"],
  customer_cancel_rate: ["customer_cancel_rate", "Customer Cancel Rate"],
  hq_cancel_rate: ["hq_cancel_rate", "HQ Cancel Rate"],
  reschedule_rate: ["reschedule_rate", "Reschedule Rate"],
  customer_reschedule_rate: ["customer_reschedule_rate", "Customer Reschedule Rate"],
  hq_reschedule_rate: ["hq_reschedule_rate", "HQ Reschedule Rate"],
  booking_rate: ["booking_rate", "Booking Rate", "booking rate"],
  conversion_rate: ["conversion_rate", "Conversion Rate", "conversion rate"],
  cancel_rate: ["cancel_rate", "Cancel Rate", "cancel rate"],
  cancel_outcome_rate: ["cancel_outcome_rate", "Cancel Outcome Rate", "cancel outcome rate"],
  aov: ["aov", "AOV", "average_order_value", "Average Order Value"],
  ctr: ["ctr", "CTR"],
  cpc: ["cpc", "CPC"],
  cost_per_inquiry: ["cost_per_inquiry", "Cost Per Inquiry"],
  mac: ["mac", "MAC"],
};

export const PRIMARY_DATASET_MAP: Record<string, string> = {
  conversion_rate: "fact_nubrakes_channel_market_kpi_daily",
  booking_rate: "fact_nubrakes_channel_market_kpi_daily",
  cancel_rate: "fact_nubrakes_channel_market_kpi_daily",
  cancel_outcome_rate: "fact_nubrakes_channel_market_kpi_daily",
  aov: "fact_nubrakes_channel_market_kpi_daily",
  revenue: "fact_nubrakes_channel_market_kpi_daily",
  leads: "fact_nubrakes_channel_market_kpi_daily",
  jobs_booked: "fact_nubrakes_channel_market_kpi_daily",
  jobs_completed: "fact_nubrakes_channel_market_kpi_daily",
  canceled_jobs: "fact_nubrakes_channel_market_kpi_daily",

  technician_utilization: "fact_nubrakes_supply_demand_daily",
  available_slots: "fact_nubrakes_supply_demand_daily",
  utilized_slots: "fact_nubrakes_supply_demand_daily",
  ft_tech_utilization: "fact_nubrakes_supply_demand_daily",
  pt_tech_utilization: "fact_nubrakes_supply_demand_daily",
  customer_cancels: "fact_nubrakes_supply_demand_daily",
  hq_cancels: "fact_nubrakes_supply_demand_daily",
  customer_reschedules: "fact_nubrakes_supply_demand_daily",
  hq_reschedules: "fact_nubrakes_supply_demand_daily",
  customer_cancel_rate: "fact_nubrakes_supply_demand_daily",
  hq_cancel_rate: "fact_nubrakes_supply_demand_daily",
  reschedule_rate: "fact_nubrakes_supply_demand_daily",
  customer_reschedule_rate: "fact_nubrakes_supply_demand_daily",
  hq_reschedule_rate: "fact_nubrakes_supply_demand_daily",

  ctr: "fact_nubrakes_marketing_performance_daily",
  clicks: "fact_nubrakes_marketing_performance_daily",
  impressions: "fact_nubrakes_marketing_performance_daily",
  marketing_spend: "fact_nubrakes_marketing_performance_daily",
  cpc: "fact_nubrakes_marketing_performance_daily",
  cost_per_inquiry: "fact_nubrakes_marketing_performance_daily",
  mac: "fact_nubrakes_marketing_performance_daily",
};

export const ADDITIVE_METRICS = new Set([
  "leads",
  "jobs_booked",
  "jobs_completed",
  "canceled_jobs",
  "revenue",
  "impressions",
  "clicks",
  "marketing_spend",
  "available_slots",
  "utilized_slots",
  "customer_cancels",
  "hq_cancels",
  "customer_reschedules",
  "hq_reschedules",
]);

export const RATE_METRICS = new Set([
  "booking_rate",
  "conversion_rate",
  "cancel_rate",
  "cancel_outcome_rate",
  "ctr",
  "cpc",
  "cost_per_inquiry",
  "mac",
  "technician_utilization",
  "ft_tech_utilization",
  "pt_tech_utilization",
  "customer_cancel_rate",
  "hq_cancel_rate",
  "reschedule_rate",
  "customer_reschedule_rate",
  "hq_reschedule_rate",
  "aov",
]);

export const MONTH_MAP: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

export const MONTH_NAMES = Object.keys(MONTH_MAP);

export function normalize(value: string): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function canonicalMetricId(value: string): string {
  return normalize(value).replace(/\s+/g, "_");
}

export function canonicalFieldName(value: string): string {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export function stripMarkdownBold(text: string): string {
  return String(text || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1");
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export async function callOpenAI(
  apiKey: string,
  body: Record<string, unknown>
): Promise<OpenAIResponse> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  return JSON.parse(text) as OpenAIResponse;
}

export function extractResponseText(resp: OpenAIResponse): string {
  if (resp.output_text && String(resp.output_text).trim()) {
    return String(resp.output_text).trim();
  }

  const items = Array.isArray(resp.output) ? resp.output : [];
  for (const item of items) {
    if (typeof item.text === "string" && item.text.trim()) return item.text.trim();
    if (Array.isArray(item.content)) {
      for (const part of item.content) {
        if (typeof part?.text === "string" && part.text.trim()) return part.text.trim();
      }
    }
  }
  return "";
}

export function formatMetricValue(value: number | null, formatType?: string): string {
  if (value === null || !Number.isFinite(value)) return "N/A";

  switch (normalize(formatType || "")) {
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "currency":
      return `$${value.toFixed(2)}`;
    default:
      if (Number.isInteger(value)) return value.toFixed(0);
      if (Math.abs(value) >= 100) return value.toFixed(0);
      if (Math.abs(value) >= 10) return value.toFixed(1);
      return value.toFixed(2);
  }
}

export function formatDeltaValue(value: number | null, formatType?: string): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const sign = value > 0 ? "+" : "";

  switch (normalize(formatType || "")) {
    case "percent":
      return `${sign}${(value * 100).toFixed(1)} pts`;
    case "currency":
      return `${sign}$${value.toFixed(2)}`;
    default:
      if (Number.isInteger(value)) return `${sign}${value.toFixed(0)}`;
      if (Math.abs(value) >= 100) return `${sign}${value.toFixed(0)}`;
      if (Math.abs(value) >= 10) return `${sign}${value.toFixed(1)}`;
      return `${sign}${value.toFixed(2)}`;
  }
}

export function inferFormatType(metricId: string): string {
  const id = canonicalMetricId(metricId);

  if (
    [
      "booking_rate", "conversion_rate", "cancel_rate", "cancel_outcome_rate", "ctr",
      "technician_utilization", "ft_tech_utilization", "pt_tech_utilization",
      "gross_margin_pct", "parts_cost_pct_revenue", "labor_cost_pct_revenue",
      "marketing_spend_pct_revenue", "customer_cancel_rate", "hq_cancel_rate",
      "reschedule_rate", "customer_reschedule_rate", "hq_reschedule_rate",
    ].includes(id)
  ) {
    return "percent";
  }

  if (
    [
      "revenue", "aov", "marketing_spend", "cpc", "cost_per_inquiry", "mac", "net_contribution_profit",
    ].includes(id)
  ) {
    return "currency";
  }

  return "number";
}

export function prettifyMetricLabel(metricId: string): string {
  const id = canonicalMetricId(metricId);
  const map: Record<string, string> = {
    leads: "Leads",
    jobs_booked: "Booked Jobs",
    jobs_completed: "Completed Jobs",
    canceled_jobs: "Canceled Jobs",
    revenue: "Revenue",
    booking_rate: "Booking Rate",
    conversion_rate: "Conversion Rate",
    cancel_rate: "Cancel Rate",
    cancel_outcome_rate: "Cancel Outcome Rate",
    aov: "AOV",
    ctr: "CTR",
    cpc: "CPC",
    cost_per_inquiry: "Cost Per Inquiry",
    mac: "MAC",
    technician_utilization: "Technician Utilization",
    ft_tech_utilization: "FT Tech Utilization",
    pt_tech_utilization: "PT Tech Utilization",
    available_slots: "Available Slots",
    utilized_slots: "Utilized Slots",
    customer_cancel_rate: "Customer Cancel Rate",
    hq_cancel_rate: "HQ Cancel Rate",
    reschedule_rate: "Reschedule Rate",
    customer_reschedule_rate: "Customer Reschedule Rate",
    hq_reschedule_rate: "HQ Reschedule Rate",
    marketing_spend: "Marketing Spend",
  };
  return map[id] || capitalize(id.replace(/_/g, " "));
}
