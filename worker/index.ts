export interface Env {
  OPENAI_API_KEY: string;
}

type MetricDefinition = {
  metric_id: string;
  metric_name: string;
  category?: string;
  definition?: string;
  unit?: string;
  format_type?: string;
  formula_logic?: string;
  aggregation?: string;
  good_direction?: "up" | "down" | "neutral" | string;
  owner?: string;
  tags?: string[];
  candidate_drivers?: string[];
  relevant_datasets?: string[];
};

type DashboardDefinition = {
  dashboard_name?: string;
  category?: string;
  description?: string;
  url?: string;
  owner?: string;
  refresh_frequency?: string;
};

type DatasetDefinition = {
  sheet_name?: string;
  dataset?: string;
  link?: string;
  description?: string;
};

type DatasetRow = Record<string, unknown>;
type TimeGrain = "day" | "week" | "month";
type CompareDimension = "market" | "channel";
type Intent =
  | "dataset_link"
  | "dashboard_link"
  | "market_performance"
  | "mix_change"
  | "metric_value"
  | "metric_trend"
  | "contribution_to_change"
  | "compare_segments"
  | "detect_anomalies"
  | "business_question"
  | "llm_fallback";

type ParsedBusinessScope = {
  time_grain: TimeGrain;
  compare_mode: "current_vs_prior";
  market?: string;
  channel?: string;
  target_bucket?: string;
};

type ParsedPointInTimeScope = {
  time_grain: TimeGrain;
  market?: string;
  channel?: string;
  target_bucket?: string;
  period_label: string;
};

type ScopedRows = {
  current: DatasetRow[];
  prior: DatasetRow[];
  current_label: string;
  prior_label: string;
};

type ConfidenceLevel = "high" | "medium" | "low";

type ConfidenceInfo = {
  level: ConfidenceLevel;
  score: number;
  reasons: string[];
};

type MetricLookupResult =
  | { found: true; metric: MetricDefinition; score: number }
  | { found: false; code: string; message: string };

type DatasetLookupResult =
  | { found: true; dataset: DatasetDefinition }
  | { found: false; code: string; message: string };

type DashboardLookupResult =
  | { found: true; dashboard: DashboardDefinition }
  | { found: false; code: string; message: string };

type BusinessQuestionDriverResult =
  | {
      found: true;
      metric: MetricDefinition;
      datasets: DatasetDefinition[];
      analysis_plan: {
        metric_id: string;
        metric_name: string;
        good_direction?: string;
        candidate_drivers: string[];
        driver_definitions: MetricDefinition[];
        relevant_datasets: string[];
        business_question: string;
        suggested_steps: string[];
      };
    }
  | {
      found: false;
      code: string;
      message: string;
    };

type AnalyzeBusinessQuestionResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: ParsedBusinessScope;
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
        current_row_count?: number;
        prior_row_count?: number;
      }>;
      confidence: ConfidenceInfo;
      analysis: {
        business_question: string;
        metric_id: string;
        metric_name: string;
        current_value: string;
        prior_value: string;
        delta_value: string;
        candidate_drivers: string[];
        summary: string;
        observations: string[];
        debug?: {
          uncomputable_drivers?: Array<{
            driver_id: string;
            dataset_used: string;
            missing_reason?: string;
            current_rows_count: number;
            prior_rows_count: number;
          }>;
        };
      };
    }
  | {
      found: false;
      code: string;
      message: string;
    };

type QueryMetricValueResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: ParsedPointInTimeScope;
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      confidence: ConfidenceInfo;
      result: {
        question: string;
        metric_id: string;
        metric_name: string;
        value: string;
        raw_value: number | null;
        period: string;
        market?: string;
        channel?: string;
        summary: string;
      };
    }
  | {
      found: false;
      code: string;
      message: string;
    };

type AnalyzeMarketPerformanceResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: ParsedBusinessScope;
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      confidence: ConfidenceInfo;
      analysis: {
        business_question: string;
        metric_id: string;
        metric_name: string;
        period: string;
        comparison_period: string;
        summary: string;
        underperforming_markets: Array<{
          market: string;
          current_value: string;
          prior_value: string;
          delta_value: string;
          raw_current_value: number | null;
          raw_prior_value: number | null;
          raw_delta_value: number | null;
        }>;
        observations: string[];
      };
    }
  | {
      found: false;
      code: string;
      message: string;
    };

type AnalyzeMixChangeResult =
  | {
      found: true;
      scope: ParsedBusinessScope;
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      confidence: ConfidenceInfo;
      analysis: {
        business_question: string;
        mix_dimension: "channel" | "market";
        base_metric: string;
        period: string;
        comparison_period: string;
        summary: string;
        changes: Array<{
          dimension_value: string;
          current_value: string;
          prior_value: string;
          current_share: string;
          prior_share: string;
          share_delta: string;
          raw_current_value: number;
          raw_prior_value: number;
          raw_current_share: number;
          raw_prior_share: number;
          raw_share_delta: number;
        }>;
        observations: string[];
      };
    }
  | {
      found: false;
      code: string;
      message: string;
    };

type AnalyzeMetricTrendResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: ParsedPointInTimeScope;
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      confidence: ConfidenceInfo;
      analysis: {
        question: string;
        metric_id: string;
        metric_name: string;
        grain: TimeGrain;
        summary: string;
        observations: string[];
        points: Array<{
          period: string;
          value: string;
          raw_value: number | null;
        }>;
      };
    }
  | { found: false; code: string; message: string };

type AnalyzeContributionToChangeResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: ParsedBusinessScope;
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      confidence: ConfidenceInfo;
      analysis: {
        question: string;
        metric_id: string;
        metric_name: string;
        dimension: CompareDimension;
        period: string;
        comparison_period: string;
        total_delta: string;
        summary: string;
        contributors: Array<{
          segment: string;
          current_value: string;
          prior_value: string;
          delta_value: string;
          contribution_pct: string;
          raw_current_value: number | null;
          raw_prior_value: number | null;
          raw_delta_value: number | null;
          raw_contribution_pct: number | null;
        }>;
      };
    }
  | { found: false; code: string; message: string };

type CompareSegmentsResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: ParsedPointInTimeScope;
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      confidence: ConfidenceInfo;
      analysis: {
        question: string;
        metric_id: string;
        metric_name: string;
        period: string;
        dimension: CompareDimension;
        segments: Array<{
          segment: string;
          value: string;
          raw_value: number | null;
        }>;
        delta_summary: string;
      };
    }
  | { found: false; code: string; message: string };

type DetectAnomaliesResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: ParsedBusinessScope;
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      confidence: ConfidenceInfo;
      analysis: {
        question: string;
        metric_id: string;
        metric_name: string;
        grain: TimeGrain;
        latest_period: string;
        summary: string;
        anomalies: Array<{
          segment: string;
          latest_value: string;
          baseline_value: string;
          delta_value: string;
          pct_delta: string;
          raw_latest_value: number | null;
          raw_baseline_value: number | null;
          raw_delta_value: number | null;
          raw_pct_delta: number | null;
        }>;
      };
    }
  | { found: false; code: string; message: string };

type OpenAIOutputItem = {
  type: string;
  name?: string;
  arguments?: string;
  call_id?: string;
  text?: string;
  content?: Array<{ type?: string; text?: string }>;
};

type OpenAIResponse = {
  id?: string;
  output?: OpenAIOutputItem[];
  output_text?: string;
};

type AppApiResponse = {
  answer: string;
  dataset?: string | null;
  rows?: Array<Record<string, unknown>>;
  dataset_link?: string | null;
  dashboard_link?: string | null;
  data?: unknown;
  debug?: unknown;
};

type LoadedDataset = {
  dataset: string;
  link?: string;
  rows: DatasetRow[];
};

type ScopedLoadedDataset = {
  dataset: string;
  link?: string;
  filteredRows: DatasetRow[];
  currentRows: DatasetRow[];
  priorRows: DatasetRow[];
  currentLabel: string;
  priorLabel: string;
  supportsMarket: boolean;
  supportsChannel: boolean;
};

type DriverRelationship = "positive" | "negative" | "contextual";

type DriverObservation = {
  driverId: string;
  currentValue: number | null;
  priorValue: number | null;
  deltaValue: number | null;
  formatType: string;
  datasetUsed: string;
  currentRowsCount: number;
  priorRowsCount: number;
  relationship: DriverRelationship;
  explanatoryDirection: "supports" | "hurts" | "mixed" | "context" | "unknown";
  explanatoryScore: number;
  missingReason?: string;
};

type IntentMatch = {
  intent: Intent;
  score: number;
  reason: string;
};

type MetricRegistryEntry = {
  metricId: string;
  formatType: "number" | "percent" | "currency";
  additive: boolean;
  primaryDataset?: string;
  fieldNames?: string[];
  formula?: (rows: DatasetRow[]) => number | null;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const DASHBOARD_LINKS_URL =
  "https://cdn.jsdelivr.net/gh/nubrakes-analytics/NuBrakes-Copilot@main/data/dashboard_links.json";
const DATASET_LIST_URL =
  "https://cdn.jsdelivr.net/gh/nubrakes-analytics/NuBrakes-Copilot@main/data/dataset_list.json";
const METRIC_DEFINITIONS_URL =
  "https://cdn.jsdelivr.net/gh/nubrakes-analytics/NuBrakes-Copilot@main/data/metric_definitions.json";

const CACHE_TTL_MS = 5 * 60 * 1000;
const DATASET_CACHE_TTL_MS = 2 * 60 * 1000;
const memoryCache = new Map<string, CacheEntry<unknown>>();

const COMMON_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "for",
  "of",
  "to",
  "in",
  "on",
  "by",
  "and",
  "or",
  "with",
  "from",
  "need",
  "show",
  "give",
  "me",
  "where",
  "can",
  "i",
  "find",
  "what",
  "why",
  "how",
  "did",
  "does",
  "is",
  "are",
  "was",
  "were",
  "about",
  "this",
  "last",
  "current",
  "latest",
]);

