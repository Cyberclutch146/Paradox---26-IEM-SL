"use client";

import Link from "next/link";
import { useAuth } from "@/state/auth-context";

export default function TopRightControls() {
  const { user } = useAuth();

  return (
    <div className="fixed top-4 right-4 md:top-6 md:right-8 z-[9999] flex items-center gap-3">
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
