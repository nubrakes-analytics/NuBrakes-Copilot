import React, { useMemo, useState } from "react";
import { Send, Database, Bot, Link as LinkIcon, BarChart3, Loader2 } from "lucide-react";

const EXAMPLES = [
  "What does completed_revenue mean?",
  "What was completed revenue in Chicago yesterday?",
  "Top 5 technicians by completed revenue last week",
  "Which store has the highest completed revenue?",
  "Where can I find the ops dashboard?",
];

const DATASETS = [
  "metric_definitions.json",
  "daily_market_kpis.json",
  "weekly_market_kpis.json",
  "tech_performance_summary.json",
  "store_performance_summary.json",
  "dashboard_links.json",
];

const mockResponses = {
  "What does completed_revenue mean?": {
    answer:
      "Completed revenue is the sum of invoiced customer price for completed jobs using approved NuBrakes reporting logic.",
    dataset: "metric_definitions.json",
    rows: [{ metric_name: "completed_revenue", definition: "Sum of invoiced customer price for completed jobs using approved NuBrakes reporting logic." }],
  },
  "What was completed revenue in Chicago yesterday?": {
    answer:
      "Completed revenue in Chicago yesterday was $28.5K across 31 completed jobs.",
    dataset: "daily_market_kpis.json",
    rows: [{ date: "2026-03-14", market: "Chicago", completed_jobs: 31, completed_revenue: 28450 }],
  },
  "Top 5 technicians by completed revenue last week": {
    answer:
      "Top technicians by completed revenue last week were John D ($18.2K), Mike S ($17.1K), and Alex R ($14.9K).",
    dataset: "tech_performance_summary.json",
    rows: [
      { tech_name: "John D", market: "Chicago", completed_jobs: 21, completed_revenue: 18234 },
      { tech_name: "Mike S", market: "Houston", completed_jobs: 19, completed_revenue: 17110 },
      { tech_name: "Alex R", market: "Chicago", completed_jobs: 16, completed_revenue: 14890 },
    ],
  },
  "Which store has the highest completed revenue?": {
    answer:
      "Store HOU-01 has the highest completed revenue in the current sample at $92.4K.",
    dataset: "store_performance_summary.json",
    rows: [{ store_id: "HOU-01", store_name: "Houston Central", market: "Houston", completed_revenue: 92410 }],
  },
  "Where can I find the ops dashboard?": {
    answer:
      "You can find the operations dashboard at the link below.",
    dataset: "dashboard_links.json",
    rows: [{ topic: "ops", url: "https://yourdomain.com/ops-dashboard" }],
  },
};

const API_URL = "https://nubrakes-copilot.jonathan-libiran.workers.dev/ask";
const APP_SECRET = "YOUR_APP_SHARED_SECRET";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-2">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
          <div className="text-lg font-semibold text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function TablePreview({ rows }) {
  const columns = useMemo(() => {
    if (!rows?.length) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  if (!rows?.length) {
    return <div className="text-sm text-slate-500">No supporting rows returned.</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 font-medium whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-slate-100">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-3 whitespace-nowrap text-slate-800">
                    {String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function NubrakesAICopilotFrontend() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Ask a question about approved NuBrakes datasets. I’ll return the answer, the dataset used, and a supporting preview.",
      meta: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async (question) => {
    if (!question?.trim() || loading) return;

    const userMessage = { role: "user", content: question, meta: null };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-secret": APP_SECRET,
        },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage = {
        role: "assistant",
        content: data.answer || "No answer returned.",
        meta: {
          dataset: data.dataset_used || data.dataset || "Approved dataset",
          rows: data.rows || data.supporting_rows || [],
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const fallback = mockResponses[question];

      const assistantMessage = fallback
        ? {
            role: "assistant",
            content: fallback.answer,
            meta: {
              dataset: fallback.dataset,
              rows: fallback.rows,
            },
          }
        : {
            role: "assistant",
            content:
              "I couldn't reach the live API yet. Update API_URL and APP_SECRET, then try again.",
            meta: {
              dataset: "Connection error",
              rows: [],
            },
          };

      setMessages((prev) => [...prev, assistantMessage]);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
            <div className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              NuBrakes AI Copilot
            </div>
            <h1 className="text-2xl font-semibold">Self-serve analytics frontend</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              A chat-based UI for querying approved aggregated datasets and surfacing supporting records.
            </p>
          </div>

          <div className="grid gap-3">
            <StatCard icon={Database} label="Datasets" value={String(DATASETS.length)} />
            <StatCard icon={BarChart3} label="Mode" value="Prototype" />
            <StatCard icon={Bot} label="Backend" value="/ask API" />
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3 text-sm font-semibold text-slate-900">Available datasets</div>
            <div className="space-y-2">
              {DATASETS.map((dataset) => (
                <div key={dataset} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                  {dataset}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 p-5">
            <div className="text-lg font-semibold">Ask NuBrakes AI Copilot</div>
            <div className="mt-1 text-sm text-slate-500">
              Example questions below are wired to mocked responses for preview.
            </div>
          </div>

          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  onClick={() => handleAsk(example)}
                  className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-200"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[520px] space-y-4 overflow-y-auto p-5">
            {messages.map((message, idx) => (
              <div key={idx} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-3xl rounded-3xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 text-slate-900 ring-1 ring-slate-200"
                  }`}
                >
                  <div className="text-sm leading-6">{message.content}</div>

                  {message.meta && (
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        <Database className="h-4 w-4" />
                        Dataset used: {message.meta.dataset}
                      </div>

                      <TablePreview rows={message.meta.rows} />

                      {message.meta.dataset === "dashboard_links.json" && message.meta.rows?.[0]?.url && (
                        <a
                          href={message.meta.rows[0].url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm text-white"
                        >
                          <LinkIcon className="h-4 w-4" />
                          Open dashboard
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-5">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAsk(input);
                }}
                placeholder="Ask about metrics, markets, technicians, stores, or dashboards..."
                className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
              />
              <button
                onClick={() => handleAsk(input)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
