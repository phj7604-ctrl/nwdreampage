"use client";
/* eslint-disable @next/next/no-img-element */

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { refreshSite, toLocalized, uploadImage, type Localized } from "@/lib/admin/client";
import { getFirebase } from "@/lib/firebase/client";
import { Button, Card, Field, Notice, inputCls } from "./ui";

type Popup = { enabled: boolean; title: Localized; image: string; link: string };

/** 메인 화면에 뜨는 팝업 (사진 1장 + 선택 링크). 방문자는 "오늘 하루 보지 않음"으로 닫을 수 있음 */
export function PopupAdmin() {
  const [p, setP] = useState<Popup | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getDoc(doc(getFirebase()!.db, "settings", "popup"))
      .then((snap) => {
        const v = snap.data() ?? {};
        setP({ enabled: Boolean(v.enabled), title: toLocalized(v.title), image: v.image ?? "", link: v.link ?? "" });
      })
      .catch((e) => setMsg({ tone: "error", text: e.message }));
  }, []);

  async function pick(files: FileList | null) {
    if (!files?.[0] || !p) return;
    setBusy("사진 올리는 중…");
    try {
      const url = await uploadImage(files[0]);
      setP({ ...p, image: url });
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (!p) return;
    if (p.enabled && !p.image) return setMsg({ tone: "error", text: "팝업을 켜려면 사진이 필요합니다." });
    setBusy("저장 중…");
    setMsg(null);
    try {
      await setDoc(doc(getFirebase()!.db, "settings", "popup"), { ...p, updatedAt: serverTimestamp() }, { merge: true });
      await refreshSite();
      setMsg({ tone: "ok", text: p.enabled ? "저장했습니다. 메인 화면에 팝업이 뜹니다." : "저장했습니다. 팝업이 꺼졌습니다." });
    } catch (e) {
      setMsg({ tone: "error", text: `저장 실패: ${(e as Error).message}` });
    } finally {
      setBusy(null);
    }
  }

  if (!p) return <Card>{msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : <p className="text-muted">불러오는 중…</p>}</Card>;

  return (
    <Card>
      <h2 className="mb-6 text-lg font-bold">메인 팝업</h2>
      <div className="grid gap-6 sm:grid-cols-[14rem_1fr]">
        <div className="space-y-2">
          <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
            {p.image ? <img src={p.image} alt="" className="size-full object-contain" /> : <span className="text-sm text-muted">사진 없음</span>}
          </div>
          <Button onClick={() => fileRef.current?.click()} disabled={Boolean(busy)} className="w-full">
            사진 바꾸기
          </Button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files)} />
        </div>
        <div className="space-y-4">
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" checked={p.enabled} onChange={(e) => setP({ ...p, enabled: e.target.checked })} />
            메인 화면에 팝업 띄우기
          </label>
          <Field label="팝업 이름 (화면 낭독기용 설명)">
            <input className={inputCls} value={p.title.ko} onChange={(e) => setP({ ...p, title: { ...p.title, ko: e.target.value } })} />
          </Field>
          <Field label="사진을 눌렀을 때 이동할 주소 (선택)" hint="예) /ko/apply 또는 https://...">
            <input className={inputCls} value={p.link} onChange={(e) => setP({ ...p, link: e.target.value })} />
          </Field>
          {busy && <Notice tone="info">{busy}</Notice>}
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <div className="flex justify-end">
            <Button tone="primary" onClick={save} disabled={Boolean(busy)}>
              저장
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
