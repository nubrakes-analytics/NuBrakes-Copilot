export type { Env } from "./types";
import type { Env } from "./types";
import { corsHeaders, jsonResponse } from "./utils";
import { handleSlackCommand } from "./slack";
import { runAiQuery } from "./ai";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
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

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (url.pathname === "/slack/command") {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
    }
    return await handleSlackCommand(request, env);
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
      { error: "Missing message. Expected one of: message, prompt, question, input" },
      400
    );
  }

  const result = await runAiQuery(userMessage, env);
  return jsonResponse(result);
}