const METRIC_REGISTRY: Record<string, MetricRegistryEntry> = {
  leads: {
    metricId: "leads",
    formatType: "number",
    additive: true,
    primaryDataset: "fact_nubrakes_channel_market_kpi_daily",
    fieldNames: ["leads", "Leads", "lead_count", "Lead Count"],
  },
  jobs_booked: {
    metricId: "jobs_booked",
    formatType: "number",
    additive: true,
    primaryDataset: "fact_nubrakes_channel_market_kpi_daily",
    fieldNames: ["jobs_booked", "Jobs Booked", "booked_jobs", "jobs booked"],
  },
  jobs_completed: {
    metricId: "jobs_completed",
    formatType: "number",
    additive: true,
    primaryDataset: "fact_nubrakes_channel_market_kpi_daily",
    fieldNames: [
      "jobs_completed",
      "Jobs Completed",
      "completed_jobs",
      "jobs completed",
    ],
  },
  canceled_jobs: {
    metricId: "canceled_jobs",
    formatType: "number",
    additive: true,
    primaryDataset: "fact_nubrakes_channel_market_kpi_daily",
    fieldNames: ["canceled_jobs", "Canceled Jobs", "cancelled_jobs", "canceled jobs"],
  },
  revenue: {
    metricId: "revenue",
    formatType: "currency",
    additive: true,
    primaryDataset: "fact_nubrakes_channel_market_kpi_daily",
    fieldNames: ["revenue", "Revenue"],
  },
  impressions: {
    metricId: "impressions",
    formatType: "number",
    additive: true,
    primaryDataset: "fact_nubrakes_marketing_performance_daily",
    fieldNames: ["impressions", "Impressions"],
  },
  clicks: {
    metricId: "clicks",
    formatType: "number",
    additive: true,
    primaryDataset: "fact_nubrakes_marketing_performance_daily",
    fieldNames: ["clicks", "Clicks"],
  },
  marketing_spend: {
    metricId: "marketing_spend",
    formatType: "currency",
    additive: true,
    primaryDataset: "fact_nubrakes_marketing_performance_daily",
    fieldNames: ["marketing_spend", "Marketing Spend"],
  },
  available_slots: {
    metricId: "available_slots",
    formatType: "number",
    additive: true,
    primaryDataset: "fact_nubrakes_supply_demand_daily",
    fieldNames: [
      "available_slots",
      "Available Slots",
      "available slots",
      "available_slot",
      "slots_available",
      "availableSlots",
      "slots",
    ],
  },
  utilized_slots: {
    metricId: "utilized_slots",
    formatType: "number",
    additive: true,
    primaryDataset: "fact_nubrakes_supply_demand_daily",
    fieldNames: [
      "utilized_slots",
      "Utilized Slots",
      "utilized slots",
      "utilized_slot",
      "slots_utilized",
      "utilizedSlots",
    ],
  },
  customer_cancels: {
    metricId: "customer_cancels",
    formatType: "number",
    additive: true,
    primaryDataset: "fact_nubrakes_supply_demand_daily",
    fieldNames: ["customer_cancels", "Customer Cancels"],
  },
  hq_cancels: {
    metricId: "hq_cancels",
    formatType: "number",
    additive: true,
    primaryDataset: "fact_nubrakes_supply_demand_daily",
    fieldNames: ["hq_cancels", "HQ Cancels"],
  },
  customer_reschedules: {
    metricId: "customer_reschedules",
    formatType: "number",
    additive: true,
    primaryDataset: "fact_nubrakes_supply_demand_daily",
    fieldNames: ["customer_reschedules", "Customer Reschedules"],
  },
  hq_reschedules: {
    metricId: "hq_reschedules",
    formatType: "number",
    additive: true,
    primaryDataset: "fact_nubrakes_supply_demand_daily",
    fieldNames: ["hq_reschedules", "HQ Reschedules"],
  },
  booking_rate: {
    metricId: "booking_rate",
    formatType: "percent",
    additive: false,
    primaryDataset: "fact_nubrakes_channel_market_kpi_daily",
    fieldNames: ["booking_rate", "Booking Rate", "booking rate"],
    formula: (rows) => {
      const leads = sumField(rows, getMetricFieldNames("leads"));
      const jobsBooked = sumField(rows, getMetricFieldNames("jobs_booked"));
      return leads > 0 ? jobsBooked / leads : avgField(rows, ["booking_rate", "Booking Rate"]);
    },
  },
  conversion_rate: {
    metricId: "conversion_rate",
    formatType: "percent",
    additive: false,
    primaryDataset: "fact_nubrakes_channel_market_kpi_daily",
    fieldNames: ["conversion_rate", "Conversion Rate", "conversion rate"],
    formula: (rows) => {
      const leads = sumField(rows, getMetricFieldNames("leads"));
      const jobsCompleted = sumField(rows, getMetricFieldNames("jobs_completed"));
      return leads > 0 ? jobsCompleted / leads : avgField(rows, ["conversion_rate", "Conversion Rate"]);
    },
  },
  cancel_rate: {
    metricId: "cancel_rate",
    formatType: "percent",
    additive: false,
    primaryDataset: "fact_nubrakes_channel_market_kpi_daily",
    fieldNames: ["cancel_rate", "Cancel Rate", "cancel rate"],
    formula: (rows) => {
      const jobsBooked = sumField(rows, getMetricFieldNames("jobs_booked"));
      const canceledJobs = sumField(rows, getMetricFieldNames("canceled_jobs"));
      return jobsBooked > 0 ? canceledJobs / jobsBooked : avgField(rows, ["cancel_rate", "Cancel Rate"]);
    },
  },
  cancel_outcome_rate: {
    metricId: "cancel_outcome_rate",
    formatType: "percent",
    additive: false,
    primaryDataset: "fact_nubrakes_channel_market_kpi_daily",
    fieldNames: ["cancel_outcome_rate", "Cancel Outcome Rate", "cancel outcome rate"],
    formula: (rows) => {
      const jobsCompleted = sumField(rows, getMetricFieldNames("jobs_completed"));
      const canceledJobs = sumField(rows, getMetricFieldNames("canceled_jobs"));
      const denom = jobsCompleted + canceledJobs;
      return denom > 0
        ? canceledJobs / denom
        : avgField(rows, ["cancel_outcome_rate", "Cancel Outcome Rate"]);
    },
  },
  aov: {
    metricId: "aov",
    formatType: "currency",
    additive: false,
    primaryDataset: "fact_nubrakes_channel_market_kpi_daily",
    fieldNames: ["aov", "AOV", "average_order_value", "Average Order Value"],
    formula: (rows) => {
      const jobsCompleted = sumField(rows, getMetricFieldNames("jobs_completed"));
      const revenue = sumField(rows, getMetricFieldNames("revenue"));
      return jobsCompleted > 0 ? revenue / jobsCompleted : avgField(rows, ["aov", "AOV", "Average Order Value"]);
    },
  },
  ctr: {
    metricId: "ctr",
    formatType: "percent",
    additive: false,
    primaryDataset: "fact_nubrakes_marketing_performance_daily",
    fieldNames: ["ctr", "CTR"],
    formula: (rows) => {
      const impressions = sumField(rows, getMetricFieldNames("impressions"));
      const clicks = sumField(rows, getMetricFieldNames("clicks"));
      return impressions > 0 ? clicks / impressions : avgField(rows, ["ctr", "CTR"]);
    },
  },
  cpc: {
    metricId: "cpc",
    formatType: "currency",
    additive: false,
    primaryDataset: "fact_nubrakes_marketing_performance_daily",
    fieldNames: ["cpc", "CPC"],
    formula: (rows) => {
      const clicks = sumField(rows, getMetricFieldNames("clicks"));
      const spend = sumField(rows, getMetricFieldNames("marketing_spend"));
      return clicks > 0 ? spend / clicks : avgField(rows, ["cpc", "CPC"]);
    },
  },
  cost_per_inquiry: {
    metricId: "cost_per_inquiry",
    formatType: "currency",
    additive: false,
    primaryDataset: "fact_nubrakes_marketing_performance_daily",
    fieldNames: ["cost_per_inquiry", "Cost Per Inquiry"],
    formula: (rows) => {
      const leads = sumField(rows, getMetricFieldNames("leads"));
      const spend = sumField(rows, getMetricFieldNames("marketing_spend"));
      return leads > 0 ? spend / leads : avgField(rows, ["cost_per_inquiry", "Cost Per Inquiry"]);
    },
  },
  mac: {
    metricId: "mac",
    formatType: "currency",
    additive: false,
    primaryDataset: "fact_nubrakes_marketing_performance_daily",
    fieldNames: ["mac", "MAC"],
    formula: (rows) => {
      const jobsCompleted = sumField(rows, getMetricFieldNames("jobs_completed"));
      const spend = sumField(rows, getMetricFieldNames("marketing_spend"));
      return jobsCompleted > 0 ? spend / jobsCompleted : avgField(rows, ["mac", "MAC"]);
    },
  },
  technician_utilization: {
    metricId: "technician_utilization",
    formatType: "percent",
    additive: false,
    primaryDataset: "fact_nubrakes_supply_demand_daily",
    fieldNames: ["technician_utilization", "Technician Utilization"],
    formula: (rows) => {
      const available = sumField(rows, getMetricFieldNames("available_slots"));
      const utilized = sumField(rows, getMetricFieldNames("utilized_slots"));
      return available > 0
        ? utilized / available
        : avgField(rows, ["technician_utilization", "Technician Utilization"]);
    },
  },
  ft_tech_utilization: {
    metricId: "ft_tech_utilization",
    formatType: "percent",
    additive: false,
    primaryDataset: "fact_nubrakes_supply_demand_daily",
    fieldNames: ["ft_tech_utilization", "FT Tech Utilization"],
  },
  pt_tech_utilization: {
    metricId: "pt_tech_utilization",
    formatType: "percent",
    additive: false,
    primaryDataset: "fact_nubrakes_supply_demand_daily",
    fieldNames: ["pt_tech_utilization", "PT Tech Utilization"],
  },
  customer_cancel_rate: {
    metricId: "customer_cancel_rate",
    formatType: "percent",
    additive: false,
    primaryDataset: "fact_nubrakes_supply_demand_daily",
    fieldNames: ["customer_cancel_rate", "Customer Cancel Rate"],
    formula: (rows) => {
      const jobsBooked = sumField(rows, getMetricFieldNames("jobs_booked"));
      const x = sumField(rows, getMetricFieldNames("customer_cancels"));
      return jobsBooked > 0
        ? x / jobsBooked
        : avgField(rows, ["customer_cancel_rate", "Customer Cancel Rate"]);
    },
  },
  hq_cancel_rate: {
    metricId: "hq_cancel_rate",
    formatType: "percent",
    additive: false,
    primaryDataset: "fact_nubrakes_supply_demand_daily",
    fieldNames: ["hq_cancel_rate", "HQ Cancel Rate"],
    formula: (rows) => {
      const jobsBooked = sumField(rows, getMetricFieldNames("jobs_booked"));
      const x = sumField(rows, getMetricFieldNames("hq_cancels"));
      return jobsBooked > 0 ? x / jobsBooked : avgField(rows, ["hq_cancel_rate", "HQ Cancel Rate"]);
    },
  },
  reschedule_rate: {
    metricId: "reschedule_rate",
    formatType: "percent",
    additive: false,
    primaryDataset: "fact_nubrakes_supply_demand_daily",
    fieldNames: ["reschedule_rate", "Reschedule Rate"],
    formula: (rows) => {
      const jobsBooked = sumField(rows, getMetricFieldNames("jobs_booked"));
      const x =
        sumField(rows, getMetricFieldNames("customer_reschedules")) +
        sumField(rows, getMetricFieldNames("hq_reschedules"));
      return jobsBooked > 0 ? x / jobsBooked : avgField(rows, ["reschedule_rate", "Reschedule Rate"]);
    },
  },
  customer_reschedule_rate: {
    metricId: "customer_reschedule_rate",
    formatType: "percent",
    additive: false,
    primaryDataset: "fact_nubrakes_supply_demand_daily",
    fieldNames: ["customer_reschedule_rate", "Customer Reschedule Rate"],
    formula: (rows) => {
      const jobsBooked = sumField(rows, getMetricFieldNames("jobs_booked"));
      const x = sumField(rows, getMetricFieldNames("customer_reschedules"));
      return jobsBooked > 0
        ? x / jobsBooked
        : avgField(rows, ["customer_reschedule_rate", "Customer Reschedule Rate"]);
    },
  },
  hq_reschedule_rate: {
    metricId: "hq_reschedule_rate",
    formatType: "percent",
    additive: false,
    primaryDataset: "fact_nubrakes_supply_demand_daily",
    fieldNames: ["hq_reschedule_rate", "HQ Reschedule Rate"],
    formula: (rows) => {
      const jobsBooked = sumField(rows, getMetricFieldNames("jobs_booked"));
      const x = sumField(rows, getMetricFieldNames("hq_reschedules"));
      return jobsBooked > 0
        ? x / jobsBooked
        : avgField(rows, ["hq_reschedule_rate", "HQ Reschedule Rate"]);
    },
  },
};

