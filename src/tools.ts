export const TOOLS = [
  {
    type: "function",
    name: "list_available_datasets",
    description:
      "Returns the list of approved aggregated JSON datasets and what they are used for.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    type: "function",
    name: "get_dataset_data",
    description:
      "Fetch data from an approved aggregated JSON dataset using a dataset key and optional filters.",
    parameters: {
      type: "object",
      properties: {
        dataset_key: {
          type: "string",
          description:
            "The dataset key to load, such as tech_ranking, market_kpi_summary, or metric_definition_lookup."
        },
        filters: {
          type: "object",
          description:
            "Optional filters such as market, week_start, date, limit, sort_by, sort_order.",
          additionalProperties: true
        }
      },
      required: ["dataset_key"]
    }
  }
] as const;
