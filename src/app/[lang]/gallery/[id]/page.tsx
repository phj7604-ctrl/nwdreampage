/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { notFound } from "next/navigation";
import { PageShell, TranslationNotice } from "@/components/page-shell";
import { RichContent } from "@/components/rich-content";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { formatDate, getGallery, getGalleryItem, isTranslated, tr } from "@/lib/content";

export async function generateStaticParams() {
  const items = await getGallery();
  return items.length ? items.map((g) => ({ id: g.id })) : [{ id: "_" }];
}

export async function generateMetadata(props: PageProps<"/[lang]/gallery/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const [item, locale] = await Promise.all([getGalleryItem(id), getLocale()]);
  return item ? { title: tr(item.title, locale) } : {};
}

export default function GalleryDetailPage(props: PageProps<"/[lang]/gallery/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GalleryDetail params={props.params} />
    </Suspense>
  );
}

async function GalleryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dict, locale, item] = await Promise.all([getDictionary(), getLocale(), getGalleryItem(id)]);
  if (!item) notFound();

  const body = tr(item.body, locale);
  // 본문에 이미 사진이 들어 있으면 본문만, 아니면 사진 목록을 보여 준다
  const bodyHasImages = /<img\s/i.test(body);

  return (
    <PageShell current="gallery" title={tr(item.title, locale)}>
      <p className="-mt-4 mb-8 border-b border-border pb-4 text-sm text-muted">
        {formatDate(item.publishedAt, locale)}
      </p>

      <TranslationNotice show={!isTranslated(item.title, locale)} text={dict.content.notTranslated} />
      {body && <RichContent html={body} />}
      {!bodyHasImages && (
        <div className="grid gap-4 sm:grid-cols-2">
          {item.images.map((img) => (
            <img key={img.src} src={img.src} alt="" loading="lazy" className="w-full rounded-xl border border-border" />
          ))}
        </div>
      )}

      <div className="mt-12 text-center">
        <Link href={`/${locale}/gallery`} className="inline-block rounded-full border border-border px-6 py-2.5 hover:border-brand hover:text-brand">
          {dict.content.backToList}
        </Link>
      </div>
    </PageShell>
  );
}
