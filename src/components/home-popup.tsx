"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

const KEY = "nwdream-popup-hidden";

/** 메인 팝업 (관리자 '센터 정보 > 메인 팝업'에서 설정). "오늘 하루 보지 않음" 지원 */
export function HomePopup({
  image,
  title,
  link,
  labels,
}: {
  image: string;
  title: string;
  link: string;
  labels: { hideToday: string; close: string };
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let hidden = false;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { image: string; until: number } | null;
      hidden = Boolean(saved && saved.image === image && saved.until > Date.now());
    } catch {
      // 저장소를 쓸 수 없는 환경이면 그냥 보여 준다
    }
    // 첫 화면이 그려진 뒤에 띄움 (서버 렌더링 결과와 어긋나지 않도록)
    const t = setTimeout(() => setOpen(!hidden), 0);
    return () => clearTimeout(t);
  }, [image]);

  if (!open) return null;

  function hideToday() {
    try {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      localStorage.setItem(KEY, JSON.stringify({ image, until: end.getTime() }));
    } catch {}
    setOpen(false);
  }

  const img = <img src={image} alt={title} className="block max-h-[70vh] w-full object-contain" />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-surface shadow-2xl">
        {link ? (
          <a href={link} target={link.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            {img}
          </a>
        ) : (
          img
        )}
        <div className="grid grid-cols-2 border-t border-border text-sm">
          <button type="button" onClick={hideToday} className="py-3 text-muted hover:bg-brand-soft">
            {labels.hideToday}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="border-l border-border py-3 font-semibold hover:bg-brand-soft">
            {labels.close}
          </button>
        </div>
      </div>
    </div>
  );
}
