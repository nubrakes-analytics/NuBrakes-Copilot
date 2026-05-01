import type { AppApiResponse, DatasetDefinition, DashboardDefinition, MetricDefinition } from "./types";
import { stripMarkdownBold } from "./utils";

export function buildAppResponse(args: {
  answer: string;
  dataset?: string | null;
  rows?: Array<Record<string, unknown>>;
  datasetLink?: string | null;
  dashboardLink?: string | null;
  data?: unknown;
  debug?: unknown;
}): AppApiResponse {
  return {
    answer: stripMarkdownBold(args.answer),
    dataset: args.dataset ?? null,
    rows: args.rows ?? [],
    dataset_link: args.datasetLink ?? null,
    dashboard_link: args.dashboardLink ?? null,
    data: args.data,
    debug: args.debug,
  };
}

export function mergeStructuredToolResultIntoResponse(
  answer: string,
  toolResult: unknown,
  debug?: unknown
): AppApiResponse {
  const base = buildAppResponse({
    answer: stripMarkdownBold(answer),
    dataset: null,
    rows: [],
    datasetLink: null,
    dashboardLink: null,
    data: toolResult,
    debug,
  });

  if (!toolResult || typeof toolResult !== "object") return base;

  const r = toolResult as Record<string, unknown>;
  if (r.found !== true) return base;

  if ("dataset" in r) {
    const dataset = r.dataset as DatasetDefinition;
    return buildAppResponse({
      answer: stripMarkdownBold(answer),
      dataset: dataset?.dataset || dataset?.sheet_name || null,
      rows: dataset ? [dataset as Record<string, unknown>] : [],
      datasetLink: dataset?.link || null,
      dashboardLink: null,
      data: toolResult,
      debug,
    });
  }

  if ("dashboard" in r) {
    const dashboard = r.dashboard as DashboardDefinition;
    return buildAppResponse({
      answer: stripMarkdownBold(answer),
      dataset: "dashboard_links",
      rows: dashboard ? [dashboard as Record<string, unknown>] : [],
      datasetLink: null,
      dashboardLink: dashboard?.url || null,
      data: toolResult,
      debug,
    });
  }

  if ("datasets_used" in r) {
    const structured = r as {
      datasets_used?: Array<{
        dataset: string;
        link?: string;
        row_count: number;
        current_row_count?: number;
        prior_row_count?: number;
      }>;
      metric?: MetricDefinition;
    };

    const datasetsUsed = structured.datasets_used || [];

    return buildAppResponse({
      answer: stripMarkdownBold(answer),
      dataset: datasetsUsed[0]?.dataset || structured.metric?.metric_id || null,
      rows: datasetsUsed.map((d) => ({
        dataset: d.dataset,
        dataset_link: d.link || null,
        row_count: d.row_count,
        current_row_count: d.current_row_count ?? null,
        prior_row_count: d.prior_row_count ?? null,
      })),
      datasetLink: datasetsUsed[0]?.link || null,
      dashboardLink: null,
      data: toolResult,
      debug,
    });
  }

  return base;
}
