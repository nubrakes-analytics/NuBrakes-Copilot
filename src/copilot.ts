import { SYSTEM_PROMPT } from "./prompt";
import { TOOLS } from "./tools";
import { executeTool } from "./data";
import { createOpenAIResponse } from "./openai";
import type { Env } from "./types";

export async function runCopilot(env: Env, question: string) {
  let input: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: question }
  ];

  for (let i = 0; i < 6; i++) {
    const response: any = await createOpenAIResponse(env, {
      model: "gpt-5",
      input,
      tools: TOOLS,
      tool_choice: "auto"
    });

    const outputs = response.output || [];
    const toolCall = outputs.find((item: any) => item.type === "function_call");

    if (!toolCall) {
      return {
        answer: response.output_text || "No answer generated.",
        response_id: response.id
      };
    }

    let args: Record<string, any> = {};
    try {
      args = JSON.parse(toolCall.arguments || "{}");
    } catch {
      args = {};
    }

    const toolResult = await executeTool(env, toolCall.name, args);

    input = [
      ...input,
      {
        type: "function_call_output",
        call_id: toolCall.call_id,
        output: JSON.stringify(toolResult)
      }
    ];
  }

  return {
    answer: "Tool-call limit reached before a final answer was generated."
  };
}
