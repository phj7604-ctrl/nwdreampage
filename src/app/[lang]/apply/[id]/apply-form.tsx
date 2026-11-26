"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { FormFieldType } from "@/lib/content";
import { getFirebase } from "@/lib/firebase/client";

export type PublicField = {
  key: string;
  type: FormFieldType;
  required: boolean;
  label: string;
  consentText: string;
  /** value: 저장값(한국어), label: 화면 표시값(현재 언어) */
  options: { value: string; label: string }[];
};

type Value = string | boolean | string[];

const input =
  "w-full border border-transparent bg-foreground/[0.04] px-3 py-2.5 text-foreground placeholder:text-muted/70 focus:border-brand focus:bg-surface focus:outline-none disabled:cursor-not-allowed";

/** 오늘 날짜(한국 시간, YYYY-MM-DD). 서버에서 미리 만든 화면에서는 "" → 모집 상태만 따름 */
const todayKst = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const noop = () => () => {};

/** 저장할 문자열로 바꾸기 (전화번호 3칸은 "-"로, 주소 2칸은 띄어쓰기로 잇기) */
function toText(f: PublicField, v: Value | undefined): string {
  if (Array.isArray(v)) {
    const parts = v.map((x) => x.trim());
    if (!parts.some(Boolean)) return "";
    return f.type === "phone" ? parts.join("-") : parts.filter(Boolean).join(" ");
  }
  return String(v ?? "").trim();
}

