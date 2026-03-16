import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  Database,
  Bot,
  Link as LinkIcon,
  BarChart3,
  Loader2,
} from "lucide-react";

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

const AI_ENDPOINT =
  "https://nubrakes-copilot.jonathan-libiran.workers.dev/api/ai";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-2">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="truncate text-lg font-semibold text-slate-900">
            {value}
          </div>
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
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        No supporting rows returned.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap px-3 py-3 font-medium sm:px-4"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-slate-100">
                {columns.map((col) => (
                  <td
                    key={col}
                    className="whitespace-nowrap px-3 py-3 text-slate-800 sm:px-4"
                  >
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

function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`w-full max-w-[92%] rounded-3xl px-4 py-3 sm:max-w-3xl ${
          isUser
            ? "bg-slate-900 text-white"
            : "bg-slate-50 text-slate-900 ring-1 ring-slate-200"
        }`}
      >
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
          {isUser ? "You" : "NuBrakes AI Copilot"}
        </div>

        <div className="whitespace-pre-wrap text-sm leading-6 sm:text-[15px]">
          {message.content}
        </div>

        {!isUser && message.meta && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Database className="h-4 w-4" />
              Dataset used: {message.meta.dataset || "Approved dataset"}
            </div>

            <TablePreview rows={message.meta.rows || []} />

            {message.meta.rows?.[0]?.url && (
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
  );
}

export default function NubrakesAICopilotFrontend() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi — I’m your NuBrakes AI Copilot. Ask a question about metrics, markets, technicians, stores, or dashboards.",
      meta: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleAsk = async (questionText) => {
    const question = questionText.trim();
    if (!question || loading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: question, meta: null },
    ]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "No answer returned.",
          meta: {
            dataset: data.dataset || data.dataset_used || "Approved dataset",
            rows: data.rows || data.supporting_rows || [],
          },
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn't reach the live AI API. Please check that the Worker is deployed and that /api/ai is returning a valid response.",
          meta: {
            dataset: "Connection error",
            rows: [],
          },
        },
      ]);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-3 sm:gap-5 sm:p-4 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6 lg:p-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4 sm:space-y-5 lg:sticky lg:top-6 lg:h-fit">
          <div className="rounded-3xl bg-slate-900 p-5 text-white shadow-sm sm:p-6">
            <div className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide sm:text-xs">
              NuBrakes AI Copilot
            </div>
            <h1 className="text-xl font-semibold sm:text-2xl">
              Self-serve analytics chat
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              A user-friendly chat interface for querying approved NuBrakes
              datasets and getting structured business answers.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <StatCard
              icon={Database}
              label="Datasets"
              value={String(DATASETS.length)}
            />
            <StatCard icon={BarChart3} label="Mode" value="Live AI Chat" />
            <StatCard icon={Bot} label="Backend" value="/api/ai" />
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
            <div className="mb-3 text-sm font-semibold text-slate-900">
              Available datasets
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {DATASETS.map((dataset) => (
                <div
                  key={dataset}
                  className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200 sm:text-sm"
                >
                  {dataset}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 lg:h-[calc(100vh-3rem)] lg:min-h-0">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="text-base font-semibold sm:text-lg">
              Ask NuBrakes AI Copilot
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Ask naturally, then wait for the answer like a normal chat.
            </div>
          </div>

          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex snap-x gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  onClick={() => handleAsk(example)}
                  disabled={loading}
                  className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-5">
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 p-3 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk(input);
                  }
                }}
                placeholder="Ask about metrics, markets, technicians, stores, or dashboards..."
                rows={2}
                className="min-h-[56px] w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500"
              />
              <button
                onClick={() => handleAsk(input)}
                disabled={loading || !input.trim()}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[132px]"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Press Enter to send. Use Shift+Enter for a new line.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
