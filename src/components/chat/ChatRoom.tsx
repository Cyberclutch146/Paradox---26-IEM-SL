"use client";

import { useRef, useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/state/auth-context";
import { useChat, type ChatMessage } from "@/lib/use-chat";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────
   Time formatting
   ──────────────────────────────────────────────────────────── */

function formatChatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ────────────────────────────────────────────────────────────
   Inline avatar — Fixed aspect ratio with background-image
   ──────────────────────────────────────────────────────────── */

function Avatar({ displayName, photoURL, size = 32 }: { displayName: string; photoURL: string | null; size?: number }) {
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (photoURL) {
    return (
      <div
        className="rounded-full border border-border-subtle shrink-0 bg-cover bg-center shadow-sm transition-all duration-300 hover:scale-110 hover:shadow-card hover:ring-2 hover:ring-accent/50 cursor-pointer"
        style={{ width: size, height: size, backgroundImage: `url(${photoURL})` }}
        title={displayName}
        aria-label={displayName}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-accent flex items-center justify-center text-[11px] font-semibold text-text-on-accent ring-1 ring-accent/20 shrink-0 shadow-sm transition-all duration-300 hover:scale-110 hover:shadow-card hover:ring-2 hover:ring-accent/50 cursor-pointer"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Single message bubble
   ──────────────────────────────────────────────────────────── */

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <div
      className={cn(
        "flex gap-3 group animate-slide-up w-full",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div className="flex flex-col justify-end pb-[20px] shrink-0">
        <Avatar displayName={message.displayName} photoURL={message.photoURL} size={30} />
      </div>

      <div className={cn("flex flex-col max-w-[80%] sm:max-w-[70%]", isOwn ? "items-end" : "items-start")}>
        {!isOwn && (
          <span className="text-[11px] font-semibold tracking-wide text-text-secondary mb-1.5 ml-1.5 flex items-center gap-1.5 transition-opacity duration-300 group-hover:text-text-primary">
            {message.displayName}
          </span>
        )}
        
        <div
          className={cn(
            "relative px-4.5 py-3 text-[15px] leading-relaxed break-words transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-card-hover cursor-default",
            isOwn
              ? "bg-accent text-text-on-accent rounded-2xl rounded-br-sm shadow-sm"
              : "bg-bg-surface border border-border-subtle text-text-primary rounded-2xl rounded-bl-sm shadow-sm"
          )}
        >
          {message.text}
        </div>
        
        <span
          className={cn(
            "font-data text-[10px] text-text-tertiary mt-1.5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300",
            isOwn ? "mr-1.5" : "ml-1.5"
          )}
        >
          {formatChatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Message composer bar
   ──────────────────────────────────────────────────────────── */

function Composer({ onSend }: { onSend: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    await onSend(text);
    setText("");
    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 relative max-w-4xl mx-auto w-full">
      <div className="flex-1 relative bg-bg-surface border border-border-subtle rounded-[24px] focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-all duration-300 shadow-sm flex items-end">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Log a field update..."
          rows={1}
          className={cn(
            "w-full resize-none bg-transparent px-5 py-3.5 text-[15px]",
            "placeholder:text-text-tertiary text-text-primary outline-none",
            "min-h-[52px] max-h-[140px]"
          )}
          style={{ overflowY: text.split("\n").length > 3 ? "auto" : "hidden" }}
        />
        <div className="p-2 shrink-0">
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Send message"
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300",
              text.trim()
                ? "bg-accent text-text-on-accent shadow-md hover:bg-accent-hover hover:scale-105 active:scale-95"
                : "bg-transparent text-text-tertiary cursor-not-allowed opacity-50"
            )}
          >
            {sending ? (
              <svg aria-hidden="true" className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ────────────────────────────────────────────────────────────
   Sign-in gate — shown when user is not authenticated
   ──────────────────────────────────────────────────────────── */

function SignInGate() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-fade-in px-6">
      <div className="h-28 w-28 rounded-full bg-accent-subtle/50 flex items-center justify-center border border-accent/10 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-accent/5 animate-pulse" />
        <svg aria-hidden="true" className="h-12 w-12 text-accent relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      </div>
      <div className="text-center max-w-lg">
        <h2 className="serif-display text-3xl font-medium tracking-tight mb-3">
          Join the field log
        </h2>
        <p className="text-[15px] text-text-secondary leading-relaxed mb-6">
          You must sign in at the landing page to collaborate with disaster responders, share real-time updates, and coordinate relief efforts securely.
        </p>
        <Link href="/login" className="btn-primary px-8 py-3.5 text-[15px] font-medium inline-flex items-center justify-center rounded-full shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
          Go to Sign In
        </Link>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Loading skeleton
   ──────────────────────────────────────────────────────────── */

function ChatSkeleton() {
  return (
    <div className="flex-1 flex flex-col gap-6 p-6">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={cn("flex gap-3 animate-pulse w-full", i % 3 === 0 ? "flex-row-reverse" : "flex-row")}>
          <div className="h-8 w-8 rounded-full bg-bg-surface-hover shrink-0 self-end" />
          <div className={cn("space-y-2 flex-1 max-w-[60%]", i % 3 === 0 ? "flex flex-col items-end" : "flex flex-col items-start")}>
            <div className="h-3 w-1/4 rounded bg-bg-surface-hover mb-1" />
            <div className="h-12 w-full rounded-2xl bg-bg-surface-hover" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Online indicator dot
   ──────────────────────────────────────────────────────────── */

function OnlineDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-low opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-risk-low" />
    </span>
  );
}

/* ────────────────────────────────────────────────────────────
   Not-configured notice — shown when the build had no Firebase
   ──────────────────────────────────────────────────────────── */

function NotConfigured() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fade-in px-6 text-center">
      <div className="h-20 w-20 rounded-full bg-bg-wash flex items-center justify-center border border-border-subtle shadow-sm">
        <svg aria-hidden="true" className="h-10 w-10 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.29 3.86l-7.32 12.7A1.5 1.5 0 004.41 18.7h15.18a1.5 1.5 0 001.44-2.14l-7.32-12.7a1.5 1.5 0 00-2.72 0z" />
        </svg>
      </div>
      <div>
        <h2 className="serif-display text-2xl font-medium tracking-tight mb-2">
          Chat is not configured
        </h2>
        <p className="text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
          This build has no Firebase credentials, so live chat is unavailable.
          Everything else on the dashboard works as usual.
        </p>
      </div>
      <div className="text-left w-full max-w-md card-static p-5 mt-2">
        <p className="eyebrow mb-3 text-text-primary">To enable it</p>
        <ol className="text-[13px] text-text-secondary space-y-2.5 list-decimal list-outside ml-4">
          <li className="pl-1">Create a Firebase project and enable Google sign-in plus Cloud Firestore.</li>
          <li className="pl-1">
            Copy <code className="font-data text-[11px] px-1.5 py-0.5 rounded bg-bg-surface-hover text-text-primary">.env.example</code> to{" "}
            <code className="font-data text-[11px] px-1.5 py-0.5 rounded bg-bg-surface-hover text-text-primary">.env.local</code> and paste your credentials.
          </li>
          <li className="pl-1">
            Deploy rules with <code className="font-data text-[11px] px-1.5 py-0.5 rounded bg-bg-surface-hover text-text-primary">firebase deploy --only firestore:rules</code>.
          </li>
          <li className="pl-1">Restart the dev server to inline the config.</li>
        </ol>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Main ChatRoom component
   ──────────────────────────────────────────────────────────── */

export default function ChatRoom() {
  const { user, loading: authLoading, configured, signIn, signOut } = useAuth();
  const { messages, loading: chatLoading, error: chatError, sendMessage } = useChat(user);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Auto-scroll when new messages arrive. */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  /* ── Firebase not configured ── */
  if (!configured) {
    return (
      <div className="card-static flex flex-col h-[calc(100vh-180px)] min-h-[600px] overflow-hidden shadow-lg border-border-subtle bg-bg-wash/30">
        <NotConfigured />
      </div>
    );
  }

  /* ── Auth loading state ── */
  if (authLoading) {
    return (
      <div className="card-static flex flex-col h-[calc(100vh-180px)] min-h-[600px] overflow-hidden shadow-lg border-border-subtle bg-bg-wash/30">
        <ChatSkeleton />
      </div>
    );
  }

  /* ── Not signed in ── */
  if (!user) {
    return (
      <div className="card-static flex flex-col h-[calc(100vh-180px)] min-h-[600px] overflow-hidden shadow-lg border-border-subtle bg-bg-wash/30">
        <SignInGate />
      </div>
    );
  }

  /* ── Signed-in chat room ── */
  return (
    <div className="card-static flex flex-col h-[calc(100vh-180px)] min-h-[600px] overflow-hidden animate-fade-in shadow-xl bg-bg-wash/40 border-border-subtle">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-bg-primary/80 backdrop-blur-xl border-b border-border-subtle sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 bg-risk-low/10 px-3 py-1.5 rounded-full border border-risk-low/20 shadow-sm">
            <OnlineDot />
            <span className="font-data text-[10px] font-bold text-risk-low uppercase tracking-widest leading-none mt-px">Live</span>
          </div>
          <div className="h-5 w-px bg-border-subtle" />
          <div className="flex items-baseline gap-2.5">
            <h2 className="serif-display text-xl font-medium text-text-primary tracking-tight">Field Log</h2>
            <span className="font-data text-[11px] text-text-tertiary">
              {messages.length} messages
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-primary hidden sm:inline text-right">
              {user.displayName}
            </span>
            <Avatar displayName={user.displayName ?? "You"} photoURL={user.photoURL} size={34} />
          </div>
          <div className="h-5 w-px bg-border-subtle hidden sm:block" />
          <button
            onClick={signOut}
            className="text-[13px] font-medium text-text-secondary hover:text-accent transition-colors"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 scroll-smooth bg-gradient-to-b from-transparent to-bg-wash/10"
      >
        {chatLoading ? (
          <ChatSkeleton />
        ) : chatError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 animate-fade-in px-6 text-center">
            <div className="h-16 w-16 rounded-full bg-risk-high/10 flex items-center justify-center border border-risk-high/20">
              <svg aria-hidden="true" className="h-8 w-8 text-risk-high" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.29 3.86l-7.32 12.7A1.5 1.5 0 004.41 18.7h15.18a1.5 1.5 0 001.44-2.14l-7.32-12.7a1.5 1.5 0 00-2.72 0z" />
              </svg>
            </div>
            <div className="max-w-md">
              <p className="text-[15px] font-medium text-text-primary mb-1">
                Could not load the conversation
              </p>
              <p className="text-sm text-text-secondary">
                The security rules may not be deployed yet, or there's a connection issue.
              </p>
            </div>
            <p className="text-[11px] text-risk-high font-data max-w-sm break-words bg-risk-high/5 p-3 rounded-lg border border-risk-high/10 mt-2">
              {chatError}
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 animate-fade-in">
            <div className="h-20 w-20 rounded-full bg-accent-subtle/50 flex items-center justify-center border border-accent/10">
              <svg aria-hidden="true" className="h-10 w-10 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[15px] font-medium text-text-primary mb-1">It's quiet here</p>
              <p className="text-sm text-text-secondary">No field updates yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isOwn={msg.uid === user.uid} />
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border-subtle px-4 sm:px-6 py-4 bg-bg-primary/90 backdrop-blur-md">
        <Composer onSend={sendMessage} />
      </div>
    </div>
  );
}
