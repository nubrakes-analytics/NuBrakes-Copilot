import type { Env, AppApiResponse } from "./types";
import {
  normalize,
  stripMarkdownBold,
  safeJsonParse,
  callOpenAI,
  extractResponseText,
  jsonResponse,
} from "./utils";
import { buildAppResponse, mergeStructuredToolResultIntoResponse } from "./response";
import {
  tryDirectDatasetShortcut,
  findDatasetLink,
  findDashboardLink,
  findMetricDefinition,
  buildBusinessQuestionDriverPlan,
} from "./lookup";
import {
  analyzeBusinessQuestion,
  analyzeMarketPerformance,
  analyzeMixChange,
  queryMetricValue,
  analyzeMetricTrend,
  analyzeContributionToChange,
  compareSegments,
} from "./analysis";

const TOOLS = [
  {
    type: "function",
    name: "find_metric_definition",
    description: "Find the metric definition, formula, tags, and metadata for a KPI or metric query.",
    parameters: {
      type: "object",
      properties: {
        metric_query: {
          type: "string",
          description: "The KPI or metric to look up, such as conversion rate, AOV, leads, or gross margin.",
        },
      },
      required: ["metric_query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "find_dashboard_link",
    description: "Find the best matching dashboard or report link.",
    parameters: {
      type: "object",
      properties: {
        dashboard_query: {
          type: "string",
          description: "Dashboard name such as ops dashboard, marketing dashboard, supply demand dashboard.",
        },
      },
      required: ["dashboard_query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "find_dataset_link",
    description: "Find the best matching raw dataset link.",
    parameters: {
      type: "object",
      properties: {
        dataset_query: {
          type: "string",
          description: "Dataset name such as supply demand daily, channel market KPI daily, metric definitions.",
        },
      },
      required: ["dataset_query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "business_question_drivers",
    description: "Identify the KPI in a business question, return its candidate drivers, and resolve the relevant datasets to analyze.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description: "A business question such as 'Why did conversion rate drop last week?'",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_business_question",
    description: "Analyze a business question by resolving the KPI, relevant datasets, and likely drivers from linked data.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description: "A business question such as 'Why did conversion rate drop last week?'",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "query_metric_value",
    description: "Return the actual metric value for a specific scope such as market, channel, and time period.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "A direct factual metric lookup question such as 'What is Dallas revenue in December 2025?'",
        },
      },
      required: ["question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_market_performance",
    description: "Rank markets for a KPI and identify which markets are underperforming versus the prior period.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description: "A market performance question such as 'Which markets are underperforming?'",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_mix_change",
    description: "Analyze mix change over time, such as lead mix by channel or market this week versus last week.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description: "A mix change question such as 'What changed in lead mix this week?'",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_metric_trend",
    description: "Analyze trend across the last several periods for a metric, with pacing-aware projection for the latest open period.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description: "A trend question such as 'monthly revenue trend' or 'trend for completed jobs this week'.",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "analyze_contribution_to_change",
    description: "Decompose the change in an additive metric by market or channel contribution.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description: "A question such as 'Which markets/channel drove the revenue decline this month?'",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "compare_segments",
    description: "Compare two markets or two channels for a metric in a selected time period.",
    parameters: {
      type: "object",
      properties: {
        business_question: {
          type: "string",
          description: "A comparison question such as 'Compare Atlanta vs Dallas completed jobs this month'.",
        },
      },
      required: ["business_question"],
      additionalProperties: false,
    },
  },
] as const;

async function handleToolCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "find_metric_definition":
      return await findMetricDefinition(String(args.metric_query || ""));
    case "find_dashboard_link":
      return await findDashboardLink(String(args.dashboard_query || ""));
    case "find_dataset_link":
      return await findDatasetLink(String(args.dataset_query || ""));
    case "business_question_drivers":
      return await buildBusinessQuestionDriverPlan(String(args.business_question || ""));
    case "analyze_business_question":
      return await analyzeBusinessQuestion(String(args.business_question || ""));
    case "query_metric_value":
      return await queryMetricValue(String(args.question || ""));
    case "analyze_market_performance":
      return await analyzeMarketPerformance(String(args.business_question || ""));
    case "analyze_mix_change":
      return await analyzeMixChange(String(args.business_question || ""));
    case "analyze_metric_trend":
      return await analyzeMetricTrend(String(args.business_question || ""));
    case "analyze_contribution_to_change":
      return await analyzeContributionToChange(String(args.business_question || ""));
    case "compare_segments":
      return await compareSegments(String(args.business_question || ""));
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function runAiQuery(userMessage: string, env: Env): Promise<AppApiResponse> {
  if (normalize(userMessage) === "ping") {
    return {
      answer: "pong",
      dataset: null,
      rows: [],
      dataset_link: null,
      dashboard_link: null,
    };
  }

  const normalizedMessage = normalize(userMessage);
  const messageWords = new Set(normalizedMessage.split(/\s+/).filter(Boolean));

  const hasPhrase = (phrase: string) => normalizedMessage.includes(phrase);
  const hasWord = (word: string) => messageWords.has(word);

  const looksLikeBusinessQuestion =
    hasWord("why") ||
    hasWord("driver") ||
    hasWord("drivers") ||
    hasWord("down") ||
    hasWord("up") ||
    hasWord("drop") ||
    hasWord("dropped") ||
    hasWord("increase") ||
    hasWord("decrease") ||
    hasWord("changed");

  const looksLikeTrendQuestion =
    hasWord("trend") ||
    hasPhrase("month over month") ||
    hasPhrase("week over week") ||
    hasPhrase("monthly trend") ||
    hasPhrase("weekly trend");

  const looksLikeContributionQuestion =
    hasPhrase("contribution to change") ||
    hasPhrase("contributed most") ||
    (hasWord("drove") && hasWord("decline")) ||
    (hasWord("drove") && hasWord("increase")) ||
    (hasWord("drive") && hasWord("decline")) ||
    (hasWord("drive") && hasWord("increase")) ||
    ((hasWord("market") || hasWord("markets")) && (hasWord("drove") || hasWord("drive"))) ||
    ((hasWord("channel") || hasWord("channels")) && (hasWord("drove") || hasWord("drive"))) ||
    (hasWord("contribution") && (hasWord("market") || hasWord("channel") || hasWord("markets") || hasWord("channels")));

  const looksLikeSegmentCompareQuestion =
    hasWord("compare") || hasWord("versus") || hasWord("vs");

  const looksLikeMarketPerformanceQuestion =
    hasPhrase("which markets are underperforming") ||
    hasPhrase("underperforming markets") ||
    hasPhrase("which markets underperform") ||
    (hasWord("markets") &&
      (hasWord("underperforming") || hasWord("underperform") || hasWord("worst")));

  const looksLikeMixChangeQuestion =
    hasPhrase("lead mix") ||
    hasPhrase("channel mix") ||
    hasPhrase("market mix") ||
    (hasWord("mix") && (hasWord("changed") || hasWord("shift") || hasWord("shifted")));

  const looksLikeDashboardLinkQuestion =
    hasWord("dashboard") ||
    hasWord("report") ||
    hasPhrase("where can i find") ||
    hasPhrase("where is");

  const looksLikeDatasetLinkQuestion =
    hasWord("dataset") ||
    hasWord("json") ||
    hasWord("sheet") ||
    hasPhrase("raw data") ||
    hasPhrase("which dataset") ||
    hasPhrase("what dataset") ||
    hasPhrase("should i use") ||
    hasPhrase("use for") ||
    hasPhrase("best dataset");

  const mentionsKnownMetric =
    hasWord("revenue") ||
    hasWord("aov") ||
    hasWord("leads") ||
    hasWord("conversion") ||
    hasPhrase("conversion rate") ||
    hasPhrase("booking rate") ||
    hasPhrase("cancel rate") ||
    hasWord("ctr") ||
    hasWord("cpc") ||
    hasPhrase("marketing spend") ||
    hasPhrase("jobs completed") ||
    hasPhrase("jobs booked") ||
    hasPhrase("available slot") ||
    hasPhrase("available slots");

  const looksLikeMetricValueQuestion =
    !looksLikeBusinessQuestion &&
    !looksLikeMarketPerformanceQuestion &&
    !looksLikeMixChangeQuestion &&
    !looksLikeTrendQuestion &&
    !looksLikeContributionQuestion &&
    !looksLikeSegmentCompareQuestion &&
    mentionsKnownMetric;

  const directDatasetMatch = await tryDirectDatasetShortcut(userMessage);

  if (directDatasetMatch && looksLikeDatasetLinkQuestion) {
    return buildAppResponse({
      answer: `You should use this dataset: ${directDatasetMatch.link}`,
      dataset: directDatasetMatch.dataset || directDatasetMatch.sheet_name || "dataset_list",
      datasetLink: directDatasetMatch.link || null,
      rows: [directDatasetMatch],
      data: { found: true, dataset: directDatasetMatch },
    });
  }

  if (looksLikeDatasetLinkQuestion) {
    const result = await findDatasetLink(userMessage);
    return result.found
      ? buildAppResponse({
          answer: `You should use this dataset: ${result.dataset.link}`,
          dataset: result.dataset.dataset || result.dataset.sheet_name || "dataset_list",
          datasetLink: result.dataset.link || null,
          rows: [result.dataset],
          data: result,
        })
      : buildAppResponse({
          answer: result.message,
          dataset: null,
          rows: [],
          data: result,
        });
  }

  if (looksLikeDashboardLinkQuestion) {
    const result = await findDashboardLink(userMessage);
    return result.found
      ? buildAppResponse({
          answer: `You can find the dashboard here: ${result.dashboard.url}`,
          dataset: "dashboard_links",
          dashboardLink: result.dashboard.url || null,
          rows: [result.dashboard],
          data: result,
        })
      : buildAppResponse({
          answer: result.message,
          dataset: null,
          rows: [],
          data: result,
        });
  }

  if (looksLikeTrendQuestion) {
    const trendResult = await analyzeMetricTrend(userMessage);
    return trendResult.found
      ? buildAppResponse({
          answer: stripMarkdownBold(
            [trendResult.analysis.summary, ...trendResult.analysis.observations.slice(0, 6)].join("\n")
          ),
          dataset: trendResult.datasets_used[0]?.dataset || trendResult.metric.metric_id,
          datasetLink: trendResult.datasets_used[0]?.link || null,
          rows: trendResult.analysis.points.map((p) => ({
            period: p.period,
            value: p.value,
            raw_value: p.raw_value,
            is_projected: p.is_projected,
          })),
          data: trendResult,
        })
      : buildAppResponse({
          answer: trendResult.message,
          dataset: null,
          rows: [],
          data: trendResult,
        });
  }

  if (looksLikeContributionQuestion) {
    const contributionResult = await analyzeContributionToChange(userMessage);
    return contributionResult.found
      ? buildAppResponse({
          answer: stripMarkdownBold(
            [contributionResult.analysis.summary, ...contributionResult.analysis.observations.slice(0, 6)].join("\n")
          ),
          dataset: contributionResult.datasets_used[0]?.dataset || contributionResult.metric.metric_id,
          datasetLink: contributionResult.datasets_used[0]?.link || null,
          rows: contributionResult.analysis.contributions.map((r) => ({
            segment: r.segment,
            current_value: r.current_value,
            prior_value: r.prior_value,
            contribution_to_change: r.contribution_to_change,
          })),
          data: contributionResult,
        })
      : buildAppResponse({
          answer: contributionResult.message,
          dataset: null,
          rows: [],
          data: contributionResult,
        });
  }

  if (looksLikeSegmentCompareQuestion) {
    const compareResult = await compareSegments(userMessage);
    if (compareResult.found) {
      return buildAppResponse({
        answer: compareResult.comparison.summary,
        dataset: compareResult.datasets_used[0]?.dataset || compareResult.metric.metric_id,
        datasetLink: compareResult.datasets_used[0]?.link || null,
        rows: [
          {
            segment: compareResult.comparison.segment_a.name,
            value: compareResult.comparison.segment_a.value,
            raw_value: compareResult.comparison.segment_a.raw_value,
          },
          {
            segment: compareResult.comparison.segment_b.name,
            value: compareResult.comparison.segment_b.value,
            raw_value: compareResult.comparison.segment_b.raw_value,
          },
        ],
        data: compareResult,
      });
    }
  }

  if (looksLikeMarketPerformanceQuestion) {
    const marketResult = await analyzeMarketPerformance(userMessage);
    return marketResult.found
      ? buildAppResponse({
          answer: stripMarkdownBold(
            [marketResult.analysis.summary, ...marketResult.analysis.observations.slice(0, 6)].join("\n")
          ),
          dataset: marketResult.datasets_used[0]?.dataset || marketResult.metric.metric_id,
          datasetLink: marketResult.datasets_used[0]?.link || null,
          rows: marketResult.analysis.underperforming_markets.map((m) => ({
            market: m.market,
            current_value: m.current_value,
            prior_value: m.prior_value,
            delta_value: m.delta_value,
          })),
          data: marketResult,
        })
      : buildAppResponse({
          answer: stripMarkdownBold(marketResult.message),
          dataset: null,
          rows: [],
          data: marketResult,
        });
  }

  if (looksLikeMixChangeQuestion) {
    const mixResult = await analyzeMixChange(userMessage);
    return mixResult.found
      ? buildAppResponse({
          answer: stripMarkdownBold(
            [mixResult.analysis.summary, ...mixResult.analysis.observations.slice(0, 6)].join("\n")
          ),
          dataset: mixResult.datasets_used[0]?.dataset || "mix_analysis",
          datasetLink: mixResult.datasets_used[0]?.link || null,
          rows: mixResult.analysis.changes.map((c) => ({
            dimension_value: c.dimension_value,
            current_share: c.current_share,
            prior_share: c.prior_share,
            share_delta: c.share_delta,
            current_value: c.current_value,
            prior_value: c.prior_value,
          })),
          data: mixResult,
        })
      : buildAppResponse({
          answer: stripMarkdownBold(mixResult.message),
          dataset: null,
          rows: [],
          data: mixResult,
        });
  }

  if (looksLikeMetricValueQuestion) {
    const valueResult = await queryMetricValue(userMessage);
    return valueResult.found
      ? buildAppResponse({
          answer: stripMarkdownBold(valueResult.result.summary),
          dataset: valueResult.datasets_used[0]?.dataset || valueResult.metric.metric_id,
          datasetLink: valueResult.datasets_used[0]?.link || null,
          rows: valueResult.datasets_used.map((d) => ({
            dataset: d.dataset,
            dataset_link: d.link || null,
            row_count: d.row_count,
          })),
          data: valueResult,
        })
      : buildAppResponse({
          answer: stripMarkdownBold(valueResult.message),
          dataset: null,
          rows: [],
          data: valueResult,
        });
  }

  if (looksLikeBusinessQuestion) {
    const directAnalysis = await analyzeBusinessQuestion(userMessage);
    return directAnalysis.found
      ? buildAppResponse({
          answer: stripMarkdownBold(
            [directAnalysis.analysis.summary, ...directAnalysis.analysis.observations.slice(0, 6)].join("\n")
          ),
          dataset: directAnalysis.datasets_used[0]?.dataset || directAnalysis.metric.metric_id,
          datasetLink: directAnalysis.datasets_used[0]?.link || null,
          rows: directAnalysis.datasets_used.map((d) => ({
            dataset: d.dataset,
            dataset_link: d.link || null,
            row_count: d.row_count,
            current_row_count: d.current_row_count ?? null,
            prior_row_count: d.prior_row_count ?? null,
          })),
          data: directAnalysis,
        })
      : buildAppResponse({
          answer: stripMarkdownBold(directAnalysis.message),
          dataset: null,
          rows: [],
          data: directAnalysis,
        });
  }

  const firstResp = await callOpenAI(env.OPENAI_API_KEY, {
    model: "gpt-5.4-mini",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are a NuBrakes business analyst assistant. " +
              "Use tools when needed. " +
              "Use find_metric_definition when the user asks what a KPI means. " +
              "Use find_dashboard_link when the user asks for a dashboard or report link. " +
              "Use find_dataset_link when the user asks for a dataset or raw data link. " +
              "Use business_question_drivers when the user asks why a KPI moved or what drove performance. " +
              "Use analyze_business_question when the user asks for an actual driver analysis from linked data. " +
              "Use query_metric_value when the user asks for a direct metric value for a market/channel/time period. " +
              "Use analyze_market_performance for questions about which markets are underperforming or worst. " +
              "Use analyze_mix_change for questions about lead mix, channel mix, or market mix changes. " +
              "Use analyze_metric_trend for trend questions. " +
              "Use analyze_contribution_to_change for decomposition questions. " +
              "Use compare_segments for vs/compare questions. " +
              "Keep answers concise, quantitative when possible, and business-focused. " +
              "Do not use markdown bold. Never use double asterisks in the response. " +
              "Return plain text only.",
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: userMessage }],
      },
    ],
    tools: TOOLS,
  });

  const outputItems = firstResp.output || [];
  const toolOutputs: Array<{
    type: "function_call_output";
    call_id?: string;
    output: string;
  }> = [];

  let lastStructuredResult: unknown = null;

  for (const item of outputItems) {
    if (item.type === "function_call" && item.name && item.arguments) {
      const args = safeJsonParse<Record<string, unknown>>(item.arguments, {});
      const result = await handleToolCall(item.name, args);
      lastStructuredResult = result;
      toolOutputs.push({
        type: "function_call_output",
        call_id: item.call_id,
        output: JSON.stringify(result),
      });
    }
  }

  if (toolOutputs.length === 0) {
    return jsonResponse(
      buildAppResponse({
        answer: stripMarkdownBold(extractResponseText(firstResp) || "No response generated."),
        dataset: null,
        rows: [],
        debug: firstResp,
      })
    ) as unknown as AppApiResponse;
  }

  const secondResp = await callOpenAI(env.OPENAI_API_KEY, {
    model: "gpt-5.4-mini",
    previous_response_id: firstResp.id,
    input: toolOutputs,
  });

  return jsonResponse(
    mergeStructuredToolResultIntoResponse(
      stripMarkdownBold(extractResponseText(secondResp) || "No response generated."),
      lastStructuredResult,
      secondResp
    )
  ) as unknown as AppApiResponse;
}
