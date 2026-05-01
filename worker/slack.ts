import type { Env } from "./types";
import { corsHeaders } from "./utils";
import { runAiQuery } from "./ai";

export async function handleSlackCommand(request: Request, env: Env): Promise<Response> {
  const rawBody = await request.text();

  const isValid = await verifySlackSignature(
    request,
    rawBody,
    env.SLACK_SIGNING_SECRET
  );

  if (!isValid) {
    return new Response("Invalid Slack signature", {
      status: 401,
      headers: corsHeaders,
    });
  }

  const form = new URLSearchParams(rawBody);
  const text = String(form.get("text") || "").trim();

  if (!text) {
    return new Response(
      JSON.stringify({
        response_type: "ephemeral",
        text: "Request: \nResponse: Please enter a question after /nb",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  const result = await runAiQuery(text, env);

  return new Response(
    JSON.stringify({
      response_type: "ephemeral",
      text: `Request: ${text}\nResponse: ${result.answer || "No response generated."}`,
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

async function verifySlackSignature(
  request: Request,
  rawBody: string,
  signingSecret: string
): Promise<boolean> {
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");

  if (!timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 60 * 5) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(baseString));
  const sigBytes = Array.from(new Uint8Array(sigBuffer));
  const computed = `v0=${sigBytes.map((b) => b.toString(16).padStart(2, "0")).join("")}`;

  return timingSafeEqual(computed, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
