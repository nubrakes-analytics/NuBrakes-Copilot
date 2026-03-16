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

type MetricLookupResult =
  | { found: true; metric: MetricDefinition }
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

async function findMetricDefinition(
  metricQuery: string
): Promise<MetricLookupResult> {
  const metrics = await loadMetricDefinitions();
  const q = normalize(metricQuery);

  let bestMatch: MetricDefinition | null = null;
  let bestScore = 0;

  for (const metric of metrics) {
    const metricId = normalize(metric.metric_id);
    const metricName = normalize(metric.metric_name);
    const category = normalize(metric.category);
    const tags = (metric.tags ?? []).map(normalize);

    let score = 0;

    if (metricId === q) score = Math.max(score, 100);
    if (metricName === q) score = Math.max(score, 95);
    if (tags.some((tag) => tag === q)) score = Math.max(score, 90);
    if (category === q) score = Math.max(score, 70);

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
async function executeTool(toolName: string, args: Record<string, unknown>) {
  if (toolName === "find_metric_definition") {
    const metricQuery = String(args.metric_query || "").trim();

    if (!metricQuery) {
      return { found: false, message: "Missing metric_query" };
    }

    return await findMetricDefinition(metricQuery);
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
    "Use tools when the user asks what a metric means or asks for a KPI definition. " +
    "Do not invent metric definitions. " +
    "If a tool returns a metric, answer in clear business language. " +
    "If no metric is found, say so clearly.";

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
  const dataset = "metric_definitions.json";

  if (
    toolResult &&
    typeof toolResult === "object" &&
    "found" in toolResult &&
    toolResult.found === true &&
    "metric" in toolResult
  ) {
    rows = [(toolResult as { metric: MetricDefinition }).metric];
  }

  let answer = secondResponse.output_text?.trim();

  if (!answer) {
    if (
      toolResult &&
      typeof toolResult === "object" &&
      "found" in toolResult &&
      toolResult.found === true &&
      "metric" in toolResult
    ) {
      const metric = (toolResult as { metric: MetricDefinition }).metric;
     answer = `${metric.metric_name}: ${metric.definition}`;
    } else if (
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
