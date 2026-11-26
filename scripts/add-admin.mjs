// 관리자 계정 등록 스크립트 (최초 최고관리자 등록용)
//
// 사용법:
//   1) Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > "새 비공개 키 생성" 으로 JSON 다운로드
//      (이 파일은 절대 공유하거나 Git에 올리지 마세요)
//   2) PowerShell:
//      $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\경로\service-account.json"
//      node scripts/add-admin.mjs someone@gmail.com super
//
// 역할: super(최고관리자) | editor(관리자). 생략하면 editor.
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const [email, role = "editor"] = process.argv.slice(2);
if (!email || !["super", "editor"].includes(role)) {
  console.error("사용법: node scripts/add-admin.mjs <이메일> [super|editor]");
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });
await getFirestore()
  .collection("admins")
  .doc(email.toLowerCase())
  .set({ role, createdAt: FieldValue.serverTimestamp() }, { merge: true });

console.log(`등록 완료: ${email} (${role})`);
