/* eslint-disable @next/next/no-img-element -- 이관된 사진은 크기 정보가 없어 일반 img 사용 */
import { pickSections, sectionParts, type PageSection } from "@/lib/content";
import type { Locale } from "@/i18n/config";

/**
 * 이관된 페이지 섹션(글 + 표 + 사진)을 사이트 디자인으로 보여 준다.
 * - "| 제목" 으로 시작하는 줄은 소제목 (pageTitle 과 같으면 생략 — 페이지 제목과 중복)
 * - 빈 줄로 나뉜 덩어리는 문단
 * - 원본에 있던 표(운영시간·요금·사업 개요 등)는 표로 유지
 */
export function SectionBlocks({ sections, locale, pageTitle }: { sections: PageSection[]; locale: Locale; pageTitle?: string }) {
  const list = pickSections(sections);
  return (
    <div className="space-y-14">
      {list.map((s, i) => (
        <SectionBlock key={i} section={s} locale={locale} pageTitle={pageTitle} />
      ))}
    </div>
  );
}

const norm = (s = "") => s.replace(/[\s·/|]+/g, "");

function SectionBlock({ section, locale, pageTitle }: { section: PageSection; locale: Locale; pageTitle?: string }) {
  const { text, tables, images } = sectionParts(section, locale);
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (!blocks.length && !tables.length && !images.length) return null;

  return (
    <section className="space-y-6">
      {blocks.length > 0 && (
        <div className="space-y-4">
          {blocks.map((b, i) => {
            const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
            if (lines[0]?.startsWith("|")) {
              const heading = lines[0].replace(/^\|\s*/, "");
              const dup = pageTitle && norm(heading) === norm(pageTitle);
              return (
                <div key={i}>
                  {!dup && <h2 className="mb-2 border-l-4 border-brand pl-3 text-xl font-bold">{heading}</h2>}
                  {lines.length > 1 && <Lines lines={lines.slice(1)} lead={Boolean(dup)} />}
                </div>
              );
            }
            return <Lines key={i} lines={lines} />;
          })}
        </div>
      )}

      {tables.map((t, i) => (
        <div key={i} className="rich-content info-table" dangerouslySetInnerHTML={{ __html: t }} />
      ))}

      {images.length > 0 && (
        <div className={`grid gap-3 ${images.length === 1 ? "" : "grid-cols-2 md:grid-cols-3"}`}>
          {images.map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              className={`w-full rounded-xl border border-border object-cover ${images.length === 1 ? "max-h-[32rem]" : "aspect-[4/3]"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Lines({ lines, lead = false }: { lines: string[]; lead?: boolean }) {
  return (
    <p className={`leading-relaxed whitespace-pre-line ${lead ? "text-lg text-muted" : "text-foreground/90"}`}>
      {lines.join("\n")}
    </p>
  );
}
