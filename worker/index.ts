export interface Env {
  DATA_BASE_URL?: string;
  OPENAI_API_KEY?: string;
}

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

export default {
  async fetch(request: Request): Promise<Response> {
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
          ai: "/api/ai",
          metric: "/api/metric",
        },
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        service: "nubrakes-ai-copilot-api",
      });
    }

    if (request.method === "POST" && url.pathname === "/api/ai") {
      return json({
        answer: "Worker route is working.",
        dataset: "test",
        rows: [],
      });
    }

    if (request.method === "POST" && url.pathname === "/api/metric") {
      return json({
        found: true,
        metric: {
          metric_id: "rev_total",
          display_name: "Total Revenue",
          description: "Test metric response.",
        },
      });
    }

    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
};
