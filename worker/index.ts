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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
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
] as const;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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

    try {
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

      if (looksLikeBusinessQuestion) {
        const directAnalysis = await analyzeBusinessQuestion(userMessage);

        return jsonResponse(
          directAnalysis.found
            ? buildAppResponse({
                answer: [
                  directAnalysis.analysis.summary,
                  ...directAnalysis.analysis.observations.slice(0, 6),
                ].join("\n"),
                dataset:
                  directAnalysis.datasets_used[0]?.dataset ||
                  directAnalysis.metric.metric_id,
                datasetLink: directAnalysis.datasets_used[0]?.link || null,
                rows: directAnalysis.datasets_used.map((d) => ({
                  dataset: d.dataset,
                  dataset_link: d.link || null,
                  row_count: d.row_count,
                })),
                data: directAnalysis,
              })
            : buildAppResponse({
                answer: directAnalysis.message,
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
                  "For business questions about why a KPI changed, prefer analyze_business_question. " +
                  "For dashboard link questions, prefer find_dashboard_link. " +
                  "For dataset/raw data link questions, prefer find_dataset_link. " +
                  "Keep answers concise, quantitative when possible, and business-focused.",
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
            answer: extractResponseText(firstResp) || "No response generated.",
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
          extractResponseText(secondResp) || "No response generated.",
          lastStructuredResult,
          secondResp
        )
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";

      if (msg.includes("unsupported_country_region_territory")) {
        return jsonResponse(
          {
            error:
              "OpenAI API is rejecting requests from the current server region. Dashboard and dataset link tools will still work, but LLM-powered analysis requires a backend hosted in a supported region.",
          },
          500
        );
      }

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
    answer: args.answer,
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
    answer,
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
      answer,
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
      answer,
      dataset: "dashboard_links",
      rows: dashboard ? [dashboard as Record<string, unknown>] : [],
      datasetLink: null,
      dashboardLink: dashboard?.url || null,
      data: toolResult,
      debug,
    });
  }

  if ("datasets_used" in r) {
    const analysisResult = r as AnalyzeBusinessQuestionResult & {
      datasets_used?: Array<{ dataset: string; link?: string; row_count: number }>;
      metric?: MetricDefinition;
    };

    const datasetsUsed = analysisResult.datasets_used || [];

    return buildAppResponse({
      answer,
      dataset:
        datasetsUsed[0]?.dataset || analysisResult.metric?.metric_id || null,
      rows: datasetsUsed.map((d) => ({
        dataset: d.dataset,
        dataset_link: d.link || null,
        row_count: d.row_count,
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
  const datasets = await findDatasetsByIds(relevantDatasets);
  const allMetrics = await loadMetricDefinitions();

  const driverDefinitions = candidateDrivers
    .map((driverId) =>
      allMetrics.find(
        (m) => normalize(m.metric_id || "") === normalize(driverId)
      )
    )
    .filter((m): m is MetricDefinition => Boolean(m));

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
      relevant_datasets: relevantDatasets,
      business_question: businessQuestion,
      suggested_steps: [
        `Identify the KPI: ${metric.metric_name} (${metric.metric_id})`,
        metric.formula_logic
          ? `Validate formula: ${metric.formula_logic}`
          : `Review KPI logic and aggregation`,
        relevantDatasets.length
          ? `Inspect relevant datasets: ${relevantDatasets.join(", ")}`
          : `No linked datasets found in metric definition`,
        candidateDrivers.length
          ? `Analyze candidate drivers: ${candidateDrivers.join(", ")}`
          : `No candidate drivers defined for this metric`,
        `Slice trend by time period`,
        `Slice performance by market and channel where available`,
        metric.good_direction
          ? `Interpret KPI movement with good direction = ${metric.good_direction}`
          : `Interpret KPI movement using business context`,
      ],
    },
  };
}

function getPrimaryDatasetForMetric(metricId: string): string | null {
  const id = normalize(metricId);

  const map: Record<string, string> = {
    conversion_rate: "fact_nubrakes_channel_market_kpi_daily",
    booking_rate: "fact_nubrakes_channel_market_kpi_daily",
    cancel_rate: "fact_nubrakes_channel_market_kpi_daily",
    aov: "fact_nubrakes_channel_market_kpi_daily",
    revenue: "fact_nubrakes_channel_market_kpi_daily",
    leads: "fact_nubrakes_channel_market_kpi_daily",
    jobs_booked: "fact_nubrakes_channel_market_kpi_daily",
    jobs_completed: "fact_nubrakes_channel_market_kpi_daily",
    technician_utilization: "fact_nubrakes_supply_demand_daily",
    available_slots: "fact_nubrakes_supply_demand_daily",
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

  const rawLoaded = await Promise.all(
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

  const scopedLoaded = rawLoaded.map((d) => {
    const filteredRows = d.rows.filter((row) =>
      rowMatchesOptionalFilters(row, scope)
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
    };
  });

  const primaryDataset = getPrimaryDatasetForMetric(metric.metric_id);

  const kpiLoaded = primaryDataset
    ? scopedLoaded.filter(
        (d) =>
          normalize(d.dataset).replace(/\.json$/, "") ===
          normalize(primaryDataset)
      )
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

  console.log("metric_id", metric.metric_id);
  console.log("scope", scope);
  console.log(
    "datasets used",
    kpiLoaded.map((d) => ({
      dataset: d.dataset,
      currentLabel: d.currentLabel,
      priorLabel: d.priorLabel,
      currentRows: d.currentRows.length,
      priorRows: d.priorRows.length,
    }))
  );
  console.log("current sample row", allCurrentRows[0]);
  console.log("prior sample row", allPriorRows[0]);
  console.log(
    "current leads",
    sumField(allCurrentRows, getMetricFieldNames("leads"))
  );
  console.log(
    "prior leads",
    sumField(allPriorRows, getMetricFieldNames("leads"))
  );
  console.log(
    "current jobs_completed",
    sumField(allCurrentRows, getMetricFieldNames("jobs_completed"))
  );
  console.log(
    "prior jobs_completed",
    sumField(allPriorRows, getMetricFieldNames("jobs_completed"))
  );

  const currentMetricValue = computeMetricValue(metric.metric_id, allCurrentRows);
  const priorMetricValue = computeMetricValue(metric.metric_id, allPriorRows);
  const deltaMetricValue = computeDelta(currentMetricValue, priorMetricValue);

  const driverObservations = candidateDrivers.map((driverId) => {
    const currentValue = computeMetricValue(driverId, allCurrentRows);
    const priorValue = computeMetricValue(driverId, allPriorRows);
    const deltaValue = computeDelta(currentValue, priorValue);

    return {
      driverId,
      currentValue,
      priorValue,
      deltaValue,
      formatType: inferFormatType(driverId),
    };
  });

  const observations: string[] = [];
  const metricFormat = metric.format_type || inferFormatType(metric.metric_id);
  const comparisonSource = kpiLoaded[0];

  if (currentMetricValue !== null && priorMetricValue !== null) {
    observations.push(
      `${metric.metric_name} was ${formatMetricValue(
        currentMetricValue,
        metricFormat
      )} in ${comparisonSource?.currentLabel || "current period"} vs ${formatMetricValue(
        priorMetricValue,
        metricFormat
      )} in ${comparisonSource?.priorLabel || "prior period"} (${formatDeltaValue(
        deltaMetricValue,
        metricFormat
      )}).`
    );
  } else {
    observations.push(
      `${metric.metric_name} could not be computed from the scoped rows. Check leads and jobs_completed coverage for ${
        comparisonSource?.currentLabel || "current period"
      } and ${comparisonSource?.priorLabel || "prior period"}.`
    );
  }

  const rankedDrivers = rankDriverObservations(
    driverObservations,
    metric.good_direction
  );

  const usableDrivers = rankedDrivers.filter(
    (obs) => !(obs.currentValue === null && obs.priorValue === null)
  );

  for (const obs of usableDrivers.slice(0, 4)) {
    observations.push(buildDriverObservationText(obs));
  }

  if (scope.market) {
    observations.push(`Scope includes market filter: ${scope.market}.`);
  }

  if (scope.channel) {
    observations.push(`Scope includes channel filter: ${scope.channel}.`);
  }

  if (primaryDataset) {
    observations.push(`Primary comparison dataset: ${primaryDataset}.`);
  }

  const summary = buildAnalysisSummary({
    metric,
    currentMetricValue,
    priorMetricValue,
    deltaMetricValue,
    rankedDrivers: usableDrivers,
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
    const year = candidateYears.length
      ? Math.max(...candidateYears)
      : new Date().getUTCFullYear();
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

function rowMatchesOptionalFilters(
  row: DatasetRow,
  scope: ParsedBusinessScope
): boolean {
  if (scope.market) {
    const marketValue = String(row["market"] || row["Market"] || "").trim();
    if (normalize(marketValue) !== normalize(scope.market)) return false;
  }

  if (scope.channel) {
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
    aov: ["aov", "AOV", "average_order_value", "Average Order Value"],
  };

  return map[m] || [metricId];
}

function computeMetricValue(metricId: string, rows: DatasetRow[]): number | null {
  const id = normalize(metricId);

  const directMetric = sumField(rows, getMetricFieldNames(metricId));

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
    ].includes(id)
  ) {
    return directMetric || 0;
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
      return leads > 0 ? jobsBooked / leads : null;

    case "conversion_rate":
      return leads > 0 ? jobsCompleted / leads : null;

    case "cancel_rate":
      return jobsBooked > 0 ? canceledJobs / jobsBooked : null;

    case "cancel_outcome_rate":
      return jobsCompleted + canceledJobs > 0
        ? canceledJobs / (jobsCompleted + canceledJobs)
        : null;

    case "aov":
      return jobsCompleted > 0 ? revenue / jobsCompleted : null;

    case "ctr":
      return impressions > 0 ? clicks / impressions : null;

    case "cpc":
      return clicks > 0 ? marketingSpend / clicks : null;

    case "cost_per_inquiry":
      return leads > 0 ? marketingSpend / leads : null;

    case "mac":
      return jobsCompleted > 0 ? marketingSpend / jobsCompleted : null;

    case "technician_utilization":
      return availableSlots > 0 ? utilizedSlots / availableSlots : null;

    case "customer_cancel_rate":
      return jobsBooked > 0 ? customerCancels / jobsBooked : null;

    case "hq_cancel_rate":
      return jobsBooked > 0 ? hqCancels / jobsBooked : null;

    case "reschedule_rate":
      return jobsBooked > 0
        ? (customerReschedules + hqReschedules) / jobsBooked
        : null;

    case "customer_reschedule_rate":
      return jobsBooked > 0 ? customerReschedules / jobsBooked : null;

    case "hq_reschedule_rate":
      return jobsBooked > 0 ? hqReschedules / jobsBooked : null;

    default:
      return directMetric || null;
  }
}

function computeDelta(
  currentValue: number | null,
  priorValue: number | null
): number | null {
  if (currentValue === null || priorValue === null) return null;
  return currentValue - priorValue;
}

function rankDriverObservations(
  drivers: Array<{
    driverId: string;
    currentValue: number | null;
    priorValue: number | null;
    deltaValue: number | null;
    formatType: string;
  }>,
  goodDirection?: string
) {
  const direction = normalize(goodDirection || "neutral");

  return [...drivers].sort((a, b) => {
    const av = driverImpactScore(a.deltaValue, direction);
    const bv = driverImpactScore(b.deltaValue, direction);
    return Math.abs(bv) - Math.abs(av);
  });
}

function driverImpactScore(
  deltaValue: number | null,
  goodDirection: string
): number {
  if (deltaValue === null) return 0;
  if (goodDirection === "up") return deltaValue;
  if (goodDirection === "down") return -deltaValue;
  return deltaValue;
}

function buildDriverObservationText(obs: {
  driverId: string;
  currentValue: number | null;
  priorValue: number | null;
  deltaValue: number | null;
  formatType: string;
}): string {
  if (obs.currentValue === null && obs.priorValue === null) {
    return `${obs.driverId} is not directly computable from the scoped dataset coverage.`;
  }

  const current = formatMetricValue(obs.currentValue, obs.formatType);
  const prior = formatMetricValue(obs.priorValue, obs.formatType);
  const delta = formatDeltaValue(obs.deltaValue, obs.formatType);

  return `${obs.driverId} was ${current} vs ${prior} (${delta}).`;
}

function buildAnalysisSummary(args: {
  metric: MetricDefinition;
  currentMetricValue: number | null;
  priorMetricValue: number | null;
  deltaMetricValue: number | null;
  rankedDrivers: Array<{
    driverId: string;
    currentValue: number | null;
    priorValue: number | null;
    deltaValue: number | null;
    formatType: string;
  }>;
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
    const availableDrivers = rankedDrivers
      .filter((d) => d.currentValue !== null || d.priorValue !== null)
      .slice(0, 3)
      .map((d) => d.driverId);

    return availableDrivers.length
      ? `${metric.metric_name} could not be fully computed for ${currentLabel} vs ${priorLabel}. Available drivers to review: ${availableDrivers.join(", ")}.`
      : `${metric.metric_name} could not be fully computed for ${currentLabel} vs ${priorLabel}.`;
  }

  const headline = `${metric.metric_name} moved from ${formatMetricValue(
    priorMetricValue,
    formatType
  )} in ${priorLabel} to ${formatMetricValue(
    currentMetricValue,
    formatType
  )} in ${currentLabel} (${formatDeltaValue(deltaMetricValue, formatType)}).`;

  const topDrivers = rankedDrivers
    .filter((d) => d.deltaValue !== null)
    .slice(0, 3)
    .map((d) => d.driverId);

  return topDrivers.length
    ? `${headline} Primary drivers to review: ${topDrivers.join(", ")}.`
    : headline;
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
  const id = normalize(metricId);

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
