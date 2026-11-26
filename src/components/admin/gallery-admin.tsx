"use client";
/* eslint-disable @next/next/no-img-element */

import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import {
  dateInputValue,
  emptyLocalized,
  fromDateInput,
  refreshSite,
  toDate,
  toLocalized,
  uploadImage,
  type Localized,
} from "@/lib/admin/client";
import { getFirebase } from "@/lib/firebase/client";
import { RichEditor } from "./rich-editor";
import { Button, Card, ConfirmButton, Field, LocaleTabs, Notice, inputCls } from "./ui";

type Img = { src: string; original?: string | null; backup?: string | null };
type Draft = { title: Localized; body: Localized; images: Img[]; published: boolean; publishedAt: Date };

export function GalleryAdmin({ id, open }: { id: string | null; open: (id: string | null) => void }) {
  return id ? <GalleryEditor id={id} close={() => open(null)} /> : <GalleryList open={open} />;
}

function GalleryList({ open }: { open: (id: string) => void }) {
  const [rows, setRows] = useState<{ id: string; title: string; cover?: string; count: number; date: Date; published: boolean }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDocs(query(collection(getFirebase()!.db, "gallery"), orderBy("publishedAt", "desc")))
      .then((snap) =>
        setRows(
          snap.docs.map((d) => {
            const v = d.data();
            const images = (v.images ?? []) as Img[];
            return {
              id: d.id,
              title: toLocalized(v.title).ko,
              cover: images[0]?.src,
              count: images.length,
              date: toDate(v.publishedAt),
              published: v.published !== false,
            };
          }),
        ),
      )
      .catch((e) => setError(e.message));
  }, []);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">활동 갤러리 {rows && <span className="text-muted">({rows.length})</span>}</h2>
        <Button tone="primary" onClick={() => open("new")}>
          + 새 앨범
        </Button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!rows && !error && <p className="py-8 text-center text-muted">불러오는 중…</p>}
      {rows && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => open(r.id)} className="block w-full overflow-hidden rounded-xl border border-border text-left hover:border-brand">
                <div className="aspect-[4/3] bg-brand-soft">{r.cover && <img src={r.cover} alt="" className="size-full object-cover" />}</div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-medium">
                    {!r.published && <span className="mr-1 text-muted">[숨김]</span>}
                    {r.title || "(제목 없음)"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {dateInputValue(r.date)} · 사진 {r.count}장
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function GalleryEditor({ id, close }: { id: string; close: () => void }) {
  const isNew = id === "new";
  const [draft, setDraft] = useState<Draft | null>(
    isNew ? { title: emptyLocalized(), body: emptyLocalized(), images: [], published: true, publishedAt: new Date() } : null,
  );
  const [lang, setLang] = useState<Locale>("ko");
  const [busy, setBusy] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNew) return;
    getDoc(doc(getFirebase()!.db, "gallery", id))
      .then((snap) => {
        if (!snap.exists()) return setMsg({ tone: "error", text: "앨범을 찾을 수 없습니다." });
        const v = snap.data();
        setDraft({
          title: toLocalized(v.title),
          body: toLocalized(v.body),
          images: (v.images ?? []) as Img[],
          published: v.published !== false,
          publishedAt: toDate(v.publishedAt),
        });
      })
      .catch((e) => setMsg({ tone: "error", text: e.message }));
  }, [id, isNew]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  async function addPhotos(files: FileList | null) {
    if (!files?.length || !draft) return;
    const list = Array.from(files);
    setMsg(null);
    try {
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

  function move(i: number, dir: -1 | 1) {
    if (!draft) return;
    const imgs = [...draft.images];
    const j = i + dir;
    if (j < 0 || j >= imgs.length) return;
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    set("images", imgs);
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.ko.trim()) return setMsg({ tone: "error", text: "한국어 제목은 꼭 입력해 주세요." });
    if (draft.images.length === 0) return setMsg({ tone: "error", text: "사진을 한 장 이상 올려 주세요." });
    setBusy("저장 중…");
    setMsg(null);
    try {
      const db = getFirebase()!.db;
      const ref = isNew ? doc(collection(db, "gallery")) : doc(db, "gallery", id);
      // 기존 이관 앨범은 본문에 사진이 들어 있어, 사진 순서·삭제가 화면에 반영되도록 본문 사진은 비운다
      const body = Object.fromEntries(
        Object.entries(draft.body).map(([l, html]) => [l, html.replace(/<img[^>]*>/g, "").replace(/<p>\s*<\/p>/g, "").trim()]),
      );
      await setDoc(
        ref,
        {
          title: draft.title,
          body,
          images: draft.images,
          published: draft.published,
          publishedAt: Timestamp.fromDate(draft.publishedAt),
          updatedAt: serverTimestamp(),
          ...(isNew ? { createdAt: serverTimestamp(), views: 0 } : {}),
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
      await deleteDoc(doc(getFirebase()!.db, "gallery", id));
      await refreshSite();
      close();
    } catch (e) {
      setMsg({ tone: "error", text: `삭제 실패: ${(e as Error).message}` });
      setBusy(null);
    }
  }

  if (!draft) return <Card>{msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : <p className="text-muted">불러오는 중…</p>}</Card>;

  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button onClick={close}>← 목록</Button>
        <h2 className="text-lg font-bold">{isNew ? "새 앨범" : "앨범 수정"}</h2>
        <span />
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="게시일">
            <input
              type="date"
              className={inputCls}
              value={dateInputValue(draft.publishedAt)}
              onChange={(e) => e.target.value && set("publishedAt", fromDateInput(e.target.value, draft.publishedAt))}
            />
          </Field>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" checked={draft.published} onChange={(e) => set("published", e.target.checked)} /> 사이트에 공개
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">사진 ({draft.images.length}장) · 첫 번째 사진이 대표 사진</span>
            <Button onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}>
              + 사진 올리기
            </Button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
          </div>
          {draft.images.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {draft.images.map((img, i) => (
                <li key={img.src + i} className="overflow-hidden rounded-lg border border-border">
                  <img src={img.src} alt="" className="aspect-[4/3] w-full object-cover" />
                  <div className="flex justify-between p-1 text-sm">
                    <span className="flex gap-1">
                      <button type="button" className="rounded px-2 hover:bg-brand-soft" onClick={() => move(i, -1)} title="앞으로">
                        ←
                      </button>
                      <button type="button" className="rounded px-2 hover:bg-brand-soft" onClick={() => move(i, 1)} title="뒤로">
                        →
                      </button>
                    </span>
                    <button
                      type="button"
                      className="rounded px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => set("images", draft.images.filter((_, j) => j !== i))}
                    >
                      빼기
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <LocaleTabs value={lang} onChange={setLang} filled={(l) => Boolean(draft.title[l].trim())} />
        <Field label={`제목 (${lang === "ko" ? "필수" : "선택"})`}>
          <input
            className={inputCls}
            value={draft.title[lang]}
            onChange={(e) => set("title", { ...draft.title, [lang]: e.target.value })}
            placeholder={lang === "ko" ? "예) 2027년 상반기 요가 교실" : draft.title.ko}
          />
        </Field>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">설명 (선택)</span>
          <RichEditor key={lang} value={draft.body[lang]} onChange={(html) => set("body", { ...draft.body, [lang]: html })} />
        </div>

        {busy && <Notice tone="info">{busy}</Notice>}
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

        <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
          {!isNew ? (
            <ConfirmButton label="앨범 삭제" confirmLabel="정말 삭제" armed={armed} setArmed={setArmed} onConfirm={remove} disabled={Boolean(busy)} />
          ) : (
            <span />
          )}
          <Button tone="primary" onClick={save} disabled={Boolean(busy)}>
            저장
          </Button>
        </div>
      </div>
    </Card>
  );
}
