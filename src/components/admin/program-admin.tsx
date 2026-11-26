"use client";
/* eslint-disable @next/next/no-img-element */

import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { emptyLocalized, refreshSite, toLocalized, uploadImage, type Localized } from "@/lib/admin/client";
import type { FormFieldType } from "@/lib/content";
import { getFirebase } from "@/lib/firebase/client";
import { ApplicationsView } from "./applications-view";
import { RichEditor } from "./rich-editor";
import { Button, Card, ConfirmButton, Field, LocaleTabs, Notice, inputCls } from "./ui";

export type AdminField = {
  key: string;
  label: Localized;
  type: FormFieldType;
  required: boolean;
  options?: Localized[];
  consentText?: Localized;
};

type Img = { src: string; original?: string | null; backup?: string | null };
type Draft = {
  title: Localized;
  summary: Localized;
  description: Localized;
  period: Localized;
  place: Localized;
  target: Localized;
  capacity: string;
  status: "open" | "closed";
  published: boolean;
  order: string;
  images: Img[];
  form: AdminField[];
  extraInfo: Localized;
  curriculum: Localized;
  archived: boolean;
  group: string;
  applyStart: string;
  applyEnd: string;
};

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "짧은 글" },
  { value: "textarea", label: "긴 글" },
  { value: "phone", label: "전화번호" },
  { value: "date", label: "날짜" },
  { value: "choice", label: "선택(하나 고르기)" },
  { value: "address", label: "주소" },
  { value: "consent", label: "개인정보 동의" },
];

const L = (ko: string): Localized => ({ ...emptyLocalized(), ko });
let seq = 0;
const newKey = () => `f${Date.now().toString(36)}${seq++}`;

/** 새 프로그램의 기본 신청서 (기존 사이트 신청서와 같은 구성) */
const defaultForm = (): AdminField[] => [
  {
    key: newKey(),
    label: L("개인정보 수집 및 이용 동의"),
    type: "consent",
    required: true,
    consentText: L(
      "수집 항목: 이름, 연락처, 주소 등 신청서 기재 내용\n이용 목적: 프로그램 신청 접수 및 선정 결과 안내\n보유 기간: 프로그램 종료 후 1년",
    ),
  },
  { key: newKey(), label: L("이름"), type: "text", required: true },
  { key: newKey(), label: L("전화번호"), type: "phone", required: true },
  { key: newKey(), label: L("주소"), type: "address", required: false },
];

export function ProgramAdmin({ id, open }: { id: string | null; open: (id: string | null) => void }) {
  if (id?.startsWith("apps:")) return <ApplicationsView programId={id.slice(5)} back={() => open(null)} />;
  return id ? <ProgramEditor id={id} close={() => open(null)} openApps={(pid) => open(`apps:${pid}`)} /> : <ProgramList open={open} />;
}

