export interface Env {
  OPENAI_API_KEY: string;
}

type MetricDefinition = {
  metric_id: string;
  metric_name: string;
  category: string;
  definition: string;
  unit: string;
  format_type: string;
  formula_logic?: string;
  aggregation: string;
  good_direction: string;
  owner: string;
  tags: string[];
};

type DatasetDefinition = {
  sheet_name?: string;
  dataset?: string;
  link?: string;
  description?: string;
};

type MetricLookupResult =
  | { found: true; metric: MetricDefinition }
  | { found: false; message: string };

type DatasetLookupResult =
  | { found: true; dataset: DatasetDefinition }
  | { found: false; message: string };

type ChatResponse = {
  answer: string;
  dataset?: string;
  rows?: Array<Record<string, unknown>>;
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

const TOOLS = [
  {
    type: "function",
    name: "find_metric_definition",
    description:
      "Find the official definition and metadata for a NuBrakes metric. Use this when the user asks what a metric means, how it is defined, or asks about a KPI like total revenue, average order value, cancellation rate, or gross margin.",
    parameters: {
      type: "object",
      properties: {
        metric_query: {
          type: "string",
          description:
            "Metric name, alias, id, or natural language metric phrase like total revenue or cancellation rate.",
        },
      },
      required: ["metric_query"],
      additionalProperties: false,
    },
  },

  {
    type: "function",
    name: "get_dashboard_links",
    description:
      "Fetch dashboard links and metadata from dashboard_links.json. Use this when the user asks where to find a dashboard, wants dashboard recommendations, or asks for dashboards by category, owner, refresh frequency, or keyword.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description:
            "Optional category filter such as Operations, Marketing, Sales, Executive, or Finance.",
        },
        owner: {
          type: "string",
          description: "Optional owner filter such as Operations or Marketing.",
        },
        refresh_frequency: {
          type: "string",
          description:
            "Optional refresh frequency filter such as Daily, Weekly, or Monthly.",
        },
        keyword: {
          type: "string",
          description:
            "Optional free-text keyword to search across dashboard_name, category, description, owner, and refresh_frequency.",
        },
      },
      additionalProperties: false,
    },
  },

  {
    type: "function",
    name: "find_dataset_link",
    description:
      "Find the best matching dataset link from dataset_list.json based on the type of dataset the user needs. Use this when the user asks for a dataset, data source, JSON link, or asks which dataset contains a certain business concept or description.",
    parameters: {
      type: "object",
      properties: {
        dataset_query: {
          type: "string",
          description:
            "Natural language description of the dataset the user needs, such as supply and demand by market, completed jobs by day, marketing spend by channel, or technician utilization dataset.",
        },
      },
      required: ["dataset_query"],
      additionalProperties: false,
    },
  },
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function normalize(text: string) {
  return text.toLowerCase().trim().replace(/[_-]+/g, " ");
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => normalize(String(tag))).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("|")
      .map((tag) => normalize(tag))
      .filter(Boolean);
  }

  return [];
}