const TOOLS = [
  {
    type: "function",
    name: "find_metric_definition",
    description: "Find the metric definition, formula, tags, and metadata for a KPI or metric query.",
    parameters: {
      type: "object",
      properties: {
        metric_query: {
          type: "string",
          description: "The KPI or metric to look up, such as conversion rate, AOV, leads, or gross margin.",
        },
      },
      required: ["metric_query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "find_dashboard_link",
    description: "Find the best matching dashboard or report link.",
    parameters: {
      type: "object",
      properties: {
        dashboard_query: {
          type: "string",
          description: "Dashboard name such as ops dashboard, marketing dashboard, supply demand dashboard.",
        },
      },
      required: ["dashboard_query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "find_dataset_link",
    description: "Find the best matching raw dataset link.",
    parameters: {
      type: "object",
      properties: {
        dataset_query: {
          type: "string",
          description: "Dataset name such as supply demand daily, channel market KPI daily, metric definitions.",
        },
      },
      required: ["dataset_query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "business_question_drivers",
    description: "Identify the KPI in a business question, return its candidate drivers, and resolve the relevant datasets to analyze.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description: "A business question such as 'Why did conversion rate drop last week?' or 'What drove AOV improvement in Atlanta?'",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_business_question",
    description: "Analyze a business question by resolving the KPI, relevant datasets, and likely drivers from linked data.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description: "A business question such as 'Why did conversion rate drop last week?' or 'What drove leads down in Atlanta this month?'",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "query_metric_value",
    description: "Return the actual metric value for a specific scope such as market, channel, and time period.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "A direct factual metric lookup question such as 'What is Dallas revenue in December 2025?'",
        },
      },
      required: ["question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_market_performance",
    description: "Rank markets for a KPI and identify which markets are underperforming versus the prior period.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description: "A market performance question such as 'Which markets are underperforming?' or 'Worst markets for completed jobs this week?'",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_mix_change",
    description: "Analyze mix change over time, such as lead mix by channel or market this week versus last week.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description: "A mix change question such as 'What changed in lead mix this week?' or 'How did channel lead mix shift last month?'",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_metric_trend",
    description: "Analyze the recent time trend for a metric by day, week, or month.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "A question like 'monthly revenue trend' or 'weekly jobs completed trend in Atlanta'.",
        },
      },
      required: ["question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_contribution_to_change",
    description: "Identify which markets or channels contributed most to a metric increase or decline.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "A question like 'Which markets contributed most to the revenue drop this month?'",
        },
      },
      required: ["question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "compare_segments",
    description: "Compare two or more market or channel segments for a metric in a given period.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "A question like 'Compare Dallas vs Houston revenue this month' or 'Referral vs Paid Search conversion last week'.",
        },
      },
      required: ["question"],
      additionalProperties: false,
    },
  }
  },
] as const;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return jsonResponse(
        {
          error: msg,
          stack: error instanceof Error ? error.stack : null,
        },
        500
      );
    }
  },
};

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (url.pathname !== "/api/ai") {
    return new Response("Not found", {
      status: 404,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
  }

  const body = (await request.json()) as {
    message?: string;
    prompt?: string;
    question?: string;
    input?: string;
  };

  const userMessage = String(
    body?.message ?? body?.prompt ?? body?.question ?? body?.input ?? ""
  ).trim();

  if (!userMessage) {
    return jsonResponse(
      {
        error: "Missing message. Expected one of: message, prompt, question, input",
      },
      400
    );
  }

  if (normalize(userMessage) === "ping") {
    return jsonResponse({
      answer: "pong",
      dataset: null,
      rows: [],
      dataset_link: null,
      dashboard_link: null,
    });
  }

  const directDatasetMatch = await tryDirectDatasetShortcut(userMessage);
  const intent = classifyIntent(userMessage);

  if (directDatasetMatch && intent.intent === "dataset_link") {
    return jsonResponse(
      buildAppResponse({
        answer: `You should use this dataset: ${directDatasetMatch.link}`,
        dataset: directDatasetMatch.dataset || directDatasetMatch.sheet_name || "dataset_list",
        datasetLink: directDatasetMatch.link || null,
        rows: [directDatasetMatch],
        data: { found: true, dataset: directDatasetMatch },
      })
    );
  }

  switch (intent.intent) {
    case "dataset_link": {
      const result = await findDatasetLink(userMessage);
      return jsonResponse(
        result.found
          ? buildAppResponse({
              answer: `You should use this dataset: ${result.dataset.link}`,
              dataset: result.dataset.dataset || result.dataset.sheet_name || "dataset_list",
              datasetLink: result.dataset.link || null,
              rows: [result.dataset],
              data: result,
            })
          : buildAppResponse({ answer: result.message, dataset: null, rows: [], data: result })
      );
    }
    case "dashboard_link": {
      const result = await findDashboardLink(userMessage);
      return jsonResponse(
        result.found
          ? buildAppResponse({
              answer: `You can find the dashboard here: ${result.dashboard.url}`,
              dataset: "dashboard_links",
              dashboardLink: result.dashboard.url || null,
              rows: [result.dashboard],
              data: result,
            })
          : buildAppResponse({ answer: result.message, dataset: null, rows: [], data: result })
      );
    }
    case "market_performance": {
      const result = await analyzeMarketPerformance(userMessage);
      return jsonResponse(formatRichAnalysisResponse(result));
    }
    case "mix_change": {
      const result = await analyzeMixChange(userMessage);
      return jsonResponse(formatRichAnalysisResponse(result));
    }
    case "metric_value": {
      const result = await queryMetricValue(userMessage);
      return jsonResponse(formatRichAnalysisResponse(result));
    }
    case "business_question": {
      const result = await analyzeBusinessQuestion(userMessage);
      return jsonResponse(formatRichAnalysisResponse(result));
    }
    case "metric_trend": {
      const result = await analyzeMetricTrend(userMessage);
      return jsonResponse(formatRichAnalysisResponse(result));
    }
    case "contribution_to_change": {
      const result = await analyzeContributionToChange(userMessage);
      return jsonResponse(formatRichAnalysisResponse(result));
    }
    case "compare_segments": {
      const result = await compareSegments(userMessage);
      return jsonResponse(formatRichAnalysisResponse(result));
    }
    case "detect_anomalies": {
      const result = await detectAnomalies(userMessage);
      return jsonResponse(formatRichAnalysisResponse(result));
    }
    case "llm_fallback":
    default:
      break;
  }

  const firstResp = await callOpenAI(env.OPENAI_API_KEY, {
    model: "gpt-5.4-mini",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are a NuBrakes business analyst assistant. " +
              "Use tools when needed. " +
              "Use find_metric_definition when the user asks what a KPI means. " +
              "Use find_dashboard_link when the user asks for a dashboard or report link. " +
              "Use find_dataset_link when the user asks for a dataset or raw data link. " +
              "Use business_question_drivers when the user asks why a KPI moved or what drove performance. " +
              "Use analyze_business_question when the user asks for an actual driver analysis from linked data. " +
              "Use query_metric_value when the user asks for a direct metric value for a market/channel/time period. " +
              "Use analyze_market_performance for questions about which markets are underperforming or worst. " +
              "Use analyze_mix_change for questions about lead mix, channel mix, or market mix changes. " +
              "Use analyze_metric_trend for trend questions. " +
              "Use analyze_contribution_to_change for contribution questions. " +
              "Use compare_segments for segment comparison questions. " +
              "Use detect_anomalies for anomaly questions. " +
              "For business questions about why a KPI changed, prefer analyze_business_question. " +
              "For direct fact lookups like revenue/conversion in a specific month, prefer query_metric_value. " +
              "Keep answers concise, quantitative when possible, and business-focused. " +
              "Do not use markdown bold. Never use double asterisks in the response. " +
              "Return plain text only.",
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: userMessage }],
      },
    ],
    tools: TOOLS,
  });

  const outputItems = firstResp.output || [];
  const toolOutputs: Array<{
    type: "function_call_output";
    call_id?: string;
    output: string;
  }> = [];

  const structuredResults: unknown[] = [];

  for (const item of outputItems) {
    if (item.type === "function_call" && item.name && item.arguments) {
      const args = safeJsonParse<Record<string, unknown>>(item.arguments, {});
      const result = await handleToolCall(item.name, args);
      structuredResults.push(result);
      toolOutputs.push({
        type: "function_call_output",
        call_id: item.call_id,
        output: JSON.stringify(result),
      });
    }
  }

  if (toolOutputs.length === 0) {
    return jsonResponse(
      buildAppResponse({
        answer: stripMarkdownBold(extractResponseText(firstResp) || "No response generated."),
        dataset: null,
        rows: [],
        debug: firstResp,
      })
    );
  }

  const secondResp = await callOpenAI(env.OPENAI_API_KEY, {
    model: "gpt-5.4-mini",
    previous_response_id: firstResp.id,
    input: toolOutputs,
  });

  return jsonResponse(
    mergeStructuredToolResultsIntoResponse(
      stripMarkdownBold(extractResponseText(secondResp) || "No response generated."),
      structuredResults,
      secondResp
    )
  );
}

function classifyIntent(message: string): IntentMatch {
  const normalized = normalize(message);
  const words = new Set(normalized.split(/\s+/).filter(Boolean));
  const hasWord = (w: string) => words.has(w);
  const hasPhrase = (p: string) => normalized.includes(p);

  const matches: IntentMatch[] = [];

  if (hasPhrase("contributed most") || hasPhrase("contribution to") || hasPhrase("explain the drop") || hasPhrase("which markets contributed") || hasPhrase("which channels contributed")) {
    matches.push({ intent: "contribution_to_change", score: 98, reason: "contribution terms" });
  }

  if ((hasPhrase("compare ") || hasPhrase(" vs ") || hasPhrase("versus ")) && (hasWord("market") || hasWord("channel") || hasWord("revenue") || hasWord("conversion") || hasWord("aov"))) {
    matches.push({ intent: "compare_segments", score: 97, reason: "comparison terms" });
  }

  if (hasWord("anomaly") || hasWord("anomalies") || hasWord("unusual") || hasWord("spike") || hasWord("abnormal")) {
    matches.push({ intent: "detect_anomalies", score: 96, reason: "anomaly terms" });
  }

  if (hasWord("trend") || hasPhrase("month over month") || hasPhrase("week over week") || hasPhrase("daily trend") || hasPhrase("monthly trend") || hasPhrase("weekly trend")) {
    matches.push({ intent: "metric_trend", score: 95, reason: "trend terms" });
  }

  if (hasPhrase("which markets are underperforming") || hasPhrase("underperforming markets") || (hasWord("markets") && (hasWord("underperforming") || hasWord("underperform") || hasWord("worst")))) {
    matches.push({ intent: "market_performance", score: 94, reason: "market performance terms" });
  }

  if (hasPhrase("lead mix") || hasPhrase("channel mix") || hasPhrase("market mix") || (hasWord("mix") && (hasWord("changed") || hasWord("shift") || hasWord("shifted")))) {
    matches.push({ intent: "mix_change", score: 93, reason: "mix terms" });
  }

  if (hasWord("dashboard") || hasWord("report") || hasPhrase("where can i find") || hasPhrase("where is")) {
    matches.push({ intent: "dashboard_link", score: 90, reason: "dashboard terms" });
  }

  if (hasWord("dataset") || hasWord("json") || hasWord("sheet") || hasPhrase("raw data") || hasPhrase("which dataset") || hasPhrase("what dataset") || hasPhrase("should i use") || hasPhrase("best dataset")) {
    matches.push({ intent: "dataset_link", score: 89, reason: "dataset terms" });
  }

  const looksLikeBusinessQuestion =
    hasWord("why") ||
    hasWord("driver") ||
    hasWord("drivers") ||
    hasWord("down") ||
    hasWord("up") ||
    hasWord("drop") ||
    hasWord("dropped") ||
    hasWord("increase") ||
    hasWord("decrease") ||
    hasWord("changed");

  const looksLikeMetricValueQuestion =
    !looksLikeBusinessQuestion &&
    (hasPhrase("what is") ||
      hasPhrase("whats") ||
      hasPhrase("what was") ||
      hasPhrase("how much") ||
      hasPhrase("show me") ||
      hasPhrase("give me")) &&
    (hasWord("revenue") ||
      hasWord("aov") ||
      hasWord("leads") ||
      hasWord("conversion") ||
      hasPhrase("conversion rate") ||
      hasPhrase("booking rate") ||
      hasPhrase("cancel rate") ||
      hasWord("ctr") ||
      hasWord("cpc") ||
      hasPhrase("marketing spend") ||
      hasPhrase("jobs completed") ||
      hasPhrase("jobs booked") ||
      hasPhrase("available slot") ||
      hasPhrase("available slots"));

  if (looksLikeMetricValueQuestion) {
    matches.push({ intent: "metric_value", score: 88, reason: "direct metric value terms" });
  }

  if (looksLikeBusinessQuestion) {
    matches.push({ intent: "business_question", score: 87, reason: "business question terms" });
  }

  if (!matches.length) {
    return { intent: "llm_fallback", score: 0, reason: "no deterministic match" };
  }

  return matches.sort((a, b) => b.score - a.score)[0];
}

function formatRichAnalysisResponse(result: any): AppApiResponse {
  if (!result?.found) {
    return buildAppResponse({
      answer: stripMarkdownBold(result?.message || "No result found."),
      dataset: null,
      rows: [],
      data: result,
    });
  }

  if (result.analysis?.underperforming_markets) {
    return buildAppResponse({
      answer: appendConfidenceText(
        stripMarkdownBold([result.analysis.summary, ...result.analysis.observations.slice(0, 6)].join("\n")),
        result.confidence
      ),
      dataset: result.datasets_used?.[0]?.dataset || result.metric?.metric_id,
      datasetLink: result.datasets_used?.[0]?.link || null,
      rows: result.analysis.underperforming_markets,
      data: result,
    });
  }

  if (result.analysis?.changes) {
    return buildAppResponse({
      answer: appendConfidenceText(
        stripMarkdownBold([result.analysis.summary, ...result.analysis.observations.slice(0, 6)].join("\n")),
        result.confidence
      ),
      dataset: result.datasets_used?.[0]?.dataset || "mix_analysis",
      datasetLink: result.datasets_used?.[0]?.link || null,
      rows: result.analysis.changes,
      data: result,
    });
  }

  if (result.result?.summary) {
    return buildAppResponse({
      answer: appendConfidenceText(stripMarkdownBold(result.result.summary), result.confidence),
      dataset: result.datasets_used?.[0]?.dataset || result.metric?.metric_id,
      datasetLink: result.datasets_used?.[0]?.link || null,
      rows: result.datasets_used || [],
      data: result,
    });
  }

  if (result.analysis?.points) {
    return buildAppResponse({
      answer: appendConfidenceText(
        stripMarkdownBold([result.analysis.summary, ...result.analysis.observations.slice(0, 6)].join("\n")),
        result.confidence
      ),
      dataset: result.datasets_used?.[0]?.dataset || result.metric?.metric_id,
      datasetLink: result.datasets_used?.[0]?.link || null,
      rows: result.analysis.points,
      data: result,
    });
  }

  if (result.analysis?.contributors) {
    return buildAppResponse({
      answer: appendConfidenceText(stripMarkdownBold(result.analysis.summary), result.confidence),
      dataset: result.datasets_used?.[0]?.dataset || result.metric?.metric_id,
      datasetLink: result.datasets_used?.[0]?.link || null,
      rows: result.analysis.contributors,
      data: result,
    });
  }

  if (result.analysis?.segments) {
    return buildAppResponse({
      answer: appendConfidenceText(stripMarkdownBold(result.analysis.delta_summary), result.confidence),
      dataset: result.datasets_used?.[0]?.dataset || result.metric?.metric_id,
      datasetLink: result.datasets_used?.[0]?.link || null,
      rows: result.analysis.segments,
      data: result,
    });
  }

  if (result.analysis?.anomalies) {
    return buildAppResponse({
      answer: appendConfidenceText(stripMarkdownBold(result.analysis.summary), result.confidence),
      dataset: result.datasets_used?.[0]?.dataset || result.metric?.metric_id,
      datasetLink: result.datasets_used?.[0]?.link || null,
      rows: result.analysis.anomalies,
      data: result,
    });
  }

  if (result.analysis?.summary) {
    return buildAppResponse({
      answer: appendConfidenceText(
        stripMarkdownBold([result.analysis.summary, ...(result.analysis.observations || []).slice(0, 6)].join("\n")),
        result.confidence
      ),
      dataset: result.datasets_used?.[0]?.dataset || result.metric?.metric_id,
      datasetLink: result.datasets_used?.[0]?.link || null,
      rows: result.datasets_used || [],
      data: result,
    });
  }

  return buildAppResponse({ answer: "No response generated.", dataset: null, rows: [], data: result });
}

function buildAppResponse(args: {
  answer: string;
  dataset?: string | null;
  rows?: Array<Record<string, unknown>>;
  datasetLink?: string | null;
  dashboardLink?: string | null;
  data?: unknown;
  debug?: unknown;
}): AppApiResponse {
  return {
    answer: stripMarkdownBold(args.answer),
    dataset: args.dataset ?? null,
    rows: args.rows ?? [],
    dataset_link: args.datasetLink ?? null,
    dashboard_link: args.dashboardLink ?? null,
    data: args.data,
    debug: args.debug,
  };
}

function appendConfidenceText(answer: string, confidence?: ConfidenceInfo): string {
  if (!confidence) return answer;
  const pct = Math.round(confidence.score * 100);
  return `${answer}\nConfidence: ${capitalize(confidence.level)} (${pct}%). ${confidence.reasons.slice(0, 2).join(" ")}`.trim();
}

