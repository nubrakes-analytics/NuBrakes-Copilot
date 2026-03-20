import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  Database,
  Bot,
  Link as LinkIcon,
  BarChart3,
  Loader2,
  RotateCcw,
} from "lucide-react";

const EXAMPLES = [
  "What does average order value mean?",
  "Where can I find the ops dashboard?",
  "Which dataset should I use for supply and demand by market?",
  "Why is conversion rate down this March?",
  "What was the referral revenue in February 2026?",
  "Why are completed jobs down?",
  "Which markets are underperforming?",
  "What changed in lead mix this week?",
];

const DATASET_LIST_URL =
  "https://nubrakes-analytics.github.io/NuBrakes-Copilot/data/dataset_list.json";

const AI_ENDPOINT =
  "https://nubrakes-copilot.jonathan-libiran.workers.dev/api/ai";

const STORAGE_KEY = "nubrakes-ai-copilot-chat-v1";

function createMessage(role, content, meta = null) {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    meta,
    createdAt: new Date().toISOString(),
  };
}

function isValidHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

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

function MetadataPill({ label, value }) {
  return (
    <div className="rounded-full bg-[#F7F2F0] px-3 py-1 text-[11px] font-medium text-[#0E2468] ring-1 ring-[#CDB7B7]">
      <span className="opacity-70">{label}:</span> {value}
    </div>
  );
}

