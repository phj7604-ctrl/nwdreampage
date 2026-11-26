import Link from "next/link";
import type { ReactNode } from "react";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { applyLink, banners, menu, type MenuItem } from "@/lib/site";

/** 하위 페이지 공통 틀: 상단 사진 배너(메뉴 묶음 이름 + 같은 묶음 페이지 탭) + 경로 + 제목 */
export async function PageShell({
  current,
  title,
  bannerTitle,
  tabs,
  children,
}: {
  current: MenuItem["key"];
  /** 메뉴 이름 대신 쓸 제목(게시글 상세 등) */
  title?: string;
  /** 배너 큰 제목을 바꿀 때 (예: 신청서 화면의 "프로그램 신청") */
  bannerTitle?: string;
  /** 배너 아래 탭을 메뉴 대신 직접 지정 (예: 신청 가능한 프로그램 목록) */
  tabs?: { href: string; label: string; active: boolean }[];
  children: ReactNode;
}) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const group = menu.find((g) => g.children.some((c) => c.key === current));
  const currentHref = [...menu.flatMap((g) => g.children), applyLink].find((c) => c.key === current)?.href ?? "";
  const banner = banners[(group?.key ?? "apply") as keyof typeof banners];
  const groupTitle = bannerTitle ?? (group ? dict.nav[group.key] : dict.nav.apply);
  const navTabs =
    tabs ??
    group?.children.map((c) => ({ href: `/${locale}${c.href}`, label: dict.nav[c.key], active: c.key === current })) ??
    [];

  return (
    <>
      <section className="relative isolate overflow-hidden bg-brand-strong">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner.image} alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-60" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-14 text-center text-white sm:py-20">
          <p className="text-xs font-semibold tracking-[0.3em] text-white/80">{banner.eyebrow}</p>
          <p className="mt-2 text-3xl font-bold sm:text-4xl">{groupTitle}</p>
          {navTabs.length > 0 && (
            <nav className="mt-6 flex flex-wrap justify-center gap-2">
              {navTabs.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className={`rounded-full px-4 py-1.5 text-sm backdrop-blur ${
                    c.active ?"bg-white font-semibold text-brand" : "bg-white/15 text-white hover:bg-white/30"
                  }`}
                >
                  {c.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <nav className="mb-4 text-sm text-muted">
          <Link href={`/${locale}`} className="hover:text-brand">
            {dict.common.home}
          </Link>
          {group && <> / {dict.nav[group.key]}</>} /{" "}
          <Link href={`/${locale}${currentHref}`} className="hover:text-brand">
            {dict.nav[current]}
          </Link>
        </nav>
        <h1 className="mb-8 text-2xl font-bold sm:text-3xl">{title ?? dict.nav[current]}</h1>
        {children}
      </div>
    </>
  );
}

export function TranslationNotice({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  return (
    <p className="mb-6 rounded-lg border border-border bg-brand-soft px-4 py-3 text-sm text-muted">{text}</p>
  );
}
