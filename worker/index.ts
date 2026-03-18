async function findDatasetLink(
  datasetQuery: string
): Promise<DatasetLookupResult> {
  const datasets = await loadDatasetDefinitions();
  const q = normalize(datasetQuery);

  if (!q) {
    return {
      found: false,
      message: "Dataset query is empty",
    };
  }

  const STOPWORDS = new Set([
    "a",
    "an",
    "the",
    "for",
    "of",
    "to",
    "in",
    "on",
    "by",
    "and",
    "or",
    "with",
    "from",
    "data",
    "dataset",
    "json",
    "link",
    "file",
    "need",
    "show",
    "give",
    "me",
  ]);

  const queryWords = q
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w && !STOPWORDS.has(w));

  let bestMatch: DatasetDefinition | null = null;
  let bestScore = -1;

  for (const dataset of datasets) {
    const rawDescription = String(dataset.description || "").trim();
    if (!rawDescription) continue;

    const sheetName = normalize(String(dataset.sheet_name || ""));
    const datasetName = normalize(String(dataset.dataset || ""));
    const description = normalize(rawDescription);
    const link = String(dataset.link || "").trim();

    if (!link) continue;

    let score = 0;

    // strong exact matches
    if (datasetName === q) score += 100;
    if (sheetName === q) score += 95;
    if (description === q) score += 80;

    // phrase contains
    if (q.length >= 3) {
      if (datasetName.includes(q)) score += 60;
      if (sheetName.includes(q)) score += 70;
      if (description.includes(q)) score += 40;
    }

    // token scoring
    for (const word of queryWords) {
      if (sheetName.includes(word)) score += 20;
      if (datasetName.includes(word)) score += 18;
      if (description.includes(word)) score += 8;
    }

    // bonus for important business keywords
    const importantWords = [
      "channel",
      "market",
      "kpi",
      "supply",
      "demand",
      "revenue",
      "completed",
      "booked",
      "canceled",
      "leads",
      "utilization",
      "technician",
    ];

    for (const word of importantWords) {
      if (queryWords.includes(word) && sheetName.includes(word)) score += 10;
      if (queryWords.includes(word) && datasetName.includes(word)) score += 8;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = dataset;
    }
  }

  if (!bestMatch || bestScore <= 0) {
    return {
      found: false,
      message: `No dataset link found for query: ${datasetQuery}`,
    };
  }

  return {
    found: true,
    dataset: bestMatch,
  };
}