function MessageBubble({ message, onRetry }) {
  const isUser = message.role === "user";
  const firstRow = message.meta?.rows?.[0] || null;

  const dashboardLinkRaw =
    message.meta?.dashboard_link ||
    firstRow?.dashboard_link ||
    firstRow?.dashboard_url;

  const datasetLinkRaw =
    message.meta?.dataset_link ||
    firstRow?.dataset_link;

  const dashboardLink = isValidHttpUrl(dashboardLinkRaw)
    ? dashboardLinkRaw
    : null;

  const datasetLink = isValidHttpUrl(datasetLinkRaw) ? datasetLinkRaw : null;

  const rowsCount = Array.isArray(message.meta?.rows)
    ? message.meta.rows.length
    : 0;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-3xl rounded-3xl px-4 py-3 ${
          isUser
            ? "bg-[#0E2468] text-white"
            : "bg-white/80 text-[#0E2468] ring-1 ring-[#CDB7B7]"
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
            {isUser ? "You" : "NuBrakes AI Copilot"}
          </div>
          <div className="text-[11px] opacity-60">{formatTime(message.createdAt)}</div>
        </div>

        <div className="whitespace-pre-wrap text-sm leading-6">
          {message.content}
        </div>

        {!isUser && (message.meta?.dataset || rowsCount > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.meta?.dataset ? (
              <MetadataPill label="Dataset" value={message.meta.dataset} />
            ) : null}
            {rowsCount > 0 ? (
              <MetadataPill label="Rows" value={String(rowsCount)} />
            ) : null}
          </div>
        )}

        {!isUser && (datasetLink || dashboardLink) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {datasetLink && (
              <a
                href={datasetLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0E2468] px-4 py-2 text-sm text-white hover:bg-[#16358F]"
              >
                <LinkIcon className="h-4 w-4" />
                Open dataset
              </a>
            )}

            {dashboardLink && (
              <a
                href={dashboardLink}
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

        {!isUser && message.meta?.error && onRetry && (
          <div className="mt-4">
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#F7F2F0] px-4 py-2 text-sm text-[#0E2468] ring-1 ring-[#CDB7B7] transition hover:bg-[#efe7e3]"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NubrakesAICopilotFrontend() {
  const [messages, setMessages] = useState(() => {
    if (typeof window === "undefined") {
      return [
        createMessage(
          "assistant",
          "Hi — I’m your NuBrakes AI Copilot. Ask about metrics, markets, stores, dashboards, technicians, channel performance, or which dataset to use."
        ),
      ];
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [
          createMessage(
            "assistant",
            "Hi — I’m your NuBrakes AI Copilot. Ask about metrics, markets, stores, dashboards, technicians, channel performance, or which dataset to use."
          ),
        ];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : [
            createMessage(
              "assistant",
              "Hi — I’m your NuBrakes AI Copilot. Ask about metrics, markets, stores, dashboards, technicians, channel performance, or which dataset to use."
            ),
          ];
    } catch {
      return [
        createMessage(
          "assistant",
          "Hi — I’m your NuBrakes AI Copilot. Ask about metrics, markets, stores, dashboards, technicians, channel performance, or which dataset to use."
        ),
      ];
    }
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState([]);
  const [lastQuestion, setLastQuestion] = useState("");
  const [datasetLoadError, setDatasetLoadError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const askAbortRef = useRef(null);

  const datasetCount = useMemo(() => String(datasets.length), [datasets]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore storage errors
    }
  }, [messages]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDatasets() {
      try {
        setDatasetLoadError(null);

        const r = await fetch(DATASET_LIST_URL, { signal: controller.signal });
        if (!r.ok) {
          throw new Error(`Failed to load dataset list: ${r.status}`);
        }

        const d = await r.json();

        const parsed = Array.isArray(d)
          ? d
          : d && Array.isArray(d.datasets)
          ? d.datasets
          : [];

        setDatasets(parsed);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("dataset_list.json load failed", err);
        setDatasets([]);
        setDatasetLoadError("Could not load dataset list.");
      }
    }

    loadDatasets();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      askAbortRef.current?.abort();
    };
  }, []);

  async function handleAsk(questionText) {
    const question = (questionText ?? input).trim();
    if (!question || loading) return;

    askAbortRef.current?.abort();
    const controller = new AbortController();
    askAbortRef.current = controller;

    const userMessage = createMessage("user", question, null);

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setLastQuestion(question);

    try {
      const res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage = createMessage(
        "assistant",
        data.answer || "No answer returned.",
        {
          dataset: data.dataset || data.dataset_used || "Approved dataset",
          rows: data.rows || data.supporting_rows || [],
          dataset_link: data.dataset_link || data.link || null,
          dashboard_link: data.dashboard_link || data.url || null,
        }
      );

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      if (error.name === "AbortError") return;

      console.error("AI request failed", error);

      const failedMessage = createMessage(
        "assistant",
        "I couldn’t get a response right now. Please try again. If this keeps happening, check whether the Worker and /api/ai endpoint are live and returning valid JSON.",
        {
          dataset: "Connection error",
          rows: [],
          dataset_link: null,
          dashboard_link: null,
          error: true,
        }
      );

      setMessages((prev) => [...prev, failedMessage]);
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    if (!lastQuestion || loading) return;
    handleAsk(lastQuestion);
  }

  function clearChat() {
    const starter = createMessage(
      "assistant",
      "Hi — I’m your NuBrakes AI Copilot. Ask about metrics, markets, stores, dashboards, technicians, channel performance, or which dataset to use."
    );
    setMessages([starter]);
    setLastQuestion("");
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([starter]));
    } catch {
      // ignore storage errors
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F2F0] text-[#0E2468]">
      <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#CDB7B7]">
            <div>
              <div className="mb-3 inline-flex items-center gap-3 rounded-full bg-white/20 px-3 py-1">
                <img
                  src="/nubrakes-ai-copilot.svg"
                  alt="NuBrakes AI Copilot logo"
                  className="h-16 w-20 object-contain"
                />
                <span className="text-sm font-semibold text-[#0E2468]">
                  NuBrakes AI Copilot
                </span>
              </div>

              <h1 className="text-2xl font-semibold text-[#0E2468]">
                Self-serve analytics chat
              </h1>

              <p className="mt-3 text-sm leading-6 text-[#817E7F]">
                A chat interface for querying approved NuBrakes datasets and
                returning structured business answers.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <StatCard icon={Database} label="Datasets" value={datasetCount} />
            <StatCard icon={BarChart3} label="Mode" value="Live AI Chat" />
            <StatCard icon={Bot} label="Backend" value="/api/ai" />
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#CDB7B7]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[#0E2468]">
                Available datasets
              </div>
              <button
                onClick={clearChat}
                className="rounded-full bg-[#F7F2F0] px-3 py-1 text-[11px] font-medium text-[#0E2468] ring-1 ring-[#CDB7B7] transition hover:bg-[#efe7e3]"
              >
                Clear chat
              </button>
            </div>

            <div className="space-y-2">
              {datasetLoadError ? (
                <div className="rounded-2xl border border-dashed border-[#CDB7B7] bg-[#F7F2F0] px-3 py-2 text-sm text-[#817E7F]">
                  {datasetLoadError}
                </div>
              ) : datasets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#CDB7B7] bg-[#F7F2F0] px-3 py-2 text-sm text-[#817E7F]">
                  No datasets loaded.
                </div>
              ) : (
                datasets.map((item, idx) => {
                  const title =
                    item.dataset || item.sheet_name || "Unnamed dataset";
                  const hasLink = isValidHttpUrl(item.link);

                  if (hasLink) {
                    return (
                      <a
                        key={`${title}-${idx}`}
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-2xl bg-[#CDB7B7]/25 px-3 py-2 text-xs text-[#0E2468] ring-1 ring-[#CDB7B7] transition hover:bg-[#CDB7B7]/40"
                        title={item.description || title}
                      >
                        <span className="min-w-0 flex-1 break-all pr-3">
                          {title}
                        </span>
                        <LinkIcon className="h-4 w-4 shrink-0" />
                      </a>
                    );
                  }

                  return (
                    <div
                      key={`${title}-${idx}`}
                      className="flex items-center justify-between rounded-2xl bg-[#CDB7B7]/15 px-3 py-2 text-xs text-[#0E2468]/70 ring-1 ring-[#CDB7B7]"
                      title={item.description || title}
                    >
                      <span className="min-w-0 flex-1 break-all pr-3">
                        {title}
                      </span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide opacity-70">
                        No link
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <main className="flex h-[85vh] flex-col rounded-3xl bg-white shadow-sm ring-1 ring-[#CDB7B7]">
          <div className="border-b border-[#CDB7B7] p-5">
            <div className="text-lg font-semibold">Ask NuBrakes AI Copilot</div>
            <div className="mt-1 text-sm text-[#817E7F]">
              Ask naturally about KPI definitions, dashboards, business drivers,
              markets, or which dataset to use.
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
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onRetry={message.meta?.error ? handleRetry : undefined}
              />
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
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk(input);
                  }
                }}
                placeholder="Ask about metrics, markets, channels, dashboards, or datasets..."
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

            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[#817E7F]">
              <span>Press Enter to send. Use Shift+Enter for a new line.</span>
              {lastQuestion ? (
                <button
                  onClick={handleRetry}
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[#0E2468] ring-1 ring-[#CDB7B7] transition hover:bg-[#F7F2F0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry last question
                </button>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
