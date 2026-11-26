import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { PageShell, TranslationNotice } from "@/components/page-shell";
import { SectionBlocks } from "@/components/section-blocks";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getPage, isTranslated } from "@/lib/content";
import { FACILITIES, FACILITY_GUIDES as GUIDES, isFacilitySlug as isSlug, sectionsFor } from "@/lib/facility";

export function generateStaticParams() {
  return Object.keys(FACILITIES).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/[lang]/facility/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  if (!isSlug(slug)) return {};
  const dict = await getDictionary();
  return { title: dict.nav[FACILITIES[slug].key] };
}

export default function FacilityPage(props: PageProps<"/[lang]/facility/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FacilityContent params={props.params} />
    </Suspense>
  );
}

async function FacilityContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();
  const guideSlug = GUIDES[slug];
  const [dict, locale, page, guide] = await Promise.all([
    getDictionary(),
    getLocale(),
    getPage("facility"),
    guideSlug ? getPage(guideSlug) : Promise.resolve(null),
  ]);
  if (!page) notFound();
  const sections = sectionsFor(slug, page.sections);

  return (
    <PageShell current={FACILITIES[slug].key}>
      <TranslationNotice show={!sections.every((s) => isTranslated(s.text, locale))} text={dict.content.notTranslated} />
      <SectionBlocks sections={sections} locale={locale} pageTitle={dict.nav[FACILITIES[slug].key]} />
      {guide && guide.sections.length > 0 && (
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="mb-8 text-2xl font-bold">{dict.content.facilityGuide}</h2>
          <SectionBlocks sections={guide.sections} locale={locale} />
        </section>
      )}
    </PageShell>
  );
}
