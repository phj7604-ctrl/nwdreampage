"use client";

import { getFirebase } from "@/lib/firebase/client";
import type { Locale } from "@/i18n/config";

export type Localized = Record<Locale, string>;
export const emptyLocalized = (): Localized => ({ ko: "", en: "", zh: "", ja: "" });
export const toLocalized = (v: unknown): Localized => ({ ...emptyLocalized(), ...((v as Partial<Localized>) ?? {}) });

/** 로그인한 관리자의 토큰을 붙여 API 호출 */
async function authedFetch(path: string, init: RequestInit = {}) {
  const user = getFirebase()?.auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  const token = await user.getIdToken();
  const res = await fetch(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `요청 실패 (${res.status})`);
  return body;
}

/** 저장·삭제 후 호출 → 공개 사이트에 즉시 반영 */
export async function refreshSite() {
  try {
    await authedFetch("/api/revalidate", { method: "POST" });
  } catch {
    // 실패해도 1분 안에 자동 반영되므로 무시
  }
}

/** 사진을 가로 최대 1920px WebP로 줄인 뒤 업로드 → 공개 주소 반환 */
export async function uploadImage(file: File): Promise<string> {
  const compressed = await compressImage(file);
  const form = new FormData();
  form.append("file", compressed, "image.webp");
  const { url } = await authedFetch("/api/upload", { method: "POST", body: form });
  return url as string;
}

async function compressImage(file: File, maxWidth = 1920, quality = 0.82): Promise<Blob> {
  if (file.type === "image/gif") return file; // 움직이는 GIF는 그대로
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
  return blob && blob.size < file.size ? blob : file;
}

/** Firestore Timestamp | ISO 문자열 → Date */
export function toDate(v: unknown): Date {
  if (v && typeof v === "object" && "toDate" in v) return (v as { toDate(): Date }).toDate();
  if (typeof v === "string") return new Date(v);
  return new Date();
}

/** <input type="date"> 값 (서울 기준) */
export function dateInputValue(d: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(d);
}

export function fromDateInput(value: string, keepTimeFrom?: Date) {
  const time = keepTimeFrom
    ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(keepTimeFrom)
    : "09:00:00";
  return new Date(`${value}T${time}+09:00`);
}
