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
type DriverRelationship = "positive" | "negative" | "contextual";
type ConfidenceLabel = "high" | "medium" | "low";

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

type ConfidenceScore = {
  score: number;
  label: ConfidenceLabel;
  reasons: string[];
};

type MetricLookupResult =
  | { found: true; metric: MetricDefinition; score: number; confidence: ConfidenceScore }
  | { found: false; message: string };

type DatasetLookupResult =
  | { found: true; dataset: DatasetDefinition; confidence: ConfidenceScore }
  | { found: false; message: string };

type DashboardLookupResult =
  | { found: true; dashboard: DashboardDefinition; confidence: ConfidenceScore }
  | { found: false; message: string };

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
      confidence: ConfidenceScore;
    }
  | { found: false; message: string };

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
        confidence: ConfidenceScore;
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
  | { found: false; message: string };

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
        confidence: ConfidenceScore;
      };
    }
  | { found: false; message: string };

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
        confidence: ConfidenceScore;
      };
    }
  | { found: false; message: string };

type AnalyzeMixChangeResult =
  | {
      found: true;
      scope: ParsedBusinessScope;
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
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
        confidence: ConfidenceScore;
      };
    }
  | { found: false; message: string };

type AnalyzeMetricTrendResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: {
        time_grain: TimeGrain;
        market?: string;
        channel?: string;
      };
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      analysis: {
        business_question: string;
        metric_id: string;
        metric_name: string;
        summary: string;
        points: Array<{
          period: string;
          value: string;
          raw_value: number | null;
          is_projected: boolean;
        }>;
        observations: string[];
        confidence: ConfidenceScore;
      };
    }
  | { found: false; message: string };

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
      analysis: {
        business_question: string;
        metric_id: string;
        metric_name: string;
        dimension: "market" | "channel";
        period: string;
        comparison_period: string;
        summary: string;
        contributions: Array<{
          segment: string;
          current_value: string;
          prior_value: string;
          contribution_to_change: string;
          raw_current_value: number | null;
          raw_prior_value: number | null;
          raw_contribution_to_change: number | null;
        }>;
        observations: string[];
        confidence: ConfidenceScore;
      };
    }
  | { found: false; message: string };

type CompareSegmentsResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: {
        time_grain: TimeGrain;
        period_label: string;
        dimension: "market" | "channel";
        segment_a: string;
        segment_b: string;
      };
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      comparison: {
        metric_id: string;
        metric_name: string;
        summary: string;
        segment_a: {
          name: string;
          value: string;
          raw_value: number | null;
        };
        segment_b: {
          name: string;
          value: string;
          raw_value: number | null;
        };
        delta: string;
        raw_delta: number | null;
        confidence: ConfidenceScore;
      };
    }
  | { found: false; message: string };

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

type MetricRegistryEntry = {
  metric: MetricDefinition;
  metricId: string;
  metricName: string;
  fieldNames: string[];
  primaryDatasetId: string | null;
  formatType: string;
  goodDirection: string;
  candidateDrivers: string[];
  relevantDatasets: string[];
  kind: "additive" | "rate";
};

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
const DATASET_TTL_MS = 10 * 60 * 1000;
const MAX_TREND_POINTS = 12;

const memoryCache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlight = new Map<string, Promise<unknown>>();

