"use client";

import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRegion } from "@/state/region-context";
import { useData } from "@/lib/use-data";
import { getRegions } from "@/lib/data-client";
import { parseChatMarkdown, type InlineSegment } from "@/lib/chat-markdown";
import type { AgentName, AgentStep, ChatReply } from "@/lib/agents/types";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "bot" | "user";
  text: string;
  steps?: AgentStep[];
  focusRegionId?: string | null;
  suggestions?: string[];
  mode?: ChatReply["mode"];
};

const WELCOME: Message = {
  id: "welcome",
  role: "bot",
  text: "Hi, I'm the DistraAI assistant. Ask me anything about landslide or flood risk in the North East. I'll ask the Orchestrator, which calls the Risk-Scoring, GIS, Community and Alert agents for the answer.",
  suggestions: [
    "What are the chances of a landslide in Mizoram?",
    "Which state is riskiest right now?",
    "Draft an alert for Tawang villagers",
  ],
};

const AGENT_SHORT: Record<AgentName, string> = {
  orchestrator: "Orchestrator",
  risk: "Risk-Scoring",
  gis: "GIS",
  community: "Community",
  alert: "Alert",
};

const HISTORY_LIMIT = 12;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function Inline({ segments }: { segments: InlineSegment[] }) {
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.bold) return <strong key={index} className="font-semibold text-text-primary">{segment.text}</strong>;
        if (segment.italic) return <em key={index} className="text-text-tertiary">{segment.text}</em>;
        return <Fragment key={index}>{segment.text}</Fragment>;
      })}
    </>
  );
}

function RichText({ text }: { text: string }) {
  const blocks = parseChatMarkdown(text);
  return (
    <div className="space-y-2">
      {blocks.map((block, index): ReactNode => {
        if (block.kind === "paragraph") {
          return <p key={index}><Inline segments={block.segments} /></p>;
        }
        const List = block.kind === "bullets" ? "ul" : "ol";
        return (
          <List
            key={index}
            className={cn("space-y-1 pl-4", block.kind === "bullets" ? "list-disc" : "list-decimal")}
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="marker:text-text-tertiary"><Inline segments={item} /></li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

/** The visible chain of agents behind one answer, expandable to the full trace. */
function AgentTrace({ steps, mode }: { steps: AgentStep[]; mode?: ChatReply["mode"] }) {
  const chain = steps
    .map((step) => step.agent)
    .filter((agent, index, all) => all.indexOf(agent) === index);

  return (
    <details className="group mt-2 w-full max-w-[85%] text-xs">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-1 text-text-tertiary hover:text-text-secondary">
        <svg className="h-3 w-3 shrink-0 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
        {chain.map((agent, index) => (
          <Fragment key={agent}>
            {index > 0 && <span aria-hidden="true">→</span>}
            <span className="eyebrow eyebrow-xs rounded-full border border-border-subtle bg-bg-wash px-2 py-0.5">
              {AGENT_SHORT[agent]}
            </span>
          </Fragment>
        ))}
        {mode && <span className="font-data ml-1 text-[10px]">{mode === "gemini" ? "Gemini" : "local planner"}</span>}
      </summary>
      <ol className="mt-2 space-y-1 border-l border-border-subtle pl-3">
        {steps.map((step, index) => (
          <li key={index} className="leading-snug">
            <span className="font-semibold text-text-secondary">{step.label}</span>
            <span className="text-text-tertiary">: {step.detail}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

export default function AssistantBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const { region, setRegion } = useRegion();
  const { data: regions } = useData(getRegions, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    const question = text.trim();
    if (!question || isLoading) return;

    const userMsg: Message = { id: newId(), role: "user", text: question };
    const conversation = [...messages, userMsg];
    setMessages(conversation);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The whole recent conversation goes up, so follow-ups like "what about there?" resolve.
          messages: conversation
            .filter((m) => m.id !== WELCOME.id)
            .slice(-HISTORY_LIMIT)
            .map((m) => ({ role: m.role, text: m.text })),
          regionId: region.id,
        }),
      });
      const data = (await response.json()) as Partial<ChatReply>;

      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "bot",
          text: data.reply || "I couldn't put an answer together. Please try rephrasing.",
          steps: data.steps ?? [],
          focusRegionId: data.focusRegionId ?? null,
          suggestions: data.suggestions ?? [],
          mode: data.mode,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "bot", text: "I couldn't reach the server. Check your connection and try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void handleSend(inputValue);
  };

  const showOnMap = (regionId: string) => {
    const target = regions?.find((r) => r.id === regionId);
    if (target) setRegion(target);
  };

  const lastBotId = [...messages].reverse().find((m) => m.role === "bot")?.id;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[9999] h-14 w-14 rounded-full bg-accent text-text-on-accent shadow-pop hover:bg-accent-hover transition-transform hover:scale-105 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-accent-muted"
        aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="DistraAI Assistant"
          className="fixed bottom-24 right-6 z-[9999] w-[calc(100vw-3rem)] sm:w-[420px] h-[600px] max-h-[calc(100vh-120px)] bg-bg-surface border border-border-subtle rounded-2xl shadow-pop flex flex-col overflow-hidden animate-slide-up"
        >
          <div className="bg-bg-elevated border-b border-border-subtle p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-accent-subtle flex items-center justify-center">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="serif-display text-base text-text-primary leading-tight">DistraAI Assistant</h3>
              <p className="eyebrow eyebrow-xs">Orchestrator · 4 agents · viewing {region.name}</p>
            </div>
            <button
              onClick={() => setMessages([WELCOME])}
              className="btn-ghost text-xs px-2 py-1"
              aria-label="Start a new conversation"
              disabled={isLoading}
            >
              New chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-primary" aria-live="polite">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-border-strong text-text-primary rounded-br-sm whitespace-pre-wrap"
                      : "bg-bg-surface border border-border-subtle text-text-secondary rounded-bl-sm shadow-card"
                  )}
                >
                  {msg.role === "bot" ? <RichText text={msg.text} /> : msg.text}
                </div>

                {msg.role === "bot" && msg.steps && msg.steps.length > 0 && (
                  <AgentTrace steps={msg.steps} mode={msg.mode} />
                )}

                {msg.role === "bot" && msg.focusRegionId && msg.focusRegionId !== region.id && (
                  <button
                    onClick={() => showOnMap(msg.focusRegionId as string)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    Show {regions?.find((r) => r.id === msg.focusRegionId)?.name ?? "this state"} on the dashboard
                  </button>
                )}

                {msg.role === "bot" && msg.id === lastBotId && !isLoading && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.suggestions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => void handleSend(opt)}
                        className="text-xs bg-bg-surface border border-accent/40 text-accent hover:bg-accent hover:text-text-on-accent px-3 py-1.5 rounded-full transition-colors text-left"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <div className="bg-bg-surface border border-border-subtle rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center shadow-card">
                  <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="eyebrow eyebrow-xs">Orchestrator is calling agents</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-bg-surface border-t border-border-subtle flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              maxLength={1500}
              placeholder="Ask about risk, villages, reports or alerts…"
              aria-label="Message the assistant"
              className="flex-1 bg-transparent border border-border-subtle rounded-full px-4 py-2 text-sm focus:outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary disabled:opacity-50"
            />
            <button
              onClick={() => void handleSend(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="h-9 w-9 rounded-full bg-accent text-text-on-accent flex items-center justify-center hover:bg-accent-hover transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
