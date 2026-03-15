import { DATASET_REGISTRY } from "./datasets";
import type { Env } from "./types";

async function fetchJson(url: string) {
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch dataset: ${res.status} ${text}`);
  }

  return await res.json();
}

function matchesFilter(row: Record<string, any>, key: string, value: any): boolean {
  if (value === undefined || value === null || value === "") return true;
  return String(row[key]) === String(value);
}

function applyFilters(rows: any[], filters: Record<string, any> = {}) {
  let result = [...rows];

  for (const [key, value] of Object.entries(filters)) {
    if (["limit", "sort_by", "sort_order"].includes(key)) continue;
    result = result.filter((row) => matchesFilter(row, key, value));
  }

  if (filters.sort_by) {
    const sortBy = String(filters.sort_by);
    const sortOrder = String(filters.sort_order || "desc").toLowerCase();

    result.sort((a, b) => {
      const av = a?.[sortBy];
      const bv = b?.[sortBy];

      const aNum = Number(av);
      const bNum = Number(bv);

      const bothNumbers = !Number.isNaN(aNum) && !Number.isNaN(bNum);

      if (bothNumbers) {
        return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
      }

      const aStr = String(av ?? "");
      const bStr = String(bv ?? "");

      return sortOrder === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }

  if (filters.limit) {
    const limit = Number(filters.limit);
    if (!Number.isNaN(limit) && limit > 0) {
      result = result.slice(0, limit);
    }
  }

  return result;
}

export async function executeTool(
  env: Env,
  toolName: string,
  args: Record<string, any>
) {
  if (toolName === "list_available_datasets") {
    return Object.entries(DATASET_REGISTRY).map(([dataset_key, config]) => ({
      dataset_key,
      file: config.file,
      description: config.description
    }));
  }

  if (toolName === "get_dataset_data") {
    const datasetKey = String(args.dataset_key || "");
    const config = DATASET_REGISTRY[datasetKey];

    if (!config) {
      return {
        error: `Unknown dataset_key: ${datasetKey}`,
        available_dataset_keys: Object.keys(DATASET_REGISTRY)
      };
    }

    const url = `${env.DATA_BASE_URL.replace(/\/$/, "")}/${config.file}`;
    const rawData = await fetchJson(url);

    if (!Array.isArray(rawData)) {
      return {
        dataset_key: datasetKey,
        file: config.file,
        row_count: 1,
        rows: [rawData]
      };
    }

    const filters = args.filters || {};
    const filtered = applyFilters(rawData, filters);

    return {
      dataset_key: datasetKey,
      file: config.file,
      row_count: filtered.length,
      filters_applied: filters,
      rows: filtered
    };
  }

  return { error: `Unknown tool: ${toolName}` };
}
