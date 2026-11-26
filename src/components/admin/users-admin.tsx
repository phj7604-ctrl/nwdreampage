"use client";

import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getFirebase } from "@/lib/firebase/client";
import { Button, Card, Field, Notice, inputCls } from "./ui";

type Admin = { email: string; role: "super" | "editor" };

/** 최고관리자 전용: 관리자 구글 계정 추가·삭제 */
export function UsersAdmin() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Admin["role"]>("editor");
  const [armed, setArmed] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    getDocs(collection(getFirebase()!.db, "admins"))
      .then((snap) => setAdmins(snap.docs.map((d) => ({ email: d.id, role: d.data().role }))))
      .catch((e) => setMsg({ tone: "error", text: e.message }));
  }, []);
  useEffect(load, [load]);

  async function add() {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return setMsg({ tone: "error", text: "올바른 이메일(구글 계정)을 입력해 주세요." });
    try {
      await setDoc(doc(getFirebase()!.db, "admins", e), { role, createdAt: serverTimestamp() });
      setEmail("");
      setMsg({ tone: "ok", text: `${e} 계정을 ${role === "super" ? "최고관리자" : "관리자"}로 등록했습니다. 이 계정으로 구글 로그인하면 됩니다.` });
      load();
    } catch (err) {
      setMsg({ tone: "error", text: `등록 실패: ${(err as Error).message}` });
    }
  }

  async function remove(target: string) {
    try {
      await deleteDoc(doc(getFirebase()!.db, "admins", target));
      setArmed(null);
      load();
    } catch (err) {
      setMsg({ tone: "error", text: `삭제 실패: ${(err as Error).message}` });
    }
  }

  return (
    <Card>
      <h2 className="mb-2 text-lg font-bold">관리자 계정</h2>
      <p className="mb-6 text-sm text-muted">
        여기 등록된 구글 계정만 관리자 화면에 들어올 수 있습니다. 최고관리자는 관리자 계정도 관리할 수 있습니다.
      </p>

      {admins && (
        <ul className="mb-6 divide-y divide-border rounded-xl border border-border">
          {admins.map((a) => (
            <li key={a.email} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 truncate">{a.email}</span>
              <span className="text-sm text-muted">{a.role === "super" ? "최고관리자" : "관리자"}</span>
              {a.email === user?.email ? (
                <span className="text-xs text-muted">(나)</span>
              ) : armed === a.email ? (
                <span className="flex gap-1">
                  <Button tone="danger" onClick={() => remove(a.email)}>
                    정말 삭제
                  </Button>
                  <Button onClick={() => setArmed(null)}>취소</Button>
                </span>
              ) : (
                <Button tone="danger" onClick={() => setArmed(a.email)}>
                  삭제
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="추가할 구글 계정 이메일">
          <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@gmail.com" />
        </Field>
        <Field label="권한">
          <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Admin["role"])}>
            <option value="editor">관리자</option>
            <option value="super">최고관리자</option>
          </select>
        </Field>
        <Button tone="primary" onClick={add}>
          추가
        </Button>
      </div>
      {msg && (
        <div className="mt-4">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}
    </Card>
  );
}
