import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";

/** 화면 오른쪽 아래에 늘 떠 있는 바로가기 (기존 사이트의 '몸키움 피트니스', '오시는길' 버튼) */
export async function QuickLinks() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const links = [
    {
      href: `/${locale}/facility/fitness`,
      label: dict.nav.fitness,
      icon: <path d="M6.5 6.5l11 11M4 9l5-5M15 20l5-5M2.5 11.5l3-3M18.5 15.5l3-3M8.5 2.5l-3 3M18.5 21.5l3-3" />,
    },
    {
      href: `/${locale}/center/location`,
      label: dict.nav.centerLocation,
      icon: (
        <>
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </>
      ),
    },
  ];
  return (
    <nav aria-label="quick links" className="fixed right-3 bottom-4 z-30 flex flex-col items-end gap-2 sm:right-5 sm:bottom-6">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="flex items-center gap-2 rounded-full bg-brand py-2.5 pr-4 pl-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-strong dark:text-background"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            {l.icon}
          </svg>
          <span className="hidden sm:inline">{l.label}</span>
        </Link>
      ))}
    </nav>
  );
}
