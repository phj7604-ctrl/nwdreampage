"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/badge";

export type BoardItem = {
  id: string;
  no: number;
  title: string;
  /** 검색용: 제목 + 본문 글자 */
  haystack: string;
  category: string | null;
  closed: boolean;
  pinned: boolean;
  date: string;
  dateIso: string;
  views: string;
};

type Labels = {
  no: string;
  search: string;
  noResults: string;
  empty: string;
  closed: string;
  pinned: string;
  views: string;
  page: string;
};

const PAGE_SIZE = 10;

/** 공지 목록: 번호 · 검색 · 쪽 나누기 (글 수가 많지 않아 브라우저에서 바로 거른다) */
export function NoticeBoard({ items, labels, base }: { items: BoardItem[]; labels: Labels; base: string }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return items;
    return items.filter((it) => words.every((w) => it.haystack.includes(w)));
  }, [items, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <label className="relative block sm:ml-auto sm:w-80">
        <span className="sr-only">{labels.search}</span>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder={labels.search}
          className="w-full rounded-full border border-border bg-surface py-2 pr-4 pl-9 text-sm focus:border-brand focus:outline-none"
        />
      </label>

      {items.length === 0 ? (
        <p className="py-16 text-center text-muted">{labels.empty}</p>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-muted">{labels.noResults}</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {shown.map((n) => (
            <li key={n.id}>
              <Link
                href={`${base}/${n.id}`}
                className="flex flex-col gap-2 px-2 py-4 transition hover:bg-brand-soft sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="hidden w-10 shrink-0 text-center text-sm text-muted sm:block" aria-label={labels.no}>
                  {n.pinned ? "★" : n.no}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {n.pinned && <Badge tone="accent">{labels.pinned}</Badge>}
                  {n.category && <Badge tone="brand">{n.category}</Badge>}
                  {n.closed && <Badge tone="muted">{labels.closed}</Badge>}
                </span>
                <span className="min-w-0 flex-1 font-medium">{n.title}</span>
                <span className="flex shrink-0 gap-3 text-sm text-muted">
                  <time dateTime={n.dateIso}>{n.date}</time>
                  <span>
                    {labels.views} {n.views}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex justify-center gap-1 pt-4" aria-label={labels.page}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              aria-current={p === current ? "page" : undefined}
              className={`size-9 rounded-full text-sm ${p === current ? "bg-brand font-semibold text-white dark:text-background" : "hover:bg-brand-soft"}`}
            >
              {p}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
