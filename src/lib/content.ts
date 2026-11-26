// 공개 콘텐츠(Firestore) 읽기 — 서버 컴포넌트 전용
//
// Firestore 보안 규칙상 공개 컬렉션은 누구나 읽을 수 있으므로, 서비스 계정 없이
// REST API로 읽는다. 결과는 "use cache"로 1분간 캐시하고, 관리자가 글을 수정하면
// revalidateTag(CONTENT_TAG)로 즉시 갱신한다(관리자 기능 단계에서 연결).
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Locale } from "@/i18n/config";

export const CONTENT_TAG = "content";

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "nwdream-page";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// ---------- 타입 ----------
export type Localized = Partial<Record<Locale, string>>;
export type ImageRef = { src: string; original?: string | null };

export type Notice = {
  id: string;
  title: Localized;
  body: Localized;
  category: string | null;
  status: "open" | "closed";
  pinned: boolean;
  publishedAt: string;
  views: number;
  images: ImageRef[];
};

export type GalleryItem = {
  id: string;
  title: Localized;
  body: Localized;
  images: ImageRef[];
  publishedAt: string;
  views: number;
};

export type PageSection = {
  order: number;
  variant: "pc" | "mobile";
  text: Localized;
  html: Localized;
  images: ImageRef[];
};

export type ContentPage = {
  id: string;
  title: Localized;
  sameAs: string | null;
  sections: PageSection[];
};

export type FormFieldType = "text" | "textarea" | "phone" | "date" | "choice" | "address" | "consent";

export type FormField = {
  key: string;
  label: Localized;
  type: FormFieldType;
  required: boolean;
  options?: Localized[];
  consentText?: Localized;
};

export type Program = {
  id: string;
  title: Localized;
  summary?: Localized;
  description: Localized;
  period?: Localized;
  place?: Localized;
  target?: Localized;
  capacity?: number | null;
  status: "open" | "closed";
  published?: boolean;
  order?: number;
  images: ImageRef[];
  form: FormField[];
  /** 기타 안내(재료비 등), 여러 줄 */
  extraInfo?: Localized;
  /** 강의내용: 회차별 커리큘럼 표(HTML) */
  curriculum?: Localized;
  /** 지난 프로그램으로 옮긴 경우 */
  archived?: boolean;
  /** 지난 프로그램 묶음 이름 (예: "2026 - 2") */
  group?: string;
  /** 묶음 정렬 (0 = 최신) */
  groupOrder?: number;
};

export type Popup = {
  enabled: boolean;
  title: Localized;
  image: string;
  link: string;
};

export type SiteSettings = {
  name: Localized;
  phone: string;
  email: string;
  address: Localized;
  hours: Localized;
  kakaoMap: string;
  naverMap: string;
};

// ---------- 다국어 ----------
/** 현재 언어 값이 비어 있으면 한국어로 대체 */
export function tr(value: Localized | undefined, locale: Locale): string {
  return (value?.[locale] || value?.ko || "").trim();
}

export function isTranslated(value: Localized | undefined, locale: Locale) {
  return locale === "ko" || Boolean(value?.[locale]?.trim());
}

// ---------- Firestore REST 값 변환 ----------
type FsValue = Record<string, unknown>;

function fromValue(v: FsValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) {
    const arr = (v.arrayValue as { values?: FsValue[] }).values ?? [];
    return arr.map(fromValue);
  }
  if ("mapValue" in v) return fromFields((v.mapValue as { fields?: Record<string, FsValue> }).fields);
  return null;
}

function fromFields(fields: Record<string, FsValue> = {}) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromValue(v)]));
}

type FsDoc = { name: string; fields?: Record<string, FsValue> };
const toDoc = <T>(d: FsDoc) => ({ id: d.name.split("/").pop()!, ...fromFields(d.fields) }) as T;

