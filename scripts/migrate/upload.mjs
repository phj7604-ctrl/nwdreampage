// migration/data.json → Firestore 업로드
//
//   node scripts/migrate/upload.mjs            (실제 업로드)
//   node scripts/migrate/upload.mjs --dry-run  (업로드할 문서만 출력)
//
// 인증: Firebase CLI 로그인(firebase login) 계정의 권한을 그대로 사용한다.
// 같은 문서 ID로 덮어쓰므로 여러 번 실행해도 중복되지 않는다.
//
// ⚠️ 사이트 운영을 시작한 뒤에는 실행하지 마세요. 관리자 화면에서 고친 이관 글이 원본으로 되돌아갑니다.
//    신청 프로그램(programs)은 관리자 화면에서 정리했으므로 --include-programs 를 줄 때만 덮어씁니다.
//
// 다국어 필드는 { ko, en, zh, ja } 형태로 저장한다. 이관 단계에서는 ko만 채운다.
// 이미지는 optimize-images.mjs 로 압축해 사이트 안(public/media/migrated)에 넣은 주소를 쓴다.
// (migration/image-map.json 이 있으면 적용, 없으면 원본 아임웹 주소 유지)
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const PROJECT = "nwdream-page";
const DRY = process.argv.includes("--dry-run");
const data = JSON.parse(await readFile(path.resolve("migration/data.json"), "utf8"));
const backupOf = new Map(data.images.map((i) => [i.url, i.file ? `migration/${i.file}` : null]));
let imageMap = {};
try {
  imageMap = JSON.parse(await readFile(path.resolve("migration/image-map.json"), "utf8"));
} catch {}

// ---------- 공통 ----------
const ko = (v) => ({ ko: v ?? "", en: "", zh: "", ja: "" });
const img = (url) => ({ src: imageMap[url] ?? url, original: url, backup: backupOf.get(url) ?? null });

/** 본문 HTML 안의 아임웹 이미지 주소(https://… 또는 //…)를 사이트 내부 주소로 바꾼다. */
function localizeHtml(html) {
  let out = html;
  for (const [orig, local] of Object.entries(imageMap)) {
    const noProto = orig.replace(/^https?:/, "");
    out = out.split(orig).join(local).split(noProto).join(local);
  }
  return out;
}
const ts = (iso) => ({ __ts: iso });
const now = new Date().toISOString();
const source = (url, extra = {}) => ({ site: "namwondream.com (imweb)", url, migratedAt: ts(now), ...extra });

function parseTitle(raw) {
  const title = raw.replace(/\s+/g, " ").trim();
  const category = (title.match(/^\[([^\]]+)\]/) || [])[1] ?? null; // [교육], [알림]
  const closed = /마감/.test(title);
  return { title, category, closed };
}

// ---------- 문서 만들기 ----------
const docs = []; // { path, fields }
const add = (p, fields) => docs.push({ path: p, fields });

for (const n of data.notices) {
  const { title, category, closed } = parseTitle(n.title);
  add(`notices/${n.idx}`, {
    title: ko(title),
    body: ko(localizeHtml(n.html)),
    category,
    status: closed ? "closed" : "open",
    pinned: false,
    published: true,
    publishedAt: ts(n.published ?? `${n.date}T00:00:00+09:00`),
    views: n.views,
    images: n.images.map(img),
    attachments: n.attachments,
    source: source(n.url, { idx: n.idx }),
    createdAt: ts(n.published ?? now),
    updatedAt: ts(now),
  });
}

for (const g of data.gallery) {
  add(`gallery/${g.idx}`, {
    title: ko(g.title.trim()),
    body: ko(localizeHtml(g.html)),
    images: g.images.map(img),
    published: true,
    publishedAt: ts(g.published ?? `${g.date}T00:00:00+09:00`),
    views: g.views,
    source: source(g.url, { idx: g.idx }),
    createdAt: ts(g.published ?? now),
    updatedAt: ts(now),
  });
}