async function getDashboardLinksTool(
  args: Record<string, unknown> = {}
) {
  const response = await fetch(
    `https://nubrakes-analytics.github.io/NuBrakes-Copilot/data/dashboard_links.json`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard links: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Invalid dashboard links format");
  }

  const category = String(args.category || "").trim().toLowerCase();
  const owner = String(args.owner || "").trim().toLowerCase();
  const refreshFrequency = String(args.refresh_frequency || "")
    .trim()
    .toLowerCase();
  const keyword = String(args.keyword || "").trim().toLowerCase();

  const filtered = data.filter((item) => {
    const matchesCategory =
      !category || String(item.category || "").toLowerCase() === category;
    const matchesOwner =
      !owner || String(item.owner || "").toLowerCase() === owner;
    const matchesRefresh =
      !refreshFrequency ||
      String(item.refresh_frequency || "").toLowerCase() === refreshFrequency;

    const haystack = [
      item.dashboard_name,
      item.category,
      item.description,
      item.owner,
      item.refresh_frequency,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesKeyword = !keyword || haystack.includes(keyword);

    return matchesCategory && matchesOwner && matchesRefresh && matchesKeyword;
  });

  return {
    count: filtered.length,
    dashboards: filtered.map((item) => ({
      dashboard_name: item.dashboard_name,
      category: item.category,
      description: item.description,
      url: item.url,
      owner: item.owner,
      refresh_frequency: item.refresh_frequency,
    })),
  };
}

async function loadMetricDefinitions(): Promise<MetricDefinition[]> {
  const base = "https://nubrakes-analytics.github.io/NuBrakes-Copilot/data";
  const url = `${base}/metric_definitions.json`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to load metric_definitions.json: ${response.status} ${text}`
    );
  }

  const raw = await response.json();

  if (Array.isArray(raw)) {
    return raw as MetricDefinition[];
  }

  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as { metrics?: unknown }).metrics)
  ) {
    return (raw as { metrics: MetricDefinition[] }).metrics;
  }

  throw new Error(
    "metric_definitions.json did not return an array or { metrics: [] }"
  );
}

async function loadDatasetDefinitions(): Promise<DatasetDefinition[]> {
  const url =
    "https://nubrakes-analytics.github.io/NuBrakes-Copilot/data/dataset_list.json";

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to load dataset_list.json: ${response.status} ${text}`
    );
  }

  const raw = await response.json();

  if (Array.isArray(raw)) {
    return raw as DatasetDefinition[];
  }

  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as { datasets?: unknown }).datasets)
  ) {
    return (raw as { datasets: DatasetDefinition[] }).datasets;
  }

  throw new Error(
    "dataset_list.json did not return an array or { datasets: [] }"
  );
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

  let bestMatch: MetricDefinition | null = null;
  let bestScore = 0;

  for (const metric of metrics) {
    const metricId = normalize(metric.metric_id);
    const metricName = normalize(metric.metric_name);
    const category = normalize(metric.category);
    const tags = parseTags(metric.tags);

    let score = 0;

    if (metricId === q) score = Math.max(score, 100);
    if (metricName === q) score = Math.max(score, 95);
    if (tags.some((tag) => tag === q)) score = Math.max(score, 90);
    if (category === q) score = Math.max(score, 70);

    if (q.length >= 4) {
      if (metricName.includes(q) || q.includes(metricName)) {
        score = Math.max(score, 60);
      }

      if (metricId.includes(q) || q.includes(metricId)) {
        score = Math.max(score, 55);
      }

      if (tags.some((tag) => tag.includes(q) || q.includes(tag))) {
        score = Math.max(score, 50);
      }

      if (category.includes(q) || q.includes(category)) {
        score = Math.max(score, 40);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = metric;
    }
  }

  if (!bestMatch) {
    return {
      found: false,
      message: `No metric found for query: ${metricQuery}`,
    };
  }

  return {
    found: true,
    metric: bestMatch,
  };
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

  let bestMatch: DatasetDefinition | null = null;
  let bestScore = 0;

  for (const dataset of datasets) {
    const rawDescription = String(dataset.description || "").trim();

    // skip datasets with blank description
    if (!rawDescription) continue;

    const sheetName = normalize(String(dataset.sheet_name || ""));
    const datasetName = normalize(String(dataset.dataset || ""));
    const description = normalize(rawDescription);
    const link = String(dataset.link || "").trim();

    let score = 0;

    if (datasetName === q) score = Math.max(score, 100);
    if (sheetName === q) score = Math.max(score, 95);
    if (description === q) score = Math.max(score, 90);

    if (q.length >= 3) {
      if (datasetName.includes(q) || q.includes(datasetName)) {
        score = Math.max(score, 75);
      }

      if (sheetName.includes(q) || q.includes(sheetName)) {
        score = Math.max(score, 70);
      }

      if (description.includes(q) || q.includes(description)) {
        score = Math.max(score, 68);
      }
    }

    const queryWords = q.split(/\s+/).filter(Boolean);
    if (queryWords.length > 1) {
      let wordHits = 0;

      for (const word of queryWords) {
        if (
          datasetName.includes(word) ||
          sheetName.includes(word) ||
          description.includes(word)
        ) {
          wordHits += 1;
        }
      }

      score += wordHits * 5;
    }

    if (score > bestScore && link) {
      bestScore = score;
      bestMatch = dataset;
    }
  }

  if (!bestMatch || !bestMatch.link) {
    return {
      found: false,
      message: `No dataset link found for query: ${datasetQuery}`,
    };
  }

  return {
    found: true,
    dataset: bestMatch,
  };
}

