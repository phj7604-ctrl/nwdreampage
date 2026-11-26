/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { sanitizeHtml, tr, type Program } from "@/lib/content";
import { CurriculumModal } from "./curriculum-modal";

const FileIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 fill-current">
    <path d="M3 1h6l4 4v10H3z" opacity=".9" />
  </svg>
);
const PointerIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 fill-current">
    <path d="M4 1l9 8.5-4 .4 2.4 4.6-1.8.9L7.3 10.8 4 13.5z" />
  </svg>
);

/** 기존 namwondream.com '체험·교육 안내' 카드: 왼쪽 사진, 오른쪽 일정·인원·장소, 아래 [강의내용][신청하기] */
export function ProgramCard({
  program: p,
  locale,
  dict,
}: {
  program: Program;
  locale: Locale;
  dict: Dictionary;
}) {
  const t = dict.apply;
  const title = tr(p.title, locale);
  const period = tr(p.period, locale).replace(/\s*\(/g, "\n(");
  const place = tr(p.place, locale);
  const curriculum = tr(p.curriculum, locale);
  const btn =
    "flex h-10 flex-1 items-center justify-center gap-1.5 text-sm text-white transition hover:brightness-110";

  return (
    <li className="flex flex-col">
      <div className="flex flex-1 flex-col sm:flex-row">
        {p.images[0] && (
          <div className="aspect-[4/3] shrink-0 overflow-hidden bg-brand-soft sm:aspect-auto sm:w-1/2">
            <img src={p.images[0].src} alt="" loading="lazy" className="size-full object-cover" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col px-1 py-4 sm:px-5 sm:py-3">
          <h2 className="border-b border-border pb-4 text-2xl font-bold text-muted">{title}</h2>
          <div className="space-y-1 pt-5 text-[15px] leading-relaxed">
            {period && <p className="whitespace-pre-line">{period}</p>}
            {p.capacity ? (
              <p>
                <strong>{t.headcount}</strong> : {p.capacity}
                {t.people}
              </p>
            ) : null}
            {place && (
              <p>
                <strong>{t.place}</strong> : {place}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex">
        {curriculum ? (
          <CurriculumModal
            title={title}
            html={sanitizeHtml(curriculum)}
            label={t.curriculum}
            closeLabel={dict.common.close}
            className={`${btn} bg-[#b5b5b5] dark:bg-[#5a5d6b]`}
          >
            <FileIcon />
          </CurriculumModal>
        ) : (
          <span className={`${btn} cursor-default bg-[#b5b5b5] opacity-60 dark:bg-[#5a5d6b]`}>
            <FileIcon />
            {t.curriculum}
          </span>
        )}
        <Link href={`/${locale}/apply/${p.id}`} className={`${btn} bg-[#828282] dark:bg-[#454857]`}>
          <PointerIcon />
          {t.applyNow}
        </Link>
      </div>
    </li>
  );
}
