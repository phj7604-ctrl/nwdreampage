"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { refreshSite, toLocalized, type Localized } from "@/lib/admin/client";
import { getFirebase } from "@/lib/firebase/client";
import { Button, Card, Field, LocaleTabs, Notice, inputCls } from "./ui";

type Settings = {
  phone: string;
  email: string;
  kakaoMap: string;
  naverMap: string;
  address: Localized;
  hours: Localized;
};

/** 전화·이메일·주소·운영시간·지도 링크 — 사이트 하단, 메인, 오시는 길에 표시 */
export function SettingsAdmin() {
  const [s, setS] = useState<Settings | null>(null);
  const [lang, setLang] = useState<Locale>("ko");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    getDoc(doc(getFirebase()!.db, "settings", "site"))
      .then((snap) => {
        const v = snap.data() ?? {};
        setS({
          phone: v.phone ?? "",
          email: v.email ?? "",
          kakaoMap: v.kakaoMap ?? "",
          naverMap: v.naverMap ?? "",
          address: toLocalized(v.address),
          hours: toLocalized(v.hours),
        });
      })
      .catch((e) => setMsg({ tone: "error", text: e.message }));
  }, []);

  async function save() {
    if (!s) return;
    setSaving(true);
    setMsg(null);
    try {
      await setDoc(doc(getFirebase()!.db, "settings", "site"), { ...s, updatedAt: serverTimestamp() }, { merge: true });
      await refreshSite();
      setMsg({ tone: "ok", text: "저장했습니다. 사이트에 바로 반영됩니다." });
    } catch (e) {
      setMsg({ tone: "error", text: `저장 실패: ${(e as Error).message}` });
    } finally {
      setSaving(false);
    }
  }

  if (!s) return <Card>{msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : <p className="text-muted">불러오는 중…</p>}</Card>;

  return (
    <Card>
      <h2 className="mb-6 text-lg font-bold">센터 정보</h2>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="전화번호">
            <input className={inputCls} value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} />
          </Field>
          <Field label="이메일">
            <input className={inputCls} value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} />
          </Field>
          <Field label="카카오맵 링크">
            <input className={inputCls} value={s.kakaoMap} onChange={(e) => setS({ ...s, kakaoMap: e.target.value })} />
          </Field>
          <Field label="네이버 지도 링크">
            <input className={inputCls} value={s.naverMap} onChange={(e) => setS({ ...s, naverMap: e.target.value })} />
          </Field>
        </div>

        <LocaleTabs value={lang} onChange={setLang} filled={(l) => Boolean(s.address[l].trim() || s.hours[l].trim())} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="주소">
            <input
              className={inputCls}
              value={s.address[lang]}
              placeholder={s.address.ko}
              onChange={(e) => setS({ ...s, address: { ...s.address, [lang]: e.target.value } })}
            />
          </Field>
          <Field label="운영 시간">
            <input
              className={inputCls}
              value={s.hours[lang]}
              placeholder={s.hours.ko}
              onChange={(e) => setS({ ...s, hours: { ...s.hours, [lang]: e.target.value } })}
            />
          </Field>
        </div>

        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <div className="flex justify-end border-t border-border pt-4">
          <Button tone="primary" onClick={save} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
