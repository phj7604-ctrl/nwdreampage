import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { notFound } from "next/navigation";
import { PageShell, TranslationNotice } from "@/components/page-shell";
import { RichContent } from "@/components/rich-content";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { formatDate, getNotice, getNotices, isTranslated, stripCategory, tr } from "@/lib/content";
import { Badge } from "@/components/badge";

export async function generateStaticParams() {
  const notices = await getNotices();
  return notices.length ? notices.map((n) => ({ id: n.id })) : [{ id: "_" }];
}

export async function generateMetadata(props: PageProps<"/[lang]/notice/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const [notice, locale] = await Promise.all([getNotice(id), getLocale()]);
  return notice ? { title: stripCategory(tr(notice.title, locale)) } : {};
}

export default function NoticeDetailPage(props: PageProps<"/[lang]/notice/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NoticeDetail params={props.params} />
    </Suspense>
  );
}

async function NoticeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dict, locale, notice, all] = await Promise.all([getDictionary(), getLocale(), getNotice(id), getNotices()]);
  if (!notice) notFound();

  const t = dict.content;
  const idx = all.findIndex((n) => n.id === notice.id);
  const newer = idx > 0 ? all[idx - 1] : null;
  const older = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <PageShell current="notice" title={stripCategory(tr(notice.title, locale))}>
      <div className="-mt-4 mb-8 flex flex-wrap items-center gap-3 border-b border-border pb-4 text-sm text-muted">
        {notice.category && <Badge tone="brand">{notice.category}</Badge>}
        {notice.status === "closed" && <Badge tone="muted">{t.closed}</Badge>}
        <time dateTime={notice.publishedAt}>{formatDate(notice.publishedAt, locale)}</time>
        <span>
          {t.views} {notice.views.toLocaleString(locale)}
        </span>
      </div>

      <TranslationNotice show={!isTranslated(notice.body, locale)} text={t.notTranslated} />
      <RichContent html={tr(notice.body, locale)} />

      <nav className="mt-12 divide-y divide-border border-y border-border text-sm">
        {[
          { label: t.prev, item: older },
          { label: t.next, item: newer },
        ].map(({ label, item }) =>
          item ? (
            <Link key={label} href={`/${locale}/notice/${item.id}`} className="flex gap-4 px-2 py-3 hover:bg-brand-soft">
              <span className="w-16 shrink-0 text-muted">{label}</span>
              <span className="truncate">{stripCategory(tr(item.title, locale))}</span>
            </Link>
          ) : null,
        )}
      </nav>
      <div className="mt-8 text-center">
        <Link href={`/${locale}/notice`} className="inline-block rounded-full border border-border px-6 py-2.5 hover:border-brand hover:text-brand">
          {t.backToList}
        </Link>
      </div>
    </PageShell>
  );
}
