import type { Metadata } from "next";
import { PageShell, TranslationNotice } from "@/components/page-shell";
import { ProgramCard } from "@/components/program-card";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getPrograms, isTranslated } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.nav.programs };
}

/** 체험·교육 안내: 기존 사이트처럼 진행 중인 프로그램 카드 (관리자 화면 '프로그램' 탭과 연동) */
export default async function ProgramsPage() {
  const [dict, locale, programs] = await Promise.all([getDictionary(), getLocale(), getPrograms()]);
  return (
    <PageShell current="programs">
      <TranslationNotice show={!programs.every((p) => isTranslated(p.title, locale))} text={dict.content.notTranslated} />
      {programs.length === 0 ? (
        <p className="py-16 text-center text-muted">{dict.apply.empty}</p>
      ) : (
        <ul className="grid gap-x-8 gap-y-12 md:grid-cols-2">
          {programs.map((p) => (
            <ProgramCard key={p.id} program={p} locale={locale} dict={dict} />
          ))}
        </ul>
      )}
    </PageShell>
  );
}
