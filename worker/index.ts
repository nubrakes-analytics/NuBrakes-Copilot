export interface Env {
  OPENAI_API_KEY: string;
}

type ChatResponse = {
  answer: string;
  dataset?: string;
  rows?: Array<Record<string, unknown>>;
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

function mockDatasetAnswer(question: string): ChatResponse | null {
  const normalized = question.trim().toLowerCase();

  if (
    normalized.includes("what does completed_revenue mean") ||
    normalized.includes("what is completed_revenue") ||
    normalized.includes("completed revenue mean")
  ) {
    return {
      answer:
        "Completed revenue is the sum of invoiced customer price for completed jobs using approved NuBrakes reporting logic.",
      dataset: "metric_definitions.json",
      rows: [
        {
          metric_name: "completed_revenue",
          definition:
            "Sum of invoiced customer price for completed jobs using approved NuBrakes reporting logic.",
        },
      ],
    };
  }

  if (
    normalized.includes("chicago yesterday") &&
    normalized.includes("completed revenue")
  ) {
    return {
      answer:
        "Completed revenue in Chicago yesterday was $28.5K across 31 completed jobs.",
      dataset: "daily_market_kpis.json",
      rows: [
        {
          date: "2026-03-14",
          market: "Chicago",
          completed_jobs: 31,
          completed_revenue: 28450,
        },
      ],
    };
  }

  if (
    normalized.includes("top 5") &&
    normalized.includes("technician") &&
    normalized.includes("last week")
  ) {
    return {
      answer:
        "Top technicians by completed revenue last week were John D ($18.2K), Mike S ($17.1K), and Alex R ($14.9K).",
      dataset: "tech_performance_summary.json",
      rows: [
        {
          tech_name: "John D",
          market: "Chicago",
          completed_jobs: 21,
          completed_revenue: 18234,
        },
        {
          tech_name: "Mike S",
          market: "Houston",
          completed_jobs: 19,
          completed_revenue: 17110,
        },
        {
          tech_name: "Alex R",
          market: "Chicago",
          completed_jobs: 16,
          completed_revenue: 14890,
        },
      ],
    };
  }

  if (
    normalized.includes("which store") &&
    normalized.includes("highest completed revenue")
  ) {
    return {
      answer:
        "Store HOU-01 has the highest completed revenue in the current sample at $92.4K.",
      dataset: "store_performance_summary.json",
      rows: [
        {
          store_id: "HOU-01",
          store_name: "Houston Central",
          market: "Houston",
          completed_revenue: 92410,
        },
      ],
    };
  }

  if (
    normalized.includes("ops dashboard") ||
    normalized.includes("operations dashboard")
  ) {
    return {
      answer: "You can find the operations dashboard at the link below.",
      dataset: "dashboard_links.json",
      rows: [
        {
          topic: "ops",
          url: "https://yourdomain.com/ops-dashboard",
        },
      ],
    };
  }

  return null;
}

async function askOpenAI(question: string, env: Env): Promise<ChatResponse> {
  const fallback = mockDatasetAnswer(question);
  if (fallback) return fallback;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content:
            "You are the NuBrakes AI Copilot. Answer clearly and concisely. If the user asks about metrics, markets, technicians, stores, or dashboards, respond in a business-friendly way. If you are unsure, say so.",
        },
        {
          role: "user",
          content: question,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    output_text?: string;
  };

  return {
    answer: data.output_text || "No answer returned.",
    dataset: "OpenAI response",
    rows: [],
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return json({
        ok: true,
        service: "nubrakes-ai-copilot-api",
        endpoints: {
          health: "/health",
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

    if (request.method === "POST" && url.pathname === "/api/ai") {
      try {
        const body = (await request.json()) as { question?: string };
        const question = body.question?.trim();

        if (!question) {
          return json({ error: "Missing question" }, 400);
        }

        const result = await askOpenAI(question, env);
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
