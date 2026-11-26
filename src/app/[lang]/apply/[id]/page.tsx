/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/badge";
import { PageShell, TranslationNotice } from "@/components/page-shell";
import { PageSkeleton } from "@/components/page-skeleton";
import { Curriculum, ProgramInfo } from "@/components/program-info";
import { RichContent } from "@/components/rich-content";
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

async function ApplyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dict, locale, program, settings] = await Promise.all([getDictionary(), getLocale(), getProgram(id), getSettings()]);
  if (!program) notFound();
  const t = dict.apply;
  const open = program.status === "open";
  const description = tr(program.description, locale);

  // 신청서 항목을 현재 언어로 바꿔서 전달 (저장은 항목 key 기준)
  const fields: PublicField[] = (program.form ?? []).map((f) => ({
    key: f.key,
    type: f.type,
    required: f.required,
    label: tr(f.label, locale),
    consentText: tr(f.consentText, locale),
    options: (f.options ?? []).map((o) => ({ value: tr(o, "ko"), label: tr(o, locale) })),
  }));

  return (
    <PageShell current="apply" title={tr(program.title, locale)}>
      <div className="-mt-4 mb-8 flex flex-wrap items-center gap-3 border-b border-border pb-4">
        <Badge tone={open ? "accent" : "muted"}>{open ? t.open : t.closed}</Badge>
        <Link href={`/${locale}/apply`} className="text-sm text-muted hover:text-brand">
          ← {t.backToList}
        </Link>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-6">
          <TranslationNotice show={!isTranslated(program.title, locale)} text={dict.content.notTranslated} />
          <ProgramInfo program={program} locale={locale} t={t} />
          <Curriculum html={tr(program.curriculum, locale)} label={t.curriculum} open />
          {description &&
            (/<[a-z][\s\S]*>/i.test(description) ? (
              <RichContent html={description} />
            ) : (
              <p className="leading-relaxed whitespace-pre-line">{description}</p>
            ))}
          {program.images.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {program.images.map((img) => (
                <img key={img.src} src={img.src} alt="" loading="lazy" className="w-full rounded-xl border border-border" />
              ))}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-4 text-lg font-bold">{t.formTitle}</h2>
            {open ? (
              <ApplyForm
                programId={program.id}
                programTitle={tr(program.title, "ko")}
                fields={fields}
                locale={locale}
                phone={settings?.phone || centerInfo.phone}
                t={t}
              />
            ) : (
              <p className="rounded-lg bg-brand-soft p-4 text-sm text-muted">{t.closedNotice}</p>
            )}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
