import { NextResponse, type NextRequest } from "next/server";
import {
  defaultLocale,
  hasLocale,
  locales,
  LOCALE_COOKIE,
  type Locale,
} from "@/i18n/config";

/** 쿠키 → 브라우저 언어(Accept-Language) → 한국어 순으로 언어를 고른다. */
function pickLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (saved && hasLocale(saved)) return saved;

  const header = request.headers.get("accept-language") ?? "";
  const preferred = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { base: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { base } of preferred) {
    if (hasLocale(base)) return base;
  }
  return defaultLocale;
}

// 기존 아임웹 사이트 주소 → 새 주소 (검색엔진·공유 링크가 끊기지 않도록 영구 이동)
const LEGACY: Record<string, string> = {
  "/home": "",
  "/center": "/center/project",
  "/center1": "/center/project",
  "/center2": "/center/story",
  "/center3": "/center/location",
  "/facility": "/facility/fitness",
  "/fitness": "/facility/fitness",
  "/cafe": "/facility/cafe",
  "/library": "/facility/library",
  "/studyroom": "/facility/studyroom",
  "/customersupport": "/notice",
  "/notice": "/notice",
  "/gallery": "/gallery", // 기존 주소는 /Gallery (대문자)
  "/program": "/programs",
  "/lastprogram": "/programs/past",
};

function legacyTarget(request: NextRequest): string | null {
  const path = request.nextUrl.pathname.replace(/\/+$/, "").toLowerCase() || "/";
  const idx = request.nextUrl.searchParams.get("idx");
  if (idx && /^\d+$/.test(idx)) {
    if (path === "/notice") return `/notice/${idx}`;
    if (path === "/gallery") return `/gallery/${idx}`;
  }
  if (path in LEGACY) return LEGACY[path];
  if (/^\/program(\d+|20\d\d-\d+)$/.test(path)) return "/apply"; // 프로그램 신청 페이지들
  return null;
}

// ---------- 없는 글이면 404 상태코드 ----------
// 페이지는 미리 만든 틀을 먼저 보내므로(스트리밍) 본문에서 '없음'을 판단하면 상태코드가 200이 된다.
// 그래서 글 상세 주소는 응답을 시작하기 전에 Firestore에 문서가 있는지만 가볍게 확인한다.
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "nwdream-page";
const DETAIL = /^\/(ko|en|zh|ja)\/(notice|gallery|apply)\/([^/]+)\/?$/;
const COLLECTION = { notice: "notices", gallery: "gallery", apply: "programs" } as const;
const existsCache = new Map<string, { exists: boolean; at: number }>();

async function docExists(collection: string, id: string): Promise<boolean> {
  const key = `${collection}/${id}`;
  const hit = existsCache.get(key);
  if (hit && Date.now() - hit.at < (hit.exists ? 300_000 : 30_000)) return hit.exists;
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${key}?mask.fieldPaths=published`,
      { signal: AbortSignal.timeout(1500) },
    );
    if (res.status !== 200 && res.status !== 404) return true; // 확인 실패 시에는 그냥 페이지로 보냄
    const body = res.status === 200 ? ((await res.json()) as { fields?: { published?: { booleanValue?: boolean } } }) : null;
    const exists = Boolean(body) && body?.fields?.published?.booleanValue !== false;
    existsCache.set(key, { exists, at: Date.now() });
    if (existsCache.size > 500) existsCache.delete(existsCache.keys().next().value!);
    return exists;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const detail = pathname.match(DETAIL);
  if (detail) {
    const [, lang, kind, rawId] = detail;
    const id = decodeURIComponent(rawId);
    if (!(await docExists(COLLECTION[kind as keyof typeof COLLECTION], id))) {
      // 어떤 페이지와도 맞지 않는 주소로 바꿔 보내면 '페이지 없음' 화면이 404 상태코드로 나간다
      const url = request.nextUrl.clone();
      url.pathname = `/${lang}/_not-found`;
      return NextResponse.rewrite(url, { status: 404 });
    }
    return;
  }

  const legacy = legacyTarget(request);
  if (legacy !== null) {
    const url = request.nextUrl.clone();
    url.pathname = `/${pickLocale(request)}${legacy}`;
    url.search = "";
    return NextResponse.redirect(url, 308);
  }
  const hasPrefix = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasPrefix) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${pickLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // _next, api, 파일(확장자 있는 경로)은 제외
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
