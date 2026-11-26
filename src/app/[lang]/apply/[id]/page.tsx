import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageShell, TranslationNotice } from "@/components/page-shell";
import { PageSkeleton } from "@/components/page-skeleton";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getProgram, getPrograms, getSettings, isTranslated, tr } from "@/lib/content";
import { centerInfo } from "@/lib/site";
import { ApplyForm, type PublicField } from "./apply-form";

export async function generateStaticParams() {
  const programs = await getPrograms();
  return programs.length ? programs.map((p) => ({ id: p.id })) : [{ id: "_" }];
}

export async function generateMetadata(props: PageProps<"/[lang]/apply/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const [program, locale] = await Promise.all([getProgram(id), getLocale()]);
  return program ? { title: tr(program.title, locale) } : {};
}

export default function ApplyDetailPage(props: PageProps<"/[lang]/apply/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ApplyDetail params={props.params} />
    </Suspense>
  );
}

/** 프로그램 신청서 — 기존 namwondream.com/program19 처럼 가운데 한 줄 신청서 */
async function ApplyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dict, locale, program, programs, settings] = await Promise.all([
    getDictionary(),
    getLocale(),
    getProgram(id),
    getPrograms(),
    getSettings(),
  ]);
  if (!program) notFound();
  const t = dict.apply;

  // 신청서 항목을 현재 언어로 바꿔서 전달 (저장은 항목 key 기준)
  const fields: PublicField[] = (program.form ?? []).map((f) => ({
    key: f.key,
    type: f.type,
    required: f.required,
    label: tr(f.label, locale),
    consentText: tr(f.consentText, locale),
    options: (f.options ?? []).map((o) => ({ value: tr(o, "ko"), label: tr(o, locale) })),
  }));

  // 배너 탭: 신청 가능한 프로그램들 (기존 사이트와 같음). 지난 프로그램을 직접 연 경우에도 현재 탭은 보이게
  const tabList = programs.some((p) => p.id === program.id) ? programs : [...programs, program];
  const tabs = tabList.map((p) => ({ href: `/${locale}/apply/${p.id}`, label: tr(p.title, locale), active: p.id === program.id }));

  return (
    <PageShell current="apply" title={tr(program.title, locale)} bannerTitle={t.bannerTitle} tabs={tabs}>
      <div className="mx-auto max-w-3xl">
        <TranslationNotice show={!isTranslated(program.title, locale)} text={dict.content.notTranslated} />
        <ApplyForm
          programId={program.id}
          programTitle={tr(program.title, "ko")}
          fields={fields}
          locale={locale}
          phone={settings?.phone || centerInfo.phone}
          open={program.status === "open" && !program.archived}
          applyStart={program.applyStart ?? ""}
          applyEnd={program.applyEnd ?? ""}
          t={t}
        />
      </div>
    </PageShell>
  );
}
