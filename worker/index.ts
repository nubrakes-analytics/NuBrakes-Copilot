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

type MetricLookupResult =
  | { found: true; metric: MetricDefinition; score: number }
  | { found: false; message: string };

type DatasetLookupResult =
  | { found: true; dataset: DatasetDefinition }
  | { found: false; message: string };

type DashboardLookupResult =
  | { found: true; dashboard: DashboardDefinition }
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
    }
  | {
      found: false;
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
      message: string;
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

const TOOLS = [
  {
    type: "function",
    name: "find_metric_definition",
    description:
      "Find the metric definition, formula, tags, and metadata for a KPI or metric query.",
    parameters: {
      type: "object",
      properties: {
        metric_query: {
          type: "string",
          description:
            "The KPI or metric to look up, such as conversion rate, AOV, leads, or gross margin.",
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
          description:
            "Dashboard name such as ops dashboard, marketing dashboard, supply demand dashboard.",
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
          description:
            "Dataset name such as supply demand daily, channel market KPI daily, metric definitions.",
        },
      },
      required: ["dataset_query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "business_question_drivers",
    description:
      "Identify the KPI in a business question, return its candidate drivers, and resolve the relevant datasets to analyze.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description:
            "A business question such as 'Why did conversion rate drop last week?' or 'What drove AOV improvement in Atlanta?'",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_business_question",
    description:
      "Analyze a business question by resolving the KPI, relevant datasets, and likely drivers from linked data.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description:
            "A business question such as 'Why did conversion rate drop last week?' or 'What drove leads down in Atlanta this month?'",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "query_metric_value",
    description:
      "Return the actual metric value for a specific scope such as market, channel, and time period. Use this for direct factual questions like 'What is Dallas revenue in December 2025?' or 'What is referral conversion rate this February?'",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description:
            "A direct factual metric lookup question such as 'What is Dallas revenue in December 2025?'",
        },
      },
      required: ["question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_market_performance",
    description:
      "Rank markets for a KPI and identify which markets are underperforming versus the prior period.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description:
            "A market performance question such as 'Which markets are underperforming?' or 'Worst markets for completed jobs this week?'",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_mix_change",
    description:
      "Analyze mix change over time, such as lead mix by channel or market this week versus last week.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description:
            "A mix change question such as 'What changed in lead mix this week?' or 'How did channel lead mix shift last month?'",
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
      {
        error:
          "Missing message. Expected one of: message, prompt, question, input",
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

  const looksLikeMarketPerformanceQuestion =
    hasPhrase("which markets are underperforming") ||
    hasPhrase("underperforming markets") ||
    hasPhrase("which markets underperform") ||
    (hasWord("markets") &&
      (hasWord("underperforming") ||
        hasWord("underperform") ||
        hasWord("worst")));

  const looksLikeMixChangeQuestion =
    hasPhrase("lead mix") ||
    hasPhrase("channel mix") ||
    hasPhrase("market mix") ||
    (hasWord("mix") &&
      (hasWord("changed") || hasWord("shift") || hasWord("shifted")));

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
      hasPhrase("jobs booked"));

  const directDatasetMatch = await tryDirectDatasetShortcut(userMessage);

  if (directDatasetMatch && looksLikeDatasetLinkQuestion) {
    return jsonResponse(
      buildAppResponse({
        answer: `You should use this dataset: ${directDatasetMatch.link}`,
        dataset:
          directDatasetMatch.dataset ||
          directDatasetMatch.sheet_name ||
          "dataset_list",
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
            dataset:
              result.dataset.dataset ||
              result.dataset.sheet_name ||
              "dataset_list",
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

  if (looksLikeMarketPerformanceQuestion) {
    const marketResult = await analyzeMarketPerformance(userMessage);

    return jsonResponse(
      marketResult.found
        ? buildAppResponse({
            answer: stripMarkdownBold(
              [
                marketResult.analysis.summary,
                ...marketResult.analysis.observations.slice(0, 6),
              ].join("\n")
            ),
            dataset:
              marketResult.datasets_used[0]?.dataset ||
              marketResult.metric.metric_id,
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
            answer: stripMarkdownBold(
              [
                mixResult.analysis.summary,
                ...mixResult.analysis.observations.slice(0, 6),
              ].join("\n")
            ),
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
            dataset:
              valueResult.datasets_used[0]?.dataset ||
              valueResult.metric.metric_id,
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
            answer: stripMarkdownBold(
              [
                directAnalysis.analysis.summary,
                ...directAnalysis.analysis.observations.slice(0, 6),
              ].join("\n")
            ),
            dataset:
              directAnalysis.datasets_used[0]?.dataset ||
              directAnalysis.metric.metric_id,
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
              "For business questions about why a KPI changed, prefer analyze_business_question. " +
              "For direct fact lookups like revenue/conversion in a specific month, prefer query_metric_value. " +
              "For dashboard link questions, prefer find_dashboard_link. " +
              "For dataset/raw data link questions, prefer find_dataset_link. " +
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
        answer: stripMarkdownBold(
          extractResponseText(firstResp) || "No response generated."
        ),
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
      stripMarkdownBold(
        extractResponseText(secondResp) || "No response generated."
      ),
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
      dataset:
        datasetsUsed[0]?.dataset || structured.metric?.metric_id || null,
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
      return await buildBusinessQuestionDriverPlan(
        String(args.business_question || "")
      );
    case "analyze_business_question":
      return await analyzeBusinessQuestion(
        String(args.business_question || "")
      );
    case "query_metric_value":
      return await queryMetricValue(String(args.question || ""));
    case "analyze_market_performance":
      return await analyzeMarketPerformance(
        String(args.business_question || "")
      );
    case "analyze_mix_change":
      return await analyzeMixChange(String(args.business_question || ""));
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function loadDashboardDefinitions(): Promise<DashboardDefinition[]> {
  const res = await fetch(DASHBOARD_LINKS_URL);
  if (!res.ok) {
    throw new Error(`Failed to load dashboard_links.json: ${res.status}`);
  }
  return (await res.json()) as DashboardDefinition[];
}

async function loadDatasetDefinitions(): Promise<DatasetDefinition[]> {
  const res = await fetch(DATASET_LIST_URL);
  if (!res.ok) {
    throw new Error(`Failed to load dataset_list.json: ${res.status}`);
  }
  return (await res.json()) as DatasetDefinition[];
}

async function loadMetricDefinitions(): Promise<MetricDefinition[]> {
  const res = await fetch(METRIC_DEFINITIONS_URL);
  if (!res.ok) {
    throw new Error(`Failed to load metric_definitions.json: ${res.status}`);
  }
  return (await res.json()) as MetricDefinition[];
}

async function loadJsonFromUrl<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load dataset from ${url}: ${res.status}`);
  }
  return (await res.json()) as T;
}

async function tryDirectDatasetShortcut(
  userMessage: string
): Promise<DatasetDefinition | null> {
  const q = normalize(userMessage);
  const datasets = await loadDatasetDefinitions();

  const shortcutMatchers: Array<{
    patterns: string[];
    sheetName: string;
  }> = [
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
      patterns: [
        "marketing performance",
        "impressions clicks ctr marketing spend",
      ],
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

  return match[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function scoreDashboardEntry(query: string, entry: DashboardDefinition): number {
  const q = normalize(query);
  if (!q) return -1;

  const STOPWORDS = new Set([
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
    "link",
    "need",
    "show",
    "give",
    "me",
    "where",
    "can",
    "i",
    "find",
  ]);

  const queryWords = q
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w && !STOPWORDS.has(w));

  const dashboardName = normalize(String(entry.dashboard_name || ""));
  const category = normalize(String(entry.category || ""));
  const description = normalize(String(entry.description || ""));
  const aliases = extractDescriptionAliases(String(entry.description || "")).map(
    normalize
  );

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
    "data",
    "dataset",
    "json",
    "link",
    "file",
    "need",
    "show",
    "give",
    "me",
    "where",
    "can",
    "i",
    "find",
    "should",
    "use",
    "best",
  ]);

  const queryWords = q
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w && !STOPWORDS.has(w));

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

async function findDashboardLink(
  dashboardQuery: string
): Promise<DashboardLookupResult> {
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
    return {
      found: false,
      message: `No confident dashboard link found for query: ${dashboardQuery}`,
    };
  }

  return { found: true, dashboard: bestMatch };
}

async function findDatasetLink(
  datasetQuery: string
): Promise<DatasetLookupResult> {
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
    return {
      found: false,
      message: `No confident dataset link found for query: ${datasetQuery}`,
    };
  }

  return { found: true, dataset: bestMatch };
}

async function findMetricDefinition(
  metricQuery: string
): Promise<MetricLookupResult> {
  const metrics = await loadMetricDefinitions();
  const q = normalize(metricQuery);

  if (!q) {
    return { found: false, message: "Metric query is empty" };
  }

  const STOPWORDS = new Set([
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
    "what",
    "why",
    "how",
    "did",
    "does",
    "is",
    "are",
    "was",
    "were",
    "show",
    "tell",
    "me",
    "about",
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
    "last",
    "this",
    "week",
    "month",
    "day",
    "during",
  ]);

  const queryWords = q
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w && !STOPWORDS.has(w));

  let bestMatch: MetricDefinition | null = null;
  let bestScore = -1;

  for (const metric of metrics) {
    const metricId = normalize(metric.metric_id || "");
    const metricName = normalize(metric.metric_name || "");
    const definition = normalize(metric.definition || "");
    const tags = Array.isArray(metric.tags)
      ? metric.tags.map((t) => normalize(String(t)))
      : [];

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
    return {
      found: false,
      message: `No metric definition found for query: ${metricQuery}`,
    };
  }

  return { found: true, metric: bestMatch, score: bestScore };
}

async function findDatasetsByIds(
  datasetIds: string[]
): Promise<DatasetDefinition[]> {
  if (!datasetIds?.length) return [];

  const datasets = await loadDatasetDefinitions();
  const wanted = new Set(
    datasetIds.map((d) => normalize(String(d)).replace(/\.json$/, ""))
  );

  return datasets.filter((dataset) => {
    const datasetName = normalize(String(dataset.dataset || "")).replace(
      /\.json$/,
      ""
    );
    const sheetName = normalize(String(dataset.sheet_name || "")).replace(
      /\.json$/,
      ""
    );
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

  const metric = metricResult.metric;
  const relevantDatasets = metric.relevant_datasets || [];
  const candidateDrivers = metric.candidate_drivers || [];
  const allMetrics = await loadMetricDefinitions();

  const driverDefinitions = candidateDrivers
    .map((driverId) =>
      allMetrics.find(
        (m) => normalize(m.metric_id || "") === normalize(driverId)
      )
    )
    .filter((m): m is MetricDefinition => Boolean(m));

  const driverPrimaryDatasetIds = candidateDrivers
    .map((driverId) => getPrimaryDatasetForMetric(driverId))
    .filter((d): d is string => Boolean(d));

  const mergedDatasetIds = Array.from(
    new Set([...relevantDatasets, ...driverPrimaryDatasetIds])
  );

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
        metric.formula_logic
          ? `Validate formula: ${metric.formula_logic}`
          : `Review KPI logic and aggregation`,
        mergedDatasetIds.length
          ? `Inspect relevant datasets: ${mergedDatasetIds.join(", ")}`
          : `No linked datasets found in metric definition`,
        candidateDrivers.length
          ? `Analyze candidate drivers: ${candidateDrivers.join(", ")}`
          : `No candidate drivers defined for this metric`,
        `Slice trend by time period`,
        `Slice performance by market and channel where available`,
        `Classify driver movements into tailwinds, headwinds, and context signals`,
      ],
    },
  };
}

function getPrimaryDatasetForMetric(metricId: string): string | null {
  const id = canonicalMetricId(metricId);

  const map: Record<string, string> = {
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

    ctr: "fact_nubrakes_marketing_performance_daily",
    clicks: "fact_nubrakes_marketing_performance_daily",
    impressions: "fact_nubrakes_marketing_performance_daily",
    marketing_spend: "fact_nubrakes_marketing_performance_daily",
    cpc: "fact_nubrakes_marketing_performance_daily",
    cost_per_inquiry: "fact_nubrakes_marketing_performance_daily",
    mac: "fact_nubrakes_marketing_performance_daily",

    customer_cancels: "fact_nubrakes_supply_demand_daily",
    hq_cancels: "fact_nubrakes_supply_demand_daily",
    customer_reschedules: "fact_nubrakes_supply_demand_daily",
    hq_reschedules: "fact_nubrakes_supply_demand_daily",
    customer_cancel_rate: "fact_nubrakes_supply_demand_daily",
    hq_cancel_rate: "fact_nubrakes_supply_demand_daily",
    reschedule_rate: "fact_nubrakes_supply_demand_daily",
    customer_reschedule_rate: "fact_nubrakes_supply_demand_daily",
    hq_reschedule_rate: "fact_nubrakes_supply_demand_daily",
  };

  return map[id] || null;
}

async function analyzeBusinessQuestion(
  businessQuestion: string
): Promise<AnalyzeBusinessQuestionResult> {
  const plan = await buildBusinessQuestionDriverPlan(businessQuestion);

  if (!plan.found) {
    return { found: false, message: plan.message };
  }

  const metric = plan.metric;
  const candidateDrivers = (plan.analysis_plan.candidate_drivers || []).filter(
    (d) => !["channel_mix", "market_mix"].includes(normalize(d))
  );

  const datasets = plan.datasets.filter((d) => d.link);

  if (!datasets.length) {
    return {
      found: false,
      message: `No linked datasets found for metric: ${metric.metric_id}`,
    };
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

  const scope = parseBusinessQuestionScopeFromRows(
    businessQuestion,
    rawLoaded.flatMap((d) => d.rows)
  );

  const scopedLoaded: ScopedLoadedDataset[] = rawLoaded.map((d) => {
    const supportsMarket = datasetSupportsAnyField(d.rows, ["market", "Market"]);
    const supportsChannel = datasetSupportsAnyField(d.rows, [
      "channel_category",
      "Channel Category",
      "channel",
      "Channel",
    ]);

    const filteredRows = d.rows.filter((row) =>
      rowMatchesOptionalFilters(row, scope, supportsMarket, supportsChannel)
    );

    const scoped = splitRowsCurrentVsPrior(
      filteredRows,
      scope.time_grain,
      scope.target_bucket
    );

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

  const kpiLoaded = primaryDataset
    ? filterScopedLoadedByDataset(scopedLoaded, primaryDataset)
    : scopedLoaded;

  if (!kpiLoaded.length) {
    return {
      found: false,
      message: `Primary dataset not found for metric: ${metric.metric_id}`,
    };
  }

  const allCurrentRows = kpiLoaded.flatMap((d) => d.currentRows);
  const allPriorRows = kpiLoaded.flatMap((d) => d.priorRows);

  if (!allCurrentRows.length) {
    return {
      found: false,
      message: `No rows found for current ${scope.time_grain} period for metric: ${metric.metric_id}`,
    };
  }

  if (!allPriorRows.length) {
    return {
      found: false,
      message: `No rows found for prior ${scope.time_grain} comparison period for metric: ${metric.metric_id}`,
    };
  }

  const currentMetricValue = computeMetricValue(metric.metric_id, allCurrentRows);
  const priorMetricValue = computeMetricValue(metric.metric_id, allPriorRows);
  const deltaMetricValue = computeDelta(currentMetricValue, priorMetricValue);
  const metricChangeDirection = deriveMetricChangeDirection(
    currentMetricValue,
    priorMetricValue
  );

  const driverObservations: DriverObservation[] = candidateDrivers.map(
    (driverId) => {
      const driverPrimaryDataset = getPrimaryDatasetForMetric(driverId);
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

      const currentValue = computeMetricValue(driverId, driverCurrentRows);
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
    }
  );

  const rankedDrivers = rankDriverObservations(driverObservations);
  const observations: string[] = [];
  const metricFormat = metric.format_type || inferFormatType(metric.metric_id);
  const comparisonSource = kpiLoaded[0];

  if (currentMetricValue === null || priorMetricValue === null) {
    observations.push(
      `${metric.metric_name} could not be fully computed from the scoped rows for ${comparisonSource?.currentLabel || "current period"} versus ${comparisonSource?.priorLabel || "prior period"}.`
    );
  }

  const primaryHeadwind = rankedDrivers.find(
    (d) => d.explanatoryDirection === "hurts"
  );
  const secondaryHeadwind = rankedDrivers
    .filter((d) => d.explanatoryDirection === "hurts")
    .slice(1, 2)[0];
  const support = rankedDrivers.find(
    (d) => d.explanatoryDirection === "supports"
  );
  const contextSignal = rankedDrivers.find(
    (d) => d.explanatoryDirection === "context"
  );

  if (primaryHeadwind) {
    observations.push(
      `Primary driver: ${buildDriverObservationText(primaryHeadwind, "headwind")}`
    );
  }

  if (secondaryHeadwind) {
    observations.push(
      `Secondary driver: ${buildDriverObservationText(
        secondaryHeadwind,
        "headwind"
      )}`
    );
  }

  if (support) {
    observations.push(
      `Offsetting factor: ${buildDriverObservationText(support, "tailwind")}`
    );
  }

  if (!primaryHeadwind && !support && contextSignal) {
    observations.push(
      `Context: ${buildDriverObservationText(contextSignal, "context")}`
    );
  }

  if (scope.market) {
    observations.push(`Scope: market = ${scope.market}.`);
  }

  if (scope.channel) {
    observations.push(`Scope: channel = ${scope.channel}.`);
  }

  if (primaryDataset) {
    observations.push(`Dataset used: ${primaryDataset}.`);
  }

  const uncomputableDrivers = rankedDrivers.filter(
    (obs) => obs.currentValue === null && obs.priorValue === null
  );

  const summary = buildAnalysisSummary({
    metric,
    currentMetricValue,
    priorMetricValue,
    deltaMetricValue,
    rankedDrivers,
    currentLabel: comparisonSource?.currentLabel || "current period",
    priorLabel: comparisonSource?.priorLabel || "prior period",
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

async function analyzeMarketPerformance(
  businessQuestion: string
): Promise<AnalyzeMarketPerformanceResult> {
  const metricResult = await findMetricDefinition(businessQuestion);

  if (!metricResult.found) {
    const fallbackMetric = await findMetricDefinition("jobs completed");
    if (!fallbackMetric.found) {
      return { found: false, message: metricResult.message };
    }
    return analyzeMarketPerformanceWithMetric(
      businessQuestion,
      fallbackMetric.metric
    );
  }

  return analyzeMarketPerformanceWithMetric(
    businessQuestion,
    metricResult.metric
  );
}

async function analyzeMarketPerformanceWithMetric(
  businessQuestion: string,
  metric: MetricDefinition
): Promise<AnalyzeMarketPerformanceResult> {
  const primaryDatasetId = getPrimaryDatasetForMetric(metric.metric_id);
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

  const rows = await loadJsonFromUrl<DatasetRow[]>(String(dataset.link));
  const loadedRows = Array.isArray(rows) ? rows : [];

  const scope = parseBusinessQuestionScopeFromRows(businessQuestion, loadedRows);
  const supportsMarket = datasetSupportsAnyField(loadedRows, ["market", "Market"]);

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
      datasetSupportsAnyField(loadedRows, [
        "channel_category",
        "Channel Category",
        "channel",
        "Channel",
      ])
    )
  );

  const scoped = splitRowsCurrentVsPrior(
    filtered,
    scope.time_grain,
    scope.target_bucket
  );

  if (!scoped.current.length || !scoped.prior.length) {
    return {
      found: false,
      message: `Insufficient current versus prior market rows for ${metric.metric_name}.`,
    };
  }

  const markets = Array.from(
    new Set(
      [...scoped.current, ...scoped.prior]
        .map((r) => String(r["market"] || r["Market"] || "").trim())
        .filter(Boolean)
    )
  );

  const formatType = metric.format_type || inferFormatType(metric.metric_id);

  const results = markets
    .map((market) => {
      const currentRows = scoped.current.filter(
        (r) =>
          normalize(String(r["market"] || r["Market"] || "")) ===
          normalize(market)
      );
      const priorRows = scoped.prior.filter(
        (r) =>
          normalize(String(r["market"] || r["Market"] || "")) ===
          normalize(market)
      );

      const currentValue = computeMetricValue(metric.metric_id, currentRows);
      const priorValue = computeMetricValue(metric.metric_id, priorRows);
      const deltaValue = computeDelta(currentValue, priorValue);

      return {
        market,
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
    .sort((a, b) => {
      const av = underperformanceScore(metric, a.currentValue, a.priorValue);
      const bv = underperformanceScore(metric, b.currentValue, b.priorValue);
      return bv - av;
    });

  const top = underperforming.slice(0, 5);
  const observations: string[] = [];

  for (const row of top) {
    observations.push(
      `${row.market}: ${formatMetricValue(
        row.currentValue,
        formatType
      )} vs ${formatMetricValue(row.priorValue, formatType)} (${formatDeltaValue(
        row.deltaValue,
        formatType
      )}).`
    );
  }

  const summary = top.length
    ? `Most underperforming markets for ${metric.metric_name} in ${scoped.current_label} versus ${scoped.prior_label}: ${top
        .map((r) => r.market)
        .join(", ")}.`
    : `No markets appear to be underperforming for ${metric.metric_name} in ${scoped.current_label} versus ${scoped.prior_label}.`;

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
    },
  };
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

  const primaryDatasetId = getPrimaryDatasetForMetric(baseMetric);
  if (!primaryDatasetId) {
    return {
      found: false,
      message: `No primary dataset mapping found for mix base metric: ${baseMetric}`,
    };
  }

  const datasets = await findDatasetsByIds([primaryDatasetId]);
  const dataset = datasets.find((d) => d.link);

  if (!dataset?.link) {
    return {
      found: false,
      message: `No linked dataset found for mix analysis.`,
    };
  }

  const rows = await loadJsonFromUrl<DatasetRow[]>(String(dataset.link));
  const loadedRows = Array.isArray(rows) ? rows : [];
  const scope = parseBusinessQuestionScopeFromRows(businessQuestion, loadedRows);

  const supportsMarket = datasetSupportsAnyField(loadedRows, ["market", "Market"]);
  const supportsChannel = datasetSupportsAnyField(loadedRows, [
    "channel_category",
    "Channel Category",
    "channel",
    "Channel",
  ]);

  if (mixDimension === "market" && !supportsMarket) {
    return {
      found: false,
      message: `Dataset ${primaryDatasetId} does not support market mix analysis.`,
    };
  }

  if (mixDimension === "channel" && !supportsChannel) {
    return {
      found: false,
      message: `Dataset ${primaryDatasetId} does not support channel mix analysis.`,
    };
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

  const scoped = splitRowsCurrentVsPrior(
    filtered,
    scope.time_grain,
    scope.target_bucket
  );

  if (!scoped.current.length || !scoped.prior.length) {
    return {
      found: false,
      message: `Insufficient current versus prior rows for ${mixDimension} mix analysis.`,
    };
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

  const currentTotal = computeMetricValue(baseMetric, scoped.current);
  const priorTotal = computeMetricValue(baseMetric, scoped.prior);

  if (
    currentTotal === null ||
    priorTotal === null ||
    currentTotal === 0 ||
    priorTotal === 0
  ) {
    return {
      found: false,
      message: `Unable to compute totals for ${mixDimension} mix analysis.`,
    };
  }

  const allValues = Array.from(
    new Set([...scoped.current, ...scoped.prior].map(dimAccessor).filter(Boolean))
  );

  const changes = allValues
    .map((value) => {
      const currentRows = scoped.current.filter(
        (r) => normalize(dimAccessor(r)) === normalize(value)
      );
      const priorRows = scoped.prior.filter(
        (r) => normalize(dimAccessor(r)) === normalize(value)
      );

      const currentValue = computeMetricValue(baseMetric, currentRows) || 0;
      const priorValue = computeMetricValue(baseMetric, priorRows) || 0;
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
  const observations: string[] = [];

  for (const row of top) {
    observations.push(
      `${row.dimension_value}: ${row.current_share} vs ${row.prior_share} (${row.share_delta}), volume ${row.current_value} vs ${row.prior_value}.`
    );
  }

  const summary = top.length
    ? `${capitalize(
        baseMetric.replace(/_/g, " ")
      )} ${mixDimension} changed in ${scoped.current_label} versus ${scoped.prior_label}. Biggest share shifts: ${top
        .slice(0, 3)
        .map((r) => `${r.dimension_value} (${r.share_delta})`)
        .join(", ")}.`
    : `No meaningful ${mixDimension} mix changes found in ${scoped.current_label} versus ${scoped.prior_label}.`;

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
    },
  };
}

async function queryMetricValue(
  question: string
): Promise<QueryMetricValueResult> {
  const metricResult = await findMetricDefinition(question);

  if (!metricResult.found) {
    return { found: false, message: metricResult.message };
  }

  const metric = metricResult.metric;
  const primaryDataset = getPrimaryDatasetForMetric(metric.metric_id);
  const relevantDatasets = metric.relevant_datasets || [];
  const linkedDatasets = await findDatasetsByIds(relevantDatasets);

  const datasetsToUse = linkedDatasets.filter((d) => d.link);
  const preferredDatasets = primaryDataset
    ? datasetsToUse.filter(
        (d) =>
          normalize(String(d.dataset || d.sheet_name || "")).replace(
            /\.json$/,
            ""
          ) === normalize(primaryDataset)
      )
    : datasetsToUse;

  const finalDatasets = preferredDatasets.length
    ? preferredDatasets
    : datasetsToUse;

  if (!finalDatasets.length) {
    return {
      found: false,
      message: `No linked datasets found for metric: ${metric.metric_id}`,
    };
  }

  const loaded = await Promise.all(
    finalDatasets.map(async (d) => {
      const rows = await loadJsonFromUrl<DatasetRow[]>(String(d.link));
      return {
        dataset: String(d.dataset || d.sheet_name || ""),
        link: d.link,
        rows: Array.isArray(rows) ? rows : [],
      };
    })
  );

  const scope = parsePointInTimeScopeFromRows(
    question,
    loaded.flatMap((d) => d.rows)
  );

  const scopedLoaded = loaded.map((d) => {
    const supportsMarket = datasetSupportsAnyField(d.rows, ["market", "Market"]);
    const supportsChannel = datasetSupportsAnyField(d.rows, [
      "channel_category",
      "Channel Category",
      "channel",
      "Channel",
    ]);

    const filteredByDimensions = d.rows.filter((row) =>
      rowMatchesPointInTimeFilters(row, scope, supportsMarket, supportsChannel)
    );

    const bucketRows = filterRowsToTargetBucket(
      filteredByDimensions,
      scope.time_grain,
      scope.target_bucket
    );

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
      message: `No rows found for ${scope.period_label}${
        scope.market ? ` in ${scope.market}` : ""
      }${scope.channel ? ` for ${scope.channel}` : ""}.`,
    };
  }

  const allRows = usable.flatMap((d) => d.bucketRows);
  const rawValue = computeMetricValue(metric.metric_id, allRows);
  const formatType = metric.format_type || inferFormatType(metric.metric_id);

  if (rawValue === null) {
    return {
      found: false,
      message: `Unable to compute ${metric.metric_name} for ${scope.period_label}.`,
    };
  }

  const value = formatMetricValue(rawValue, formatType);

  const scopeParts = [
    scope.market ? `market ${scope.market}` : "",
    scope.channel ? `channel ${scope.channel}` : "",
    scope.period_label,
  ].filter(Boolean);

  const summary = `${metric.metric_name} was ${value} for ${scopeParts.join(
    ", "
  )}.`;

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
      summary,
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
    const candidateYears = extractAvailableYears(rows, [
      "month",
      "Month",
      "day",
      "Day",
      "week",
      "Week",
    ]);
    const explicitYearMatch = q.match(/\b(20\d{2})\b/);
    const explicitYear = explicitYearMatch
      ? Number(explicitYearMatch[1])
      : undefined;
    const year = explicitYear ?? (candidateYears.length
      ? Math.max(...candidateYears)
      : new Date().getUTCFullYear());
    target_bucket = `${year}-${monthMap[matchedMonth]}-01`;
  }

  const markets = uniqueDimensionValues(rows, ["market", "Market"]);
  const channels = uniqueDimensionValues(rows, [
    "channel_category",
    "Channel Category",
    "channel",
    "Channel",
  ]);

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
  if (q.includes("today") || q.includes("yesterday") || q.includes("daily")) {
    time_grain = "day";
  } else if (q.includes("week") || q.includes("weekly")) {
    time_grain = "week";
  }

  const markets = uniqueDimensionValues(rows, ["market", "Market"]);
  const channels = uniqueDimensionValues(rows, [
    "channel_category",
    "Channel Category",
    "channel",
    "Channel",
  ]);

  const market = findBestMentionedDimensionValue(q, markets);
  const channel = findBestMentionedDimensionValue(q, channels);

  const monthName = Object.keys(monthMap).find((m) => q.includes(m));

  const explicitYearMatch = q.match(/\b(20\d{2})\b/);
  const explicitYear = explicitYearMatch ? explicitYearMatch[1] : null;

  let target_bucket: string | undefined;
  let period_label = "latest available period";

  if (monthName) {
    const monthNum = monthMap[monthName];
    const availableYears = extractAvailableYears(rows, [
      "month",
      "Month",
      "day",
      "Day",
      "week",
      "Week",
    ]);

    let yearToUse: string;
    if (explicitYear) {
      yearToUse = explicitYear;
    } else {
      const yearsWithMonth = availableYears.filter((y) =>
        rows.some((row) => {
          const key = getBucketKey(row, [
            "month",
            "Month",
            "day",
            "Day",
            "week",
            "Week",
          ]);
          return key.startsWith(`${y}-${monthNum}-`);
        })
      );
      yearToUse = String(
        yearsWithMonth.length
          ? Math.max(...yearsWithMonth)
          : new Date().getUTCFullYear()
      );
    }

    target_bucket = `${yearToUse}-${monthNum}-01`;
    period_label = `${capitalize(monthName)} ${yearToUse}`;
    time_grain = "month";
  } else if (q.includes("this month")) {
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
  } else if (q.includes("this week")) {
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

function extractAvailableYears(rows: DatasetRow[], fields: string[]): number[] {
  const years = new Set<number>();

  for (const row of rows) {
    for (const field of fields) {
      const raw = row[field];
      if (!raw) continue;
      const parsed = Date.parse(String(raw));
      if (Number.isFinite(parsed)) {
        years.add(new Date(parsed).getUTCFullYear());
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

function findBestMentionedDimensionValue(
  normalizedQuestion: string,
  values: string[]
): string | undefined {
  let best: string | undefined;
  let bestScore = 0;

  for (const raw of values) {
    const v = normalize(raw);
    if (!v) continue;

    let score = 0;
    if (normalizedQuestion.includes(v)) score += 100;

    const words = v.split(" ").filter(Boolean);
    for (const word of words) {
      if (word.length >= 3 && normalizedQuestion.includes(word)) {
        score += 10;
      }
    }

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
      if (
        row[field] !== undefined &&
        row[field] !== null &&
        String(row[field]).trim() !== ""
      ) {
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
  const fieldCandidates =
    grain === "day"
      ? ["day", "Day"]
      : grain === "month"
        ? ["month", "Month"]
        : ["week", "Week"];

  const bucketMap = new Map<string, DatasetRow[]>();

  for (const row of rows) {
    const key = getBucketKey(row, fieldCandidates);
    if (!key) continue;

    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key)!.push(row);
  }

  const sortedKeys = Array.from(bucketMap.keys()).sort(
    (a, b) => Date.parse(a) - Date.parse(b)
  );

  if (!sortedKeys.length) {
    return {
      current: [],
      prior: [],
      current_label: "current period",
      prior_label: "prior period",
    };
  }

  let currentKey = sortedKeys[sortedKeys.length - 1];
  if (targetBucket && bucketMap.has(targetBucket)) {
    currentKey = targetBucket;
  }

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
  const fieldCandidates =
    grain === "day"
      ? ["day", "Day"]
      : grain === "month"
        ? ["month", "Month"]
        : ["week", "Week"];

  if (!targetBucket) {
    const latest = getLatestBucket(rows, grain);
    if (!latest) return [];
    return rows.filter((row) => getBucketKey(row, fieldCandidates) === latest);
  }

  return rows.filter(
    (row) => getBucketKey(row, fieldCandidates) === targetBucket
  );
}

function getLatestBucket(
  rows: DatasetRow[],
  grain: TimeGrain
): string | undefined {
  const fieldCandidates =
    grain === "day"
      ? ["day", "Day"]
      : grain === "month"
        ? ["month", "Month"]
        : ["week", "Week"];

  const buckets = rows
    .map((row) => getBucketKey(row, fieldCandidates))
    .filter(Boolean)
    .sort((a, b) => Date.parse(a) - Date.parse(b));

  return buckets.length ? buckets[buckets.length - 1] : undefined;
}

function getLatestAndPriorBucket(
  rows: DatasetRow[],
  grain: TimeGrain
): { latest?: string; prior?: string } {
  const fieldCandidates =
    grain === "day"
      ? ["day", "Day"]
      : grain === "month"
        ? ["month", "Month"]
        : ["week", "Week"];

  const buckets = Array.from(
    new Set(
      rows.map((row) => getBucketKey(row, fieldCandidates)).filter(Boolean)
    )
  ).sort((a, b) => Date.parse(a) - Date.parse(b));

  return {
    latest: buckets[buckets.length - 1],
    prior: buckets.length >= 2 ? buckets[buckets.length - 2] : undefined,
  };
}

function getBucketKey(row: DatasetRow, fieldCandidates: string[]): string {
  for (const field of fieldCandidates) {
    const raw = row[field];
    if (raw === null || raw === undefined || raw === "") continue;

    const value = String(raw).trim();
    if (!value) continue;

    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString().slice(0, 10);
    }

    const ym = value.match(/^(\d{4})[-/](\d{1,2})$/);
    if (ym) {
      const y = ym[1];
      const m = ym[2].padStart(2, "0");
      return `${y}-${m}-01`;
    }
  }
  return "";
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function avgField(rows: DatasetRow[], fieldNames: string[]): number | null {
  const normalizedTargets = new Set(fieldNames.map((f) => normalize(f)));
  let total = 0;
  let count = 0;

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (normalizedTargets.has(normalize(key))) {
        const n = Number(value);
        if (Number.isFinite(n)) {
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
  const normalizedTargets = new Set(fieldNames.map((f) => normalize(f)));

  return rows.reduce((sum, row) => {
    for (const [key, value] of Object.entries(row)) {
      if (normalizedTargets.has(normalize(key))) {
        return sum + toNumber(value);
      }
    }
    return sum;
  }, 0);
}

function getMetricFieldNames(metricId: string): string[] {
  const m = normalize(metricId);

  const map: Record<string, string[]> = {
    leads: ["leads", "Leads", "lead_count", "Lead Count"],
    jobs_booked: [
      "jobs_booked",
      "Jobs Booked",
      "booked_jobs",
      "jobs booked",
    ],
    jobs_completed: [
      "jobs_completed",
      "Jobs Completed",
      "completed_jobs",
      "jobs completed",
    ],
    canceled_jobs: [
      "canceled_jobs",
      "Canceled Jobs",
      "cancelled_jobs",
      "canceled jobs",
    ],
    revenue: ["revenue", "Revenue"],
    impressions: ["impressions", "Impressions"],
    clicks: ["clicks", "Clicks"],
    marketing_spend: ["marketing_spend", "Marketing Spend"],
    available_slots: ["available_slots", "Available Slots", "slots"],
    utilized_slots: ["utilized_slots", "Utilized Slots"],
    technician_utilization: [
      "technician_utilization",
      "Technician Utilization",
    ],
    ft_tech_utilization: ["ft_tech_utilization", "FT Tech Utilization"],
    pt_tech_utilization: ["pt_tech_utilization", "PT Tech Utilization"],
    customer_cancels: ["customer_cancels", "Customer Cancels"],
    hq_cancels: ["hq_cancels", "HQ Cancels"],
    customer_reschedules: ["customer_reschedules", "Customer Reschedules"],
    hq_reschedules: ["hq_reschedules", "HQ Reschedules"],
    customer_cancel_rate: ["customer_cancel_rate", "Customer Cancel Rate"],
    hq_cancel_rate: ["hq_cancel_rate", "HQ Cancel Rate"],
    reschedule_rate: ["reschedule_rate", "Reschedule Rate"],
    customer_reschedule_rate: [
      "customer_reschedule_rate",
      "Customer Reschedule Rate",
    ],
    hq_reschedule_rate: ["hq_reschedule_rate", "HQ Reschedule Rate"],
    booking_rate: ["booking_rate", "Booking Rate", "booking rate"],
    conversion_rate: [
      "conversion_rate",
      "Conversion Rate",
      "conversion rate",
    ],
    cancel_rate: ["cancel_rate", "Cancel Rate", "cancel rate"],
    cancel_outcome_rate: [
      "cancel_outcome_rate",
      "Cancel Outcome Rate",
      "cancel outcome rate",
    ],
    aov: ["aov", "AOV", "average_order_value", "Average Order Value"],
    ctr: ["ctr", "CTR"],
    cpc: ["cpc", "CPC"],
    cost_per_inquiry: ["cost_per_inquiry", "Cost Per Inquiry"],
    mac: ["mac", "MAC"],
  };

  return map[m] || [metricId];
}

function computeMetricValue(metricId: string, rows: DatasetRow[]): number | null {
  const id = canonicalMetricId(metricId);

  const rateMetrics = new Set([
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

  const directMetricSum = sumField(rows, getMetricFieldNames(metricId));
  const directMetricAvg = avgField(rows, getMetricFieldNames(metricId));

  if (
    [
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
    ].includes(id)
  ) {
    return directMetricSum || 0;
  }

  const leads = sumField(rows, getMetricFieldNames("leads"));
  const jobsBooked = sumField(rows, getMetricFieldNames("jobs_booked"));
  const jobsCompleted = sumField(rows, getMetricFieldNames("jobs_completed"));
  const canceledJobs = sumField(rows, getMetricFieldNames("canceled_jobs"));
  const revenue = sumField(rows, getMetricFieldNames("revenue"));
  const clicks = sumField(rows, getMetricFieldNames("clicks"));
  const impressions = sumField(rows, getMetricFieldNames("impressions"));
  const marketingSpend = sumField(rows, getMetricFieldNames("marketing_spend"));
  const availableSlots = sumField(rows, getMetricFieldNames("available_slots"));
  const utilizedSlots = sumField(rows, getMetricFieldNames("utilized_slots"));
  const customerCancels = sumField(rows, getMetricFieldNames("customer_cancels"));
  const hqCancels = sumField(rows, getMetricFieldNames("hq_cancels"));
  const customerReschedules = sumField(
    rows,
    getMetricFieldNames("customer_reschedules")
  );
  const hqReschedules = sumField(rows, getMetricFieldNames("hq_reschedules"));

  switch (id) {
    case "booking_rate":
      return leads > 0 ? jobsBooked / leads : directMetricAvg;
    case "conversion_rate":
      return leads > 0 ? jobsCompleted / leads : directMetricAvg;
    case "cancel_rate":
      return jobsBooked > 0 ? canceledJobs / jobsBooked : directMetricAvg;
    case "cancel_outcome_rate":
      return jobsCompleted + canceledJobs > 0
        ? canceledJobs / (jobsCompleted + canceledJobs)
        : directMetricAvg;
    case "aov":
      return jobsCompleted > 0 ? revenue / jobsCompleted : directMetricAvg;
    case "ctr":
      return impressions > 0 ? clicks / impressions : directMetricAvg;
    case "cpc":
      return clicks > 0 ? marketingSpend / clicks : directMetricAvg;
    case "cost_per_inquiry":
      return leads > 0 ? marketingSpend / leads : directMetricAvg;
    case "mac":
      return jobsCompleted > 0 ? marketingSpend / jobsCompleted : directMetricAvg;
    case "technician_utilization":
      return availableSlots > 0 ? utilizedSlots / availableSlots : directMetricAvg;
    case "customer_cancel_rate":
      return jobsBooked > 0 ? customerCancels / jobsBooked : directMetricAvg;
    case "hq_cancel_rate":
      return jobsBooked > 0 ? hqCancels / jobsBooked : directMetricAvg;
    case "reschedule_rate":
      return jobsBooked > 0
        ? (customerReschedules + hqReschedules) / jobsBooked
        : directMetricAvg;
    case "customer_reschedule_rate":
      return jobsBooked > 0 ? customerReschedules / jobsBooked : directMetricAvg;
    case "hq_reschedule_rate":
      return jobsBooked > 0 ? hqReschedules / jobsBooked : directMetricAvg;
    default:
      return rateMetrics.has(id) ? directMetricAvg : directMetricSum || null;
  }
}

function computeDelta(
  currentValue: number | null,
  priorValue: number | null
): number | null {
  if (currentValue === null || priorValue === null) return null;
  return currentValue - priorValue;
}

function filterScopedLoadedByDataset(
  scopedLoaded: ScopedLoadedDataset[],
  datasetName: string
): ScopedLoadedDataset[] {
  const wanted = normalize(datasetName).replace(/\.json$/, "");

  return scopedLoaded.filter(
    (d) => normalize(d.dataset).replace(/\.json$/, "") === wanted
  );
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

function getDriverRelationship(
  metricId: string,
  driverId: string
): DriverRelationship {
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

  if (deltaValue === null || metricChangeDirection === "unknown") {
    return { direction: "unknown", score: 0 };
  }

  if (relationship === "contextual") {
    return { direction: "context", score: Math.abs(deltaValue) };
  }

  if (metricChangeDirection === "flat") {
    return { direction: "mixed", score: Math.abs(deltaValue) * 0.25 };
  }

  const driverMovedUp = deltaValue > 0;
  const driverMovedDown = deltaValue < 0;

  const helpsMetric =
    relationship === "positive"
      ? driverMovedUp
      : relationship === "negative"
        ? driverMovedDown
        : false;

  const hurtsMetric =
    relationship === "positive"
      ? driverMovedDown
      : relationship === "negative"
        ? driverMovedUp
        : false;

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
  const bucketRank: Record<
    DriverObservation["explanatoryDirection"],
    number
  > = {
    hurts: 4,
    supports: 3,
    context: 2,
    mixed: 1,
    unknown: 0,
  };

  return [...drivers].sort((a, b) => {
    const bucketDiff =
      bucketRank[b.explanatoryDirection] - bucketRank[a.explanatoryDirection];
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
  label: "headwind" | "tailwind" | "context"
): string {
  if (obs.currentValue === null && obs.priorValue === null) {
    return `${prettifyMetricLabel(obs.driverId)} is not directly computable from ${obs.datasetUsed}.`;
  }

  const metricLabel = prettifyMetricLabel(obs.driverId);
  const current = formatMetricValue(obs.currentValue, obs.formatType);
  const prior = formatMetricValue(obs.priorValue, obs.formatType);
  const delta = formatDeltaValue(obs.deltaValue, obs.formatType);

  if (label === "headwind") {
    return `${metricLabel} moved from ${prior} to ${current} (${delta}), which looks like a headwind.`;
  }

  if (label === "tailwind") {
    return `${metricLabel} moved from ${prior} to ${current} (${delta}), which helped offset the decline.`;
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

  const headwind = rankedDrivers.find((d) => d.explanatoryDirection === "hurts");
  const support = rankedDrivers.find((d) => d.explanatoryDirection === "supports");

  let summary = `${metric.metric_name} was ${formatMetricValue(
    currentMetricValue,
    formatType
  )} in ${currentLabel} versus ${formatMetricValue(
    priorMetricValue,
    formatType
  )} in ${priorLabel} (${formatDeltaValue(deltaMetricValue, formatType)}).`;

  if (headwind) {
    summary += ` Primary driver: ${prettifyMetricLabel(headwind.driverId)}.`;
  }

  if (support) {
    summary += ` Offsetting factor: ${prettifyMetricLabel(support.driverId)}.`;
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

  if (direction === "down") {
    return currentValue > priorValue;
  }

  if (direction === "neutral") {
    return false;
  }

  return currentValue < priorValue;
}

function underperformanceScore(
  metric: MetricDefinition,
  currentValue: number | null,
  priorValue: number | null
): number {
  if (currentValue === null || priorValue === null) return 0;
  const direction = normalize(metric.good_direction || "up");

  if (direction === "down") {
    return currentValue - priorValue;
  }

  return priorValue - currentValue;
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
  const id = canonicalMetricId(metricId);

  if (
    [
      "booking_rate",
      "conversion_rate",
      "cancel_rate",
      "cancel_outcome_rate",
      "ctr",
      "technician_utilization",
      "ft_tech_utilization",
      "pt_tech_utilization",
      "gross_margin_pct",
      "parts_cost_pct_revenue",
      "labor_cost_pct_revenue",
      "marketing_spend_pct_revenue",
      "customer_cancel_rate",
      "hq_cancel_rate",
      "reschedule_rate",
      "customer_reschedule_rate",
      "hq_reschedule_rate",
    ].includes(id)
  ) {
    return "percent";
  }

  if (
    [
      "revenue",
      "aov",
      "marketing_spend",
      "cpc",
      "cost_per_inquiry",
      "mac",
      "net_contribution_profit",
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
    if (typeof item.text === "string" && item.text.trim()) {
      return item.text.trim();
    }

    if (Array.isArray(item.content)) {
      for (const part of item.content) {
        if (typeof part?.text === "string" && part.text.trim()) {
          return part.text.trim();
        }
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
