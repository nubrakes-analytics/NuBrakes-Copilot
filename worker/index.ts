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

async function askOpenAI(question: string, env: Env): Promise<ChatResponse> {
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