export function ApplyForm({
  programId,
  programTitle,
  fields,
  locale,
  phone,
  open,
  applyStart,
  applyEnd,
  t,
}: {
  programId: string;
  programTitle: string;
  fields: PublicField[];
  locale: Locale;
  phone: string;
  open: boolean;
  applyStart: string;
  applyEnd: string;
  t: Dictionary["apply"];
}) {
  const [values, setValues] = useState<Record<string, Value>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: Value) => setValues((s) => ({ ...s, [k]: v }));
  const setPart = (k: string, i: number, n: number, v: string) =>
    setValues((s) => {
      const cur = Array.isArray(s[k]) ? [...(s[k] as string[])] : Array<string>(n).fill("");
      cur[i] = v;
      return { ...s, [k]: cur };
    });
  const part = (k: string, i: number) => (Array.isArray(values[k]) ? (values[k] as string[])[i] ?? "" : "");

  const today = useSyncExternalStore(noop, todayKst, () => "");
  const notStarted = Boolean(today && applyStart && today < applyStart);
  const ended = Boolean(today && applyEnd && today > applyEnd);
  const locked = !open || notStarted || ended;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    if (form.get("website")) return; // 자동 입력 스팸 차단(사람에게는 안 보이는 칸)

    for (const f of fields) {
      const v = values[f.key];
      if (f.type === "consent" && v !== true) return setError(t.consentError);
      if (f.required && f.type !== "consent" && !toText(f, v)) return setError(`${t.requiredError} (${f.label})`);
    }

    const fb = getFirebase();
    if (!fb) return setError(t.error);
    setState("sending");
    try {
      const answers = Object.fromEntries(
        fields.map((f) => [f.key, f.type === "consent" ? values[f.key] === true : toText(f, values[f.key]).slice(0, 2000)]),
      );
      await addDoc(collection(fb.db, "applications"), {
        programId,
        programTitle,
        answers,
        consent: true,
        status: "received",
        locale,
        createdAt: serverTimestamp(),
      });
      setState("done");
    } catch {
      setState("idle");
      setError(t.error);
    }
  }

  if (state === "done") {
    return (
      <div className="space-y-2 rounded-lg bg-brand-soft p-8 text-center">
        <p className="text-lg font-bold text-brand">✓ {t.successTitle}</p>
        <p className="text-sm text-muted">
          {t.successBody}
          <a href={`tel:${phone}`} className="font-medium underline">
            {phone}
          </a>
        </p>
      </div>
    );
  }

  const star = <span className="text-red-500">*</span>;
  const label = (f: PublicField, htmlFor?: string) => (
    <label htmlFor={htmlFor} className="mb-2 flex items-center gap-1 text-sm text-muted">
      {f.label}
      {(f.required || f.type === "consent") && star}
    </label>
  );

  return (
    <form onSubmit={submit} noValidate>
      {locked && (
        <p className="mb-6 flex items-center justify-center gap-2 rounded bg-red-100 px-4 py-3 text-center text-sm text-red-800 dark:bg-red-950/60 dark:text-red-200">
          <span aria-hidden className="grid size-4 place-items-center rounded-full border border-current text-[10px] leading-none">
            !
          </span>
          {notStarted ? t.notStarted : t.closedNotice}
        </p>
      )}
      {(applyStart || applyEnd) && (
        <p className="mb-4 text-right text-sm text-muted">
          {t.responsePeriod}: {applyStart} - {applyEnd}
        </p>
      )}

      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <fieldset disabled={locked} className={`space-y-7 ${locked ? "opacity-55" : ""}`}>
        {fields.map((f) => (
          <div key={f.key}>
            {f.type === "consent" ? (
              <>
                {label(f)}
                {f.consentText && (
                  <div className="max-h-40 overflow-y-auto border border-border bg-foreground/[0.03] p-4 text-xs leading-relaxed whitespace-pre-line text-muted">
                    {f.consentText}
                  </div>
                )}
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--brand)]"
                    checked={values[f.key] === true}
                    onChange={(e) => set(f.key, e.target.checked)}
                  />
                  {t.agree}
                </label>
              </>
            ) : f.type === "choice" ? (
              <>
                {label(f)}
                <div className="space-y-2">
                  {f.options.map((o) => (
                    <label key={o.value} className="flex w-fit cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={f.key}
                        value={o.value}
                        className="size-4 accent-[var(--brand)]"
                        checked={values[f.key] === o.value}
                        onChange={() => set(f.key, o.value)}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </>
            ) : f.type === "phone" ? (
              <>
                {label(f, `${f.key}-0`)}
                <div className="flex items-center gap-2">
                  {[3, 4, 4].map((len, i) => (
                    <span key={i} className="contents">
                      {i > 0 && <span className="text-muted">-</span>}
                      <input
                        id={`${f.key}-${i}`}
                        aria-label={`${f.label} ${i + 1}`}
                        inputMode="numeric"
                        maxLength={len}
                        className={`${input} w-20 text-center sm:w-24`}
                        value={part(f.key, i)}
                        onChange={(e) => setPart(f.key, i, 3, e.target.value.replace(/\D/g, ""))}
                      />
                    </span>
                  ))}
                </div>
              </>
            ) : f.type === "address" ? (
              <>
                {label(f, `${f.key}-0`)}
                <div className="space-y-2">
                  <input
                    id={`${f.key}-0`}
                    placeholder={t.addressMain}
                    autoComplete="street-address"
                    className={input}
                    value={part(f.key, 0)}
                    onChange={(e) => setPart(f.key, 0, 2, e.target.value)}
                  />
                  <input
                    aria-label={t.addressDetail}
                    placeholder={t.addressDetail}
                    className={input}
                    value={part(f.key, 1)}
                    onChange={(e) => setPart(f.key, 1, 2, e.target.value)}
                  />
                </div>
              </>
            ) : f.type === "textarea" ? (
              <>
                {label(f, f.key)}
                <textarea id={f.key} rows={4} className={input} value={String(values[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
              </>
            ) : (
              <>
                {label(f, f.key)}
                <input
                  id={f.key}
                  type={f.type === "date" ? "date" : "text"}
                  className={input}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </>
            )}
          </div>
        ))}
      </fieldset>

      {error && <p className="mt-6 rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      {!locked && (
        <button
          type="submit"
          disabled={state === "sending"}
          className="mt-8 w-full bg-brand py-3.5 font-semibold text-white hover:bg-brand-strong disabled:opacity-60 dark:text-background"
        >
          {state === "sending" ? t.submitting : t.submit}
        </button>
      )}
    </form>
  );
}
