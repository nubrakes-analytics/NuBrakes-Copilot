export interface Env {
  OPENAI_API_KEY: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
}

export type MetricDefinition = {
  metric_id: string;
  metric_name: string;
  category?: string;
  definition?: string;
  unit?: string;
  format_type?: string;
  formula_logic?: string;
  aggregation?: string;
  good_direction?: "up" | "down" | "neutral" | string;
  owner?: string;
  tags?: string[];
  candidate_drivers?: string[];
  relevant_datasets?: string[];
};

export type DashboardDefinition = {
  dashboard_name?: string;
  category?: string;
  description?: string;
  url?: string;
  owner?: string;
  refresh_frequency?: string;
};

export type DatasetDefinition = {
  sheet_name?: string;
  dataset?: string;
  link?: string;
  description?: string;
};

export type DatasetRow = Record<string, unknown>;
export type TimeGrain = "day" | "week" | "month";
export type DriverRelationship = "positive" | "negative" | "contextual";
export type ConfidenceLabel = "high" | "medium" | "low";

export type ParsedBusinessScope = {
  time_grain: TimeGrain;
  compare_mode: "current_vs_prior";
  market?: string;
  channel?: string;
  target_bucket?: string;
};

export type ParsedPointInTimeScope = {
  time_grain: TimeGrain;
  market?: string;
  channel?: string;
  target_bucket?: string;
  period_label: string;
};

export type ScopedRows = {
  current: DatasetRow[];
  prior: DatasetRow[];
  current_label: string;
  prior_label: string;
};

export type LoadedDataset = {
  dataset: string;
  link?: string;
  rows: DatasetRow[];
};

export type ScopedLoadedDataset = {
  dataset: string;
  link?: string;
  filteredRows: DatasetRow[];
  currentRows: DatasetRow[];
  priorRows: DatasetRow[];
  currentLabel: string;
  priorLabel: string;
  supportsMarket: boolean;
  supportsChannel: boolean;
};

export type ConfidenceScore = {
  score: number;
  label: ConfidenceLabel;
  reasons: string[];
};

export type MetricLookupResult =
  | { found: true; metric: MetricDefinition; score: number; confidence: ConfidenceScore }
  | { found: false; message: string };

export type DatasetLookupResult =
  | { found: true; dataset: DatasetDefinition; confidence: ConfidenceScore }
  | { found: false; message: string };

export type DashboardLookupResult =
  | { found: true; dashboard: DashboardDefinition; confidence: ConfidenceScore }
  | { found: false; message: string };

export type BusinessQuestionDriverResult =
  | {
      found: true;
      metric: MetricDefinition;
      datasets: DatasetDefinition[];
      analysis_plan: {
        metric_id: string;
        metric_name: string;
        good_direction?: string;
        candidate_drivers: string[];
        driver_definitions: MetricDefinition[];
        relevant_datasets: string[];
        business_question: string;
        suggested_steps: string[];
      };
      confidence: ConfidenceScore;
    }
  | { found: false; message: string };

export type AnalyzeBusinessQuestionResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: ParsedBusinessScope;
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
        current_row_count?: number;
        prior_row_count?: number;
      }>;
      analysis: {
        business_question: string;
        metric_id: string;
        metric_name: string;
        current_value: string;
        prior_value: string;
        delta_value: string;
        candidate_drivers: string[];
        summary: string;
        observations: string[];
        confidence: ConfidenceScore;
        debug?: {
          uncomputable_drivers?: Array<{
            driver_id: string;
            dataset_used: string;
            missing_reason?: string;
            current_rows_count: number;
            prior_rows_count: number;
          }>;
        };
      };
    }
  | { found: false; message: string };

export type QueryMetricValueResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: ParsedPointInTimeScope;
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      result: {
        question: string;
        metric_id: string;
        metric_name: string;
        value: string;
        raw_value: number | null;
        period: string;
        market?: string;
        channel?: string;
        summary: string;
        confidence: ConfidenceScore;
      };
    }
  | { found: false; message: string };

export type AnalyzeMarketPerformanceResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: ParsedBusinessScope;
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      analysis: {
        business_question: string;
        metric_id: string;
        metric_name: string;
        period: string;
        comparison_period: string;
        summary: string;
        underperforming_markets: Array<{
          market: string;
          current_value: string;
          prior_value: string;
          delta_value: string;
          raw_current_value: number | null;
          raw_prior_value: number | null;
          raw_delta_value: number | null;
        }>;
        observations: string[];
        confidence: ConfidenceScore;
      };
    }
  | { found: false; message: string };

export type AnalyzeMixChangeResult =
  | {
      found: true;
      scope: ParsedBusinessScope;
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      analysis: {
        business_question: string;
        mix_dimension: "channel" | "market";
        base_metric: string;
        period: string;
        comparison_period: string;
        summary: string;
        changes: Array<{
          dimension_value: string;
          current_value: string;
          prior_value: string;
          current_share: string;
          prior_share: string;
          share_delta: string;
          raw_current_value: number;
          raw_prior_value: number;
          raw_current_share: number;
          raw_prior_share: number;
          raw_share_delta: number;
        }>;
        observations: string[];
        confidence: ConfidenceScore;
      };
    }
  | { found: false; message: string };

export type AnalyzeMetricTrendResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: {
        time_grain: TimeGrain;
        market?: string;
        channel?: string;
      };
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      analysis: {
        business_question: string;
        metric_id: string;
        metric_name: string;
        summary: string;
        points: Array<{
          period: string;
          value: string;
          raw_value: number | null;
          is_projected: boolean;
        }>;
        observations: string[];
        confidence: ConfidenceScore;
      };
    }
  | { found: false; message: string };

export type AnalyzeContributionToChangeResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: ParsedBusinessScope;
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      analysis: {
        business_question: string;
        metric_id: string;
        metric_name: string;
        dimension: "market" | "channel";
        period: string;
        comparison_period: string;
        summary: string;
        contributions: Array<{
          segment: string;
          current_value: string;
          prior_value: string;
          contribution_to_change: string;
          raw_current_value: number | null;
          raw_prior_value: number | null;
          raw_contribution_to_change: number | null;
        }>;
        observations: string[];
        confidence: ConfidenceScore;
      };
    }
  | { found: false; message: string };

export type CompareSegmentsResult =
  | {
      found: true;
      metric: MetricDefinition;
      scope: {
        time_grain: TimeGrain;
        period_label: string;
        dimension: "market" | "channel";
        segment_a: string;
        segment_b: string;
      };
      datasets_used: Array<{
        dataset: string;
        link?: string;
        row_count: number;
      }>;
      comparison: {
        metric_id: string;
        metric_name: string;
        summary: string;
        segment_a: {
          name: string;
          value: string;
          raw_value: number | null;
        };
        segment_b: {
          name: string;
          value: string;
          raw_value: number | null;
        };
        delta: string;
        raw_delta: number | null;
        confidence: ConfidenceScore;
      };
    }
  | { found: false; message: string };

export type DriverObservation = {
  driverId: string;
  currentValue: number | null;
  priorValue: number | null;
  deltaValue: number | null;
  formatType: string;
  datasetUsed: string;
  currentRowsCount: number;
  priorRowsCount: number;
  relationship: DriverRelationship;
  explanatoryDirection: "supports" | "hurts" | "mixed" | "context" | "unknown";
  explanatoryScore: number;
  missingReason?: string;
};

export type MetricRegistryEntry = {
  metric: MetricDefinition;
  metricId: string;
  metricName: string;
  fieldNames: string[];
  primaryDatasetId: string | null;
  formatType: string;
  goodDirection: string;
  candidateDrivers: string[];
  relevantDatasets: string[];
  kind: "additive" | "rate";
};

export type OpenAIOutputItem = {
  type: string;
  name?: string;
  arguments?: string;
  call_id?: string;
  text?: string;
  content?: Array<{ type?: string; text?: string }>;
};

export type OpenAIResponse = {
  id?: string;
  output?: OpenAIOutputItem[];
  output_text?: string;
};

export type AppApiResponse = {
  answer: string;
  dataset?: string | null;
  rows?: Array<Record<string, unknown>>;
  dataset_link?: string | null;
  dashboard_link?: string | null;
  data?: unknown;
  debug?: unknown;
};
