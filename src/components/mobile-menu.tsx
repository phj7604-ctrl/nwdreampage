"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { label: string; href: string };
type Group = Item & { children: Item[] };

export function MobileMenu({
  groups,
  apply,
  labels,
}: {
  groups: Group[];
  apply: Item;
  labels: { menu: string; close: string };
}) {
  const pathname = usePathname();
  // 메뉴를 연 페이지를 기억 → 다른 페이지로 이동하면 자동으로 닫힘
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpenedAt(open ? null : pathname)}
        aria-expanded={open}
        aria-label={open ? labels.close : labels.menu}
        className="grid size-9 place-items-center rounded-full text-foreground hover:bg-brand-soft"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <nav className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-surface px-4 pb-6 shadow-lg">
          {groups.map((g) => (
            <div key={g.href} className="border-b border-border py-4 last:border-0">
              <p className="mb-2 font-semibold text-brand">{g.label}</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                {g.children.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} className="block py-1 text-sm text-foreground hover:text-brand">
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Link
            href={apply.href}
            className="mt-4 block rounded-full bg-brand py-3 text-center font-semibold text-white dark:text-background"
          >
            {apply.label}
          </Link>
        </nav>
      )}
    </div>
  );
}
