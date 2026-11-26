import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { formatDate, getNotices, stripCategory, tr } from "@/lib/content";
import { NoticeBoard, type BoardItem } from "./notice-board";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.nav.notice };
}

const plain = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

export default async function NoticeListPage() {
  const [dict, locale, notices] = await Promise.all([getDictionary(), getLocale(), getNotices()]);
  const t = dict.content;

  // 번호: 오래된 글부터 1번 (상단 고정 글은 ★)
  const byDate = [...notices].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  const numberOf = new Map(byDate.map((n, i) => [n.id, i + 1]));

  const items: BoardItem[] = notices.map((n) => {
    const title = stripCategory(tr(n.title, locale)).replace(/\s*【[^】]*】\s*$/, "");
    return {
      id: n.id,
      no: numberOf.get(n.id) ?? 0,
      title,
      haystack: `${tr(n.title, locale)} ${tr(n.title, "ko")} ${plain(tr(n.body, locale))}`.toLowerCase(),
      category: n.category,
      closed: n.status === "closed",
      pinned: n.pinned,
      date: formatDate(n.publishedAt, locale),
      dateIso: n.publishedAt,
      views: n.views.toLocaleString(locale),
    };
  });

  return (
    <PageShell current="notice">
      <NoticeBoard
        items={items}
        base={`/${locale}/notice`}
        labels={{ no: t.no, search: t.search, noResults: t.noResults, empty: t.empty, closed: t.closed, pinned: t.pinned, views: t.views, page: t.page }}
      />
    </PageShell>
  );
}
