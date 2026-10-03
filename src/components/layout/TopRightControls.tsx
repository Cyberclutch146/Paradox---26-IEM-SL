"use client";

import Link from "next/link";
import { useAuth } from "@/state/auth-context";

export default function TopRightControls() {
  const { user } = useAuth();

  return (
    <div className="fixed top-4 right-4 md:top-6 md:right-8 z-[9999] flex items-center gap-3">
      <button
        className="relative p-2 rounded-xl bg-bg-surface/80 backdrop-blur-md border border-border-subtle shadow-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover transition-all duration-200"
        aria-label="Notifications"
      >
        <svg
          aria-hidden="true"
          className="h-[18px] w-[18px]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-risk-high ring-2 ring-bg-surface" />
      </button>

      <Link
        href="/profile"
        className="flex items-center justify-center p-0.5 rounded-full bg-bg-surface/80 backdrop-blur-md border border-border-subtle shadow-sm hover:ring-4 ring-bg-surface-hover transition-all"
        aria-label="User profile"
      >
        {user?.photoURL ? (
          <div
            className="h-9 w-9 rounded-full border border-border-subtle shrink-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${user.photoURL})` }}
            title={user.displayName ?? "User"}
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-text-on-accent">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
          </div>
        )}
      </Link>
    </div>
  );
}
