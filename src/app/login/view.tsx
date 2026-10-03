"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/state/auth-context";
import { useRouter } from "next/navigation";

export default function LoginView() {
  const { signIn, user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-text-secondary">Loading...</div>;
  }

  // If already signed in, we render nothing while useEffect redirects
  if (user) return null;

  async function handleSignIn() {
    setBusy(true);
    try {
      await signIn();
      router.push("/profile");
    } catch (e) {
      console.error(e);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg-primary relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none" style={{ backgroundImage: "url('/new_hero_bg.png')" }} />
      <div className="card-static p-8 sm:p-12 max-w-md w-full relative z-10 flex flex-col items-center animate-fade-in border-t border-t-accent/30 shadow-pop">
        <Link href="/" className="absolute top-6 left-6 text-text-tertiary hover:text-text-primary transition-colors" aria-label="Go home">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        
        <div className="h-20 w-20 rounded-full bg-accent-subtle/50 flex items-center justify-center border border-accent/10 shadow-sm relative overflow-hidden mb-8">
          <div className="absolute inset-0 bg-accent/5 animate-pulse" />
          <svg aria-hidden="true" className="h-10 w-10 text-accent relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>

        <h1 className="serif-display text-3xl font-medium tracking-tight mb-3 text-text-primary text-center">
          Welcome back
        </h1>
        <p className="text-[15px] text-text-secondary leading-relaxed mb-8 text-center">
          Sign in to access real-time risk intelligence, community field logs, and operational dashboards.
        </p>

        <button
          onClick={handleSignIn}
          disabled={busy}
          className="btn-primary w-full py-3.5 text-[15px] font-medium inline-flex items-center justify-center gap-3 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md"
        >
          {busy ? (
            <svg aria-hidden="true" className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          Sign in with Google
        </button>

        <p className="mt-8 text-[13px] text-text-tertiary">
          Don't have an account? <Link href="/signup" className="link-editorial">Request access</Link>
        </p>
      </div>
    </div>
  );
}
