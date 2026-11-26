"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState, type FormEvent } from "react";
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

const input =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground focus:border-brand focus:outline-none";

export function ApplyForm({
  programId,
  programTitle,
  fields,
  locale,
  phone,
  t,
}: {
  programId: string;
  programTitle: string;
  fields: PublicField[];
  locale: Locale;
  phone: string;
  t: Dictionary["apply"];
}) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string | boolean) => setValues((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    if (form.get("website")) return; // 자동 입력 스팸 차단(사람에게는 안 보이는 칸)

    for (const f of fields) {
      const v = values[f.key];
      if (f.type === "consent" && v !== true) return setError(t.consentError);
      if (f.required && f.type !== "consent" && !String(v ?? "").trim()) return setError(`${t.requiredError} (${f.label})`);
    }

    const fb = getFirebase();
    if (!fb) return setError(t.error);
    setState("sending");
    try {
      const answers = Object.fromEntries(
        fields.map((f) => [f.key, f.type === "consent" ? values[f.key] === true : String(values[f.key] ?? "").trim().slice(0, 2000)]),
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
      <div className="space-y-2 rounded-lg bg-brand-soft p-5 text-center">
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

  // 신청서에 동의 항목이 없으면 기본 동의 항목을 추가하지 않고, 저장 규칙상 consent=true 로만 접수
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          {f.type !== "consent" && (
            <label htmlFor={f.key} className="flex items-center gap-1 text-sm font-medium">
              {f.label}
              {f.required && <span className="text-xs text-red-600 dark:text-red-400">*</span>}
            </label>
          )}

          {f.type === "consent" ? (
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="mb-2 font-medium">{f.label}</p>
              {f.consentText && <p className="mb-3 whitespace-pre-line text-xs text-muted">{f.consentText}</p>}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={values[f.key] === true} onChange={(e) => set(f.key, e.target.checked)} />
                {t.agree}
              </label>
            </div>
          ) : f.type === "choice" ? (
            <div className="flex flex-wrap gap-2">
              {f.options.map((o) => (
                <label
                  key={o.value}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm ${
                    values[f.key] === o.value ? "border-brand bg-brand text-white dark:text-background" : "border-border"
                  }`}
                >
                  <input type="radio" name={f.key} value={o.value} className="sr-only" onChange={() => set(f.key, o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
          ) : f.type === "textarea" || f.type === "address" ? (
            <textarea
              id={f.key}
              rows={f.type === "address" ? 2 : 4}
              className={input}
              value={String(values[f.key] ?? "")}
              onChange={(e) => set(f.key, e.target.value)}
            />
          ) : (
            <input
              id={f.key}
              type={f.type === "phone" ? "tel" : f.type === "date" ? "date" : "text"}
              inputMode={f.type === "phone" ? "tel" : undefined}
              placeholder={f.type === "phone" ? "010-0000-0000" : undefined}
              className={input}
              value={String(values[f.key] ?? "")}
              onChange={(e) => set(f.key, e.target.value)}
            />
          )}
        </div>
      ))}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-full bg-brand py-3 font-semibold text-white hover:bg-brand-strong disabled:opacity-60 dark:text-background"
      >
        {state === "sending" ? t.submitting : t.submit}
      </button>
    </form>
  );
}
