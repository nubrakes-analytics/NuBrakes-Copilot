import { runCopilot } from "./copilot";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "nubrakes-ai-copilot-api"
      });
    }

    if (request.method === "POST" && url.pathname === "/ask") {
      const sharedSecret = request.headers.get("x-app-secret");

      if (sharedSecret !== env.APP_SHARED_SECRET) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      let body: { question?: string };
      try {
        body = (await request.json()) as { question?: string };
      } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const question = body.question?.trim();

      if (!question) {
        return Response.json({ error: "Missing question" }, { status: 400 });
      }

      try {
        const result = await runCopilot(env, question);
        return Response.json(result);
      } catch (error: any) {
        return Response.json(
          {
            error: error?.message || "Unknown server error"
          },
          { status: 500 }
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