const METRIC_FIELD_MAP: Record<string, string[]> = {
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

const PRIMARY_DATASET_MAP: Record<string, string> = {
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

const ADDITIVE_METRICS = new Set([
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

const RATE_METRICS = new Set([
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
          description: "A business question such as 'Why did conversion rate drop last week?'",
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
          description: "A business question such as 'Why did conversion rate drop last week?'",
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
          description: "A market performance question such as 'Which markets are underperforming?'",
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
          description: "A mix change question such as 'What changed in lead mix this week?'",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_metric_trend",
    description: "Analyze trend across the last several periods for a metric, with pacing-aware projection for the latest open period.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description: "A trend question such as 'monthly revenue trend' or 'trend for completed jobs this week'.",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_contribution_to_change",
    description: "Decompose the change in an additive metric by market or channel contribution.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description: "A question such as 'Which markets drove the revenue decline this month?'",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "compare_segments",
    description: "Compare two markets or two channels for a metric in a selected time period.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description: "A comparison question such as 'Compare Atlanta vs Dallas completed jobs this month'.",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
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
      { error: "Missing message. Expected one of: message, prompt, question, input" },
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

  const normalizedMessage = normalize(userMessage);
  const messageWords = new Set(normalizedMessage.split(/\s+/).filter(Boolean));

  const hasPhrase = (phrase: string) => normalizedMessage.includes(phrase);
  const hasWord = (word: string) => messageWords.has(word);

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

  const looksLikeTrendQuestion =
    hasWord("trend") ||
    hasPhrase("month over month") ||
    hasPhrase("week over week") ||
    hasPhrase("monthly trend") ||
    hasPhrase("weekly trend");

  const looksLikeContributionQuestion =
    hasPhrase("contribution to change") ||
    hasPhrase("contributed most") ||
    hasPhrase("drove the decline") ||
    hasPhrase("drove the increase") ||
    hasPhrase("which market drove") ||
    hasPhrase("which channel drove");

  const looksLikeSegmentCompareQuestion =
    hasWord("compare") || hasWord("versus") || hasWord("vs");

  const looksLikeMarketPerformanceQuestion =
    hasPhrase("which markets are underperforming") ||
    hasPhrase("underperforming markets") ||
    hasPhrase("which markets underperform") ||
    (hasWord("markets") && (hasWord("underperforming") || hasWord("underperform") || hasWord("worst")));

  const looksLikeMixChangeQuestion =
    hasPhrase("lead mix") ||
    hasPhrase("channel mix") ||
    hasPhrase("market mix") ||
    (hasWord("mix") && (hasWord("changed") || hasWord("shift") || hasWord("shifted")));

  const looksLikeDashboardLinkQuestion =
    hasWord("dashboard") ||
    hasWord("report") ||
    hasPhrase("where can i find") ||
    hasPhrase("where is");

  const looksLikeDatasetLinkQuestion =
    hasWord("dataset") ||
    hasWord("json") ||
    hasWord("sheet") ||
    hasPhrase("raw data") ||
    hasPhrase("which dataset") ||
    hasPhrase("what dataset") ||
    hasPhrase("should i use") ||
    hasPhrase("use for") ||
    hasPhrase("best dataset");

  const looksLikeMetricValueQuestion =
    !looksLikeBusinessQuestion &&
    !looksLikeMarketPerformanceQuestion &&
    !looksLikeMixChangeQuestion &&
    !looksLikeTrendQuestion &&
    !looksLikeContributionQuestion &&
    !looksLikeSegmentCompareQuestion &&
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

  const directDatasetMatch = await tryDirectDatasetShortcut(userMessage);

  if (directDatasetMatch && looksLikeDatasetLinkQuestion) {
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

  if (looksLikeDatasetLinkQuestion) {
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
        : buildAppResponse({
            answer: result.message,
            dataset: null,
            rows: [],
            data: result,
          })
    );
  }

  if (looksLikeDashboardLinkQuestion) {
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
        : buildAppResponse({
            answer: result.message,
            dataset: null,
            rows: [],
            data: result,
          })
    );
  }

  if (looksLikeTrendQuestion) {
    const trendResult = await analyzeMetricTrend(userMessage);
    return jsonResponse(
      trendResult.found
        ? buildAppResponse({
            answer: stripMarkdownBold([trendResult.analysis.summary, ...trendResult.analysis.observations.slice(0, 6)].join("\n")),
            dataset: trendResult.datasets_used[0]?.dataset || trendResult.metric.metric_id,
            datasetLink: trendResult.datasets_used[0]?.link || null,
            rows: trendResult.analysis.points.map((p) => ({
              period: p.period,
              value: p.value,
              raw_value: p.raw_value,
              is_projected: p.is_projected,
            })),
            data: trendResult,
          })
        : buildAppResponse({
            answer: trendResult.message,
            dataset: null,
            rows: [],
            data: trendResult,
          })
    );
  }

  if (looksLikeContributionQuestion) {
    const contributionResult = await analyzeContributionToChange(userMessage);
    return jsonResponse(
      contributionResult.found
        ? buildAppResponse({
            answer: stripMarkdownBold([contributionResult.analysis.summary, ...contributionResult.analysis.observations.slice(0, 6)].join("\n")),
            dataset: contributionResult.datasets_used[0]?.dataset || contributionResult.metric.metric_id,
            datasetLink: contributionResult.datasets_used[0]?.link || null,
            rows: contributionResult.analysis.contributions.map((r) => ({
              segment: r.segment,
              current_value: r.current_value,
              prior_value: r.prior_value,
              contribution_to_change: r.contribution_to_change,
            })),
            data: contributionResult,
          })
        : buildAppResponse({
            answer: contributionResult.message,
            dataset: null,
            rows: [],
            data: contributionResult,
          })
    );
  }

  if (looksLikeSegmentCompareQuestion) {
    const compareResult = await compareSegments(userMessage);
    if (compareResult.found) {
      return jsonResponse(
        buildAppResponse({
          answer: compareResult.comparison.summary,
          dataset: compareResult.datasets_used[0]?.dataset || compareResult.metric.metric_id,
          datasetLink: compareResult.datasets_used[0]?.link || null,
          rows: [
            {
              segment: compareResult.comparison.segment_a.name,
              value: compareResult.comparison.segment_a.value,
              raw_value: compareResult.comparison.segment_a.raw_value,
            },
            {
              segment: compareResult.comparison.segment_b.name,
              value: compareResult.comparison.segment_b.value,
              raw_value: compareResult.comparison.segment_b.raw_value,
            },
          ],
          data: compareResult,
        })
      );
    }
  }

  if (looksLikeMarketPerformanceQuestion) {
    const marketResult = await analyzeMarketPerformance(userMessage);
    return jsonResponse(
      marketResult.found
        ? buildAppResponse({
            answer: stripMarkdownBold([marketResult.analysis.summary, ...marketResult.analysis.observations.slice(0, 6)].join("\n")),
            dataset: marketResult.datasets_used[0]?.dataset || marketResult.metric.metric_id,
            datasetLink: marketResult.datasets_used[0]?.link || null,
            rows: marketResult.analysis.underperforming_markets.map((m) => ({
              market: m.market,
              current_value: m.current_value,
              prior_value: m.prior_value,
              delta_value: m.delta_value,
            })),
            data: marketResult,
          })
        : buildAppResponse({
            answer: stripMarkdownBold(marketResult.message),
            dataset: null,
            rows: [],
            data: marketResult,
          })
    );
  }

  if (looksLikeMixChangeQuestion) {
    const mixResult = await analyzeMixChange(userMessage);
    return jsonResponse(
      mixResult.found
        ? buildAppResponse({
            answer: stripMarkdownBold([mixResult.analysis.summary, ...mixResult.analysis.observations.slice(0, 6)].join("\n")),
            dataset: mixResult.datasets_used[0]?.dataset || "mix_analysis",
            datasetLink: mixResult.datasets_used[0]?.link || null,
            rows: mixResult.analysis.changes.map((c) => ({
              dimension_value: c.dimension_value,
              current_share: c.current_share,
              prior_share: c.prior_share,
              share_delta: c.share_delta,
              current_value: c.current_value,
              prior_value: c.prior_value,
            })),
            data: mixResult,
          })
        : buildAppResponse({
            answer: stripMarkdownBold(mixResult.message),
            dataset: null,
            rows: [],
            data: mixResult,
          })
    );
  }

  if (looksLikeMetricValueQuestion) {
    const valueResult = await queryMetricValue(userMessage);
    return jsonResponse(
      valueResult.found
        ? buildAppResponse({
            answer: stripMarkdownBold(valueResult.result.summary),
            dataset: valueResult.datasets_used[0]?.dataset || valueResult.metric.metric_id,
            datasetLink: valueResult.datasets_used[0]?.link || null,
            rows: valueResult.datasets_used.map((d) => ({
              dataset: d.dataset,
              dataset_link: d.link || null,
              row_count: d.row_count,
            })),
            data: valueResult,
          })
        : buildAppResponse({
            answer: stripMarkdownBold(valueResult.message),
            dataset: null,
            rows: [],
            data: valueResult,
          })
    );
  }

  if (looksLikeBusinessQuestion) {
    const directAnalysis = await analyzeBusinessQuestion(userMessage);
    return jsonResponse(
      directAnalysis.found
        ? buildAppResponse({
            answer: stripMarkdownBold([directAnalysis.analysis.summary, ...directAnalysis.analysis.observations.slice(0, 6)].join("\n")),
            dataset: directAnalysis.datasets_used[0]?.dataset || directAnalysis.metric.metric_id,
            datasetLink: directAnalysis.datasets_used[0]?.link || null,
            rows: directAnalysis.datasets_used.map((d) => ({
              dataset: d.dataset,
              dataset_link: d.link || null,
              row_count: d.row_count,
              current_row_count: d.current_row_count ?? null,
              prior_row_count: d.prior_row_count ?? null,
            })),
            data: directAnalysis,
          })
        : buildAppResponse({
            answer: stripMarkdownBold(directAnalysis.message),
            dataset: null,
            rows: [],
            data: directAnalysis,
          })
    );
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
              "Use analyze_contribution_to_change for decomposition questions. " +
              "Use compare_segments for vs/compare questions. " +
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

  let lastStructuredResult: unknown = null;

  for (const item of outputItems) {
    if (item.type === "function_call" && item.name && item.arguments) {
      const args = safeJsonParse<Record<string, unknown>>(item.arguments, {});
      const result = await handleToolCall(item.name, args);
      lastStructuredResult = result;
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
    mergeStructuredToolResultIntoResponse(
      stripMarkdownBold(extractResponseText(secondResp) || "No response generated."),
      lastStructuredResult,
      secondResp
    )
  );
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

function mergeStructuredToolResultIntoResponse(
  answer: string,
  toolResult: unknown,
  debug?: unknown
): AppApiResponse {
  const base = buildAppResponse({
    answer: stripMarkdownBold(answer),
    dataset: null,
    rows: [],
    datasetLink: null,
    dashboardLink: null,
    data: toolResult,
    debug,
  });

  if (!toolResult || typeof toolResult !== "object") return base;

  const r = toolResult as Record<string, unknown>;
  if (r.found !== true) return base;

  if ("dataset" in r) {
    const dataset = r.dataset as DatasetDefinition;
    return buildAppResponse({
      answer: stripMarkdownBold(answer),
      dataset: dataset?.dataset || dataset?.sheet_name || null,
      rows: dataset ? [dataset as Record<string, unknown>] : [],
      datasetLink: dataset?.link || null,
      dashboardLink: null,
      data: toolResult,
      debug,
    });
  }

  if ("dashboard" in r) {
    const dashboard = r.dashboard as DashboardDefinition;
    return buildAppResponse({
      answer: stripMarkdownBold(answer),
      dataset: "dashboard_links",
      rows: dashboard ? [dashboard as Record<string, unknown>] : [],
      datasetLink: null,
      dashboardLink: dashboard?.url || null,
      data: toolResult,
      debug,
    });
  }

  if ("datasets_used" in r) {
    const structured = r as {
      datasets_used?: Array<{
        dataset: string;
        link?: string;
        row_count: number;
        current_row_count?: number;
        prior_row_count?: number;
      }>;
      metric?: MetricDefinition;
    };

    const datasetsUsed = structured.datasets_used || [];

    return buildAppResponse({
      answer: stripMarkdownBold(answer),
      dataset: datasetsUsed[0]?.dataset || structured.metric?.metric_id || null,
      rows: datasetsUsed.map((d) => ({
        dataset: d.dataset,
        dataset_link: d.link || null,
        row_count: d.row_count,
        current_row_count: d.current_row_count ?? null,
        prior_row_count: d.prior_row_count ?? null,
      })),
      datasetLink: datasetsUsed[0]?.link || null,
      dashboardLink: null,
      data: toolResult,
      debug,
    });
  }

  return base;
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
      return await analyzeMetricTrend(String(args.business_question || ""));
    case "analyze_contribution_to_change":
      return await analyzeContributionToChange(String(args.business_question || ""));
    case "compare_segments":
      return await compareSegments(String(args.business_question || ""));
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function fetchJsonCached<T = unknown>(
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
    const cache = caches.default;
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

async function loadDashboardDefinitions(): Promise<DashboardDefinition[]> {
  return await fetchJsonCached<DashboardDefinition[]>(DASHBOARD_LINKS_URL, CACHE_TTL_MS);
}

async function loadDatasetDefinitions(): Promise<DatasetDefinition[]> {
  return await fetchJsonCached<DatasetDefinition[]>(DATASET_LIST_URL, CACHE_TTL_MS);
}

async function loadMetricDefinitions(): Promise<MetricDefinition[]> {
  return await fetchJsonCached<MetricDefinition[]>(METRIC_DEFINITIONS_URL, CACHE_TTL_MS);
}

async function loadJsonFromUrl<T = unknown>(url: string): Promise<T> {
  return await fetchJsonCached<T>(url, DATASET_TTL_MS);
}

async function loadMetricRegistry(): Promise<Map<string, MetricRegistryEntry>> {
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

function buildConfidenceScore(args: {
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

async function findMetricDefinition(metricQuery: string): Promise<MetricLookupResult> {
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

async function buildBusinessQuestionDriverPlan(
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

async function analyzeBusinessQuestion(
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

  const rawLoaded: LoadedDataset[] = await Promise.all(
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
        `Primary contributing factor: ${buildDriverObservationText(
          support,
          "tailwind",
          metricChangeDirection
        )}`
      );
    }
    if (primaryHeadwind) {
      observations.push(
        `Headwind: ${buildDriverObservationText(
          primaryHeadwind,
          "headwind",
          metricChangeDirection
        )}`
      );
    }
    if (secondaryHeadwind) {
      observations.push(
        `Secondary headwind: ${buildDriverObservationText(
          secondaryHeadwind,
          "headwind",
          metricChangeDirection
        )}`
      );
    }
  } else {
    if (primaryHeadwind) {
      observations.push(
        `Primary driver: ${buildDriverObservationText(
          primaryHeadwind,
          "headwind",
          metricChangeDirection
        )}`
      );
    }
    if (secondaryHeadwind) {
      observations.push(
        `Secondary driver: ${buildDriverObservationText(
          secondaryHeadwind,
          "headwind",
          metricChangeDirection
        )}`
      );
    }
    if (support) {
      observations.push(
        `Offsetting factor: ${buildDriverObservationText(
          support,
          "tailwind",
          metricChangeDirection
        )}`
      );
    }
  }

  if (!primaryHeadwind && !support && contextSignal) {
    observations.push(
      `Context: ${buildDriverObservationText(
        contextSignal,
        "context",
        metricChangeDirection
      )}`
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

async function analyzeMarketPerformance(
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
    scope: { ...scope, market: undefined },
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

async function analyzeMixChange(
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

  const currentTotal =
    maybeProjectMetricValue({
      metricId: baseMetric,
      grain: scope.time_grain,
      allDatasetRows: filtered,
      scopedBucketRows: scoped.current,
      targetBucket: scoped.current_label,
    }) ?? 0;

  const priorTotal = computeMetricValue(baseMetric, scoped.prior);

  if (priorTotal === null || currentTotal === 0 || priorTotal === 0) {
    return { found: false, message: `Unable to compute totals for ${mixDimension} mix analysis.` };
  }

  const allValues = Array.from(new Set([...scoped.current, ...scoped.prior].map(dimAccessor).filter(Boolean)));

  const changes = allValues
    .map((value) => {
      const currentRows = scoped.current.filter((r) => normalize(dimAccessor(r)) === normalize(value));
      const priorRows = scoped.prior.filter((r) => normalize(dimAccessor(r)) === normalize(value));

      const currentValue =
        maybeProjectMetricValue({
          metricId: baseMetric,
          grain: scope.time_grain,
          allDatasetRows: filtered,
          scopedBucketRows: currentRows,
          targetBucket: scoped.current_label,
        }) ?? 0;

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

async function queryMetricValue(question: string): Promise<QueryMetricValueResult> {
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

async function analyzeMetricTrend(
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

  const first = points[0];
  const last = points[points.length - 1];
  const rawDelta = computeDelta(last.raw_value, first.raw_value);

  const observations: string[] = [];
  if (last.is_projected) {
    observations.push(`Latest period ${latestBucket} uses pacing-aware projection.`);
  }
  observations.push(`Trend covers ${points.length} ${pointScope.time_grain} periods.`);
  if (pointScope.market) observations.push(`Scope: market = ${pointScope.market}.`);
  if (pointScope.channel) observations.push(`Scope: channel = ${pointScope.channel}.`);

  const summary = `${metric.metric_name} trend over the last ${points.length} ${pointScope.time_grain} periods ends at ${last.value} in ${last.period}, versus ${first.value} in ${first.period} (${formatDeltaValue(rawDelta, formatType)}).`;

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

async function analyzeContributionToChange(
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

async function compareSegments(
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

function parseBusinessQuestionScopeFromRows(
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

function parsePointInTimeScopeFromRows(
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

const MONTH_MAP: Record<string, string> = {
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

const MONTH_NAMES = Object.keys(MONTH_MAP);

function extractAvailableYears(rows: DatasetRow[], fields: string[]): number[] {
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

function findComparedSegments(normalizedQuestion: string, values: string[]): string[] {
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

function findBestMentionedDimensionValue(normalizedQuestion: string, values: string[]): string | undefined {
  const matches = findComparedSegments(normalizedQuestion, values);
  return matches[0];
}

function datasetSupportsAnyField(rows: DatasetRow[], fields: string[]): boolean {
  for (const row of rows) {
    for (const field of fields) {
      if (row[field] !== undefined && row[field] !== null && String(row[field]).trim() !== "") {
        return true;
      }
    }
  }
  return false;
}

function rowMatchesOptionalFilters(
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

function rowMatchesPointInTimeFilters(
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

function splitRowsCurrentVsPrior(
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

function filterRowsToTargetBucket(
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

function getLatestBucket(rows: DatasetRow[], grain: TimeGrain): string | undefined {
  const fieldCandidates = getBucketDateFieldCandidates(grain);
  const buckets = Array.from(new Set(rows.map((row) => getBucketKey(row, fieldCandidates)).filter(Boolean)))
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  return buckets.length ? buckets[buckets.length - 1] : undefined;
}

function getLatestAndPriorBucket(
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

function getBucketDateFieldCandidates(grain: TimeGrain): string[] {
  return grain === "day" ? ["day", "Day"] : grain === "month" ? ["month", "Month"] : ["week", "Week"];
}

function getBucketKey(row: DatasetRow, fieldCandidates: string[]): string {
  for (const field of fieldCandidates) {
    const raw = row[field];
    if (raw === null || raw === undefined || raw === "") continue;

    const value = String(raw).trim();
    if (!value) continue;

    const canonicalField = canonicalFieldName(field);

    if (canonicalField === "month") {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return `${value.slice(0, 7)}-01`;
      const ym = value.match(/^(\d{4})[-/](\d{1,2})$/);
      if (ym) {
        const y = ym[1];
        const m = ym[2].padStart(2, "0");
        return `${y}-${m}-01`;
      }
    }

    if (canonicalField === "week" || canonicalField === "day") {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return canonicalField === "month" ? `${y}-${m}-01` : `${y}-${m}-${d}`;
    }
  }

  return "";
}

function canonicalFieldName(value: string): string {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function toNumberOrNull(value: unknown): number | null {
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

function collectNumericValues(rows: DatasetRow[], fieldNames: string[]): number[] {
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

function sumFieldNullable(rows: DatasetRow[], fieldNames: string[]): number | null {
  const values = collectNumericValues(rows, fieldNames);
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0);
}

function avgFieldNullable(rows: DatasetRow[], fieldNames: string[]): number | null {
  const values = collectNumericValues(rows, fieldNames);
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function safeDivide(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null) return null;
  if (denominator === 0) return null;
  return numerator / denominator;
}

function computeMetricValue(metricId: string, rows: DatasetRow[]): number | null {
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

function addNullable(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}

function isAdditiveMetric(metricId: string): boolean {
  return ADDITIVE_METRICS.has(canonicalMetricId(metricId));
}

function getRowDateForPacing(row: DatasetRow): Date | null {
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

function isLatestBucketForGrain(rows: DatasetRow[], grain: TimeGrain, bucket: string | undefined): boolean {
  if (!bucket) return false;
  const latest = getLatestBucket(rows, grain);
  return !!latest && latest === bucket;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getPeriodStartDateFromBucket(bucket: string, grain: TimeGrain): Date | null {
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

function getPeriodEndDateFromBucket(bucket: string, grain: TimeGrain): Date | null {
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

function countWeekdaysBetweenLocal(startDate: Date | null, endDate: Date | null): number[] {
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

function sumNumberArray(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function getMetricTotalByWeekdayForWorker(rows: DatasetRow[], metricId: string): number[] {
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

function calcHistoricalPacingForWorker(
  grain: TimeGrain,
  rows: DatasetRow[],
  metricId: string,
  targetBucket?: string
): {
  projected: number;
  actual: number;
  pct: number;
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

  const historicalKeys = keys.filter((k) => k !== currentBucket);

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
        const elapsedCount = currentElapsedWeekdayCounts[i] || 0;
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

function maybeProjectMetricValue(args: {
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
  return pacing?.projected ?? rawValue;
}

function computeDelta(currentValue: number | null, priorValue: number | null): number | null {
  if (currentValue === null || priorValue === null) return null;
  return currentValue - priorValue;
}

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

function formatMetricValue(value: number | null, formatType?: string): string {
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

function formatDeltaValue(value: number | null, formatType?: string): string {
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

function inferFormatType(metricId: string): string {
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

function extractResponseText(resp: OpenAIResponse): string {
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

function normalize(value: string): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function canonicalMetricId(value: string): string {
  return normalize(value).replace(/\s+/g, "_");
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function stripMarkdownBold(text: string): string {
  return String(text || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1");
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function callOpenAI(
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

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
