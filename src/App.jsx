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
  "What does average order value mean?",
  "Where can I find the ops dashboard?",
];

const DATASETS_FALLBACK = [
  {
    sheet_name: "metric_definitions",
    dataset: "metric_definitions.json",
    link: "https://docs.google.com/spreadsheets/d/1-HSowpqpc3F1uahwpEFHuI2ecPC09DczantTscYF8pc/edit?gid=0#gid=0",
  },
  {
    sheet_name: "dashboard_links",
    dataset: "dashboard_links.json",
    link: "https://docs.google.com/spreadsheets/d/1-HSowpqpc3F1uahwpEFHuI2ecPC09DczantTscYF8pc/edit?gid=474904201#gid=474904201",
  },
];

function YourComponent() {
  const [datasets, setDatasets] = useState(DATASETS_FALLBACK);

  useEffect(() => {
    fetch("data/dataset_list.json")
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load dataset list: ${r.status}`);
        return r.json();
      })
      .then(d => {
        if (Array.isArray(d) && d.length) {
          setDatasets(d);
        }
      })
      .catch(err => {
        console.error("dataset_list.json load failed", err);
      });
  }, []);

  return React.createElement(
    "div",
    null,
    datasets.map(item =>
      React.createElement(
        "a",
        {
          key: item.dataset,
          href: item.link,
          target: "_blank",
          rel: "noreferrer"
        },
        item.dataset
      )
    )
  );
}

const AI_ENDPOINT =
  "https://nubrakes-copilot.jonathan-libiran.workers.dev/api/ai";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#CDB7B7]">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[#CDB7B7]/25 p-2">
          <Icon className="h-5 w-5 text-[#0E2468]" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-[#817E7F]">
            {label}
          </div>
          <div className="text-lg font-semibold text-[#0E2468]">{value}</div>
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
      <div className="rounded-2xl border border-dashed border-[#CDB7B7] bg-[#F7F2F0] p-4 text-sm text-[#817E7F]">
        No supporting rows returned.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#CDB7B7] bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#CDB7B7]/25 text-left text-[#817E7F]">
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
              <tr key={idx} className="border-t border-[#CDB7B7]/60">
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-3 whitespace-nowrap text-[#0E2468]"
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
        className={`max-w-3xl rounded-3xl px-4 py-3 ${
          isUser
            ? "bg-[#0E2468] text-white"
            : "bg-white/80 text-[#0E2468] ring-1 ring-[#CDB7B7]"
        }`}
      >
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
          {isUser ? "You" : "NuBrakes AI Copilot"}
        </div>

        <div className="whitespace-pre-wrap text-sm leading-6">
          {message.content}
        </div>

        {!isUser && message.meta && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#817E7F]">
              <Database className="h-4 w-4" />
              Dataset used: {message.meta.dataset || "Approved dataset"}
            </div>

            <TablePreview rows={message.meta.rows || []} />

            {message.meta.rows?.[0]?.url && (
              <a
                href={message.meta.rows[0].url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#E63F2B] px-4 py-2 text-sm text-white hover:bg-[#cf3826]"
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
    <div className="min-h-screen bg-[#F7F2F0] text-[#0E2468]">
      <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-3xl bg-white p-6 text-white shadow-sm ring-1 ring-[#CDB7B7]">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1">
                <img
                  src="/nubrakes-ai-copilot.svg"
                  alt="NuBrakes AI Copilot logo"
                  className="h-18 w-20"
                />
                <span className="text-sm font-semibold text-[#0E2468]">
                  NuBrakes AI Copilot
                </span>
              </div>

              <h1 className="text-2xl font-semibold text-[#0E2468]">
                Self-serve analytics chat
              </h1>

              <p className="mt-3 text-sm leading-6 text-[#817E7F]">
                A user-friendly chat interface for querying approved NuBrakes
                datasets and getting structured business answers.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <StatCard
              icon={Database}
              label="Datasets"
              value={String(DATASETS.length)}
            />
            <StatCard icon={BarChart3} label="Mode" value="Live AI Chat" />
            <StatCard icon={Bot} label="Backend" value="/api/ai" />
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#CDB7B7]">
            <div className="mb-3 text-sm font-semibold text-[#0E2468]">
              Available datasets
            </div>
            <div className="space-y-2">
  {datasets.map((item) => (
    <a
      key={item.dataset}
      href={item.link}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-2xl bg-[#CDB7B7]/25 px-3 py-2 text-sm text-[#0E2468] ring-1 ring-[#CDB7B7] transition hover:bg-[#CDB7B7]/40"
    >
      <span>{item.dataset}</span>
    </a>
  ))}
</div>
                  <LinkIcon className="h-4 w-4 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex h-[85vh] flex-col rounded-3xl bg-white shadow-sm ring-1 ring-[#CDB7B7]">
          <div className="border-b border-[#CDB7B7] p-5">
            <div className="text-lg font-semibold">Ask NuBrakes AI Copilot</div>
            <div className="mt-1 text-sm text-[#817E7F]">
              Ask naturally, then wait for the answer like a normal chat.
            </div>
          </div>

          <div className="border-b border-[#CDB7B7] p-5">
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  onClick={() => handleAsk(example)}
                  disabled={loading}
                  className="rounded-full bg-white px-3 py-2 text-sm text-[#0E2468] ring-1 ring-[#CDB7B7] transition hover:bg-[#CDB7B7]/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-3xl bg-white px-4 py-3 text-sm text-[#0E2468] ring-1 ring-[#CDB7B7]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[#CDB7B7] p-5">
            <div className="flex gap-3">
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
                className="flex-1 resize-none rounded-2xl border border-[#CDB7B7] px-4 py-3 text-sm outline-none placeholder:text-[#817E7F]/80 focus:border-[#6E9CC0]"
              />
              <button
                onClick={() => handleAsk(input)}
                disabled={loading || !input.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0E2468] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#16358F] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
            <div className="mt-2 text-xs text-[#817E7F]">
              Press Enter to send. Use Shift+Enter for a new line.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
