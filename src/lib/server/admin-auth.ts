// 서버(API)에서 요청한 사람이 관리자인지 확인
//
// 1) 브라우저가 보낸 Firebase ID 토큰을 firebase-admin 으로 검증 (서비스 계정 불필요, 프로젝트 ID만 사용)
// 2) 그 토큰으로 Firestore admins/{이메일} 문서를 읽어 역할 확인 (보안 규칙상 본인 문서만 읽힘)
import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const PROJECT = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "nwdream-page";

/**
 * 서버용 Firebase 관리자 앱.
 * 서비스 계정(FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY, Vercel 비밀 환경변수)이 있으면 그 권한으로,
 * 없으면 프로젝트 ID만으로 초기화한다(ID 토큰 검증은 서비스 계정 없이도 동작).
 */
export function adminApp() {
  const existing = getApps()[0];
  if (existing) return existing;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return initializeApp(
    clientEmail && privateKey
      ? { credential: cert({ projectId: PROJECT, clientEmail, privateKey }), projectId: PROJECT }
      : { projectId: PROJECT },
  );
}

function adminAuth() {
  return getAuth(adminApp());
}

export type AdminIdentity = { email: string; role: "super" | "editor" };

export async function verifyAdmin(request: Request): Promise<AdminIdentity | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    if (!decoded.email || !decoded.email_verified) return null;

    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/admins/${encodeURIComponent(decoded.email)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const doc = (await res.json()) as { fields?: { role?: { stringValue?: string } } };
    const role = doc.fields?.role?.stringValue;
    return role === "super" || role === "editor" ? { email: decoded.email, role } : null;
  } catch {
    return null;
  }
}

export const unauthorized = () =>
  Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
