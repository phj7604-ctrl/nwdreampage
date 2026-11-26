import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell, TranslationNotice } from "@/components/page-shell";
import { SectionBlocks } from "@/components/section-blocks";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getPage, isTranslated } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.nav.programs };
}

export default async function ProgramsPage() {
  const [dict, locale, page] = await Promise.all([getDictionary(), getLocale(), getPage("programs-intro")]);
  if (!page) notFound();
  return (
    <PageShell current="programs">
      <TranslationNotice show={!page.sections.every((s) => isTranslated(s.text, locale))} text={dict.content.notTranslated} />
      <SectionBlocks sections={page.sections} locale={locale} />
    </PageShell>
  );
}
