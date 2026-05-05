import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Database,
  Edit2,
  ExternalLink,
  Flag,
  History,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DemoNotice from "@/components/ui/DemoNotice";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { KNOWLEDGE_TOPICS } from "@/lib/mock";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

type Role = "user" | "assistant";
type ContextScope = "all" | "property" | "period" | "custom";

type ActionCard = {
  type: "create-action" | "schedule-report" | "flag-review";
  label: string;
  detail: string;
};

type Source = { title: string; version: string; date: string };

type Message = {
  id: string;
  role: Role;
  text: string;
  ts: string;
  confidence?: number;
  sources?: Source[];
  refusal?: boolean;
  suggestions?: { label: string; requiresApproval: boolean }[];
  actionCards?: ActionCard[];
  feedback?: "up" | "down";
  context?: { role: string; pillar?: string; property?: string };
};

type Thread = {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
};

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const SUGGESTED_PROMPTS = [
  "Summarise my biggest emission sources this period",
  "Draft Scope 3 narrative for GRI 305-3",
  "Which properties are off-track for net-zero?",
  "Explain the CDD/HDD occupancy adjustment",
  "What evidence do I need for ISO 14001 renewal?",
  "Identify top 5 actions by CO₂e saving potential",
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "m1",
    role: "user",
    ts: "09:41",
    text: "Why did our Energy Intensity rise last month even though occupancy was the same?",
    context: { role: "Sustainability Manager", pillar: "energy", property: "Greenview Resort" },
  },
  {
    id: "m2",
    role: "assistant",
    ts: "09:41",
    text:
      "Three contributors stand out for April 2026. The F&B refurbishment commissioning kept chillers running 24/7 (logged operational event, +1.2% impact on raw intensity). Cooling Degree Days were 11% above the property's 5-year baseline (+0.6%). And one diesel fill-up was double-counted in QuickBooks — flagged for resolution. GP-E adjusts for the first two and excludes the duplicate, giving a corrected GP improvement of +1.4% vs prior year.",
    confidence: 86,
    sources: [
      { title: "How GP normalises occupancy",             version: "v2.3", date: "2026-03-04" },
      { title: "Reading your CDD/HDD adjustment",         version: "v1.9", date: "2026-02-12" },
      { title: "Double-counting flags — duplicate invoices", version: "v1.4", date: "2026-01-20" },
    ],
    suggestions: [
      { label: "Open the duplicate-invoice record in Review queue", requiresApproval: false },
      { label: "Draft a checker comment summarising this",          requiresApproval: true },
    ],
    actionCards: [
      { type: "create-action",   label: "Create action",   detail: "Review BMS schedules for chillers — Greenview Resort" },
      { type: "flag-review",     label: "Flag for review", detail: "Mark diesel double-count for checker resolution" },
    ],
  },
];

const THREADS: Thread[] = [
  { id: "t-1", title: "Energy intensity anomaly — Apr 2026", updatedAt: "Today 09:41", messages: INITIAL_MESSAGES },
  { id: "t-2", title: "GHG Protocol Cat 1 vs Cat 4 split",   updatedAt: "Today 10:50", messages: [] },
  { id: "t-3", title: "CSRD applicability 2024",             updatedAt: "Yesterday",   messages: [] },
  { id: "t-4", title: "How to close a queried record",       updatedAt: "Yesterday",   messages: [] },
];

const RECENT_LOG = [
  { at: "2026-05-02 11:14", role: "Sustainability Manager", q: "Explain why GP-E rose this month",                resp: "answered", conf: 86 },
  { at: "2026-05-02 10:50", role: "Sustainability Manager", q: "What is the GHG Protocol Cat 1 vs Cat 4 split?",  resp: "answered", conf: 92 },
  { at: "2026-05-02 09:40", role: "Property SM",            q: "Should we report 2024 in CSRD?",                  resp: "refused",  conf: 0  },
  { at: "2026-05-01 16:30", role: "Property SM",            q: "How do I close out a queried record?",            resp: "answered", conf: 88 },
];

const SCOPE_LABELS: Record<ContextScope, string> = {
  all:      "All data",
  property: "This property",
  period:   "This period",
  custom:   "Custom range",
};

