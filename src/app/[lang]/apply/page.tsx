/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/badge";
import { PageShell } from "@/components/page-shell";
import { ProgramInfo } from "@/components/program-info";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getPrograms, tr } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.nav.apply };
}

export default async function ApplyListPage() {
  const [dict, locale, programs] = await Promise.all([getDictionary(), getLocale(), getPrograms()]);
  const t = dict.apply;

  return (
    <PageShell current="apply">
      <p className="-mt-4 mb-8 text-muted">{t.intro}</p>
      {programs.length === 0 ? (
        <p className="py-16 text-center text-muted">{t.empty}</p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2">
          {programs.map((p) => {
            const open = p.status === "open";
            return (
              <li key={p.id} className={`flex flex-col overflow-hidden rounded-2xl border bg-surface ${open ? "border-brand" : "border-border"}`}>
                {p.images[0] && (
                  <div className="aspect-[16/9] overflow-hidden bg-brand-soft">
                    <img src={p.images[0].src} alt="" loading="lazy" className={`size-full object-cover ${open ? "" : "opacity-60 grayscale"}`} />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold">{tr(p.title, locale)}</h2>
                    <Badge tone={open ? "accent" : "muted"}>{open ? t.open : t.closed}</Badge>
                  </div>
                  {tr(p.summary, locale) && <p className="text-sm text-muted">{tr(p.summary, locale)}</p>}
                  <ProgramInfo program={p} locale={locale} t={t} />
                  <div className="mt-auto pt-2">
                    <Link
                      href={`/${locale}/apply/${p.id}`}
                      className={`inline-block rounded-full px-5 py-2.5 text-sm font-semibold ${
                        open ? "bg-brand text-white hover:bg-brand-strong dark:text-background" : "border border-border hover:border-brand"
                      }`}
                    >
                      {open ? t.applyNow : t.viewDetail}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