function mergeStructuredToolResultsIntoResponse(answer: string, toolResults: unknown[], debug?: unknown): AppApiResponse {
  const successful = toolResults.find(
    (r) => r && typeof r === "object" && (r as Record<string, unknown>).found === true
  );

  if (!successful) {
    return buildAppResponse({
      answer: stripMarkdownBold(answer),
      dataset: null,
      rows: [],
      data: toolResults,
      debug,
    });
  }

  return formatRichAnalysisResponse({ ...(successful as Record<string, unknown>), _assistant_answer: answer, debug });
}

async function handleToolCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "find_metric_definition":
      return await findMetricDefinition(String(args.metric_query || ""));
    case "find_dashboard_link":
      return await findDashboardLink(String(args.dashboard_query || ""));
    case "find_dataset_link":
      return await findDatasetLink(String(args.dataset_query || ""));
    case "business_question_drivers":
      return await buildBusinessQuestionDriverPlan(String(args.business_question || ""));
    case "analyze_business_question":
      return await analyzeBusinessQuestion(String(args.business_question || ""));
    case "query_metric_value":
      return await queryMetricValue(String(args.question || ""));
    case "analyze_market_performance":
      return await analyzeMarketPerformance(String(args.business_question || ""));
    case "analyze_mix_change":
      return await analyzeMixChange(String(args.business_question || ""));
    case "analyze_metric_trend":
      return await analyzeMetricTrend(String(args.question || ""));
    case "analyze_contribution_to_change":
      return await analyzeContributionToChange(String(args.question || ""));
    case "compare_segments":
      return await compareSegments(String(args.question || ""));
    case "detect_anomalies":
      return await detectAnomalies(String(args.question || ""));
    default:
      return { found: false, code: "UNKNOWN_TOOL", message: `Unknown tool: ${name}` };
  }
}

async function getCachedJson<T>(key: string, loader: () => Promise<T>, ttlMs = CACHE_TTL_MS): Promise<T> {
  const now = Date.now();
  const existing = memoryCache.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.value as T;
  }
  const value = await loader();
  memoryCache.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

async function loadDashboardDefinitions(): Promise<DashboardDefinition[]> {
  return getCachedJson("dashboard_links", async () => {
    const res = await fetch(DASHBOARD_LINKS_URL);
    if (!res.ok) throw new Error(`Failed to load dashboard_links.json: ${res.status}`);
    return (await res.json()) as DashboardDefinition[];
  });
}

async function loadDatasetDefinitions(): Promise<DatasetDefinition[]> {
  return getCachedJson("dataset_list", async () => {
    const res = await fetch(DATASET_LIST_URL);
    if (!res.ok) throw new Error(`Failed to load dataset_list.json: ${res.status}`);
    return (await res.json()) as DatasetDefinition[];
  });
}

async function loadMetricDefinitions(): Promise<MetricDefinition[]> {
  return getCachedJson("metric_definitions", async () => {
    const res = await fetch(METRIC_DEFINITIONS_URL);
    if (!res.ok) throw new Error(`Failed to load metric_definitions.json: ${res.status}`);
    return (await res.json()) as MetricDefinition[];
  });
}

