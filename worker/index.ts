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

    // PASTE IT HERE, replacing the current /api/ai block
    if (request.method === "POST" && url.pathname === "/api/ai") {
      return json({
        answer: "Worker route is working.",
        dataset: "test",
        rows: [],
      });
    }

    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
};
