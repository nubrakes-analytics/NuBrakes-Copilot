export type DatasetConfig = {
  file: string;
  description: string;
};

export const DATASET_REGISTRY: Record<string, DatasetConfig> = {
  metric_definition_lookup: {
    file: "metric_definitions.json",
    description: "Definitions of approved NuBrakes business metrics"
  },
  market_kpi_summary: {
    file: "daily_market_kpis.json",
    description: "Daily KPI summary by market"
  },
  weekly_market_trends: {
    file: "weekly_market_kpis.json",
    description: "Weekly KPI trends by market"
  },
  tech_ranking: {
    file: "tech_performance_summary.json",
    description: "Technician performance and ranking data"
  },
  store_summary: {
    file: "store_performance_summary.json",
    description: "Store-level KPI summaries"
  },
  channel_summary: {
    file: "channel_performance_summary.json",
    description: "Marketing and acquisition channel performance"
  },
  vioc_summary: {
    file: "vioc_summary.json",
    description: "VIOC-related performance summary"
  },
  anomaly_lookup: {
    file: "anomaly_events.json",
    description: "Detected KPI anomalies and metadata"
  },
  dashboard_link_lookup: {
    file: "dashboard_links.json",
    description: "Dashboard URLs by topic"
  }
};
