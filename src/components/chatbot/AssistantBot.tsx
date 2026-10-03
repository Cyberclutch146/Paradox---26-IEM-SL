"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useRegion } from "@/state/region-context";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "bot" | "user";
  text: string;
  options?: string[];
};

export default function AssistantBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { region } = useRegion();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "bot",
      text: "Hello! I am your DistraAI Assistant powered by generative AI. I can read your current region settings to provide an instant risk briefing, or you can ask me anything about the disaster intelligence data.",
      options: ["Analyze my region", "What is the ML model?"],
    },
  ]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: text.trim() };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, text: m.text })),
          regionId: region.id,
        }),
      });

      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "bot",
          text: data.reply || "I couldn't generate a response.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "bot",
          text: "Sorry, I had trouble reaching the AI server. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend(inputValue);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[9999] h-14 w-14 rounded-full bg-accent text-text-on-accent shadow-pop hover:bg-accent-hover transition-transform hover:scale-105 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-accent-muted"
        aria-label="Open AI Assistant"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[9999] w-80 sm:w-[400px] h-[550px] max-h-[calc(100vh-120px)] bg-bg-surface border border-border-subtle rounded-2xl shadow-pop flex flex-col overflow-hidden animate-slide-up">
          <div className="bg-bg-elevated border-b border-border-subtle p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-accent/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary text-sm">DistraAI Assistant</h3>
              <p className="text-[10px] uppercase tracking-widest text-text-tertiary">Generative AI Advisor</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-primary/50">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
                    msg.role === "user"
                      ? "bg-border-strong text-text-primary rounded-br-sm"
                      : "bg-bg-surface border border-border-subtle text-text-secondary rounded-bl-sm shadow-sm"
                  )}
                >
                  {msg.text}
                </div>
                {msg.role === "bot" && msg.options && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSend(opt)}
                        className="text-xs bg-bg-surface border border-accent/40 text-accent hover:bg-accent hover:text-text-on-accent px-3 py-1.5 rounded-full transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex flex-col items-start">
                <div className="bg-bg-surface border border-border-subtle text-text-secondary rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center shadow-sm">
                  <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
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
              placeholder="Type your question..."
              className="flex-1 bg-transparent border border-border-subtle rounded-full px-4 py-2 text-sm focus:outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary disabled:opacity-50"
            />
            <button
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="h-9 w-9 rounded-full bg-accent text-text-on-accent flex items-center justify-center hover:bg-accent-hover transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
