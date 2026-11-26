import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { sanitizeHtml, tr, type Program } from "@/lib/content";

/** 일정·장소·대상·정원 + 기타 안내(재료비 등) */
export function ProgramInfo({ program, locale, t }: { program: Program; locale: Locale; t: Dictionary["apply"] }) {
  const rows = [
    [t.period, tr(program.period, locale)],
    [t.place, tr(program.place, locale)],
    [t.target, tr(program.target, locale)],
    [t.capacity, program.capacity ? `${program.capacity}${t.people}` : ""],
  ].filter(([, v]) => v);
  const extra = tr(program.extraInfo, locale);
  if (rows.length === 0 && !extra) return null;
  return (
    <div className="space-y-1.5 text-sm">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {extra && <p className="whitespace-pre-line text-muted">{extra}</p>}
    </div>
  );
}

/** 강의내용(회차별 커리큘럼 표). 펼쳐 보기 */
export function Curriculum({ html, label, open = false }: { html: string; label: string; open?: boolean }) {
  if (!html) return null;
  return (
    <details open={open || undefined} className="group rounded-xl border border-border bg-background">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold select-none hover:text-brand">
        <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
        {label}
      </summary>
      <div className="rich-content curriculum border-t border-border px-4 pb-4 text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
    </details>
  );
}
