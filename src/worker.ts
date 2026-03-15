const AI_ENDPOINT = "/api/ai";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Let the frontend files load normally
    if (url.pathname !== AI_ENDPOINT) {
      return env.ASSETS.fetch(request);
    }

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    if (request.method !== "POST") {
      return json(
        { error: "Method not allowed" },
        405,
        corsHeaders()
      );
    }

    try {
      const { question } = await request.json();

      if (!question || !String(question).trim()) {
        return json(
          { error: "Missing question" },
          400,
          corsHeaders()
        );
      }

      const openaiRes = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-5",
          input: [
            {
              role: "system",
              content:
                "You are the NuBrakes AI Copilot. Answer clearly and concisely.",
            },
            {
              role: "user",
              content: question,
            },
          ],
        }),
      });

      const data = await openaiRes.json();

      return json(
        {
          answer: data.output_text || "No answer returned.",
          raw: data,
        },
        openaiRes.status,
        corsHeaders()
      );
    } catch (err) {
      return json(
        { error: err.message || "Server error" },
        500,
        corsHeaders()
      );
    }
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: extraHeaders,
  });
}
