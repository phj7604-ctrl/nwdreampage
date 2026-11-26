// 백업한 기존 사진(migration/images) → 압축 WebP(public/media/migrated)
//
//   node scripts/migrate/optimize-images.mjs
//
// - 가로 최대 1920px, WebP 품질 80 (움직이는 GIF는 움직이는 WebP로)
// - SVG는 그대로 복사
// - 결과 매핑을 migration/image-map.json 에 저장 → upload.mjs 가 Firestore 주소 교체에 사용
import sharp from "sharp";
import { mkdir, readFile, writeFile, copyFile, stat } from "node:fs/promises";
import path from "node:path";

const data = JSON.parse(await readFile("migration/data.json", "utf8"));
// 추가 수집분(crawl-extra.mjs)의 사진도 함께 처리
try {
  const extra = JSON.parse(await readFile("migration/extra.json", "utf8"));
  const seen = new Set(data.images.map((i) => i.url));
  data.images.push(...extra.images.filter((i) => !seen.has(i.url)));
} catch {}
const OUT_DIR = "public/media/migrated";
const PUBLIC_PREFIX = "/media/migrated";
await mkdir(OUT_DIR, { recursive: true });

const map = {}; // 원본 URL → 사이트 내부 주소
let before = 0;
let after = 0;

for (const img of data.images) {
  if (!img.file) continue;
  const src = path.join("migration", img.file);
  const base = path.basename(img.file, path.extname(img.file));
  const ext = path.extname(img.file).toLowerCase();
  before += (await stat(src)).size;

  let outName;
  if (ext === ".svg") {
    outName = base + ".svg";
    await copyFile(src, path.join(OUT_DIR, outName));
  } else {
    outName = base + ".webp";
    await sharp(src, { animated: ext === ".gif" })
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(OUT_DIR, outName));
  }
  after += (await stat(path.join(OUT_DIR, outName))).size;
  map[img.url] = `${PUBLIC_PREFIX}/${outName}`;
}

await writeFile("migration/image-map.json", JSON.stringify(map, null, 2));
const mb = (n) => (n / 1024 / 1024).toFixed(1) + "MB";
console.log(`사진 ${Object.keys(map).length}장: ${mb(before)} → ${mb(after)}`);
