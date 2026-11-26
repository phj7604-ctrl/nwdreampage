/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { PageShell, TranslationNotice } from "@/components/page-shell";
import { Curriculum, ProgramInfo } from "@/components/program-info";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getPastProgramGroups, isTranslated, tr } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.nav.pastPrograms };
}

/** 지난 프로그램: 연도(학기)별 카드 — 관리자 화면에서 '지난 프로그램으로 이동'한 프로그램 */
export default async function PastProgramsPage() {
  const [dict, locale, groups] = await Promise.all([getDictionary(), getLocale(), getPastProgramGroups()]);
  const t = dict.apply;
  const allTranslated = groups.every((g) => g.programs.every((p) => isTranslated(p.title, locale)));

  return (
    <PageShell current="pastPrograms">
      <TranslationNotice show={!allTranslated} text={dict.content.notTranslated} />
      {groups.length === 0 && <p className="py-16 text-center text-muted">{dict.content.empty}</p>}
      <div className="space-y-14">
        {groups.map(({ group, programs }) => (
          <section key={group}>
            {group && (
              <h2 className="mb-6 rounded-xl bg-brand py-3 text-center text-xl font-bold tracking-wide text-white dark:text-background">
                {group}
              </h2>
            )}
            <ul className="grid gap-6 md:grid-cols-2">
              {programs.map((p) => (
                <li key={p.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <div className="flex flex-col sm:flex-row">
                    {p.images[0] && (
                      <div className="aspect-[4/3] shrink-0 bg-brand-soft sm:w-48">
                        <img src={p.images[0].src} alt="" loading="lazy" className="size-full object-cover" />
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
                      <h3 className="text-lg font-bold">{tr(p.title, locale)}</h3>
                      {tr(p.summary, locale) && <p className="text-sm text-muted">{tr(p.summary, locale)}</p>}
                      <ProgramInfo program={p} locale={locale} t={t} />
                    </div>
                  </div>
                  {tr(p.curriculum, locale) && (
                    <div className="border-t border-border p-4">
                      <Curriculum html={tr(p.curriculum, locale)} label={t.curriculum} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
