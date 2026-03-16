export interface Env {
  OPENAI_API_KEY: string;
  DATA_BASE_URL: string;
}

type MetricDefinition = {
  metric_id: string;
  display_name: string;
  aliases?: string[];
  category: string;
  sub_category: string;
  description: string;
  unit: string;
  format: string;
  direction: string;
  aggregation: string;
  source_table: string;
  source_column: string;
  is_primary: boolean;
  tags: string[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

async function loadMetricDefinitions(env: Env): Promise<MetricDefinition[]> {
  const url = `${env.DATA_BASE_URL.replace(/\/$/, "")}/metric_definitions.json`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to load metric_definitions.json: ${response.status} ${text}`);
  }

  const data = (await response.json()) as MetricDefinition[];

  if (!Array.isArray(data)) {
    throw new Error("metric_definitions.json did not return an array");
  }

  return data;
}

async function findMetricDefinition(metricQuery: string, env: Env) {
  const metrics = await loadMetricDefinitions(env);
  const q = normalize(metricQuery);

  const match = metrics.find((metric) => {
    return (
      normalize(metric.metric_id) === q ||
      normalize(metric.display_name) === q ||
      metric.aliases?.some((alias) => normalize(alias) === q) ||
      metric.tags?.some((tag) => normalize(tag) === q)
    );
  });

  if (!match) {
    return {
      found: false,
      message: `No metric found for query: ${metricQuery}`,
    };
  }

  return {
    found: true,
    metric: match,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "nubrakes-ai-copilot-api" });
    }

    if (request.method === "POST" && url.pathname === "/api/metric") {
      try {
        const body = (await request.json()) as { metric_query?: string };
        const metricQuery = body.metric_query?.trim();

        if (!metricQuery) {
          return json({ error: "Missing metric_query" }, 400);
        }

        const result = await findMetricDefinition(metricQuery, env);
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