/* ------------------------------------------------------------------ */
/* Main page                                                            */
/* ------------------------------------------------------------------ */

export default function AIAssistant() {
  const [threads, setThreads]       = useState<Thread[]>(THREADS);
  const [activeId, setActiveId]     = useState("t-1");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal]   = useState("");
  const [scope, setScope]           = useState<ContextScope>("property");
  const [draft, setDraft]           = useState("");
  const [auditOpen, setAuditOpen]   = useState(false);
  const [tokenPct]                  = useState(34);

  const active = threads.find((t) => t.id === activeId)!;

  function newThread() {
    const t: Thread = {
      id:        "t-" + Date.now(),
      title:     "New conversation",
      updatedAt: "Just now",
      messages:  [],
    };
    setThreads((ts) => [t, ...ts]);
    setActiveId(t.id);
  }

  function deleteThread(id: string) {
    setThreads((ts) => ts.filter((t) => t.id !== id));
    if (activeId === id) setActiveId(threads[0]?.id ?? "");
  }

  function startRename(t: Thread) {
    setRenamingId(t.id);
    setRenameVal(t.title);
  }

  function commitRename() {
    setThreads((ts) => ts.map((t) => t.id === renamingId ? { ...t, title: renameVal || t.title } : t));
    setRenamingId(null);
  }

  function setMessages(id: string, msgs: Message[]) {
    setThreads((ts) => ts.map((t) => t.id === id ? { ...t, messages: msgs, updatedAt: "Just now" } : t));
  }

  function send() {
    if (!draft.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: Message = {
      id:      "u-" + Date.now(),
      role:    "user",
      ts:      now,
      text:    draft.trim(),
      context: { role: "Sustainability Manager", property: "Greenview Resort" },
    };
    const refuse = /stock|invest|price/i.test(draft);
    const aiMsg: Message = refuse
      ? { id: "a-" + Date.now(), role: "assistant", ts: now, refusal: true, confidence: 0,
          text: "I can't answer that — it is outside the hotel sustainability knowledge base. The assistant only answers questions it is trained on. Please consult a human expert or financial system." }
      : { id: "a-" + Date.now(), role: "assistant", ts: now, confidence: 78,
          text: "Based on the knowledge base, here's a draft response. This is assistive guidance only — please review before applying it to your data.",
          sources: [
            { title: KNOWLEDGE_TOPICS[0].topic, version: "v2.1", date: "2026-02-14" },
            { title: "Setting an SBTi-aligned target", version: "v1.8", date: "2026-01-22" },
          ],
          suggestions: [{ label: "Save this to a checker comment draft", requiresApproval: true }],
          actionCards: [{ type: "schedule-report", label: "Schedule report", detail: "Add to next ESG disclosure cycle" }],
        };
    setMessages(activeId, [...active.messages, userMsg, aiMsg]);
    setDraft("");
  }

  function vote(msgId: string, v: "up" | "down") {
    setMessages(activeId, active.messages.map((m) => m.id === msgId ? { ...m, feedback: v } : m));
  }

  function useSuggested(prompt: string) {
    setDraft(prompt);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="AI-assisted sustainability guidance"
        title="AI Assistant"
        subtitle="Conversational guidance grounded in a curated knowledge base. AI is assistive, never authoritative — every answer cites sources and never commits data without explicit human approval."
        actions={
          <button onClick={() => setAuditOpen(true)} className="btn-secondary">
            <History size={14} /> AI audit log
          </button>
        }
      />
      <DemoNotice message="Responses shown are illustrative examples. In a live environment, answers are grounded in your verified sustainability records." />

      <div className="grid grid-cols-12 gap-4 items-start">
        {/* ---- History sidebar ---- */}
        <div className="col-span-12 lg:col-span-3">
          <Card className="h-[640px] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare size={11} /> Threads
              </span>
              <button onClick={newThread} className="btn-ghost h-7 w-7 p-0 text-brand-700" title="New conversation">
                <Plus size={14} />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {threads.map((t) => (
                <li key={t.id}>
                  {renamingId === t.id ? (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <input
                        autoFocus
                        className="input text-[12px] h-7 flex-1"
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => e.key === "Enter" && commitRename()}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveId(t.id)}
                      className={cn(
                        "w-full text-left rounded-lg px-3 py-2 group flex items-start justify-between gap-1",
                        t.id === activeId ? "bg-brand-50 text-brand-900" : "hover:bg-ink-50 text-ink-700"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium truncate leading-tight">{t.title}</div>
                        <div className="text-[10px] text-ink-400 mt-0.5 flex items-center gap-1">
                          <Clock size={9} /> {t.updatedAt}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5">
                        <button onClick={(e) => { e.stopPropagation(); startRename(t); }}
                          className="w-5 h-5 grid place-items-center rounded hover:bg-ink-200 text-ink-500">
                          <Edit2 size={9} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                          className="w-5 h-5 grid place-items-center rounded hover:bg-bad/10 text-ink-500 hover:text-bad">
                          <Trash2 size={9} />
                        </button>
                      </div>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ---- Conversation ---- */}
        <div className="col-span-12 lg:col-span-6">
          <ChatPane
            thread={active}
            scope={scope}
            setScope={setScope}
            draft={draft}
            setDraft={setDraft}
            onSend={send}
            onVote={vote}
            onSuggested={useSuggested}
            tokenPct={tokenPct}
          />
        </div>

        {/* ---- Knowledge base ---- */}
        <div className="col-span-12 lg:col-span-3">
          <Card className="h-[640px] flex flex-col">
            <CardHeader title="Knowledge base" hint="Curated · versioned · audit-logged" />
            <ul className="flex-1 overflow-y-auto p-4 space-y-2 text-sm">
              {KNOWLEDGE_TOPICS.map((k) => (
                <li key={k.topic} className="rounded-lg border border-ink-200 p-3 hover:bg-ink-50/60 cursor-pointer">
                  <div className="font-medium text-ink-900 text-[12px]">
                    <BookOpen size={11} className="inline text-brand-700 mr-1.5" />
                    {k.topic}
                  </div>
                  <div className="text-[10px] text-ink-500 flex items-center justify-between mt-1">
                    <span>{k.category}</span>
                    <span>v2.1 · 2026-02-14</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="rounded-xl bg-warn/10 border border-warn/25 p-3 flex items-start gap-2.5">
        <Bot size={16} className="text-warn mt-0.5 shrink-0" />
        <div className="text-[13px] text-warn">
          <strong>Refusal state.</strong> If your question isn't covered by the curated knowledge base, the assistant will refuse to answer and offer to escalate to a human expert  to see how that looks. Try asking <em>"What's our stock price?"</em> to see how that looks.
        </div>
      </div>

      {/* Audit drawer */}
      {auditOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setAuditOpen(false)}>
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" />
          <div onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white border-l border-ink-200 shadow-2xl overflow-y-auto">
            <div className="p-5 border-b border-ink-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-ink-900">AI audit log</div>
                <div className="text-[11px] text-ink-500 mt-0.5">Every Q&A logged with role, pillar, sources, confidence.</div>
              </div>
              <button onClick={() => setAuditOpen(false)} className="w-8 h-8 grid place-items-center rounded-md hover:bg-ink-100">
                <X size={14} />
              </button>
            </div>
            <ul className="p-4 space-y-2">
              {RECENT_LOG.map((l, i) => (
                <li key={i} className="rounded-xl border border-ink-200 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-ink-500">{l.at}</span>
                    {l.resp === "answered"
                      ? <Badge tone="good">{l.conf}% confidence</Badge>
                      : <Badge tone="warn">Refused</Badge>}
                  </div>
                  <div className="text-[12px] text-ink-700 mt-1">{l.role}</div>
                  <div className="text-ink-900 mt-0.5">{l.q}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chat pane                                                            */
/* ------------------------------------------------------------------ */

function ChatPane({
  thread,
  scope,
  setScope,
  draft,
  setDraft,
  onSend,
  onVote,
  onSuggested,
  tokenPct,
}: {
  thread: Thread;
  scope: ContextScope;
  setScope: (s: ContextScope) => void;
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  onVote: (id: string, v: "up" | "down") => void;
  onSuggested: (p: string) => void;
  tokenPct: number;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.messages]);

  const isEmpty = thread.messages.length === 0;

  return (
    <Card className="h-[640px] flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-ink-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge tone="brand">BETA</Badge>
          <Badge tone="info"><UserCheck size={11} /> Sustainability Manager</Badge>
        </div>
        {/* Context scope picker */}
        <div className="relative">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as ContextScope)}
            className="h-8 pl-3 pr-7 rounded-lg border border-ink-200 bg-white text-[12px] font-medium text-ink-700 appearance-none cursor-pointer"
          >
            {(Object.keys(SCOPE_LABELS) as ContextScope[]).map((s) => (
              <option key={s} value={s}>{SCOPE_LABELS[s]}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
        </div>
      </div>

      {/* Messages / Empty state */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center text-brand-700">
              <Sparkles size={22} />
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-ink-900">How can I help?</div>
              <div className="text-[12px] text-ink-500 mt-1">Choose a prompt or type your own question below.</div>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => onSuggested(p)}
                  className="text-left text-[12px] rounded-xl border border-ink-200 bg-ink-50/60 hover:bg-brand-50 hover:border-brand-200 px-3 py-2.5 leading-snug transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          thread.messages.map((m) =>
            m.role === "user" ? (
              <UserBubble key={m.id} text={m.text} ts={m.ts} />
            ) : (
              <BotBubble key={m.id} msg={m} onVote={(v) => onVote(m.id, v)} />
            )
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-ink-200 px-4 pt-3 pb-3">
        <div className="flex items-end gap-2">
          <textarea
            className="input min-h-[44px] py-2.5 resize-none flex-1 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about your data, frameworks, or recommendations…"
            rows={2}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSend(); }}
          />
          <button onClick={onSend} className="btn-primary shrink-0">
            <Send size={14} /> Send
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-400 flex-wrap">
          <span className="inline-flex items-center gap-1"><ShieldCheck size={10} /> Assistive only</span>
          <span className="inline-flex items-center gap-1"><Database size={10} /> Knowledge base grounded</span>
          <span className="inline-flex items-center gap-1"><UserCheck size={10} /> Human approval required</span>
        </div>

        {/* Token usage */}
        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-[10px] text-ink-400 flex items-center gap-1 shrink-0">
            <Zap size={9} /> Tokens {tokenPct}% of monthly limit
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                tokenPct < 60 ? "bg-good" : tokenPct < 85 ? "bg-warn" : "bg-bad"
              )}
              style={{ width: `${tokenPct}%` }}
            />
          </div>
          <span className="text-[10px] text-ink-400 shrink-0">{tokenPct}/100</span>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Bubbles                                                              */
/* ------------------------------------------------------------------ */

function UserBubble({ text, ts }: { text: string; ts: string }) {
  return (
    <div className="flex justify-end gap-2 items-end">
      <span className="text-[10px] text-ink-400 mb-0.5">{ts}</span>
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-brand-700 text-white px-4 py-2.5 text-sm shadow-sm">
        {text}
      </div>
    </div>
  );
}

function BotBubble({ msg, onVote }: { msg: Message; onVote: (v: "up" | "down") => void }) {
  const [citationsOpen, setCitationsOpen] = useState(true);

  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-brand-50 grid place-items-center text-brand-700 shrink-0 mt-1">
        <Bot size={14} />
      </div>
      <div className="max-w-[90%] flex-1 min-w-0">
        {/* Timestamp */}
        <div className="text-[10px] text-ink-400 mb-1 flex items-center gap-1">
          <Clock size={9} /> {msg.ts}
          {msg.context && (
            <span className="ml-1 text-ink-300">
              · {msg.context.role}{msg.context.property && ` · ${msg.context.property}`}
            </span>
          )}
        </div>

        <div className={cn(
          "rounded-2xl rounded-tl-sm px-4 py-3 text-sm border",
          msg.refusal
            ? "bg-warn/10 border-warn/25 text-warn"
            : "bg-white border-ink-200 text-ink-800"
        )}>
          {msg.text}
        </div>

        {/* Confidence */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          {msg.refusal ? (
            <Badge tone="warn">No knowledge-base coverage</Badge>
          ) : (
            <Badge tone={msg.confidence! >= 85 ? "good" : msg.confidence! >= 70 ? "warn" : "bad"}>
              <Sparkles size={10} /> {msg.confidence}% confidence
            </Badge>
          )}
        </div>

        {/* Source citations — collapsible */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-2 rounded-xl border border-ink-200 overflow-hidden">
            <button
              onClick={() => setCitationsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-ink-600 bg-ink-50/60 hover:bg-ink-100"
            >
              <span className="flex items-center gap-1.5"><BookOpen size={11} /> {msg.sources.length} source citation{msg.sources.length !== 1 ? "s" : ""}</span>
              <ChevronDown size={11} className={cn("transition-transform", citationsOpen && "rotate-180")} />
            </button>
            {citationsOpen && (
              <div className="divide-y divide-ink-100">
                {msg.sources.map((s) => (
                  <div key={s.title} className="px-3 py-2 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-ink-800 font-medium">{s.title}</span>
                    <span className="text-ink-400 shrink-0">{s.version} · {s.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggestions */}
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="mt-2 rounded-xl border border-ink-200 bg-ink-50/40 p-3">
            <div className="text-[10px] font-semibold text-ink-500 uppercase tracking-wide mb-1.5">Suggested next steps</div>
            <ul className="space-y-1.5">
              {msg.suggestions.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="text-ink-800">{s.label}</span>
                  {s.requiresApproval
                    ? <Badge tone="warn"><UserCheck size={10} /> Approval needed</Badge>
                    : <Badge tone="info">No data change</Badge>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action cards */}
        {msg.actionCards && msg.actionCards.length > 0 && (
          <div className="mt-2 space-y-2">
            {msg.actionCards.map((ac, i) => (
              <ActionCardWidget key={i} card={ac} />
            ))}
          </div>
        )}

        {/* Feedback */}
        {!msg.refusal && (
          <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-400">
            <button
              onClick={() => onVote("up")}
              className={cn("inline-flex items-center gap-1 hover:text-brand-700", msg.feedback === "up" && "text-good font-semibold")}
            >
              <ThumbsUp size={11} /> Useful
            </button>
            <button
              onClick={() => onVote("down")}
              className={cn("inline-flex items-center gap-1 hover:text-brand-700", msg.feedback === "down" && "text-bad font-semibold")}
            >
              <ThumbsDown size={11} /> Not useful
            </button>
            <span className="text-ink-300">·</span>
            <button className="hover:text-brand-700 inline-flex items-center gap-1">
              <ExternalLink size={11} /> Escalate
            </button>
          </div>
        )}

        {msg.feedback && (
          <div className="text-[10px] text-good mt-1 inline-flex items-center gap-1">
            <CheckCircle2 size={10} /> Feedback recorded — used to improve KB curation.
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Action card widget                                                   */
/* ------------------------------------------------------------------ */

const ACTION_CARD_META: Record<ActionCard["type"], { icon: React.ReactNode; tone: string }> = {
  "create-action":   { icon: <ArrowRight size={12} />, tone: "bg-brand-50 border-brand-200 text-brand-800" },
  "schedule-report": { icon: <Calendar size={12} />,   tone: "bg-good/10 border-good/25 text-good" },
  "flag-review":     { icon: <Flag size={12} />,        tone: "bg-warn/10 border-warn/25 text-warn" },
};

function ActionCardWidget({ card }: { card: ActionCard }) {
  const [done, setDone] = useState(false);
  const meta = ACTION_CARD_META[card.type];
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-[12px]", meta.tone)}>
      <span className="flex items-center gap-1.5 font-medium">
        {meta.icon} {card.label}
        <span className="font-normal text-[11px] opacity-75">— {card.detail}</span>
      </span>
      {done ? (
        <span className="flex items-center gap-1 text-[11px] opacity-75"><CheckCircle2 size={11} /> Done</span>
      ) : (
        <button onClick={() => setDone(true)} className="shrink-0 text-[11px] font-semibold underline underline-offset-2">
          Apply
        </button>
      )}
    </div>
  );
}
