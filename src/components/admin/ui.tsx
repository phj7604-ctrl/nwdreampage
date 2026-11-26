"use client";

import type { ReactNode } from "react";
import { locales, localeLabels, type Locale } from "@/i18n/config";

export const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-brand focus:outline-none";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** 한국어/영어/중국어/일본어 입력 탭. 내용이 있는 언어는 점으로 표시 */
export function LocaleTabs({
  value,
  onChange,
  filled,
}: {
  value: Locale;
  onChange: (l: Locale) => void;
  filled: (l: Locale) => boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-brand-soft p-1">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
            value === l ? "bg-surface font-semibold shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          {localeLabels[l]}
          {filled(l) ? (
            <span className="size-1.5 rounded-full bg-brand" title="입력됨" />
          ) : (
            l !== "ko" && <span className="text-[10px] text-muted">(미번역)</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Button({
  tone = "default",
  children,
  ...props
}: { tone?: "primary" | "default" | "danger" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: "bg-brand text-white hover:bg-brand-strong dark:text-background",
    default: "border border-border hover:border-brand hover:text-brand",
    danger: "border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950",
  }[tone];
  return (
    <button
      type="button"
      {...props}
      className={`rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

/** 삭제처럼 되돌릴 수 없는 작업: 버튼을 한 번 더 눌러야 실행 */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  armed,
  setArmed,
  disabled,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  armed: boolean;
  setArmed: (v: boolean) => void;
  disabled?: boolean;
}) {
  return armed ? (
    <span className="inline-flex gap-1">
      <Button tone="danger" onClick={onConfirm} disabled={disabled}>
        {confirmLabel}
      </Button>
      <Button onClick={() => setArmed(false)}>취소</Button>
    </span>
  ) : (
    <Button tone="danger" onClick={() => setArmed(true)} disabled={disabled}>
      {label}
    </Button>
  );
}

export function Notice({ tone, children }: { tone: "ok" | "error" | "info"; children: ReactNode }) {
  const styles = {
    ok: "bg-brand-soft text-brand",
    error: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    info: "bg-surface text-muted border border-border",
  }[tone];
  return <p className={`rounded-lg px-4 py-3 text-sm ${styles}`}>{children}</p>;
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">{children}</div>;
}