async function executeTool(toolName: string, args: Record<string, unknown>) {
  if (toolName === "find_metric_definition") {
    const metricQuery = String(args.metric_query || "").trim();

    if (!metricQuery) {
      return { found: false, message: "Missing metric_query" };
    }

    return await findMetricDefinition(metricQuery);
  }

  if (toolName === "get_dashboard_links") {
    return await getDashboardLinksTool(args);
  }

  if (toolName === "find_dataset_link") {
    const datasetQuery = String(args.dataset_query || "").trim();

    if (!datasetQuery) {
      return { found: false, message: "Missing dataset_query" };
    }

    return await findDatasetLink(datasetQuery);
  }

  return { error: `Unknown tool: ${toolName}` };
}

async function createOpenAIResponse(
  env: Env,
  payload: Record<string, unknown>
): Promise<OpenAIResponse> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as OpenAIResponse;
}

async function handleAiQuestion(
  question: string,
  env: Env
): Promise<ChatResponse> {
  const systemPrompt =
    "You are the NuBrakes AI Copilot. " +
    "Use tools when the user asks what a metric means, asks for a KPI definition, asks where to find a dashboard, or asks for the dataset link they need. " +
    "Do not invent metric definitions, dashboard links, or dataset links. " +
    "If a tool returns a metric, answer in clear business language. " +
    "If a tool returns dashboard links, summarize the best match clearly. " +
    "If a tool returns a dataset link, explain briefly what the dataset is for and include the link clearly. " +
    "If no result is found, say so clearly.";

  const firstResponse = await createOpenAIResponse(env, {
    model: "gpt-4.1",
    instructions: systemPrompt,
    input: question,
    tools: TOOLS,
    tool_choice: "auto",
  });

  const toolCall = (firstResponse.output || []).find(
    (item) => item.type === "function_call"
  );

  if (!toolCall || !toolCall.name || !toolCall.call_id || !firstResponse.id) {
    return {
      answer: firstResponse.output_text || "No answer returned.",
      dataset: "OpenAI response",
      rows: [],
    };
  }

  let parsedArgs: Record<string, unknown> = {};
  try {
    parsedArgs = JSON.parse(toolCall.arguments || "{}");
  } catch {
    parsedArgs = {};
  }

  const toolResult = await executeTool(toolCall.name, parsedArgs);

  const secondResponse = await createOpenAIResponse(env, {
    model: "gpt-4.1",
    previous_response_id: firstResponse.id,
    input: [
      {
        type: "function_call_output",
        call_id: toolCall.call_id,
        output: JSON.stringify(toolResult),
      },
    ],
  });

  let rows: Array<Record<string, unknown>> = [];

  const dataset =
    toolCall.name === "get_dashboard_links"
      ? "dashboard_links.json"
      : toolCall.name === "find_dataset_link"
      ? "dataset_list.json"
      : "metric_definitions.json";

  if (
    toolCall.name === "find_metric_definition" &&
    toolResult &&
    typeof toolResult === "object" &&
    "found" in toolResult &&
    toolResult.found === true &&
    "metric" in toolResult
  ) {
    rows = [(toolResult as { metric: MetricDefinition }).metric];
  }

  if (
    toolCall.name === "get_dashboard_links" &&
    toolResult &&
    typeof toolResult === "object" &&
    "dashboards" in toolResult &&
    Array.isArray(
      (toolResult as { dashboards: Array<Record<string, unknown>> }).dashboards
    )
  ) {
    rows = (
      toolResult as { dashboards: Array<Record<string, unknown>> }
    ).dashboards;
  }

  if (
    toolCall.name === "find_dataset_link" &&
    toolResult &&
    typeof toolResult === "object" &&
    "found" in toolResult &&
    toolResult.found === true &&
    "dataset" in toolResult
  ) {
    rows = [(toolResult as { dataset: DatasetDefinition }).dataset as Record<string, unknown>];
  }

  let answer = secondResponse.output_text?.trim();

  if (!answer) {
    if (
      toolCall.name === "find_metric_definition" &&
      toolResult &&
      typeof toolResult === "object" &&
      "found" in toolResult &&
      toolResult.found === true &&
      "metric" in toolResult
    ) {
      const metric = (toolResult as { metric: MetricDefinition }).metric;
      answer = `${metric.metric_name}: ${metric.definition}`;
    } else if (
      toolCall.name === "find_metric_definition" &&
      toolResult &&
      typeof toolResult === "object" &&
      "found" in toolResult &&
      toolResult.found === false &&
      "message" in toolResult
    ) {
      answer = String(toolResult.message);
    } else if (
      toolCall.name === "get_dashboard_links" &&
      toolResult &&
      typeof toolResult === "object" &&
      "dashboards" in toolResult &&
      Array.isArray(
        (toolResult as { dashboards: Array<Record<string, unknown>> }).dashboards
      )
    ) {
      const dashboards = (
        toolResult as { dashboards: Array<Record<string, unknown>> }
      ).dashboards;

      if (!dashboards.length) {
        answer = "No dashboard links found.";
      } else if (dashboards.length === 1) {
        const d = dashboards[0];
        answer = `${String(d.dashboard_name || "Dashboard")}: ${String(d.url || "")}`;
      } else {
        answer = `Found ${dashboards.length} dashboard links.`;
      }
    } else if (
      toolCall.name === "find_dataset_link" &&
      toolResult &&
      typeof toolResult === "object" &&
      "found" in toolResult &&
      toolResult.found === true &&
      "dataset" in toolResult
    ) {
      const d = (toolResult as { dataset: DatasetDefinition }).dataset;
      answer = `${String(d.dataset_name || "Dataset")}: ${String(d.description || "")} ${String(d.url || "")}`.trim();
    } else if (
      toolCall.name === "find_dataset_link" &&
      toolResult &&
      typeof toolResult === "object" &&
      "found" in toolResult &&
      toolResult.found === false &&
      "message" in toolResult
    ) {
      answer = String(toolResult.message);
    } else {
      answer = "No answer returned.";
    }
  }

  return {
    answer,
    dataset,
    rows,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return json({
        ok: true,
        service: "nubrakes-ai-copilot-api",
        endpoints: {
          health: "/health",
          metric: "/api/metric",
          ai: "/api/ai",
        },
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        service: "nubrakes-ai-copilot-api",
      });
    }

    if (request.method === "GET" && url.pathname === "/api/ai") {
      return json({
        ok: true,
        message: "Use POST /api/ai with JSON body: { question }",
      });
    }

    if (request.method === "GET" && url.pathname === "/api/metric") {
      return json({
        ok: true,
        message: "Use POST /api/metric with JSON body: { metric_query }",
      });
    }

    if (request.method === "POST" && url.pathname === "/api/metric") {
      try {
        const body = (await request.json()) as { metric_query?: string };
        const metricQuery = body.metric_query?.trim();

        if (!metricQuery) {
          return json({ error: "Missing metric_query" }, 400);
        }

        const result = await findMetricDefinition(metricQuery);
        return json(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown server error";
        return json({ error: message }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/ai") {
      try {
        const body = (await request.json()) as { question?: string };
        const question = body.question?.trim();

        if (!question) {
          return json({ error: "Missing question" }, 400);
        }

        const result = await handleAiQuestion(question, env);
        return json(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown server error";
        return json({ error: message }, 500);
      }
    }

    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
};
