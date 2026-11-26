"use client";

import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toDate, toLocalized } from "@/lib/admin/client";
import { getFirebase } from "@/lib/firebase/client";
import type { AdminField } from "./program-admin";
import { Button, Card, Notice } from "./ui";

const STATUS = {
  received: "접수",
  selected: "선정",
  waiting: "대기",
  cancelled: "취소",
} as const;
type Status = keyof typeof STATUS;

type App = { id: string; createdAt: Date; status: Status; locale: string; answers: Record<string, string | boolean> };

/** 프로그램별 신청자 목록 — 상태 변경, 삭제, 엑셀(CSV) 내려받기 */
export function ApplicationsView({ programId, back }: { programId: string; back: () => void }) {
  const [title, setTitle] = useState("");
  const [capacity, setCapacity] = useState<number | null>(null);
  const [fields, setFields] = useState<AdminField[]>([]);
  const [apps, setApps] = useState<App[] | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const db = getFirebase()!.db;
    Promise.all([
      getDoc(doc(db, "programs", programId)),
      getDocs(query(collection(db, "applications"), where("programId", "==", programId))),
    ])
      .then(([p, snap]) => {
      const v = p.data() ?? {};
      setTitle(toLocalized(v.title).ko);
      setCapacity(typeof v.capacity === "number" ? v.capacity : null);
      setFields(((v.form ?? []) as AdminField[]).filter((f) => f.type !== "consent").map((f) => ({ ...f, label: toLocalized(f.label) })));
      setApps(
        snap.docs
          .map((d) => {
            const a = d.data();
            return { id: d.id, createdAt: toDate(a.createdAt), status: (a.status ?? "received") as Status, locale: a.locale ?? "ko", answers: a.answers ?? {} };
          })
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()), // 먼저 신청한 순서 (선착순)
      );
      })
      .catch((e: Error) => setError(e.message));
  }, [programId]);

  useEffect(load, [load]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { received: 0, selected: 0, waiting: 0, cancelled: 0 };
    apps?.forEach((a) => c[a.status]++);
    return c;
  }, [apps]);

  async function setStatus(id: string, status: Status) {
    await updateDoc(doc(getFirebase()!.db, "applications", id), { status });
    setApps((list) => list?.map((a) => (a.id === id ? { ...a, status } : a)) ?? null);
  }

  async function remove(id: string) {
    await deleteDoc(doc(getFirebase()!.db, "applications", id));
    setArmed(null);
    setApps((list) => list?.filter((a) => a.id !== id) ?? null);
  }

  function downloadCsv() {
    if (!apps) return;
    const header = ["순번", "신청일시", "상태", ...fields.map((f) => f.label.ko), "신청 언어"];
    const rows = apps.map((a, i) => [
      String(i + 1),
      fmt(a.createdAt),
      STATUS[a.status],
      ...fields.map((f) => String(a.answers[f.key] ?? "")),
      a.locale,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    // 엑셀에서 한글이 깨지지 않도록 BOM 추가
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `신청자_${title.replace(/[\\/:*?"<>|]/g, "")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button onClick={back}>← 목록</Button>
        <h2 className="text-lg font-bold">{title || "신청자"}</h2>
        <Button tone="primary" onClick={downloadCsv} disabled={!apps?.length}>
          엑셀(CSV) 내려받기
        </Button>
      </div>

      {apps && (
        <p className="mb-4 text-sm text-muted">
          전체 {apps.length}명{capacity ? ` (정원 ${capacity}명)` : ""} · 접수 {counts.received} · 선정 {counts.selected} · 대기{" "}
          {counts.waiting} · 취소 {counts.cancelled}
        </p>
      )}
      {capacity !== null && apps && apps.filter((a) => a.status !== "cancelled").length >= capacity && (
        <div className="mb-4">
          <Notice tone="info">신청 인원이 정원에 도달했습니다. 더 받지 않으려면 프로그램을 &apos;마감&apos;으로 바꿔 주세요.</Notice>
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {!apps && !error && <p className="py-8 text-center text-muted">불러오는 중…</p>}
      {apps?.length === 0 && <p className="py-8 text-center text-muted">아직 신청자가 없습니다.</p>}

      {apps && apps.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">신청일시</th>
                <th className="px-2 py-2">상태</th>
                {fields.map((f) => (
                  <th key={f.key} className="px-2 py-2">
                    {f.label.ko}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {apps.map((a, i) => (
                <tr key={a.id} className={`border-b border-border ${a.status === "cancelled" ? "text-muted line-through" : ""}`}>
                  <td className="px-2 py-2">{i + 1}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{fmt(a.createdAt)}</td>
                  <td className="px-2 py-2">
                    <select
                      value={a.status}
                      onChange={(e) => setStatus(a.id, e.target.value as Status)}
                      className="rounded border border-border bg-background px-1 py-0.5 no-underline"
                    >
                      {(Object.keys(STATUS) as Status[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  {fields.map((f) => (
                    <td key={f.key} className="max-w-60 px-2 py-2 break-words">
                      {String(a.answers[f.key] ?? "")}
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    {armed === a.id ? (
                      <span className="flex gap-1">
                        <button type="button" className="text-red-600" onClick={() => remove(a.id)}>
                          정말 삭제
                        </button>
                        <button type="button" onClick={() => setArmed(null)}>
                          취소
                        </button>
                      </span>
                    ) : (
                      <button type="button" className="text-muted hover:text-red-600" onClick={() => setArmed(a.id)}>
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function fmt(d: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
