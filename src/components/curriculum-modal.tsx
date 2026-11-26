"use client";

import { useRef } from "react";

/** 기존 사이트의 '강의내용' 버튼 → 가운데 팝업으로 회차별 강의 표를 보여 준다 */
export function CurriculumModal({
  title,
  html,
  label,
  closeLabel,
  className,
  children,
}: {
  title: string;
  html: string;
  label: string;
  closeLabel: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()} aria-haspopup="dialog">
        {children}
        {label}
      </button>
      <dialog
        ref={ref}
        aria-label={`${title} ${label}`}
        className="m-auto w-[min(92vw,640px)] max-h-[85vh] overflow-hidden rounded-lg bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) ref.current?.close();
        }}
      >
        <div className="relative flex max-h-[85vh] flex-col">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label={closeLabel}
            className="absolute top-3 right-3 grid size-8 place-items-center rounded-full border border-border bg-surface text-lg leading-none text-muted hover:text-foreground"
          >
            ×
          </button>
          <h2 className="px-12 pt-7 pb-5 text-center text-lg font-bold">{title}</h2>
          <div
            className="rich-content curriculum curriculum-modal overflow-y-auto px-4 pb-6 text-sm"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </dialog>
    </>
  );
}
