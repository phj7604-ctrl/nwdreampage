/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { formatDate, getGallery, tr } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.nav.gallery };
}

export default async function GalleryListPage() {
  const [dict, locale, items] = await Promise.all([getDictionary(), getLocale(), getGallery()]);

  return (
    <PageShell current="gallery">
      {items.length === 0 ? (
        <p className="py-16 text-center text-muted">{dict.content.empty}</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((g) => (
            <li key={g.id}>
              <Link href={`/${locale}/gallery/${g.id}`} className="group block overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="aspect-[4/3] overflow-hidden bg-brand-soft">
                  {g.images[0] && (
                    <img
                      src={g.images[0].src}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 font-semibold group-hover:text-brand">{tr(g.title, locale)}</p>
                  <p className="mt-2 text-sm text-muted">
                    {formatDate(g.publishedAt, locale)} · {dict.content.photos} {g.images.length}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
