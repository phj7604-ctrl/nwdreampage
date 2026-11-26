// 서버(API)에서 요청한 사람이 관리자인지 확인
//
// 브라우저가 보낸 Firebase ID 토큰을 그대로 사용해 Firestore admins/{이메일} 문서를 읽는다.
// - Firestore 가 토큰 서명·만료를 직접 검증하므로 위조 토큰은 거부된다.
// - 보안 규칙상 admins 문서는 '이메일 인증된 본인'만 읽을 수 있으므로,
//   토큰 속 이메일과 문서 이메일이 다르면 읽기가 거부된다.
// (firebase-admin 의 auth 모듈은 Vercel 런타임에서 라이브러리 호환 문제로 불러오지 못해 사용하지 않음)
import "server-only";

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "nwdream-page";

export type AdminIdentity = { email: string; role: "super" | "editor" };

/** JWT 본문에서 이메일만 꺼낸다 (검증은 Firestore 가 함) */
function emailFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { email?: string };
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export async function verifyAdmin(request: Request): Promise<AdminIdentity | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token.split(".").length !== 3) return null;
  const email = emailFromToken(token);
  if (!email) return null;

  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/admins/${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!res.ok) return null; // 401(잘못된 토큰) · 403(규칙 거부) · 404(관리자 아님)
    const doc = (await res.json()) as { fields?: { role?: { stringValue?: string } } };
    const role = doc.fields?.role?.stringValue;
    return role === "super" || role === "editor" ? { email, role } : null;
  } catch {
    return null;
  }
}

export const unauthorized = () =>
  Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
