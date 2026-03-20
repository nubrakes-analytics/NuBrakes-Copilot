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

type OpenAIInputMessage = {
  role?: "system" | "user" | "assistant";
  type?: string;
  content?:
    | Array<{
        type: string;
        text?: string;
      }>
    | string;
};

type OpenAIOutputItem = {
  type: string;
  name?: string;
  arguments?: string;
  call_id?: string;
};

type OpenAIResponse = {
  id?: string;
  output?: OpenAIOutputItem[];
  output_text?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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
    name: "find_dataset_link",
    description:
      "Find the best matching dataset link from the dataset catalog.",
    parameters: {
      type: "object",
      properties: {
        dataset_query: {
          type: "string",
          description:
            "The dataset to look up, such as channel market KPI daily or supply demand daily.",
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
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse(
        { error: "Method not allowed. Use POST." },
        405
      );
    }

    try {
      const body = (await request.json()) as { message?: string };
      const userMessage = String(body?.message || "").trim();

      if (!userMessage) {
        return jsonResponse({ error: "Missing message" }, 400);
      }

      const firstResp = await callOpenAI(env.OPENAI_API_KEY, {
  model: "gpt-4.1",
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
            "Use find_dataset_link when the user asks for a dataset link. " +
            "Use business_question_drivers when the user asks why a KPI moved or what drove performance. " +
            "Use analyze_business_question when the user asks for an actual driver analysis from linked data. " +
            "For business questions about why a KPI changed, prefer analyze_business_question. " +
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

console.log("FIRST RESPONSE RAW:", JSON.stringify(firstResp, null, 2));

      const outputItems = firstResp.output || [];
      const toolOutputs: Array<{
        type: "function_call_output";
        call_id?: string;
        output: string;
      }> = [];

      for (const item of outputItems) {
        if (item.type === "function_call" && item.name && item.arguments) {
          const args = safeJsonParse<Record<string, unknown>>(
            item.arguments,
            {}
          );
          const result = await handleToolCall(item.name, args);

          toolOutputs.push({
            type: "function_call_output",
            call_id: item.call_id,
            output: JSON.stringify(result),
          });
        }
      }

      if (toolOutputs.length === 0) {
        return jsonResponse({
          answer: firstResp.output_text || "No response generated.",
        });
      }

      const secondResp = await callOpenAI(env.OPENAI_API_KEY, {
        model: "gpt-4.1",
        previous_response_id: firstResp.id,
        input: toolOutputs,
      });

      return jsonResponse({
        answer: secondResp.output_text || "No response generated.",
      });
    } catch (error) {
      return jsonResponse(
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  },
};

async function handleToolCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "find_metric_definition":
      return await findMetricDefinition(String(args.metric_query || ""));

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

async function findDatasetLink(
  datasetQuery: string
): Promise<DatasetLookupResult> {
  const datasets = await loadDatasetDefinitions();
  const q = normalize(datasetQuery);

  if (!q) {
    return {
      found: false,
      message: "Dataset query is empty",
    };
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
    "data",
    "dataset",
    "json",
    "link",
    "file",
    "need",
    "show",
    "give",
    "me",
  ]);

  const queryWords = q
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w && !STOPWORDS.has(w));

  let bestMatch: DatasetDefinition | null = null;
  let bestScore = -1;

  for (const dataset of datasets) {
    const sheetName = normalize(String(dataset.sheet_name || ""));
    const datasetName = normalize(String(dataset.dataset || ""));
    const description = normalize(String(dataset.description || ""));
    const link = String(dataset.link || "").trim();

    if (!link) continue;

    let score = 0;

    if (datasetName === q) score += 100;
    if (sheetName === q) score += 100;
    if (description && description === q) score += 70;

    if (q.length >= 3) {
      if (datasetName.includes(q)) score += 70;
      if (sheetName.includes(q)) score += 70;
      if (description.includes(q)) score += 35;
    }

    for (const word of queryWords) {
      if (datasetName.includes(word)) score += 20;
      if (sheetName.includes(word)) score += 20;
      if (description.includes(word)) score += 8;
    }

    const importantWords = [
      "channel",
      "market",
      "kpi",
      "supply",
      "demand",
      "revenue",
      "completed",
      "booked",
      "canceled",
      "leads",
      "utilization",
      "technician",
    ];

    for (const word of importantWords) {
      if (queryWords.includes(word) && datasetName.includes(word)) score += 10;
      if (queryWords.includes(word) && sheetName.includes(word)) score += 10;
    }

    if (
      score > bestScore ||
      (score === bestScore &&
        String(dataset.description || "").trim() &&
        !String(bestMatch?.description || "").trim())
    ) {
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

  return {
    found: true,
    dataset: bestMatch,
  };
}

async function findMetricDefinition(
  metricQuery: string
): Promise<MetricLookupResult> {
  const metrics = await loadMetricDefinitions();
  const q = normalize(metricQuery);

  if (!q) {
    return {
      found: false,
      message: "Metric query is empty",
    };
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

  return {
    found: true,
    metric: bestMatch,
    score: bestScore,
  };
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
    return {
      found: false,
      message: metricResult.message,
    };
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

async function analyzeBusinessQuestion(
  businessQuestion: string
): Promise<AnalyzeBusinessQuestionResult> {
  const plan = await buildBusinessQuestionDriverPlan(businessQuestion);

  if (!plan.found) {
    return {
      found: false,
      message: plan.message,
    };
  }

  const metric = plan.metric;
  const candidateDrivers = plan.analysis_plan.candidate_drivers || [];
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

  const loaded = rawLoaded.map((d) => {
    const filteredRows = d.rows.filter((row) =>
      rowMatchesOptionalFilters(row, scope)
    );
    const scoped = splitRowsCurrentVsPrior(filteredRows, scope.time_grain);

    return {
      dataset: d.dataset,
      link: d.link,
      allRows: d.rows,
      filteredRows,
      currentRows: scoped.current,
      priorRows: scoped.prior,
      currentLabel: scoped.current_label,
      priorLabel: scoped.prior_label,
    };
  });

  const allCurrentRows = loaded.flatMap((d) => d.currentRows);
  const allPriorRows = loaded.flatMap((d) => d.priorRows);

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

  observations.push(
    currentMetricValue !== null
      ? `${metric.metric_name} was ${formatMetricValue(currentMetricValue, metricFormat)} in ${loaded[0]?.currentLabel || "current period"} vs ${formatMetricValue(priorMetricValue, metricFormat)} in ${loaded[0]?.priorLabel || "prior period"} (${formatDeltaValue(deltaMetricValue, metricFormat)}).`
      : `${metric.metric_name} could not be computed for the scoped periods.`
  );

  const rankedDrivers = rankDriverObservations(
    driverObservations,
    metric.good_direction
  );

  for (const obs of rankedDrivers.slice(0, 6)) {
    observations.push(buildDriverObservationText(obs, metric.good_direction));
  }

  if (scope.market) {
    observations.push(`Scope includes market filter: ${scope.market}.`);
  }

  if (scope.channel) {
    observations.push(`Scope includes channel filter: ${scope.channel}.`);
  }

  const summary = buildAnalysisSummary({
    metric,
    currentMetricValue,
    priorMetricValue,
    deltaMetricValue,
    rankedDrivers,
    currentLabel: loaded[0]?.currentLabel || "current period",
    priorLabel: loaded[0]?.priorLabel || "prior period",
  });

  return {
    found: true,
    metric,
    scope,
    datasets_used: loaded.map((d) => ({
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

  if (q.includes("today") || q.includes("yesterday") || q.includes("daily")) {
    time_grain = "day";
  } else if (
    q.includes("month") ||
    q.includes("monthly") ||
    q.includes("mtd")
  ) {
    time_grain = "month";
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
  };
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
  grain: TimeGrain
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

  if (sortedKeys.length === 0) {
    return {
      current: [],
      prior: [],
      current_label: "current period",
      prior_label: "prior period",
    };
  }

  const currentKey = sortedKeys[sortedKeys.length - 1];
  const priorKey =
    sortedKeys.length >= 2 ? sortedKeys[sortedKeys.length - 2] : "";

  return {
    current: bucketMap.get(currentKey) || [],
    prior: priorKey ? bucketMap.get(priorKey) || [] : [],
    current_label: currentKey,
    prior_label: priorKey || "previous period unavailable",
  };
}

function getBucketKey(row: DatasetRow, fieldCandidates: string[]): string {
  for (const field of fieldCandidates) {
    const value = String(row[field] || "").trim();
    if (value && Number.isFinite(Date.parse(value))) return value;
  }
  return "";
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sumField(rows: DatasetRow[], fieldNames: string[]): number {
  return rows.reduce((sum, row) => {
    for (const field of fieldNames) {
      if (field in row) return sum + toNumber(row[field]);
    }
    return sum;
  }, 0);
}

function getMetricFieldNames(metricId: string): string[] {
  const m = normalize(metricId);

  const map: Record<string, string[]> = {
    leads: ["leads", "Leads"],
    jobs_booked: ["jobs_booked", "Jobs Booked"],
    jobs_completed: ["jobs_completed", "Jobs Completed"],
    canceled_jobs: ["canceled_jobs", "Canceled Jobs"],
    revenue: ["revenue", "Revenue"],
    impressions: ["impressions", "Impressions"],
    clicks: ["clicks", "Clicks"],
    marketing_spend: ["marketing_spend", "Marketing Spend"],
    available_slots: ["available_slots", "Available Slots"],
    technician_utilization: [
      "technician_utilization",
      "Technician Utilization",
    ],
    ft_tech_utilization: ["ft_tech_utilization", "FT Tech Utilization"],
    pt_tech_utilization: ["pt_tech_utilization", "PT Tech Utilization"],
    customer_cancels: ["customer_cancels", "Customer Cancels"],
    hq_cancels: ["hq_cancels", "HQ Cancels"],
    customer_reschedules: [
      "customer_reschedules",
      "Customer Reschedules",
    ],
    hq_reschedules: ["hq_reschedules", "HQ Reschedules"],
  };

  return map[m] || [metricId];
}

function computeMetricValue(metricId: string, rows: DatasetRow[]): number | null {
  const id = normalize(metricId);

  const leads = sumField(rows, getMetricFieldNames("leads"));
  const jobsBooked = sumField(rows, getMetricFieldNames("jobs_booked"));
  const jobsCompleted = sumField(rows, getMetricFieldNames("jobs_completed"));
  const canceledJobs = sumField(rows, getMetricFieldNames("canceled_jobs"));
  const revenue = sumField(rows, getMetricFieldNames("revenue"));
  const clicks = sumField(rows, getMetricFieldNames("clicks"));
  const impressions = sumField(rows, getMetricFieldNames("impressions"));
  const marketingSpend = sumField(rows, getMetricFieldNames("marketing_spend"));

  switch (id) {
    case "leads":
      return leads;
    case "jobs_booked":
      return jobsBooked;
    case "jobs_completed":
      return jobsCompleted;
    case "canceled_jobs":
      return canceledJobs;
    case "revenue":
      return revenue;
    case "booking_rate":
      return leads ? jobsBooked / leads : null;
    case "conversion_rate":
      return leads ? jobsCompleted / leads : null;
    case "cancel_rate":
      return jobsBooked ? canceledJobs / jobsBooked : null;
    case "cancel_outcome_rate":
      return jobsCompleted + canceledJobs
        ? canceledJobs / (jobsCompleted + canceledJobs)
        : null;
    case "aov":
      return jobsCompleted ? revenue / jobsCompleted : null;
    case "ctr":
      return impressions ? clicks / impressions : null;
    case "cpc":
      return clicks ? marketingSpend / clicks : null;
    case "cost_per_inquiry":
      return leads ? marketingSpend / leads : null;
    case "mac":
      return jobsCompleted ? marketingSpend / jobsCompleted : null;
    case "marketing_spend":
      return marketingSpend;
    default: {
      const direct = sumField(rows, getMetricFieldNames(metricId));
      return direct || null;
    }
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

function buildDriverObservationText(
  obs: {
    driverId: string;
    currentValue: number | null;
    priorValue: number | null;
    deltaValue: number | null;
    formatType: string;
  },
  _parentGoodDirection?: string
): string {
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

  const headline =
    currentMetricValue !== null
      ? `${metric.metric_name} moved from ${formatMetricValue(priorMetricValue, formatType)} in ${priorLabel} to ${formatMetricValue(currentMetricValue, formatType)} in ${currentLabel} (${formatDeltaValue(deltaMetricValue, formatType)}).`
      : `${metric.metric_name} could not be fully computed for the comparison periods.`;

  const topDrivers = rankedDrivers
    .filter((d) => d.deltaValue !== null)
    .slice(0, 3)
    .map((d) => d.driverId);

  if (!topDrivers.length) return headline;

  return `${headline} Primary drivers to review: ${topDrivers.join(", ")}.`;
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