async function loadJsonFromUrl<T = unknown>(url: string): Promise<T> {
  return getCachedJson(`dataset:${url}`, async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load dataset from ${url}: ${res.status}`);
    return (await res.json()) as T;
  }, DATASET_CACHE_TTL_MS);
}

async function tryDirectDatasetShortcut(userMessage: string): Promise<DatasetDefinition | null> {
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

function tokenizeQuery(query: string, stopwords: Set<string>): string[] {
  return normalize(query)
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w && !stopwords.has(w));
}

function scoreDashboardEntry(query: string, entry: DashboardDefinition): number {
  const q = normalize(query);
  if (!q) return -1;

  const queryWords = tokenizeQuery(query, COMMON_STOPWORDS);
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
    for (const alias of aliases) if (alias.includes(q)) score += 75;
  }
  for (const word of queryWords) {
    if (dashboardName.includes(word)) score += 25;
    if (category.includes(word)) score += 8;
    if (description.includes(word)) score += 8;
    for (const alias of aliases) if (alias.includes(word)) score += 22;
  }
  return score;
}

function scoreDatasetEntry(query: string, entry: DatasetDefinition): number {
  const q = normalize(query);
  if (!q) return -1;

  const stopwords = new Set([...COMMON_STOPWORDS, "data", "dataset", "json", "link", "file", "should", "use", "best"]);
  const queryWords = tokenizeQuery(query, stopwords);
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

async function findDashboardLink(dashboardQuery: string): Promise<DashboardLookupResult> {
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
    return { found: false, code: "NOT_FOUND", message: `No confident dashboard link found for query: ${dashboardQuery}` };
  }

  return { found: true, dashboard: bestMatch };
}

async function findDatasetLink(datasetQuery: string): Promise<DatasetLookupResult> {
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
    return { found: false, code: "NOT_FOUND", message: `No confident dataset link found for query: ${datasetQuery}` };
  }

  return { found: true, dataset: bestMatch };
}

async function findMetricDefinition(metricQuery: string): Promise<MetricLookupResult> {
  const metrics = await loadMetricDefinitions();
  const q = normalize(metricQuery);
  if (!q) return { found: false, code: "EMPTY_QUERY", message: "Metric query is empty" };

  const stopwords = new Set([
    ...COMMON_STOPWORDS,
    "metric",
    "kpi",
    "driver",
    "drivers",
    "business",
    "question",
    "drop",
    "dropped",
    "increase",
    "increased",
    "decrease",
    "decreased",
    "change",
    "changed",
    "trend",
    "performing",
    "performance",
    "week",
    "month",
    "day",
    "during",
    "compare",
    "versus",
    "vs",
  ]);

  const queryWords = tokenizeQuery(metricQuery, stopwords);
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
      for (const tag of tags) if (tag.includes(q)) score += 70;
    }
    for (const word of queryWords) {
      if (metricId.includes(word)) score += 25;
      if (metricName.includes(word)) score += 30;
      if (definition.includes(word)) score += 8;
      for (const tag of tags) if (tag.includes(word)) score += 18;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = metric;
    }
  }

  if (!bestMatch || bestScore < 25) {
    return { found: false, code: "NOT_FOUND", message: `No metric definition found for query: ${metricQuery}` };
  }

  return { found: true, metric: bestMatch, score: bestScore };
}

async function findDatasetsByIds(datasetIds: string[]): Promise<DatasetDefinition[]> {
  if (!datasetIds?.length) return [];
  const datasets = await loadDatasetDefinitions();
  const wanted = new Set(datasetIds.map((d) => normalize(String(d)).replace(/\.json$/, "")));
  return datasets.filter((dataset) => {
    const datasetName = normalize(String(dataset.dataset || "")).replace(/\.json$/, "");
    const sheetName = normalize(String(dataset.sheet_name || "")).replace(/\.json$/, "");
    return wanted.has(datasetName) || wanted.has(sheetName);
  });
}

async function buildBusinessQuestionDriverPlan(businessQuestion: string): Promise<BusinessQuestionDriverResult> {
  const metricResult = await findMetricDefinition(businessQuestion);
  if (!metricResult.found) return { found: false, code: metricResult.code, message: metricResult.message };

  const metric = metricResult.metric;
  const relevantDatasets = metric.relevant_datasets || [];
  const candidateDrivers = metric.candidate_drivers || [];
  const allMetrics = await loadMetricDefinitions();

  const driverDefinitions = candidateDrivers
    .map((driverId) => allMetrics.find((m) => normalize(m.metric_id || "") === normalize(driverId)))
    .filter((m): m is MetricDefinition => Boolean(m));

  const driverPrimaryDatasetIds = candidateDrivers
    .map((driverId) => getPrimaryDatasetForMetric(driverId))
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
        `Classify driver movements into tailwinds, headwinds, and context signals`,
      ],
    },
  };
}

function getPrimaryDatasetForMetric(metricId: string): string | null {
  return METRIC_REGISTRY[canonicalMetricId(metricId)]?.primaryDataset || null;
}

async function analyzeBusinessQuestion(businessQuestion: string): Promise<AnalyzeBusinessQuestionResult> {
  const plan = await buildBusinessQuestionDriverPlan(businessQuestion);
  if (!plan.found) return { found: false, code: plan.code, message: plan.message };

  const metric = plan.metric;
  const candidateDrivers = (plan.analysis_plan.candidate_drivers || []).filter((d) => !["channel_mix", "market_mix"].includes(normalize(d)));
  const datasets = plan.datasets.filter((d) => d.link);

  if (!datasets.length) {
    return { found: false, code: "NO_DATASET", message: `No linked datasets found for metric: ${metric.metric_id}` };
  }

  const rawLoaded: LoadedDataset[] = await Promise.all(
    datasets.map(async (d) => {
      const rows = await loadJsonFromUrl<DatasetRow[]>(String(d.link));
      return {
        dataset: String(d.dataset || d.sheet_name || ""),
        link: d.link,
        rows: Array.isArray(rows) ? rows : [],
      };
    })
  );

  const scope = parseBusinessQuestionScopeFromRows(businessQuestion, rawLoaded.flatMap((d) => d.rows));
  const scopedLoaded: ScopedLoadedDataset[] = rawLoaded.map((d) => {
    const supportsMarket = datasetSupportsAnyField(d.rows, ["market", "Market"]);
    const supportsChannel = datasetSupportsAnyField(d.rows, ["channel_category", "Channel Category", "channel", "Channel"]);
    const filteredRows = d.rows.filter((row) => rowMatchesOptionalFilters(row, scope, supportsMarket, supportsChannel));
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

  const primaryDataset = getPrimaryDatasetForMetric(metric.metric_id);
  const kpiLoaded = primaryDataset ? filterScopedLoadedByDataset(scopedLoaded, primaryDataset) : scopedLoaded;
  if (!kpiLoaded.length) {
    return { found: false, code: "PRIMARY_DATASET_NOT_FOUND", message: `Primary dataset not found for metric: ${metric.metric_id}` };
  }

  const allCurrentRows = kpiLoaded.flatMap((d) => d.currentRows);
  const allPriorRows = kpiLoaded.flatMap((d) => d.priorRows);
  const kpiAllRows = kpiLoaded.flatMap((d) => d.filteredRows);
  const comparisonSource = kpiLoaded[0];

  if (!allCurrentRows.length) {
    return { found: false, code: "INSUFFICIENT_DATA", message: `No rows found for current ${scope.time_grain} period for metric: ${metric.metric_id}` };
  }
  if (!allPriorRows.length) {
    return { found: false, code: "INSUFFICIENT_DATA", message: `No rows found for prior ${scope.time_grain} comparison period for metric: ${metric.metric_id}` };
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
    const driverPrimaryDataset = getPrimaryDatasetForMetric(driverId);
    const relationship = getDriverRelationship(metric.metric_id, driverId);
    const driverLoaded = driverPrimaryDataset ? filterScopedLoadedByDataset(scopedLoaded, driverPrimaryDataset) : scopedLoaded;
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
        explanatoryDirection: "unknown",
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
        explanatoryDirection: "unknown",
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
        explanatoryDirection: "unknown",
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
    const explanatory = classifyDriverEffect({ relationship, deltaValue, metricChangeDirection });

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
  const metricFormat = metric.format_type || inferFormatType(metric.metric_id);

  if (currentMetricValue === null || priorMetricValue === null) {
    observations.push(`${metric.metric_name} could not be fully computed from the scoped rows for ${comparisonSource?.currentLabel || "current period"} versus ${comparisonSource?.priorLabel || "prior period"}.`);
  }

  const primaryHeadwind = rankedDrivers.find((d) => d.explanatoryDirection === "hurts");
  const secondaryHeadwind = rankedDrivers.filter((d) => d.explanatoryDirection === "hurts").slice(1, 2)[0];
  const support = rankedDrivers.find((d) => d.explanatoryDirection === "supports");
  const contextSignal = rankedDrivers.find((d) => d.explanatoryDirection === "context");

  if (primaryHeadwind) observations.push(`Primary driver: ${buildDriverObservationText(primaryHeadwind, "headwind")}`);
  if (secondaryHeadwind) observations.push(`Secondary driver: ${buildDriverObservationText(secondaryHeadwind, "headwind")}`);
  if (support) observations.push(`Offsetting factor: ${buildDriverObservationText(support, "tailwind")}`);
  if (!primaryHeadwind && !support && contextSignal) observations.push(`Context: ${buildDriverObservationText(contextSignal, "context")}`);
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

  const confidence = buildConfidence({
    currentRows: allCurrentRows.length,
    priorRows: allPriorRows.length,
    usedPacing: shouldApplyPacing({
      metricId: metric.metric_id,
      grain: scope.time_grain,
      allDatasetRows: kpiAllRows,
      scopedBucketRows: allCurrentRows,
      targetBucket: comparisonSource?.currentLabel,
    }),
    uncomputableDrivers: uncomputableDrivers.length,
    computedSuccessfully: currentMetricValue !== null && priorMetricValue !== null,
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
    confidence,
    analysis: {
      business_question: businessQuestion,
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      current_value: formatMetricValue(currentMetricValue, metricFormat),
      prior_value: formatMetricValue(priorMetricValue, metricFormat),
      delta_value: formatDeltaValue(deltaMetricValue, metricFormat),
      candidate_drivers: candidateDrivers,
      summary,
      observations,
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

async function analyzeMarketPerformance(businessQuestion: string): Promise<AnalyzeMarketPerformanceResult> {
  const metricResult = await findMetricDefinition(businessQuestion);
  if (!metricResult.found) {
    const fallbackMetric = await findMetricDefinition("jobs completed");
    if (!fallbackMetric.found) return { found: false, code: metricResult.code, message: metricResult.message };
    return analyzeMarketPerformanceWithMetric(businessQuestion, fallbackMetric.metric);
  }
  return analyzeMarketPerformanceWithMetric(businessQuestion, metricResult.metric);
}

async function analyzeMarketPerformanceWithMetric(businessQuestion: string, metric: MetricDefinition): Promise<AnalyzeMarketPerformanceResult> {
  const primaryDatasetId = getPrimaryDatasetForMetric(metric.metric_id);
  if (!primaryDatasetId) return { found: false, code: "NO_PRIMARY_DATASET", message: `No primary dataset mapping found for metric: ${metric.metric_id}` };

  const datasets = await findDatasetsByIds([primaryDatasetId]);
  const dataset = datasets.find((d) => d.link);
  if (!dataset?.link) return { found: false, code: "NO_DATASET", message: `No linked dataset found for metric: ${metric.metric_id}` };

  const rows = await loadJsonFromUrl<DatasetRow[]>(String(dataset.link));
  const loadedRows = Array.isArray(rows) ? rows : [];
  const scope = parseBusinessQuestionScopeFromRows(businessQuestion, loadedRows);
  const supportsMarket = datasetSupportsAnyField(loadedRows, ["market", "Market"]);
  if (!supportsMarket) return { found: false, code: "UNSUPPORTED_SCOPE", message: `Dataset ${primaryDatasetId} does not support market analysis.` };

  const filtered = loadedRows.filter((row) =>
    rowMatchesOptionalFilters(row, { ...scope, market: undefined }, true, datasetSupportsAnyField(loadedRows, ["channel_category", "Channel Category", "channel", "Channel"]))
  );
  const scoped = splitRowsCurrentVsPrior(filtered, scope.time_grain, scope.target_bucket);
  if (!scoped.current.length || !scoped.prior.length) {
    return { found: false, code: "INSUFFICIENT_DATA", message: `Insufficient current versus prior market rows for ${metric.metric_name}.` };
  }

  const markets = Array.from(new Set([...scoped.current, ...scoped.prior].map((r) => String(r["market"] || r["Market"] || "").trim()).filter(Boolean)));
  const formatType = metric.format_type || inferFormatType(metric.metric_id);

  const results = markets
    .map((market) => {
      const currentRows = scoped.current.filter((r) => normalize(String(r["market"] || r["Market"] || "")) === normalize(market));
      const priorRows = scoped.prior.filter((r) => normalize(String(r["market"] || r["Market"] || "")) === normalize(market));
      const currentValue = maybeProjectMetricValue({ metricId: metric.metric_id, grain: scope.time_grain, allDatasetRows: filtered, scopedBucketRows: currentRows, targetBucket: scoped.current_label });
      const priorValue = computeMetricValue(metric.metric_id, priorRows);
      const deltaValue = computeDelta(currentValue, priorValue);
      return { market, currentValue, priorValue, deltaValue };
    })
    .filter((r) => r.currentValue !== null || r.priorValue !== null);

  if (!results.length) return { found: false, code: "NO_RESULTS", message: `No market-level results found for ${metric.metric_name}.` };

  const underperforming = results
    .filter((r) => isUnderperformingMetric(metric, r.currentValue, r.priorValue))
    .sort((a, b) => underperformanceScore(metric, b.currentValue, b.priorValue) - underperformanceScore(metric, a.currentValue, a.priorValue));

  const top = underperforming.slice(0, 5);
  const observations = top.map((row) => `${row.market}: ${formatMetricValue(row.currentValue, formatType)} vs ${formatMetricValue(row.priorValue, formatType)} (${formatDeltaValue(row.deltaValue, formatType)}).`);
  const summary = top.length
    ? `Most underperforming markets for ${metric.metric_name} in ${scoped.current_label} versus ${scoped.prior_label}: ${top.map((r) => r.market).join(", ")}.`
    : `No markets appear to be underperforming for ${metric.metric_name} in ${scoped.current_label} versus ${scoped.prior_label}.`;

  return {
    found: true,
    metric,
    scope: { ...scope, market: undefined },
    datasets_used: [{ dataset: String(dataset.dataset || dataset.sheet_name || ""), link: dataset.link, row_count: filtered.length }],
    confidence: buildConfidence({ currentRows: scoped.current.length, priorRows: scoped.prior.length, usedPacing: false, uncomputableDrivers: 0, computedSuccessfully: true }),
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
    },
  };
}

async function analyzeMixChange(businessQuestion: string): Promise<AnalyzeMixChangeResult> {
  const normalized = normalize(businessQuestion);
  const mixDimension: "channel" | "market" = normalized.includes("market mix") ? "market" : "channel";
  const baseMetric = normalized.includes("job mix") || normalized.includes("completed") ? "jobs_completed" : "leads";
  const primaryDatasetId = getPrimaryDatasetForMetric(baseMetric);
  if (!primaryDatasetId) return { found: false, code: "NO_PRIMARY_DATASET", message: `No primary dataset mapping found for mix base metric: ${baseMetric}` };

  const datasets = await findDatasetsByIds([primaryDatasetId]);
  const dataset = datasets.find((d) => d.link);
  if (!dataset?.link) return { found: false, code: "NO_DATASET", message: `No linked dataset found for mix analysis.` };

  const rows = await loadJsonFromUrl<DatasetRow[]>(String(dataset.link));
  const loadedRows = Array.isArray(rows) ? rows : [];
  const scope = parseBusinessQuestionScopeFromRows(businessQuestion, loadedRows);
  const supportsMarket = datasetSupportsAnyField(loadedRows, ["market", "Market"]);
  const supportsChannel = datasetSupportsAnyField(loadedRows, ["channel_category", "Channel Category", "channel", "Channel"]);

  if (mixDimension === "market" && !supportsMarket) return { found: false, code: "UNSUPPORTED_SCOPE", message: `Dataset ${primaryDatasetId} does not support market mix analysis.` };
  if (mixDimension === "channel" && !supportsChannel) return { found: false, code: "UNSUPPORTED_SCOPE", message: `Dataset ${primaryDatasetId} does not support channel mix analysis.` };

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
  if (!scoped.current.length || !scoped.prior.length) return { found: false, code: "INSUFFICIENT_DATA", message: `Insufficient current versus prior rows for ${mixDimension} mix analysis.` };

  const dimAccessor =
    mixDimension === "channel"
      ? (row: DatasetRow) => String(row["channel_category"] || row["Channel Category"] || row["channel"] || row["Channel"] || "").trim()
      : (row: DatasetRow) => String(row["market"] || row["Market"] || "").trim();

  const currentTotal = maybeProjectMetricValue({ metricId: baseMetric, grain: scope.time_grain, allDatasetRows: filtered, scopedBucketRows: scoped.current, targetBucket: scoped.current_label }) ?? 0;
  const priorTotal = computeMetricValue(baseMetric, scoped.prior);
  if (priorTotal === null || currentTotal === 0 || priorTotal === 0) {
    return { found: false, code: "COMPUTATION_FAILED", message: `Unable to compute totals for ${mixDimension} mix analysis.` };
  }

  const allValues = Array.from(new Set([...scoped.current, ...scoped.prior].map(dimAccessor).filter(Boolean)));
  const changes = allValues
    .map((value) => {
      const currentRows = scoped.current.filter((r) => normalize(dimAccessor(r)) === normalize(value));
      const priorRows = scoped.prior.filter((r) => normalize(dimAccessor(r)) === normalize(value));
      const currentValue = maybeProjectMetricValue({ metricId: baseMetric, grain: scope.time_grain, allDatasetRows: filtered, scopedBucketRows: currentRows, targetBucket: scoped.current_label }) ?? 0;
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
  const observations = top.map((row) => `${row.dimension_value}: ${row.current_share} vs ${row.prior_share} (${row.share_delta}), volume ${row.current_value} vs ${row.prior_value}.`);
  const summary = top.length
    ? `${capitalize(baseMetric.replace(/_/g, " "))} ${mixDimension} changed in ${scoped.current_label} versus ${scoped.prior_label}. Biggest share shifts: ${top.slice(0, 3).map((r) => `${r.dimension_value} (${r.share_delta})`).join(", ")}.`
    : `No meaningful ${mixDimension} mix changes found in ${scoped.current_label} versus ${scoped.prior_label}.`;

  return {
    found: true,
    scope: { ...scope },
    datasets_used: [{ dataset: String(dataset.dataset || dataset.sheet_name || ""), link: dataset.link, row_count: filtered.length }],
    confidence: buildConfidence({ currentRows: scoped.current.length, priorRows: scoped.prior.length, usedPacing: false, uncomputableDrivers: 0, computedSuccessfully: true }),
    analysis: {
      business_question: businessQuestion,
      mix_dimension: mixDimension,
      base_metric: baseMetric,
      period: scoped.current_label,
      comparison_period: scoped.prior_label,
      summary,
      changes: top,
      observations,
    },
  };
}

async function queryMetricValue(question: string): Promise<QueryMetricValueResult> {
  const metricResult = await findMetricDefinition(question);
  if (!metricResult.found) return { found: false, code: metricResult.code, message: metricResult.message };

  const metric = metricResult.metric;
  const primaryDataset = getPrimaryDatasetForMetric(metric.metric_id);
  const relevantDatasets = metric.relevant_datasets || [];
  const linkedDatasets = await findDatasetsByIds(primaryDataset ? [primaryDataset, ...relevantDatasets] : relevantDatasets);
  const finalDatasets = linkedDatasets.filter((d) => d.link);

  if (!finalDatasets.length) return { found: false, code: "NO_DATASET", message: `No linked datasets found for metric: ${metric.metric_id}` };

  const loaded = await Promise.all(
    finalDatasets.map(async (d) => {
      const rows = await loadJsonFromUrl<DatasetRow[]>(String(d.link));
      return { dataset: String(d.dataset || d.sheet_name || ""), link: d.link, rows: Array.isArray(rows) ? rows : [] };
    })
  );

  const scope = parsePointInTimeScopeFromRows(question, loaded.flatMap((d) => d.rows));
  const scopedLoaded = loaded.map((d) => {
    const supportsMarket = datasetSupportsAnyField(d.rows, ["market", "Market"]);
    const supportsChannel = datasetSupportsAnyField(d.rows, ["channel_category", "Channel Category", "channel", "Channel"]);
    const filteredByDimensions = d.rows.filter((row) => rowMatchesPointInTimeFilters(row, scope, supportsMarket, supportsChannel));
    const bucketRows = filterRowsToTargetBucket(filteredByDimensions, scope.time_grain, scope.target_bucket);
    return { dataset: d.dataset, link: d.link, filteredRows: filteredByDimensions, bucketRows };
  });

  const usable = scopedLoaded.filter((d) => d.bucketRows.length > 0);
  if (!usable.length) {
    return {
      found: false,
      code: "INSUFFICIENT_DATA",
      message: `No rows found for ${scope.period_label}${scope.market ? ` in ${scope.market}` : ""}${scope.channel ? ` for ${scope.channel}` : ""}.`,
    };
  }

  const allRows = usable.flatMap((d) => d.bucketRows);
  const fullDatasetRows = loaded.flatMap((d) => d.rows);
  const formatType = metric.format_type || inferFormatType(metric.metric_id);
  const rawValue = maybeProjectMetricValue({ metricId: metric.metric_id, grain: scope.time_grain, allDatasetRows: fullDatasetRows, scopedBucketRows: allRows, targetBucket: scope.target_bucket });
  if (rawValue === null) return { found: false, code: "COMPUTATION_FAILED", message: `Unable to compute ${metric.metric_name} for ${scope.period_label}.` };

  const value = formatMetricValue(rawValue, formatType);
  const scopeParts = [scope.market ? `market ${scope.market}` : "", scope.channel ? `channel ${scope.channel}` : "", scope.period_label].filter(Boolean);
  const summary = `${metric.metric_name} was ${value} for ${scopeParts.join(", ")}.`;

  return {
    found: true,
    metric,
    scope,
    datasets_used: scopedLoaded.map((d) => ({ dataset: d.dataset, link: d.link, row_count: d.bucketRows.length })),
    confidence: buildConfidence({ currentRows: allRows.length, priorRows: 0, usedPacing: false, uncomputableDrivers: 0, computedSuccessfully: rawValue !== null }),
    result: {
      question,
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      value,
      raw_value: rawValue,
      period: scope.period_label,
      market: scope.market,
      channel: scope.channel,
      summary,
    },
  };
}

async function analyzeMetricTrend(question: string): Promise<AnalyzeMetricTrendResult> {
  const metricResult = await findMetricDefinition(question);
  if (!metricResult.found) return { found: false, code: metricResult.code, message: metricResult.message };

  const metric = metricResult.metric;
  const primaryDataset = getPrimaryDatasetForMetric(metric.metric_id);
  if (!primaryDataset) return { found: false, code: "NO_PRIMARY_DATASET", message: `No primary dataset found for metric: ${metric.metric_id}` };

  const datasets = await findDatasetsByIds([primaryDataset]);
  const dataset = datasets.find((d) => d.link);
  if (!dataset?.link) return { found: false, code: "NO_DATASET", message: `No linked dataset found for metric: ${metric.metric_id}` };

  const rows = await loadJsonFromUrl<DatasetRow[]>(String(dataset.link));
  const loadedRows = Array.isArray(rows) ? rows : [];
  const scope = parsePointInTimeScopeFromRows(question, loadedRows);
  const supportsMarket = datasetSupportsAnyField(loadedRows, ["market", "Market"]);
  const supportsChannel = datasetSupportsAnyField(loadedRows, ["channel_category", "Channel Category", "channel", "Channel"]);

  const filtered = loadedRows.filter((row) => rowMatchesPointInTimeFilters(row, scope, supportsMarket, supportsChannel));
  const bucketCandidates = getBucketDateFieldCandidates(scope.time_grain);
  const bucketMap = new Map<string, DatasetRow[]>();

  for (const row of filtered) {
    const key = getBucketKey(row, bucketCandidates);
    if (!key) continue;
    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key)!.push(row);
  }

  const sortedBuckets = Array.from(bucketMap.keys()).sort((a, b) => Date.parse(a) - Date.parse(b));
  const recentBuckets = sortedBuckets.slice(-6);
  if (!recentBuckets.length) return { found: false, code: "INSUFFICIENT_DATA", message: `No trend buckets found for ${metric.metric_name}.` };

  const formatType = metric.format_type || inferFormatType(metric.metric_id);
  const points = recentBuckets.map((bucket) => {
    const bucketRows = bucketMap.get(bucket) || [];
    const value = maybeProjectMetricValue({
      metricId: metric.metric_id,
      grain: scope.time_grain,
      allDatasetRows: filtered,
      scopedBucketRows: bucketRows,
      targetBucket: bucket,
    });
    return { period: bucket, value: formatMetricValue(value, formatType), raw_value: value };
  });

  const latest = points[points.length - 1];
  const prior = points.length >= 2 ? points[points.length - 2] : undefined;
  const delta = computeDelta(latest.raw_value, prior?.raw_value ?? null);
  const summary = prior
    ? `${metric.metric_name} in the latest ${scope.time_grain} was ${latest.value} versus ${prior.value} in the prior ${scope.time_grain} (${formatDeltaValue(delta, formatType)}).`
    : `${metric.metric_name} in the latest ${scope.time_grain} was ${latest.value}.`;
  const observations = points.map((p) => `${p.period}: ${p.value}.`);

  return {
    found: true,
    metric,
    scope,
    datasets_used: [{ dataset: String(dataset.dataset || dataset.sheet_name || ""), link: dataset.link, row_count: filtered.length }],
    confidence: buildConfidence({ currentRows: filtered.length, priorRows: recentBuckets.length > 1 ? (bucketMap.get(recentBuckets[recentBuckets.length - 2]) || []).length : 0, usedPacing: false, uncomputableDrivers: 0, computedSuccessfully: points.some((p) => p.raw_value !== null) }),
    analysis: {
      question,
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      grain: scope.time_grain,
      summary,
      observations,
      points,
    },
  };
}

async function analyzeContributionToChange(question: string): Promise<AnalyzeContributionToChangeResult> {
  const metricResult = await findMetricDefinition(question);
  if (!metricResult.found) return { found: false, code: metricResult.code, message: metricResult.message };

  const metric = metricResult.metric;
  const normalized = normalize(question);
  const dimension: CompareDimension = normalized.includes("channel") ? "channel" : "market";
  const primaryDataset = getPrimaryDatasetForMetric(metric.metric_id);
  if (!primaryDataset) return { found: false, code: "NO_PRIMARY_DATASET", message: `No primary dataset found for metric: ${metric.metric_id}` };

  const datasets = await findDatasetsByIds([primaryDataset]);
  const dataset = datasets.find((d) => d.link);
  if (!dataset?.link) return { found: false, code: "NO_DATASET", message: `No linked dataset found for metric: ${metric.metric_id}` };

  const rows = await loadJsonFromUrl<DatasetRow[]>(String(dataset.link));
  const loadedRows = Array.isArray(rows) ? rows : [];
  const scope = parseBusinessQuestionScopeFromRows(question, loadedRows);
  const supportsMarket = datasetSupportsAnyField(loadedRows, ["market", "Market"]);
  const supportsChannel = datasetSupportsAnyField(loadedRows, ["channel_category", "Channel Category", "channel", "Channel"]);

  if (dimension === "market" && !supportsMarket) return { found: false, code: "UNSUPPORTED_SCOPE", message: `Dataset ${primaryDataset} does not support market analysis.` };
  if (dimension === "channel" && !supportsChannel) return { found: false, code: "UNSUPPORTED_SCOPE", message: `Dataset ${primaryDataset} does not support channel analysis.` };

  const filtered = loadedRows.filter((row) =>
    rowMatchesOptionalFilters(
      row,
      { ...scope, market: dimension === "market" ? undefined : scope.market, channel: dimension === "channel" ? undefined : scope.channel },
      supportsMarket,
      supportsChannel
    )
  );
  const scoped = splitRowsCurrentVsPrior(filtered, scope.time_grain, scope.target_bucket);
  if (!scoped.current.length || !scoped.prior.length) return { found: false, code: "INSUFFICIENT_DATA", message: `Insufficient current versus prior rows for contribution analysis.` };

  const dimAccessor = dimension === "market"
    ? (row: DatasetRow) => String(row["market"] || row["Market"] || "").trim()
    : (row: DatasetRow) => String(row["channel_category"] || row["Channel Category"] || row["channel"] || row["Channel"] || "").trim();

  const segments = Array.from(new Set([...scoped.current, ...scoped.prior].map(dimAccessor).filter(Boolean)));
  const totalCurrent = maybeProjectMetricValue({ metricId: metric.metric_id, grain: scope.time_grain, allDatasetRows: filtered, scopedBucketRows: scoped.current, targetBucket: scoped.current_label });
  const totalPrior = computeMetricValue(metric.metric_id, scoped.prior);
  const totalDelta = computeDelta(totalCurrent, totalPrior);
  const formatType = metric.format_type || inferFormatType(metric.metric_id);

  const contributors = segments
    .map((segment) => {
      const currentRows = scoped.current.filter((r) => normalize(dimAccessor(r)) === normalize(segment));
      const priorRows = scoped.prior.filter((r) => normalize(dimAccessor(r)) === normalize(segment));
      const currentValue = maybeProjectMetricValue({ metricId: metric.metric_id, grain: scope.time_grain, allDatasetRows: filtered, scopedBucketRows: currentRows, targetBucket: scoped.current_label });
      const priorValue = computeMetricValue(metric.metric_id, priorRows);
      const deltaValue = computeDelta(currentValue, priorValue);
      const rawContributionPct = totalDelta && deltaValue !== null && totalDelta !== 0 ? deltaValue / totalDelta : null;
      return {
        segment,
        current_value: formatMetricValue(currentValue, formatType),
        prior_value: formatMetricValue(priorValue, formatType),
        delta_value: formatDeltaValue(deltaValue, formatType),
        contribution_pct: rawContributionPct === null ? "N/A" : formatMetricValue(rawContributionPct, "percent"),
        raw_current_value: currentValue,
        raw_prior_value: priorValue,
        raw_delta_value: deltaValue,
        raw_contribution_pct: rawContributionPct,
      };
    })
    .filter((x) => x.raw_delta_value !== null)
    .sort((a, b) => Math.abs(b.raw_delta_value || 0) - Math.abs(a.raw_delta_value || 0))
    .slice(0, 8);

  const summary = contributors.length
    ? `Biggest ${dimension} contributors to the ${metric.metric_name} change in ${scoped.current_label} versus ${scoped.prior_label}: ${contributors.slice(0, 3).map((c) => `${c.segment} (${c.delta_value})`).join(", ")}.`
    : `No meaningful ${dimension} contribution changes found.`;

  return {
    found: true,
    metric,
    scope,
    datasets_used: [{ dataset: String(dataset.dataset || dataset.sheet_name || ""), link: dataset.link, row_count: filtered.length }],
    confidence: buildConfidence({ currentRows: scoped.current.length, priorRows: scoped.prior.length, usedPacing: false, uncomputableDrivers: 0, computedSuccessfully: totalDelta !== null }),
    analysis: {
      question,
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      dimension,
      period: scoped.current_label,
      comparison_period: scoped.prior_label,
      total_delta: formatDeltaValue(totalDelta, formatType),
      summary,
      contributors,
    },
  };
}

async function compareSegments(question: string): Promise<CompareSegmentsResult> {
  const metricResult = await findMetricDefinition(question);
  if (!metricResult.found) return { found: false, code: metricResult.code, message: metricResult.message };
  const metric = metricResult.metric;
  const normalized = normalize(question);
  const dimension: CompareDimension = normalized.includes("channel") ? "channel" : "market";
  const primaryDataset = getPrimaryDatasetForMetric(metric.metric_id);
  if (!primaryDataset) return { found: false, code: "NO_PRIMARY_DATASET", message: `No primary dataset found for metric: ${metric.metric_id}` };

  const datasets = await findDatasetsByIds([primaryDataset]);
  const dataset = datasets.find((d) => d.link);
  if (!dataset?.link) return { found: false, code: "NO_DATASET", message: `No linked dataset found for metric: ${metric.metric_id}` };

  const rows = await loadJsonFromUrl<DatasetRow[]>(String(dataset.link));
  const loadedRows = Array.isArray(rows) ? rows : [];
  const scope = parsePointInTimeScopeFromRows(question, loadedRows);
  const supportsMarket = datasetSupportsAnyField(loadedRows, ["market", "Market"]);
  const supportsChannel = datasetSupportsAnyField(loadedRows, ["channel_category", "Channel Category", "channel", "Channel"]);
  if (dimension === "market" && !supportsMarket) return { found: false, code: "UNSUPPORTED_SCOPE", message: `Dataset ${primaryDataset} does not support market comparison.` };
  if (dimension === "channel" && !supportsChannel) return { found: false, code: "UNSUPPORTED_SCOPE", message: `Dataset ${primaryDataset} does not support channel comparison.` };

  const fieldValues = uniqueDimensionValues(
    loadedRows,
    dimension === "market" ? ["market", "Market"] : ["channel_category", "Channel Category", "channel", "Channel"]
  );
  const mentionedSegments = fieldValues.filter((v) => normalized.includes(normalize(v)));
  if (mentionedSegments.length < 2) {
    return { found: false, code: "INSUFFICIENT_SEGMENTS", message: `Please mention at least two ${dimension} segments to compare.` };
  }

  const periodRows = filterRowsToTargetBucket(loadedRows, scope.time_grain, scope.target_bucket);
  const dimAccessor = dimension === "market"
    ? (row: DatasetRow) => String(row["market"] || row["Market"] || "").trim()
    : (row: DatasetRow) => String(row["channel_category"] || row["Channel Category"] || row["channel"] || row["Channel"] || "").trim();
  const formatType = metric.format_type || inferFormatType(metric.metric_id);

  const segments = mentionedSegments.slice(0, 5).map((segment) => {
    const rowsForSegment = periodRows.filter((r) => normalize(dimAccessor(r)) === normalize(segment));
    const value = maybeProjectMetricValue({ metricId: metric.metric_id, grain: scope.time_grain, allDatasetRows: loadedRows, scopedBucketRows: rowsForSegment, targetBucket: scope.target_bucket });
    return { segment, value: formatMetricValue(value, formatType), raw_value: value };
  });

  const ranked = [...segments].sort((a, b) => (b.raw_value || 0) - (a.raw_value || 0));
  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];
  const delta = computeDelta(top?.raw_value ?? null, bottom?.raw_value ?? null);
  const deltaSummary = top && bottom
    ? `${top.segment} leads ${bottom.segment} for ${metric.metric_name} in ${scope.period_label}: ${top.value} vs ${bottom.value} (${formatDeltaValue(delta, formatType)}).`
    : `Comparison computed for ${metric.metric_name} in ${scope.period_label}.`;

  return {
    found: true,
    metric,
    scope,
    datasets_used: [{ dataset: String(dataset.dataset || dataset.sheet_name || ""), link: dataset.link, row_count: periodRows.length }],
    confidence: buildConfidence({ currentRows: periodRows.length, priorRows: 0, usedPacing: false, uncomputableDrivers: 0, computedSuccessfully: segments.some((s) => s.raw_value !== null) }),
    analysis: {
      question,
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      period: scope.period_label,
      dimension,
      segments,
      delta_summary: deltaSummary,
    },
  };
}

async function detectAnomalies(question: string): Promise<DetectAnomaliesResult> {
  const metricResult = await findMetricDefinition(question);
  if (!metricResult.found) return { found: false, code: metricResult.code, message: metricResult.message };
  const metric = metricResult.metric;
  const primaryDataset = getPrimaryDatasetForMetric(metric.metric_id);
  if (!primaryDataset) return { found: false, code: "NO_PRIMARY_DATASET", message: `No primary dataset found for metric: ${metric.metric_id}` };

  const datasets = await findDatasetsByIds([primaryDataset]);
  const dataset = datasets.find((d) => d.link);
  if (!dataset?.link) return { found: false, code: "NO_DATASET", message: `No linked dataset found for metric: ${metric.metric_id}` };

  const rows = await loadJsonFromUrl<DatasetRow[]>(String(dataset.link));
  const loadedRows = Array.isArray(rows) ? rows : [];
  const scope = parseBusinessQuestionScopeFromRows(question, loadedRows);
  const supportsMarket = datasetSupportsAnyField(loadedRows, ["market", "Market"]);

  const filtered = loadedRows.filter((row) => rowMatchesOptionalFilters(row, { ...scope, market: undefined }, supportsMarket, datasetSupportsAnyField(loadedRows, ["channel_category", "Channel Category", "channel", "Channel"])));
  const scoped = splitRowsCurrentVsPrior(filtered, scope.time_grain, scope.target_bucket);
  if (!scoped.current.length) return { found: false, code: "INSUFFICIENT_DATA", message: `No latest-period rows found for anomaly detection.` };

  const fieldAccessor = supportsMarket
    ? (row: DatasetRow) => String(row["market"] || row["Market"] || "All").trim() || "All"
    : (_row: DatasetRow) => "All";

  const bucketCandidates = getBucketDateFieldCandidates(scope.time_grain);
  const bucketMap = new Map<string, DatasetRow[]>();
  for (const row of filtered) {
    const key = getBucketKey(row, bucketCandidates);
    if (!key) continue;
    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key)!.push(row);
  }

  const sortedBuckets = Array.from(bucketMap.keys()).sort((a, b) => Date.parse(a) - Date.parse(b));
  const latestPeriod = scoped.current_label;
  const baselineBuckets = sortedBuckets.filter((b) => b !== latestPeriod).slice(-4);
  if (!baselineBuckets.length) return { found: false, code: "INSUFFICIENT_BASELINE", message: `Not enough historical buckets to detect anomalies.` };

  const segments = Array.from(new Set(filtered.map(fieldAccessor).filter(Boolean)));
  const formatType = metric.format_type || inferFormatType(metric.metric_id);

  const anomalies = segments
    .map((segment) => {
      const latestRows = scoped.current.filter((r) => normalize(fieldAccessor(r)) === normalize(segment));
      const latestValue = maybeProjectMetricValue({ metricId: metric.metric_id, grain: scope.time_grain, allDatasetRows: filtered, scopedBucketRows: latestRows, targetBucket: latestPeriod });

      const baselineValues = baselineBuckets
        .map((bucket) => {
          const rowsForBucket = (bucketMap.get(bucket) || []).filter((r) => normalize(fieldAccessor(r)) === normalize(segment));
          return computeMetricValue(metric.metric_id, rowsForBucket);
        })
        .filter((v): v is number => v !== null);

      if (latestValue === null || !baselineValues.length) {
        return null;
      }

      const baselineValue = baselineValues.reduce((a, b) => a + b, 0) / baselineValues.length;
      const deltaValue = latestValue - baselineValue;
      const pctDelta = baselineValue !== 0 ? deltaValue / baselineValue : null;

      return {
        segment,
        latest_value: formatMetricValue(latestValue, formatType),
        baseline_value: formatMetricValue(baselineValue, formatType),
        delta_value: formatDeltaValue(deltaValue, formatType),
        pct_delta: pctDelta === null ? "N/A" : formatMetricValue(pctDelta, "percent"),
        raw_latest_value: latestValue,
        raw_baseline_value: baselineValue,
        raw_delta_value: deltaValue,
        raw_pct_delta: pctDelta,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .filter((x) => Math.abs(x.raw_pct_delta || 0) >= 0.2 || Math.abs(x.raw_delta_value || 0) > 0)
    .sort((a, b) => Math.abs(b.raw_pct_delta || 0) - Math.abs(a.raw_pct_delta || 0))
    .slice(0, 8);

  const summary = anomalies.length
    ? `Largest anomalies for ${metric.metric_name} in ${latestPeriod} versus trailing ${baselineBuckets.length} ${scope.time_grain} periods: ${anomalies.slice(0, 3).map((a) => `${a.segment} (${a.pct_delta})`).join(", ")}.`
    : `No strong anomalies detected for ${metric.metric_name} in ${latestPeriod}.`;

  return {
    found: true,
    metric,
    scope,
    datasets_used: [{ dataset: String(dataset.dataset || dataset.sheet_name || ""), link: dataset.link, row_count: filtered.length }],
    confidence: buildConfidence({ currentRows: scoped.current.length, priorRows: baselineBuckets.length, usedPacing: false, uncomputableDrivers: 0, computedSuccessfully: true }),
    analysis: {
      question,
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      grain: scope.time_grain,
      latest_period: latestPeriod,
      summary,
      anomalies,
    },
  };
}

function parseBusinessQuestionScopeFromRows(businessQuestion: string, rows: DatasetRow[]): ParsedBusinessScope {
  const q = normalize(businessQuestion);
  let time_grain: TimeGrain = "week";
  let target_bucket: string | undefined;

  if (q.includes("today") || q.includes("yesterday") || q.includes("daily")) {
    time_grain = "day";
  } else if (
    q.includes("month") ||
    q.includes("monthly") ||
    q.includes("mtd") ||
    q.includes("march") ||
    q.includes("april") ||
    q.includes("may") ||
    q.includes("june") ||
    q.includes("july") ||
    q.includes("august") ||
    q.includes("september") ||
    q.includes("october") ||
    q.includes("november") ||
    q.includes("december") ||
    q.includes("january") ||
    q.includes("february")
  ) {
    time_grain = "month";
  }

  const monthMap: Record<string, string> = {
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

  const matchedMonth = Object.keys(monthMap).find((m) => q.includes(m));
  if (matchedMonth) {
    const candidateYears = extractAvailableYears(rows, ["month", "Month", "day", "Day", "week", "Week"]);
    const explicitYearMatch = q.match(/\b(20\d{2})\b/);
    const explicitYear = explicitYearMatch ? Number(explicitYearMatch[1]) : undefined;
    const year = explicitYear ?? (candidateYears.length ? Math.max(...candidateYears) : new Date().getUTCFullYear());
    target_bucket = `${year}-${monthMap[matchedMonth]}-01`;
  }

  const markets = uniqueDimensionValues(rows, ["market", "Market"]);
  const channels = uniqueDimensionValues(rows, ["channel_category", "Channel Category", "channel", "Channel"]);
  const market = findBestMentionedDimensionValue(q, markets);
  const channel = findBestMentionedDimensionValue(q, channels);

  return { time_grain, compare_mode: "current_vs_prior", market, channel, target_bucket };
}

function parsePointInTimeScopeFromRows(question: string, rows: DatasetRow[]): ParsedPointInTimeScope {
  const q = normalize(question);
  const monthMap: Record<string, string> = {
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

  let time_grain: TimeGrain = "month";
  if (q.includes("today") || q.includes("yesterday") || q.includes("daily")) time_grain = "day";
  else if (q.includes("week") || q.includes("weekly")) time_grain = "week";

  const markets = uniqueDimensionValues(rows, ["market", "Market"]);
  const channels = uniqueDimensionValues(rows, ["channel_category", "Channel Category", "channel", "Channel"]);
  const market = findBestMentionedDimensionValue(q, markets);
  const channel = findBestMentionedDimensionValue(q, channels);

  const monthName = Object.keys(monthMap).find((m) => q.includes(m));
  const explicitYearMatch = q.match(/\b(20\d{2})\b/);
  const explicitYear = explicitYearMatch ? explicitYearMatch[1] : null;

  let target_bucket: string | undefined;
  let period_label = "latest available period";

  if (monthName) {
    const monthNum = monthMap[monthName];
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
      yearToUse = String(yearsWithMonth.length ? Math.max(...yearsWithMonth) : new Date().getUTCFullYear());
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

  return { time_grain, market, channel, target_bucket, period_label };
}

function extractAvailableYears(rows: DatasetRow[], fields: string[]): number[] {
  const years = new Set<number>();
  for (const row of rows) {
    for (const field of fields) {
      const raw = row[field];
      if (!raw) continue;
      const parsed = Date.parse(String(raw));
      if (Number.isFinite(parsed)) years.add(new Date(parsed).getUTCFullYear());
    }
  }
  return Array.from(years);
}

function uniqueDimensionValues(rows: DatasetRow[], fields: string[]): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    for (const field of fields) {
      const value = String(row[field] || "").trim();
      if (value) values.add(value);
    }
  }
  return Array.from(values);
}

function findBestMentionedDimensionValue(normalizedQuestion: string, values: string[]): string | undefined {
  let best: string | undefined;
  let bestScore = 0;
  for (const raw of values) {
    const v = normalize(raw);
    if (!v) continue;
    let score = 0;
    if (normalizedQuestion.includes(v)) score += 100 + v.length;
    const words = v.split(" ").filter(Boolean);
    const matchedWords = words.filter((word) => word.length >= 3 && normalizedQuestion.includes(word));
    score += matchedWords.length * 10;
    if (score > bestScore) {
      bestScore = score;
      best = raw;
    }
  }
  return bestScore >= 20 ? best : undefined;
}

function datasetSupportsAnyField(rows: DatasetRow[], fields: string[]): boolean {
  for (const row of rows) {
    for (const field of fields) {
      if (row[field] !== undefined && row[field] !== null && String(row[field]).trim() !== "") return true;
    }
  }
  return false;
}

function rowMatchesOptionalFilters(row: DatasetRow, scope: ParsedBusinessScope, supportsMarket = true, supportsChannel = true): boolean {
  if (scope.market && supportsMarket) {
    const marketValue = String(row["market"] || row["Market"] || "").trim();
    if (normalize(marketValue) !== normalize(scope.market)) return false;
  }
  if (scope.channel && supportsChannel) {
    const channelValue = String(row["channel_category"] || row["Channel Category"] || row["channel"] || row["Channel"] || "").trim();
    if (normalize(channelValue) !== normalize(scope.channel)) return false;
  }
  return true;
}

function rowMatchesPointInTimeFilters(row: DatasetRow, scope: ParsedPointInTimeScope, supportsMarket = true, supportsChannel = true): boolean {
  if (scope.market && supportsMarket) {
    const marketValue = String(row["market"] || row["Market"] || "").trim();
    if (normalize(marketValue) !== normalize(scope.market)) return false;
  }
  if (scope.channel && supportsChannel) {
    const channelValue = String(row["channel_category"] || row["Channel Category"] || row["channel"] || row["Channel"] || "").trim();
    if (normalize(channelValue) !== normalize(scope.channel)) return false;
  }
  return true;
}

function splitRowsCurrentVsPrior(rows: DatasetRow[], grain: TimeGrain, targetBucket?: string): ScopedRows {
  const fieldCandidates = grain === "day" ? ["day", "Day"] : grain === "month" ? ["month", "Month"] : ["week", "Week"];
  const bucketMap = new Map<string, DatasetRow[]>();

  for (const row of rows) {
    const key = getBucketKey(row, fieldCandidates);
    if (!key) continue;
    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key)!.push(row);
  }

  const sortedKeys = Array.from(bucketMap.keys()).sort((a, b) => Date.parse(a) - Date.parse(b));
  if (!sortedKeys.length) {
    return { current: [], prior: [], current_label: "current period", prior_label: "prior period" };
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

function filterRowsToTargetBucket(rows: DatasetRow[], grain: TimeGrain, targetBucket?: string): DatasetRow[] {
  const fieldCandidates = grain === "day" ? ["day", "Day"] : grain === "month" ? ["month", "Month"] : ["week", "Week"];
  if (!targetBucket) {
    const latest = getLatestBucket(rows, grain);
    if (!latest) return [];
    return rows.filter((row) => getBucketKey(row, fieldCandidates) === latest);
  }
  return rows.filter((row) => getBucketKey(row, fieldCandidates) === targetBucket);
}

function getLatestBucket(rows: DatasetRow[], grain: TimeGrain): string | undefined {
  const fieldCandidates = grain === "day" ? ["day", "Day"] : grain === "month" ? ["month", "Month"] : ["week", "Week"];
  const buckets = Array.from(new Set(rows.map((row) => getBucketKey(row, fieldCandidates)).filter(Boolean))).sort((a, b) => Date.parse(a) - Date.parse(b));
  return buckets.length ? buckets[buckets.length - 1] : undefined;
}

function getLatestAndPriorBucket(rows: DatasetRow[], grain: TimeGrain): { latest?: string; prior?: string } {
  const fieldCandidates = grain === "day" ? ["day", "Day"] : grain === "month" ? ["month", "Month"] : ["week", "Week"];
  const buckets = Array.from(new Set(rows.map((row) => getBucketKey(row, fieldCandidates)).filter(Boolean))).sort((a, b) => Date.parse(a) - Date.parse(b));
  return { latest: buckets[buckets.length - 1], prior: buckets.length >= 2 ? buckets[buckets.length - 2] : undefined };
}

function getBucketKey(row: DatasetRow, fieldCandidates: string[]): string {
  for (const field of fieldCandidates) {
    const raw = row[field];
    if (raw === null || raw === undefined || raw === "") continue;
    const value = String(raw).trim();
    if (!value) continue;

    const isoWeek = value.match(/^(\d{4})-W(\d{2})$/i);
    if (isoWeek) {
      const year = Number(isoWeek[1]);
      const week = Number(isoWeek[2]);
      const jan4 = new Date(Date.UTC(year, 0, 4));
      const jan4Dow = jan4.getUTCDay() || 7;
      const monday = new Date(jan4);
      monday.setUTCDate(jan4.getUTCDate() - jan4Dow + 1 + (week - 1) * 7);
      return monday.toISOString().slice(0, 10);
    }

    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 10);

    const ym = value.match(/^(\d{4})[-/](\d{1,2})$/);
    if (ym) return `${ym[1]}-${ym[2].padStart(2, "0")}-01`;
  }
  return "";
}

function toFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function canonicalFieldName(value: string): string {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function avgField(rows: DatasetRow[], fieldNames: string[]): number | null {
  const normalizedTargets = new Set(fieldNames.map(canonicalFieldName));
  let total = 0;
  let count = 0;

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (normalizedTargets.has(canonicalFieldName(key))) {
        const n = toFiniteNumber(value);
        if (n !== null) {
          total += n;
          count += 1;
          break;
        }
      }
    }
  }

  return count > 0 ? total / count : null;
}

function sumField(rows: DatasetRow[], fieldNames: string[]): number {
  const normalizedTargets = new Set(fieldNames.map(canonicalFieldName));
  let sum = 0;
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (normalizedTargets.has(canonicalFieldName(key))) {
        const n = toFiniteNumber(value);
        if (n !== null) sum += n;
        break;
      }
    }
  }
  return sum;
}

function getMetricFieldNames(metricId: string): string[] {
  const id = canonicalMetricId(metricId);
  return METRIC_REGISTRY[id]?.fieldNames || [metricId];
}

function computeMetricValue(metricId: string, rows: DatasetRow[]): number | null {
  const id = canonicalMetricId(metricId);
  const entry = METRIC_REGISTRY[id];
  if (!entry) {
    const fallbackSum = sumField(rows, [metricId]);
    return rows.length ? fallbackSum : null;
  }
  if (entry.formula) return entry.formula(rows);
  if (entry.additive) return sumField(rows, entry.fieldNames || [metricId]);
  return avgField(rows, entry.fieldNames || [metricId]);
}

function isAdditiveMetric(metricId: string): boolean {
  return Boolean(METRIC_REGISTRY[canonicalMetricId(metricId)]?.additive);
}

function getBucketDateFieldCandidates(grain: TimeGrain): string[] {
  return grain === "day" ? ["day", "Day"] : grain === "month" ? ["month", "Month"] : ["week", "Week"];
}

function getMaxRowDate(rows: DatasetRow[]): Date | null {
  const dates = rows
    .flatMap((row) => ["day", "Day", "week", "Week", "month", "Month"].map((field) => row[field]).filter(Boolean))
    .map((v) => new Date(String(v)))
    .filter((d) => !isNaN(d.getTime()));
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function getPointInPeriodFromRow(row: DatasetRow, grain: TimeGrain): number | null {
  const raw = row["day"] || row["Day"] || row["week"] || row["Week"] || row["month"] || row["Month"];
  if (!raw) return null;
  const d = new Date(String(raw));
  if (isNaN(d.getTime())) return null;
  if (grain === "week") {
    const dow = d.getUTCDay();
    return dow === 0 ? 7 : dow;
  }
  if (grain === "month") return d.getUTCDate();
  return null;
}

function getPeriodLengthFromBucket(bucket: string, grain: TimeGrain): number | null {
  if (!bucket) return null;
  if (grain === "week") return 7;
  if (grain === "month") {
    const [y, m] = bucket.slice(0, 10).split("-");
    return new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate();
  }
  return null;
}

function isLatestBucketForGrain(rows: DatasetRow[], grain: TimeGrain, bucket: string | undefined): boolean {
  if (!bucket) return false;
  const latest = getLatestBucket(rows, grain);
  return !!latest && latest === bucket;
}

function calcHistoricalPacingForWorker(
  grain: TimeGrain,
  rows: DatasetRow[],
  metricId: string,
  targetBucket?: string
): { projected: number; actual: number; pct: number; method: "historical" | "fallback"; sampleSize: number } | null {
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

  const currentBucket = targetBucket && grouped.has(targetBucket) ? targetBucket : keys[keys.length - 1];
  const currentRows = grouped.get(currentBucket) || [];
  if (!currentRows.length) return null;

  const maxDate = getMaxRowDate(currentRows) || getMaxRowDate(rows);
  if (!maxDate) return null;

  const currentPoint = grain === "week" ? (maxDate.getUTCDay() === 0 ? 7 : maxDate.getUTCDay()) : maxDate.getUTCDate();
  const currentActual = computeMetricValue(metricId, currentRows);
  if (currentActual === null) return null;

  const historicalKeys = keys.filter((k) => k !== currentBucket);
  const shares = historicalKeys
    .map((bucket) => {
      const bucketRows = grouped.get(bucket) || [];
      const total = computeMetricValue(metricId, bucketRows);
      if (total === null || total === 0) return null;
      const periodLength = getPeriodLengthFromBucket(bucket, grain);
      if (!periodLength) return null;
      const maxPoint = Math.max(...bucketRows.map((r) => getPointInPeriodFromRow(r, grain) || 0));
      if (maxPoint < periodLength) return null;
      const cumulativeRows = bucketRows.filter((r) => {
        const p = getPointInPeriodFromRow(r, grain);
        return p !== null && p <= currentPoint;
      });
      const cumulative = computeMetricValue(metricId, cumulativeRows);
      if (cumulative === null) return null;
      const share = cumulative / total;
      if (!share || share <= 0 || share > 1.25) return null;
      return share;
    })
    .filter((v): v is number => v !== null);

  const totalPoints = getPeriodLengthFromBucket(currentBucket, grain) || 1;
  if (!shares.length) {
    const fallbackPct = grain === "week" ? currentPoint / 7 : currentPoint / totalPoints;
    return {
      actual: currentActual,
      projected: fallbackPct > 0 ? currentActual / fallbackPct : currentActual,
      pct: fallbackPct,
      method: "fallback",
      sampleSize: 0,
    };
  }

  const historicalPct = shares.reduce((a, b) => a + b, 0) / shares.length;
  return {
    actual: currentActual,
    projected: historicalPct > 0 ? currentActual / historicalPct : currentActual,
    pct: historicalPct,
    method: "historical",
    sampleSize: shares.length,
  };
}

function shouldApplyPacing(args: {
  metricId: string;
  grain: TimeGrain;
  allDatasetRows: DatasetRow[];
  scopedBucketRows: DatasetRow[];
  targetBucket?: string;
  minHistoricalSamples?: number;
}): boolean {
  const { metricId, grain, allDatasetRows, scopedBucketRows, targetBucket, minHistoricalSamples = 3 } = args;
  if (!isAdditiveMetric(metricId)) return false;
  if (grain !== "week" && grain !== "month") return false;
  if (!isLatestBucketForGrain(allDatasetRows, grain, targetBucket)) return false;

  const pacing = calcHistoricalPacingForWorker(grain, allDatasetRows, metricId, targetBucket);
  if (!pacing) return false;
  if (pacing.method === "historical" && pacing.sampleSize < minHistoricalSamples) return false;

  const maxDate = getMaxRowDate(scopedBucketRows);
  if (!maxDate) return false;

  if (grain === "week") {
    const dayOfWeek = maxDate.getUTCDay() === 0 ? 7 : maxDate.getUTCDay();
    if (dayOfWeek >= 7) return false;
  }

  if (grain === "month") {
    const daysInMonth = getPeriodLengthFromBucket(targetBucket || "", "month");
    if (daysInMonth && maxDate.getUTCDate() >= daysInMonth) return false;
  }

  return true;
}

function maybeProjectMetricValue(args: { metricId: string; grain: TimeGrain; allDatasetRows: DatasetRow[]; scopedBucketRows: DatasetRow[]; targetBucket?: string }): number | null {
  const { metricId, grain, allDatasetRows, scopedBucketRows, targetBucket } = args;
  const rawValue = computeMetricValue(metricId, scopedBucketRows);
  if (rawValue === null) return null;
  if (!shouldApplyPacing({ metricId, grain, allDatasetRows, scopedBucketRows, targetBucket })) return rawValue;
  const pacing = calcHistoricalPacingForWorker(grain, allDatasetRows, metricId, targetBucket);
  return pacing?.projected ?? rawValue;
}

function computeDelta(currentValue: number | null, priorValue: number | null): number | null {
  if (currentValue === null || priorValue === null) return null;
  return currentValue - priorValue;
}

function filterScopedLoadedByDataset(scopedLoaded: ScopedLoadedDataset[], datasetName: string): ScopedLoadedDataset[] {
  const wanted = normalize(datasetName).replace(/\.json$/, "");
  return scopedLoaded.filter((d) => normalize(d.dataset).replace(/\.json$/, "") === wanted);
}

function deriveMetricChangeDirection(currentValue: number | null, priorValue: number | null): "up" | "down" | "flat" | "unknown" {
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

function classifyDriverEffect(args: { relationship: DriverRelationship; deltaValue: number | null; metricChangeDirection: "up" | "down" | "flat" | "unknown" }): { direction: "supports" | "hurts" | "mixed" | "context" | "unknown"; score: number } {
  const { relationship, deltaValue, metricChangeDirection } = args;
  if (deltaValue === null || metricChangeDirection === "unknown") return { direction: "unknown", score: 0 };
  if (relationship === "contextual") return { direction: "context", score: Math.abs(deltaValue) };
  if (metricChangeDirection === "flat") return { direction: "mixed", score: Math.abs(deltaValue) * 0.25 };

  const driverMovedUp = deltaValue > 0;
  const driverMovedDown = deltaValue < 0;
  const helpsMetric = relationship === "positive" ? driverMovedUp : relationship === "negative" ? driverMovedDown : false;
  const hurtsMetric = relationship === "positive" ? driverMovedDown : relationship === "negative" ? driverMovedUp : false;

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

function prettifyMetricLabel(metricId: string): string {
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

function buildDriverObservationText(obs: DriverObservation, label: "headwind" | "tailwind" | "context"): string {
  if (obs.currentValue === null && obs.priorValue === null) {
    return `${prettifyMetricLabel(obs.driverId)} is not directly computable from ${obs.datasetUsed}.`;
  }

  const metricLabel = prettifyMetricLabel(obs.driverId);
  const current = formatMetricValue(obs.currentValue, obs.formatType);
  const prior = formatMetricValue(obs.priorValue, obs.formatType);
  const delta = formatDeltaValue(obs.deltaValue, obs.formatType);

  if (label === "headwind") return `${metricLabel} moved from ${prior} to ${current} (${delta}), which looks like a headwind.`;
  if (label === "tailwind") return `${metricLabel} moved from ${prior} to ${current} (${delta}), which helped offset the decline.`;
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
  const { metric, currentMetricValue, priorMetricValue, deltaMetricValue, rankedDrivers, currentLabel, priorLabel } = args;
  const formatType = metric.format_type || inferFormatType(metric.metric_id);
  if (currentMetricValue === null || priorMetricValue === null) {
    return `${metric.metric_name} could not be fully computed for ${currentLabel} versus ${priorLabel}.`;
  }

  const headwind = rankedDrivers.find((d) => d.explanatoryDirection === "hurts");
  const support = rankedDrivers.find((d) => d.explanatoryDirection === "supports");
  let summary = `${metric.metric_name} was ${formatMetricValue(currentMetricValue, formatType)} in ${currentLabel} versus ${formatMetricValue(priorMetricValue, formatType)} in ${priorLabel} (${formatDeltaValue(deltaMetricValue, formatType)}).`;
  if (headwind) summary += ` Primary driver: ${prettifyMetricLabel(headwind.driverId)}.`;
  if (support) summary += ` Offsetting factor: ${prettifyMetricLabel(support.driverId)}.`;
  return summary;
}

function isUnderperformingMetric(metric: MetricDefinition, currentValue: number | null, priorValue: number | null): boolean {
  if (currentValue === null || priorValue === null) return false;
  const direction = normalize(metric.good_direction || "up");
  if (direction === "down") return currentValue > priorValue;
  if (direction === "neutral") return false;
  return currentValue < priorValue;
}

function underperformanceScore(metric: MetricDefinition, currentValue: number | null, priorValue: number | null): number {
  if (currentValue === null || priorValue === null) return 0;
  const direction = normalize(metric.good_direction || "up");
  return direction === "down" ? currentValue - priorValue : priorValue - currentValue;
}

function formatMetricValue(value: number | null, formatType?: string): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  switch (normalize(formatType || "")) {
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "currency":
      return `$${value.toFixed(2)}`;
    default:
      if (Math.abs(value) >= 100) return value.toFixed(0);
      if (Math.abs(value) >= 10) return value.toFixed(1);
      return value.toFixed(2);
  }
}

function formatDeltaValue(value: number | null, formatType?: string): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const sign = value > 0 ? "+" : "";
  switch (normalize(formatType || "")) {
    case "percent":
      return `${sign}${(value * 100).toFixed(1)} pts`;
    case "currency":
      return `${sign}$${value.toFixed(2)}`;
    default:
      if (Math.abs(value) >= 100) return `${sign}${value.toFixed(0)}`;
      if (Math.abs(value) >= 10) return `${sign}${value.toFixed(1)}`;
      return `${sign}${value.toFixed(2)}`;
  }
}

function inferFormatType(metricId: string): string {
  return METRIC_REGISTRY[canonicalMetricId(metricId)]?.formatType || "number";
}

function buildConfidence(args: {
  currentRows: number;
  priorRows: number;
  usedPacing: boolean;
  uncomputableDrivers: number;
  computedSuccessfully: boolean;
}): ConfidenceInfo {
  const reasons: string[] = [];
  let score = 1;

  if (!args.computedSuccessfully) {
    score -= 0.45;
    reasons.push("Metric was not fully computable.");
  } else {
    reasons.push("Primary metric computed successfully.");
  }

  if (args.currentRows < 20) {
    score -= 0.2;
    reasons.push("Current-period sample is small.");
  }
  if (args.priorRows > 0 && args.priorRows < 20) {
    score -= 0.15;
    reasons.push("Prior-period sample is small.");
  }
  if (args.usedPacing) {
    score -= 0.1;
    reasons.push("Latest period used pacing projection.");
  }
  if (args.uncomputableDrivers > 0) {
    score -= Math.min(0.2, args.uncomputableDrivers * 0.05);
    reasons.push(`${args.uncomputableDrivers} driver(s) were not computable.`);
  }

  score = Math.max(0.05, Math.min(1, score));
  const level: ConfidenceLevel = score >= 0.8 ? "high" : score >= 0.55 ? "medium" : "low";
  return { level, score, reasons };
}

function extractResponseText(resp: OpenAIResponse): string {
  if (resp.output_text && String(resp.output_text).trim()) return String(resp.output_text).trim();
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

function normalize(value: string): string {
  return String(value || "").toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function canonicalMetricId(value: string): string {
  return normalize(value).replace(/\s+/g, "_");
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function stripMarkdownBold(text: string): string {
  return String(text || "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1");
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function callOpenAI(apiKey: string, body: Record<string, unknown>): Promise<OpenAIResponse> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${text}`);
  return JSON.parse(text) as OpenAIResponse;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
