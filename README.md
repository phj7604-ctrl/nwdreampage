# 남원드림센터 홈페이지 (nwdream-web)

Next.js 16 + Vercel + Firebase(구글 로그인, Firestore, Storage)로 만든 자체 관리형 홈페이지.

## 구조

| 경로 | 내용 |
|---|---|
| `src/proxy.ts` | `/` 접속 시 언어(쿠키 → 브라우저 언어 → 한국어)를 골라 `/ko` 등으로 이동 |
| `src/i18n/` | 4개 언어(ko/en/zh/ja) 설정과 고정 문구 사전(`dictionaries/*.json`) |
| `src/lib/site.ts` | 메뉴 구조, 센터 연락처 |
| `src/app/[lang]/` | 모든 페이지 (언어별 주소) |
| `src/app/[lang]/[...slug]/` | 아직 만들지 않은 메뉴의 임시 페이지 |
| `src/app/[lang]/admin/` | 관리자 로그인·대시보드 |
| `src/components/auth-provider.tsx` | 구글 로그인 + 관리자 권한(`admins/{이메일}`) 확인 |
| `firestore.rules`, `storage.rules` | Firebase 보안 규칙 |
| `scripts/add-admin.mjs` | 관리자 계정 등록 |

## 로컬 실행

```powershell
npm install
copy .env.local.example .env.local   # Firebase 값 채우기
npm run dev                          # http://localhost:3000
```

## Firebase 연결 순서

1. 센터 구글 계정으로 [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 생성
2. Authentication → 로그인 방법 → **Google** 사용 설정
3. Firestore Database 생성 (서울 `asia-northeast3`)
4. Storage 사용 설정 (Blaze 요금제 필요 — 예산 알림 설정 권장)
5. 프로젝트 설정 → 웹 앱 추가 → 설정값을 `.env.local`에 입력 (Vercel 환경변수에도 동일하게)
6. 보안 규칙 배포: `npx firebase-tools deploy --only firestore:rules,storage`
7. 최고관리자 등록: `node scripts/add-admin.mjs 이메일 super`
8. Authentication → 설정 → 승인된 도메인에 `namwondream.com`, Vercel 주소 추가
