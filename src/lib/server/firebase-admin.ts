// 서버용 Firebase 관리자 앱 (서비스 계정 권한) — 보안 규칙을 거치지 않는 서버 작업용
// 예) 정원이 차면 프로그램 자동 마감 등. 필요한 API 에서만 import 해서 쓴다.
//
// 환경변수(Vercel 비밀 값): FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// FIREBASE_PRIVATE_KEY 는 줄바꿈을 \n 글자로 바꿔 한 줄로 저장되어 있다.
import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";

export function adminApp() {
  const existing = getApps()[0];
  if (existing) return existing;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) throw new Error("Firebase 서비스 계정 환경변수가 없습니다.");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}