async function fsList<T>(collection: string): Promise<T[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 60, expire: 3600 }); // stale 5분 이상이어야 정적 셸에 포함됨
  cacheTag(CONTENT_TAG);
  const res = await fetch(`${BASE}/${collection}?pageSize=300`);
  if (!res.ok) throw new Error(`Firestore ${collection}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { documents?: FsDoc[] };
  return (json.documents ?? []).map((d) => toDoc<T>(d));
}

async function fsGet<T>(path: string): Promise<T | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 60, expire: 3600 }); // stale 5분 이상이어야 정적 셸에 포함됨
  cacheTag(CONTENT_TAG);
  const res = await fetch(`${BASE}/${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore ${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return toDoc<T>((await res.json()) as FsDoc);
}

const byDateDesc = (a: { publishedAt: string }, b: { publishedAt: string }) =>
  b.publishedAt.localeCompare(a.publishedAt);

// ---------- 공개 API ----------
export async function getNotices(): Promise<Notice[]> {
  const list = await fsList<Notice & { published?: boolean }>("notices");
  return list
    .filter((n) => n.published !== false)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || byDateDesc(a, b));
}

export async function getNotice(id: string) {
  const n = await fsGet<Notice & { published?: boolean }>(`notices/${encodeURIComponent(id)}`);
  return n && n.published !== false ? n : null;
}

export async function getGallery(): Promise<GalleryItem[]> {
  const list = await fsList<GalleryItem & { published?: boolean }>("gallery");
  return list.filter((g) => g.published !== false).sort(byDateDesc);
}

export async function getGalleryItem(id: string) {
  const g = await fsGet<GalleryItem & { published?: boolean }>(`gallery/${encodeURIComponent(id)}`);
  return g && g.published !== false ? g : null;
}

export async function getPage(slug: string): Promise<ContentPage | null> {
  const page = await fsGet<ContentPage>(`pages/${encodeURIComponent(slug)}`);
  if (page?.sameAs) return getPage(page.sameAs);
  return page;
}

/** 신청 프로그램: 모집중 먼저, 그다음 정렬 순서(order) */
export async function getPrograms(): Promise<Program[]> {
  const list = await fsList<Program>("programs");
  return list
    .filter((p) => p.published !== false && !p.archived)
    .sort(
      (a, b) =>
        Number(b.status === "open") - Number(a.status === "open") ||
        (a.order ?? 999) - (b.order ?? 999) ||
        tr(a.title, "ko").localeCompare(tr(b.title, "ko")),
    );
}

/** 지난 프로그램: 묶음(예: "2026 - 2")별로, 최신 묶음 먼저 */
export async function getPastProgramGroups(): Promise<{ group: string; programs: Program[] }[]> {
  const list = (await fsList<Program>("programs")).filter((p) => p.published !== false && p.archived);
  const groups = new Map<string, Program[]>();
  // 묶음 이름 내림차순("2026 - 2" > "2026 - 1" > "2025"), 묶음 안에서는 순서(order)
  list
    .sort(
      (a, b) =>
        (b.group ?? "").localeCompare(a.group ?? "", "ko", { numeric: true }) || (a.order ?? 999) - (b.order ?? 999),
    )
    .forEach((p) => {
      const g = p.group || "";
      groups.set(g, [...(groups.get(g) ?? []), p]);
    });
  return [...groups].map(([group, programs]) => ({ group, programs }));
}

export async function getPopup(): Promise<Popup | null> {
  const p = await fsGet<Popup>("settings/popup");
  return p?.enabled && p.image ? p : null;
}

export async function getProgram(id: string) {
  const p = await fsGet<Program>(`programs/${encodeURIComponent(id)}`);
  return p && p.published !== false ? p : null;
}

export async function getSettings(): Promise<SiteSettings | null> {
  return fsGet<SiteSettings>("settings/site");
}

// ---------- 표시용 도우미 ----------
export function formatDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}

/** 제목 앞의 [교육]·[알림] 분류 표시는 배지로 따로 보여 주므로 제목에서 뺀다. */
export function stripCategory(title: string) {
  return title.replace(/^\s*\[[^\]]+\]\s*/, "");
}

