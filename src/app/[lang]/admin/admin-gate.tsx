"use client";

import { Suspense, useState } from "react";
import { AdminApp } from "@/components/admin/admin-app";
import { useAuth } from "@/components/auth-provider";
import type { Dictionary } from "@/i18n/get-dictionary";

export function AdminGate({ t }: { t: Dictionary["admin"] }) {
  const { configured, loading, user, role, signIn, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const card = "rounded-2xl border border-border bg-surface p-5 sm:p-8";

  if (!configured) {
    return <div className={`${card} text-muted`}>{t.notConfigured}</div>;
  }
  if (loading) {
    return <div className={`${card} text-muted`}>{t.checking}</div>;
  }

  if (!user) {
    return (
      <div className={card}>
        <p className="mb-6 text-muted">{t.intro}</p>
        <button
          type="button"
          onClick={() => signIn().catch((e: Error) => setError(e.message))}
          className="flex items-center gap-3 rounded-full border border-border bg-background px-6 py-3 font-medium hover:border-brand"
        >
          <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
          </svg>
          {t.login}
        </button>
        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className={card}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">
            {user.displayName ?? user.email}
            {t.welcome}
          </p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-full border border-border px-4 py-2 text-sm hover:border-brand"
        >
          {t.logout}
        </button>
      </div>

      {role ? (
        <>
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold text-black">
            {role === "super" ? t.roleSuper : t.roleEditor}
          </span>
          <div className="mt-6">
            <Suspense fallback={<p className="text-muted">{t.checking}</p>}>
              <AdminApp />
            </Suspense>
          </div>
        </>
      ) : (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {t.notAdmin}
        </p>
      )}
    </div>
  );
}
