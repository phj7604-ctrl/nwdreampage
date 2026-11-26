// migration/extra.json → Firestore (추가 수집분)
//
//   node scripts/migrate/upload-extra.mjs [--dry-run]
//
// - pages/facility-fitness-guide, pages/facility-studyroom-guide : 시설 안내 상세
// - programs/{현재 2개}.curriculum                                : 강의내용(회차별 표) 추가 (다른 필드는 건드리지 않음)
// - programs/past-*                                              : 지난 프로그램 (archived=true)
// - settings/popup                                               : 메인 팝업
// - public/og.jpg                                                : 공유 미리보기 이미지
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import sharp from "sharp";

const PROJECT = "nwdream-page";
const DRY = process.argv.includes("--dry-run");
const extra = JSON.parse(await readFile("migration/extra.json", "utf8"));
const imageMap = JSON.parse(await readFile("migration/image-map.json", "utf8"));
const now = new Date().toISOString();

const ko = (v) => ({ ko: v ?? "", en: "", zh: "", ja: "" });
const img = (url) => ({ src: imageMap[url] ?? url, original: url });
const ts = (iso) => ({ __ts: iso });

const writes = []; // { path, fields, mask? }

// 1) 시설 안내 상세
for (const g of extra.guides) {
  writes.push({
    path: `pages/${g.slug}`,
    fields: {
      title: ko(g.title),
      sameAs: null,
      sections: g.sections.map((s, i) => ({ order: i, variant: s.variant, text: ko(s.text), html: ko(""), images: s.images.map(img), sourceId: s.id })),
      source: { site: "namwondream.com (imweb)", url: g.url, migratedAt: ts(now) },
      updatedAt: ts(now),
    },
  });
}

// 2) 현재 프로그램: 강의내용만 추가
const CURRENT_IDS = { "/program19": "creative-boardgame", "/program20": "kids-art" };
for (const c of extra.current) {
  const id = CURRENT_IDS[c.applyPath];
  if (!id || !c.curriculumHtml) continue;
  writes.push({ path: `programs/${id}`, fields: { curriculum: ko(c.curriculumHtml) }, mask: ["curriculum"] });
}

// 3) 지난 프로그램
const groups = [...new Set(extra.past.map((c) => c.group))]; // 페이지 순서 = 최신순
extra.past.forEach((c, i) => {
  const id = c.applyPath ? `past-${c.applyPath.replace(/^\//, "").toLowerCase()}` : `past-${c.group.replace(/\D+/g, "")}-${i}`;
  writes.push({
    path: `programs/${id}`,
    fields: {
      title: ko(c.title),
      summary: ko(c.summary),
      description: ko(""),
      period: ko(c.info.period.join(" ")),
      place: ko(c.info.place),
      target: ko(c.info.target),
      extraInfo: ko(c.info.extra.join("\n")),
      capacity: c.info.capacity,
      curriculum: ko(c.curriculumHtml ?? ""),
      images: c.image ? [img(c.image)] : [],
      form: [],
      status: "closed",
      archived: true,
      group: c.group, // 예) "2026 - 2"
      groupOrder: groups.indexOf(c.group), // 0 = 최신
      order: i,
      published: true,
      source: { site: "namwondream.com (imweb)", url: `https://namwondream.com/Lastprogram`, applyPath: c.applyPath, migratedAt: ts(now) },
      updatedAt: ts(now),
    },
  });
});

// 4) 메인 팝업
writes.push({
  path: "settings/popup",
  fields: {
    enabled: true,
    title: ko("카페남원 운영 안내"),
    image: imageMap[extra.meta.popupImage] ?? extra.meta.popupImage,
    link: "",
    updatedAt: ts(now),
  },
});

// 5) 공유 미리보기 이미지 → public/og.jpg (1200x630)
if (extra.meta.ogImage && !DRY) {
  const file = extra.images.find((i) => i.url === extra.meta.ogImage)?.file;
  if (file) {
    await sharp(path.join("migration", file)).resize(1200, 630, { fit: "cover" }).jpeg({ quality: 85 }).toFile("public/og.jpg");
    console.log("public/og.jpg 생성");
  }
}

// ---------- Firestore ----------
function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (v.__ts) return { timestampValue: new Date(v.__ts).toISOString() };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
}

console.log(`문서 ${writes.length}개`);
writes.forEach((w) => console.log("  -", w.path, w.mask ? `(필드: ${w.mask.join(",")})` : ""));
if (DRY) process.exit(0);

const require = createRequire(import.meta.url);
const { configstore } = require("firebase-tools/lib/configstore");
const auth = require("firebase-tools/lib/auth");
const { access_token } = await auth.getAccessToken(configstore.get("tokens").refresh_token, []);
const root = `projects/${PROJECT}/databases/(default)/documents`;
const res = await fetch(`https://firestore.googleapis.com/v1/${root}:commit`, {
  method: "POST",
  headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    writes: writes.map((w) => ({
      update: { name: `${root}/${w.path}`, fields: toValue(w.fields).mapValue.fields },
      ...(w.mask ? { updateMask: { fieldPaths: w.mask }, currentDocument: { exists: true } } : {}),
    })),
  }),
});
if (!res.ok) throw new Error(`업로드 실패 ${res.status}: ${await res.text()}`);
console.log("Firestore 업로드 완료");
