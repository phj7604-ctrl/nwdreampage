"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, localeLabels, LOCALE_COOKIE, type Locale } from "@/i18n/config";

export function LanguageSwitcher({
  current,
  label,
}: {
  current: Locale;
  label: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function change(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const rest = pathname.replace(/^\/[^/]+/, "");
    router.push(`/${next}${rest}`);
  }

  return (
    <label className="relative flex items-center">
      <span className="sr-only">{label}</span>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-2 size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
      <select
        value={current}
        onChange={(e) => change(e.target.value as Locale)}
        className="h-9 cursor-pointer appearance-none rounded-full border border-border bg-surface pr-3 pl-7 text-sm text-foreground hover:border-brand"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeLabels[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