for (const p of data.pages) {
  add(`pages/${p.slug}`, {
    title: ko(p.title),
    sameAs: p.sameAs, // 다른 페이지와 내용이 같은 경우 (시설 하위 페이지들)
    sections: p.sections.map((s, i) => ({
      order: i,
      variant: s.variant, // pc | mobile (아임웹은 PC/모바일용 섹션을 따로 둠)
      text: ko(s.text),
      html: ko(localizeHtml(s.html)),
      images: s.images.map(img),
      sourceId: s.id,
    })),
    source: source(p.url),
    updatedAt: ts(now),
  });
}

// 신청서: 아임웹 입력 항목을 우리 형식으로 정리 (전화번호 3칸·주소 2칸 → 1개 항목)
function normalizeForm(fields) {
  const out = [];
  for (const f of fields) {
    if (!f.label) continue; // 라벨 없는 내부 체크박스
    const existing = out.find((o) => o.label === f.label);
    if (existing) {
      if (f.type === "radio" && f.option) existing.options.push(f.option);
      continue;
    }
    const type =
      f.type === "checkbox" ? "consent" : f.type === "radio" ? "choice" : f.type === "tel" ? "phone" : f.label.includes("주소") ? "address" : f.label.includes("생년월일") ? "date" : "text";
    out.push({
      key: `f${out.length + 1}`,
      label: f.label,
      type,
      required: true,
      ...(type === "choice" ? { options: [f.option] } : {}),
      ...(type === "consent" ? { consentText: f.option } : {}),
    });
  }
  return out.map((f) => ({ ...f, label: ko(f.label), ...(f.options ? { options: f.options.map(ko) } : {}), ...(f.consentText ? { consentText: ko(f.consentText) } : {}) }));
}

for (const f of process.argv.includes("--include-programs") ? data.forms : []) {
  add(`programs/${f.slug}`, {
    title: ko(f.title),
    status: "closed", // 기존 사이트에서 신청 버튼 비활성 상태
    form: normalizeForm(f.fields),
    description: ko(f.sections.map((s) => s.text).join("\n\n")),
    images: [...new Set(f.sections.flatMap((s) => s.images))].map(img),
    published: true,
    source: source(f.url),
    updatedAt: ts(now),
  });
}

add("settings/site", {
  name: ko("남원드림센터"),
  phone: "064-764-9181",
  email: "nw-dream@naver.com",
  address: ko("제주특별자치도 서귀포시 남원읍 남원회관로 28"),
  hours: ko("AM 10:00 - PM 7:00"),
  kakaoMap: "https://kko.kakao.com/EyLfHR8PxJ",
  naverMap: "https://naver.me/GV26iZTP",
  updatedAt: ts(now),
});

// ---------- Firestore REST 형식 변환 ----------
function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (v.__ts) return { timestampValue: new Date(v.__ts).toISOString() };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
}

console.log(`업로드할 문서 ${docs.length}개`);
for (const d of docs) console.log("  -", d.path);
if (DRY) process.exit(0);

// Firebase CLI 로그인 토큰 사용
const require = createRequire(import.meta.url);
const { configstore } = require("firebase-tools/lib/configstore");
const auth = require("firebase-tools/lib/auth");
const tokens = configstore.get("tokens");
if (!tokens?.refresh_token) throw new Error("Firebase CLI 로그인이 필요합니다: npx firebase login");
const { access_token } = await auth.getAccessToken(tokens.refresh_token, []);

const root = `projects/${PROJECT}/databases/(default)/documents`;
for (let i = 0; i < docs.length; i += 400) {
  const writes = docs.slice(i, i + 400).map((d) => ({
    update: { name: `${root}/${d.path}`, fields: toValue(d.fields).mapValue.fields },
  }));
  const res = await fetch(`https://firestore.googleapis.com/v1/${root}:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
  });
  if (!res.ok) throw new Error(`Firestore 업로드 실패: ${res.status} ${await res.text()}`);
}
console.log("Firestore 업로드 완료");
