"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/state/auth-context";
import { useRouter } from "next/navigation";

export default function SignupView() {
  const { signIn, user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-text-secondary">Loading...</div>;
  }

  // If already signed in, redirect to profile
  if (user) {
    router.replace("/dashboard");
    return null;
  }

  async function handleSignUp() {
    setBusy(true);
    try {
      await signIn(); // Just using the same google sign in for demo
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
             <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
        </div>

        <h1 className="serif-display text-3xl font-medium tracking-tight mb-3 text-text-primary text-center">
          Request access
        </h1>
        <p className="text-[15px] text-text-secondary leading-relaxed mb-8 text-center">
          Join the DistraAI network to deploy intelligence before disaster strikes. Authenticate to begin.
        </p>

        <button
          onClick={handleSignUp}
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
          Sign up with Google
        </button>

        <p className="mt-8 text-[13px] text-text-tertiary">
          Already a member? <Link href="/login" className="link-editorial">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