// ---------------- 목록 ----------------
function ProgramList({ open }: { open: (id: string) => void }) {
  const [rows, setRows] = useState<
    { id: string; title: string; status: string; published: boolean; capacity: number | null; count: number; archived: boolean; group: string }[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirebase()!.db;
    getDocs(collection(db, "programs"))
      .then(async (snap) => {
        const list = await Promise.all(
          snap.docs.map(async (d) => {
            const v = d.data();
            const count = await getCountFromServer(query(collection(db, "applications"), where("programId", "==", d.id)))
              .then((c) => c.data().count)
              .catch(() => 0);
            return {
              id: d.id,
              title: toLocalized(v.title).ko,
              status: v.status ?? "closed",
              published: v.published !== false,
              capacity: typeof v.capacity === "number" ? v.capacity : null,
              count,
              archived: Boolean(v.archived),
              group: (v.group as string) ?? "",
            };
          }),
        );
        list.sort(
          (a, b) =>
            Number(a.archived) - Number(b.archived) ||
            b.group.localeCompare(a.group, "ko", { numeric: true }) ||
            Number(b.status === "open") - Number(a.status === "open") ||
            a.title.localeCompare(b.title),
        );
        setRows(list);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">체험·교육 프로그램</h2>
        <Button tone="primary" onClick={() => open("new")}>
          + 새 프로그램
        </Button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!rows && !error && <p className="py-8 text-center text-muted">불러오는 중…</p>}
      {rows && (
        <ul className="divide-y divide-border">
          {rows.map((r, i) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              {r.archived && rows[i - 1]?.group !== r.group && (
                <p className="mt-4 w-full text-sm font-semibold text-muted">지난 프로그램 · {r.group || "(묶음 없음)"}</p>
              )}
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${r.status === "open" ? "bg-accent text-black" : "bg-border text-muted"}`}
              >
                {r.status === "open" ? "모집중" : "마감"}
              </span>
              <button type="button" onClick={() => open(r.id)} className="min-w-0 flex-1 truncate text-left font-medium hover:text-brand">
                {!r.published && <span className="mr-1 text-muted">[숨김]</span>}
                {r.title || "(제목 없음)"}
              </button>
              <button type="button" onClick={() => open(`apps:${r.id}`)} className="rounded-full border border-border px-3 py-1 text-sm hover:border-brand hover:text-brand">
                신청자 {r.count}
                {r.capacity ? ` / ${r.capacity}` : ""}명
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------- 등록·수정 ----------------
function ProgramEditor({ id, close, openApps }: { id: string; close: () => void; openApps: (id: string) => void }) {
  const isNew = id === "new";
  const blank = (): Draft => ({
    title: emptyLocalized(),
    summary: emptyLocalized(),
    description: emptyLocalized(),
    period: emptyLocalized(),
    place: emptyLocalized(),
    target: emptyLocalized(),
    capacity: "",
    status: "open",
    published: true,
    order: "",
    images: [],
    form: defaultForm(),
    extraInfo: emptyLocalized(),
    curriculum: emptyLocalized(),
    archived: false,
    group: "",
    applyStart: "",
    applyEnd: "",
  });
  const [draft, setDraft] = useState<Draft | null>(isNew ? blank() : null);
  const [lang, setLang] = useState<Locale>("ko");
  const [busy, setBusy] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNew) return;
    getDoc(doc(getFirebase()!.db, "programs", id))
      .then((snap) => {
        if (!snap.exists()) return setMsg({ tone: "error", text: "프로그램을 찾을 수 없습니다." });
        const v = snap.data();
        setDraft({
          title: toLocalized(v.title),
          summary: toLocalized(v.summary),
          description: toLocalized(v.description),
          period: toLocalized(v.period),
          place: toLocalized(v.place),
          target: toLocalized(v.target),
          capacity: typeof v.capacity === "number" ? String(v.capacity) : "",
          status: v.status === "open" ? "open" : "closed",
          published: v.published !== false,
          order: typeof v.order === "number" ? String(v.order) : "",
          images: (v.images ?? []) as Img[],
          extraInfo: toLocalized(v.extraInfo),
          curriculum: toLocalized(v.curriculum),
          archived: Boolean(v.archived),
          group: v.group ?? "",
          applyStart: v.applyStart ?? "",
          applyEnd: v.applyEnd ?? "",
          form: ((v.form ?? []) as AdminField[]).map((f) => ({
            ...f,
            label: toLocalized(f.label),
            options: f.options?.map(toLocalized),
            consentText: f.consentText ? toLocalized(f.consentText) : undefined,
          })),
        });
      })
      .catch((e) => setMsg({ tone: "error", text: e.message }));
  }, [id, isNew]);

  if (!draft) return <Card>{msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : <p className="text-muted">불러오는 중…</p>}</Card>;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const setL = (k: "title" | "summary" | "period" | "place" | "target" | "extraInfo", v: string) => set(k, { ...draft[k], [lang]: v });
  const setField = (i: number, f: AdminField) => set("form", draft.form.map((x, j) => (j === i ? f : x)));

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    try {
      const list = Array.from(files);
      for (let i = 0; i < list.length; i++) {
        setBusy(`사진 올리는 중… (${i + 1}/${list.length})`);
        const src = await uploadImage(list[i]);
        setDraft((d) => (d ? { ...d, images: [...d.images, { src }] } : d));
      }
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.ko.trim()) return setMsg({ tone: "error", text: "한국어 프로그램 이름은 꼭 입력해 주세요." });
    if (draft.form.some((f) => !f.label.ko.trim())) return setMsg({ tone: "error", text: "신청서 항목 이름(한국어)이 비어 있습니다." });
    if (draft.form.some((f) => f.type === "choice" && !(f.options ?? []).some((o) => o.ko.trim())))
      return setMsg({ tone: "error", text: "'선택' 항목에는 보기를 하나 이상 넣어 주세요." });
    setBusy("저장 중…");
    setMsg(null);
    try {
      const db = getFirebase()!.db;
      const ref = isNew ? doc(collection(db, "programs")) : doc(db, "programs", id);
      const capacity = parseInt(draft.capacity, 10);
      const order = parseInt(draft.order, 10);
      await setDoc(
        ref,
        {
          title: draft.title,
          summary: draft.summary,
          description: draft.description,
          period: draft.period,
          place: draft.place,
          target: draft.target,
          capacity: Number.isFinite(capacity) ? capacity : null,
          order: Number.isFinite(order) ? order : null,
          status: draft.archived ? "closed" : draft.status,
          published: draft.published,
          archived: draft.archived,
          group: draft.archived ? draft.group.trim() : null,
          applyStart: draft.applyStart || null,
          applyEnd: draft.applyEnd || null,
          extraInfo: draft.extraInfo,
          curriculum: draft.curriculum,
          images: draft.images,
          form: draft.form.map((f) => ({
            key: f.key,
            label: f.label,
            type: f.type,
            required: f.type === "consent" ? true : f.required,
            ...(f.type === "choice" ? { options: (f.options ?? []).filter((o) => o.ko.trim()) } : {}),
            ...(f.type === "consent" ? { consentText: f.consentText ?? emptyLocalized() } : {}),
          })),
          updatedAt: serverTimestamp(),
          ...(isNew ? { createdAt: serverTimestamp() } : {}),
        },
        { merge: true },
      );
      await refreshSite();
      setMsg({ tone: "ok", text: "저장했습니다. 사이트에 바로 반영됩니다." });
      if (isNew) close();
    } catch (e) {
      setMsg({ tone: "error", text: `저장 실패: ${(e as Error).message}` });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("삭제 중…");
    try {
      const db = getFirebase()!.db;
      // 신청자 개인정보가 남지 않도록 이 프로그램의 신청 내역도 함께 삭제
      const apps = await getDocs(query(collection(db, "applications"), where("programId", "==", id)));
      for (let i = 0; i < apps.docs.length; i += 400) {
        const batch = writeBatch(db);
        apps.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(doc(db, "programs", id));
      await refreshSite();
      close();
    } catch (e) {
      setMsg({ tone: "error", text: `삭제 실패: ${(e as Error).message}` });
      setBusy(null);
    }
  }

  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button onClick={close}>← 목록</Button>
        <h2 className="text-lg font-bold">{isNew ? "새 프로그램" : "프로그램 수정"}</h2>
        {!isNew ? <Button onClick={() => openApps(id)}>신청자 보기</Button> : <span />}
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="모집 상태">
            <select className={inputCls} value={draft.status} onChange={(e) => set("status", e.target.value as Draft["status"])}>
              <option value="open">모집중 (신청 받기)</option>
              <option value="closed">마감</option>
            </select>
          </Field>
          <Field label="정원 (명)" hint="비우면 표시 안 함">
            <input type="number" min={0} className={inputCls} value={draft.capacity} onChange={(e) => set("capacity", e.target.value)} />
          </Field>
          <Field label="목록 순서" hint="작은 숫자가 앞에">
            <input type="number" className={inputCls} value={draft.order} onChange={(e) => set("order", e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" checked={draft.published} onChange={(e) => set("published", e.target.checked)} /> 사이트에 공개
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="신청 받는 기간 — 시작일" hint="비우면 모집 상태만 따름">
            <input type="date" className={inputCls} value={draft.applyStart} onChange={(e) => set("applyStart", e.target.value)} />
          </Field>
          <Field label="신청 받는 기간 — 마감일" hint="이 날이 지나면 신청서가 자동으로 잠겨요">
            <input type="date" className={inputCls} value={draft.applyEnd} onChange={(e) => set("applyEnd", e.target.value)} />
          </Field>
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-xl bg-brand-soft p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={draft.archived} onChange={(e) => set("archived", e.target.checked)} />
            지난 프로그램으로 이동 (신청 목록에서 빠지고 &apos;지난 프로그램&apos;에 표시)
          </label>
          {draft.archived && (
            <Field label="묶음 이름" hint="같은 이름끼리 묶여 보여요. 예) 2026 - 2">
              <input className={inputCls} value={draft.group} onChange={(e) => set("group", e.target.value)} placeholder="2026 - 2" />
            </Field>
          )}
        </div>

        <LocaleTabs value={lang} onChange={setLang} filled={(l) => Boolean(draft.title[l].trim())} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`프로그램 이름 (${lang === "ko" ? "필수" : "선택"})`}>
            <input className={inputCls} value={draft.title[lang]} placeholder={draft.title.ko} onChange={(e) => setL("title", e.target.value)} />
          </Field>
          <Field label="한 줄 소개">
            <input className={inputCls} value={draft.summary[lang]} placeholder={draft.summary.ko} onChange={(e) => setL("summary", e.target.value)} />
          </Field>
          <Field label="일정" hint="예) 2027.03.06 ~ 05.29 (매주 토 14:00-15:30)">
            <input className={inputCls} value={draft.period[lang]} placeholder={draft.period.ko} onChange={(e) => setL("period", e.target.value)} />
          </Field>
          <Field label="장소">
            <input className={inputCls} value={draft.place[lang]} placeholder={draft.place.ko} onChange={(e) => setL("place", e.target.value)} />
          </Field>
          <Field label="대상">
            <input className={inputCls} value={draft.target[lang]} placeholder={draft.target.ko} onChange={(e) => setL("target", e.target.value)} />
          </Field>
          <Field label="기타 안내" hint="재료비 등. 줄마다 한 가지">
            <textarea
              rows={2}
              className={inputCls}
              value={draft.extraInfo[lang]}
              placeholder={draft.extraInfo.ko || "재료비 : 50,000원"}
              onChange={(e) => setL("extraInfo", e.target.value)}
            />
          </Field>
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium">강의내용 (회차별 일정·내용 — 편집기의 ▦ 표 버튼으로 표를 만들 수 있어요)</span>
          <RichEditor
            key={`cur-${lang}`}
            value={draft.curriculum[lang]}
            onChange={(html) => set("curriculum", { ...draft.curriculum, [lang]: html })}
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium">상세 안내</span>
          <RichEditor
            key={lang}
            value={toHtml(draft.description[lang])}
            onChange={(html) => set("description", { ...draft.description, [lang]: html })}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">사진 ({draft.images.length}장)</span>
            <Button onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}>
              + 사진 올리기
            </Button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
          </div>
          {draft.images.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {draft.images.map((img, i) => (
                <li key={img.src + i} className="relative">
                  <img src={img.src} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => set("images", draft.images.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 rounded-full bg-black/60 px-2 text-xs text-white"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 신청서 항목 */}
        <div className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">신청서 항목 ({lang === "ko" ? "한국어" : "번역"} 편집 중)</span>
            <Button onClick={() => set("form", [...draft.form, { key: newKey(), label: emptyLocalized(), type: "text", required: true }])}>
              + 항목 추가
            </Button>
          </div>
          {draft.form.map((f, i) => (
            <FieldEditor
              key={f.key}
              field={f}
              lang={lang}
              onChange={(nf) => setField(i, nf)}
              onRemove={() => set("form", draft.form.filter((_, j) => j !== i))}
              onMove={(dir) => {
                const j = i + dir;
                if (j < 0 || j >= draft.form.length) return;
                const next = [...draft.form];
                [next[i], next[j]] = [next[j], next[i]];
                set("form", next);
              }}
            />
          ))}
          {!draft.archived && !draft.form.some((f) => f.type === "consent") && (
            <Notice tone="error">개인정보를 받는 신청서에는 &apos;개인정보 동의&apos; 항목이 꼭 있어야 합니다.</Notice>
          )}
        </div>

        {busy && <Notice tone="info">{busy}</Notice>}
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

        <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
          {!isNew ? (
            <ConfirmButton
              label="프로그램 삭제"
              confirmLabel="신청 내역까지 모두 삭제"
              armed={armed}
              setArmed={setArmed}
              onConfirm={remove}
              disabled={Boolean(busy)}
            />
          ) : (
            <span />
          )}
          <Button tone="primary" onClick={save} disabled={Boolean(busy) || (!draft.archived && !draft.form.some((f) => f.type === "consent"))}>
            저장
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** 이관된 설명은 일반 텍스트라 편집기에 넣기 전 문단으로 바꾼다 */
function toHtml(v: string) {
  if (!v || /<[a-z][\s\S]*>/i.test(v)) return v;
  return v
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function FieldEditor({
  field: f,
  lang,
  onChange,
  onRemove,
  onMove,
}: {
  field: AdminField;
  lang: Locale;
  onChange: (f: AdminField) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} min-w-40 flex-1`}
          value={f.label[lang]}
          placeholder={lang === "ko" ? "항목 이름 (예: 학생 이름)" : f.label.ko}
          onChange={(e) => onChange({ ...f, label: { ...f.label, [lang]: e.target.value } })}
        />
        <select
          className={`${inputCls} w-auto`}
          value={f.type}
          onChange={(e) => {
            const type = e.target.value as FormFieldType;
            onChange({
              ...f,
              type,
              options: type === "choice" ? (f.options?.length ? f.options : [emptyLocalized()]) : undefined,
              consentText: type === "consent" ? (f.consentText ?? emptyLocalized()) : undefined,
            });
          }}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {f.type !== "consent" && (
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={f.required} onChange={(e) => onChange({ ...f, required: e.target.checked })} /> 필수
          </label>
        )}
        <span className="flex gap-1 text-sm">
          <button type="button" className="rounded px-2 hover:bg-brand-soft" onClick={() => onMove(-1)} title="위로">
            ↑
          </button>
          <button type="button" className="rounded px-2 hover:bg-brand-soft" onClick={() => onMove(1)} title="아래로">
            ↓
          </button>
          <button type="button" className="rounded px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={onRemove}>
            삭제
          </button>
        </span>
      </div>

      {f.type === "choice" && (
        <div className="flex flex-wrap items-center gap-2 pl-2">
          <span className="text-xs text-muted">보기:</span>
          {(f.options ?? []).map((o, i) => (
            <span key={i} className="flex items-center gap-1">
              <input
                className={`${inputCls} w-28 py-1 text-sm`}
                value={o[lang]}
                placeholder={lang === "ko" ? `보기 ${i + 1}` : o.ko}
                onChange={(e) => onChange({ ...f, options: f.options!.map((x, j) => (j === i ? { ...x, [lang]: e.target.value } : x)) })}
              />
              <button type="button" className="text-xs text-muted" onClick={() => onChange({ ...f, options: f.options!.filter((_, j) => j !== i) })}>
                ✕
              </button>
            </span>
          ))}
          <button type="button" className="text-sm text-brand" onClick={() => onChange({ ...f, options: [...(f.options ?? []), emptyLocalized()] })}>
            + 보기
          </button>
        </div>
      )}

      {f.type === "consent" && (
        <textarea
          rows={3}
          className={`${inputCls} text-sm`}
          value={f.consentText?.[lang] ?? ""}
          placeholder={lang === "ko" ? "수집 항목, 이용 목적, 보유 기간을 적어 주세요." : f.consentText?.ko}
          onChange={(e) => onChange({ ...f, consentText: { ...(f.consentText ?? emptyLocalized()), [lang]: e.target.value } })}
        />
      )}
    </div>
  );
}
