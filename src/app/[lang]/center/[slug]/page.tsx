import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MapEmbed } from "@/components/map-embed";
import { PageSkeleton } from "@/components/page-skeleton";
import { PageShell, TranslationNotice } from "@/components/page-shell";
import { SectionBlocks } from "@/components/section-blocks";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getPage, getSettings, isTranslated, tr } from "@/lib/content";

// URL slug → Firestore pages 문서 / 메뉴 키
const PAGES = {
  project: { doc: "center-project", key: "centerProject" },
  story: { doc: "center-story", key: "centerStory" },
  location: { doc: "center-location", key: "centerLocation" },
} as const;
type Slug = keyof typeof PAGES;
const isSlug = (s: string): s is Slug => s in PAGES;

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/[lang]/center/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  if (!isSlug(slug)) return {};
  const dict = await getDictionary();
  return { title: dict.nav[PAGES[slug].key] };
}

export default function CenterPage(props: PageProps<"/[lang]/center/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CenterContent params={props.params} />
    </Suspense>
  );
}

async function CenterContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();
  const { doc, key } = PAGES[slug];
  const [dict, locale, page, settings] = await Promise.all([getDictionary(), getLocale(), getPage(doc), getSettings()]);
  if (!page) notFound();

  return (
    <PageShell current={key}>
      <TranslationNotice show={!page.sections.every((s) => isTranslated(s.text, locale))} text={dict.content.notTranslated} />

      {slug === "location" && settings && (
        <div className="mb-10 grid gap-4 rounded-2xl border border-border bg-surface p-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt className="text-muted">{dict.content.address}</dt>
            <dd className="font-medium">{tr(settings.address, locale)}</dd>
            <dt className="text-muted">{dict.footer.phone}</dt>
            <dd>
              <a href={`tel:${settings.phone}`} className="hover:text-brand">
                {settings.phone}
              </a>
            </dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            <a href={settings.kakaoMap} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#FEE500] px-5 py-2.5 font-medium text-black">
              {dict.home.kakaoMap}
            </a>
            <a href={settings.naverMap} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#03C75A] px-5 py-2.5 font-medium text-white">
              {dict.home.naverMap}
            </a>
          </div>
        </div>
      )}
      {slug === "location" && settings && tr(settings.address, "ko") && (
        <div className="mb-10">
          <MapEmbed address={tr(settings.address, "ko")} locale={locale} title={dict.nav.centerLocation} />
        </div>
      )}

      <SectionBlocks sections={page.sections} locale={locale} pageTitle={dict.nav[key]} />
    </PageShell>
  );
}
