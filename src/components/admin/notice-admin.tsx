"use client";

import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import {
  dateInputValue,
  emptyLocalized,
  fromDateInput,
  refreshSite,
  toDate,
  toLocalized,
  type Localized,
} from "@/lib/admin/client";
import { getFirebase } from "@/lib/firebase/client";
import { RichEditor } from "./rich-editor";
import { Button, Card, ConfirmButton, Field, LocaleTabs, Notice, inputCls } from "./ui";

const CATEGORIES = ["교육", "알림", "행사", "모집", "기타"];

type Row = { id: string; title: Localized; category: string | null; status: string; pinned: boolean; published: boolean; publishedAt: Date };

type Draft = {
  title: Localized;
  body: Localized;
  category: string;
  status: "open" | "closed";
  pinned: boolean;
  published: boolean;
  publishedAt: Date;
};

const newDraft = (): Draft => ({
  title: emptyLocalized(),
  body: emptyLocalized(),
  category: "알림",
  status: "open",
  pinned: false,
  published: true,
  publishedAt: new Date(),
});

export function NoticeAdmin({ id, open }: { id: string | null; open: (id: string | null) => void }) {
  return id ? <NoticeEditor id={id} close={() => open(null)} /> : <NoticeList open={open} />;
}

// ---------------- 목록 ----------------
function NoticeList({ open }: { open: (id: string) => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirebase()!.db;
    getDocs(query(collection(db, "notices"), orderBy("publishedAt", "desc")))
      .then((snap) =>
        setRows(
          snap.docs.map((d) => {
            const v = d.data();
            return {
              id: d.id,
              title: toLocalized(v.title),
              category: v.category ?? null,
              status: v.status ?? "open",
              pinned: Boolean(v.pinned),
              published: v.published !== false,
              publishedAt: toDate(v.publishedAt),
            };
          }),
        ),
      )
      .catch((e) => setError(e.message));
  }, []);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">공지사항 {rows && <span className="text-muted">({rows.length})</span>}</h2>
        <Button tone="primary" onClick={() => open("new")}>
          + 새 공지 쓰기
        </Button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!rows && !error && <p className="py-8 text-center text-muted">불러오는 중…</p>}
      {rows && (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => open(r.id)} className="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-brand-soft">
                <span className="w-24 shrink-0 text-xs text-muted">{dateInputValue(r.publishedAt)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {r.pinned && <Tag>상단고정</Tag>}
                  {!r.published && <Tag>숨김</Tag>}
                  {r.status === "closed" && <Tag>마감</Tag>}
                  {r.title.ko || "(제목 없음)"}
                </span>
                <span className="hidden shrink-0 gap-0.5 text-[10px] text-muted sm:flex">
                  {(["en", "zh", "ja"] as const).map((l) => (
                    <span key={l} className={r.title[l] ? "text-brand" : ""}>
                      {l.toUpperCase()}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="mr-1.5 rounded bg-border px-1.5 py-0.5 text-[11px] text-muted">{children}</span>
);

// ---------------- 작성·수정 ----------------
function NoticeEditor({ id, close }: { id: string; close: () => void }) {
  const isNew = id === "new";
  const [draft, setDraft] = useState<Draft | null>(isNew ? newDraft() : null);
  const [lang, setLang] = useState<Locale>("ko");
  const [saving, setSaving] = useState(false);
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isNew) return;
    getDoc(doc(getFirebase()!.db, "notices", id))
      .then((snap) => {
        if (!snap.exists()) return setMsg({ tone: "error", text: "글을 찾을 수 없습니다." });
        const v = snap.data();
        setDraft({
          title: toLocalized(v.title),
          body: toLocalized(v.body),
          category: v.category ?? "",
          status: v.status === "closed" ? "closed" : "open",
          pinned: Boolean(v.pinned),
          published: v.published !== false,
          publishedAt: toDate(v.publishedAt),
        });
      })
      .catch((e) => setMsg({ tone: "error", text: e.message }));
  }, [id, isNew]);

  const update = useCallback(<K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d)), []);

  async function save() {
    if (!draft) return;
    if (!draft.title.ko.trim()) return setMsg({ tone: "error", text: "한국어 제목은 꼭 입력해 주세요." });
    setSaving(true);
    setMsg(null);
    try {
      const db = getFirebase()!.db;
      const ref = isNew ? doc(collection(db, "notices")) : doc(db, "notices", id);
      const images = extractImages(Object.values(draft.body).join(" ")).map((src) => ({ src }));
      await setDoc(
        ref,
        {
          title: draft.title,
          body: draft.body,
          category: draft.category || null,
          status: draft.status,
          pinned: draft.pinned,
          published: draft.published,
          publishedAt: Timestamp.fromDate(draft.publishedAt),
          images,
          updatedAt: serverTimestamp(),
          ...(isNew ? { createdAt: serverTimestamp(), views: 0, attachments: [] } : {}),
        },
        { merge: true },
      );
      await refreshSite();
      setMsg({ tone: "ok", text: "저장했습니다. 사이트에 바로 반영됩니다." });
      if (isNew) close();
    } catch (e) {
      setMsg({ tone: "error", text: `저장 실패: ${(e as Error).message}` });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await deleteDoc(doc(getFirebase()!.db, "notices", id));
      await refreshSite();
      close();
    } catch (e) {
      setMsg({ tone: "error", text: `삭제 실패: ${(e as Error).message}` });
      setSaving(false);
    }
  }

  if (!draft) return <Card>{msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : <p className="text-muted">불러오는 중…</p>}</Card>;

  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button onClick={close}>← 목록</Button>
        <h2 className="text-lg font-bold">{isNew ? "새 공지 쓰기" : "공지 수정"}</h2>
        <span />
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="분류">
            <select className={inputCls} value={draft.category} onChange={(e) => update("category", e.target.value)}>
              <option value="">(없음)</option>
              {[...new Set([...CATEGORIES, draft.category].filter(Boolean))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="모집 상태">
            <select className={inputCls} value={draft.status} onChange={(e) => update("status", e.target.value as Draft["status"])}>
              <option value="open">진행중 / 해당없음</option>
              <option value="closed">마감</option>
            </select>
          </Field>
          <Field label="게시일">
            <input
              type="date"
              className={inputCls}
              value={dateInputValue(draft.publishedAt)}
              onChange={(e) => e.target.value && update("publishedAt", fromDateInput(e.target.value, draft.publishedAt))}
            />
          </Field>
          <div className="space-y-2 pt-6 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.pinned} onChange={(e) => update("pinned", e.target.checked)} /> 목록 맨 위에 고정
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.published} onChange={(e) => update("published", e.target.checked)} /> 사이트에 공개
            </label>
          </div>
        </div>

        <LocaleTabs value={lang} onChange={setLang} filled={(l) => Boolean(draft.title[l].trim())} />
        {lang !== "ko" && (
          <Notice tone="info">비워 두면 이 언어 화면에서는 한국어 원문이 &quot;번역 준비 중&quot; 안내와 함께 보입니다.</Notice>
        )}

        <Field label={`제목 (${lang === "ko" ? "필수" : "선택"})`}>
          <input
            className={inputCls}
            value={draft.title[lang]}
            onChange={(e) => update("title", { ...draft.title, [lang]: e.target.value })}
            placeholder={lang === "ko" ? "예) [교육] 2027년 상반기 프로그램 수강생 모집" : draft.title.ko}
          />
        </Field>

        <div className="space-y-1.5">
          <span className="text-sm font-medium">본문</span>
          <RichEditor key={lang} value={draft.body[lang]} onChange={(html) => update("body", { ...draft.body, [lang]: html })} />
        </div>

        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

        <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
          {!isNew ? (
            <ConfirmButton label="삭제" confirmLabel="정말 삭제" armed={armed} setArmed={setArmed} onConfirm={remove} disabled={saving} />
          ) : (
            <span />
          )}
          <Button tone="primary" onClick={save} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function extractImages(html: string) {
  return [...new Set([...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]))];
}