/** 관리자만 쓸 수 있는 콘텐츠지만, 혹시 모를 스크립트·이벤트 속성은 제거 */
export function sanitizeHtml(html: string) {
  return html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|iframe|object|embed)[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "$1=$2#$2");
}

/**
 * 기존 사이트의 장식용 배경 이미지 — 내용 사진이 아니므로 화면에 넣지 않음.
 * 대부분 투명한 PNG 오버레이("DREAM" 워터마크 11개, 원형 장식 3개)를 이미지 통계로 찾아낸 목록.
 */
const DECOR_IMAGES = [
  "1d275c071a48e7d6", "255ee441d6c67fbc", "5433be75d8c557a0", "57185a2076ca4013", "6b32e26d7b779307", "7f9d4d465483301b",
  "a2ecd0f698c56272", "b1acebd73cbe5802", "b52431333ea51e54", "d4dd4d02a6bca2d4", "dd57561a68c176a3",
  "6a1e387e51870028", "dc77d24615d2edd9", "f7e60d32fc471bea",
];
export const isDecorImage = (src: string) => DECOR_IMAGES.some((k) => src.includes(k));

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");

/** HTML 안의 가장 바깥쪽 <table> 들의 위치 (중첩 표 고려) */
function findTopTables(html: string): [number, number][] {
  const out: [number, number][] = [];
  const re = /<(\/?)table\b[^>]*>/gi;
  let depth = 0;
  let start = -1;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    if (!m[1]) {
      if (depth++ === 0) start = m.index;
    } else if (depth > 0 && --depth === 0) out.push([start, m.index + m[0].length]);
  }
  return out;
}

/** 표에서 아임웹 스타일·속성을 걷어 내고 칸 병합(colspan/rowspan)만 남김 */
function cleanTable(table: string) {
  return table
    .replace(/<(img|colgroup|col)\b[^>]*>/gi, "")
    .replace(/<\/?(span|font|colgroup)\b[^>]*>/gi, "")
    .replace(/<([a-z0-9]+)\b([^>]*)>/gi, (_, tag: string, attrs: string) => {
      const keep = [...attrs.matchAll(/\s(colspan|rowspan)\s*=\s*("[^"]*"|'[^']*'|\d+)/gi)].map((m) => ` ${m[1]}=${m[2]}`).join("");
      return `<${tag}${keep}>`;
    })
    .replace(/​/g, "");
}

function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/​/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 섹션을 '글'과 '표'로 나눈다. 원본 HTML에 표가 있으면 표는 그대로 살리고(운영시간·요금 등),
 * 나머지 부분만 글로 보여 준다. 표가 없으면 저장된 글을 그대로 쓴다.
 */
export function sectionParts(section: PageSection, locale: Locale): { text: string; tables: string[]; images: string[] } {
  const html = tr(section.html, locale);
  const images = [...new Set(section.images.map((i) => i.src))].filter((s) => !isDecorImage(s));
  const ranges = html ? findTopTables(html) : [];
  if (ranges.length === 0) return { text: tr(section.text, locale), tables: [], images };
  let rest = "";
  let last = 0;
  for (const [s, e] of ranges) {
    rest += html.slice(last, s) + "\n";
    last = e;
  }
  rest += html.slice(last);
  return {
    text: htmlToText(rest),
    tables: ranges.map(([s, e]) => cleanTable(html.slice(s, e))).filter((t) => /<td|<th/i.test(t)),
    images,
  };
}

/**
 * 이관된 페이지 섹션 정리: 아임웹은 같은 내용을 PC용·모바일용 섹션으로 중복해 두므로
 * PC 섹션을 기본으로 쓰고, PC에 없는 내용의 모바일 섹션만 추가한다.
 */
export function pickSections(sections: PageSection[]): PageSection[] {
  const norm = (s: string) => s.replace(/[\s|]+/g, "");
  const pcText = sections.filter((s) => s.variant === "pc").map((s) => norm(s.text.ko ?? "")).join("");
  return sections
    .filter((s) => s.variant === "pc" || !pcText.includes(norm(s.text.ko ?? "")))
    .sort((a, b) => a.order - b.order);
}
