// 기존 namwondream.com(아임웹) 콘텐츠 수집 → migration/data.json + migration/images/
//
//   node scripts/migrate/crawl.mjs
//
// - 공지사항, 활동 갤러리: 게시글 전체(제목, 본문 HTML, 작성일, 조회수, 이미지)
// - 일반 페이지(센터소개, 시설소개, 체험·교육 안내, 지난 프로그램): 섹션별 텍스트·HTML·이미지
// - 신청 페이지: 신청서 항목 구성
// - 모든 이미지 원본을 내려받아 보관 (아임웹 계약 종료 대비)
import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

const BASE = "https://namwondream.com";
const OUT = path.resolve("migration");
const IMG_DIR = path.join(OUT, "images");
const UA = "Mozilla/5.0 (compatible; nwdream-migration/1.0)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchHtml(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(new URL(url, BASE), { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await sleep(300); // 서버 부담 줄이기
      return cheerio.load(await res.text());
    } catch (e) {
      if (i === 2) throw new Error(`${url}: ${e.message}`);
      await sleep(1000);
    }
  }
}

// ---------- 이미지 ----------
const images = new Map(); // url -> { url, file, bytes }

function normalizeImg(src) {
  if (!src) return null;
  src = src.trim().replace(/^['"]|['"]$/g, "");
  if (!src || src.startsWith("data:")) return null;
  if (src.startsWith("//")) src = "https:" + src;
  try {
    const u = new URL(src, BASE);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.href;
  } catch {
    return null;
  }
}

function collectImages($, root) {
  const found = new Set();
  $(root)
    .find("img")
    .each((_, el) => {
      for (const attr of ["data-original", "data-src", "src"]) {
        const u = normalizeImg($(el).attr(attr));
        if (u) {
          found.add(u);
          break;
        }
      }
    });
  const html = $(root).html() ?? "";
  for (const m of html.matchAll(/background-image\s*:\s*url\(\s*(?:&quot;|['"])?([^'")&]+)/gi)) {
    const u = normalizeImg(m[1]);
    if (u) found.add(u);
  }
  // 사진 갤러리 위젯의 원본(data-src, data-bg, srcset 등): HTML 어디에 있든 아임웹 이미지 주소는 모두 수집
  for (const m of html.matchAll(/(?:https?:)?\/\/cdn\.imweb\.me\/(?:upload|thumbnail)\/[^"'\s)&,]+\.(?:jpe?g|png|gif|webp|svg)/gi)) {
    const u = normalizeImg(m[0]);
    if (u) found.add(u);
  }
  // 아이콘·트래킹 픽셀 등 제외 (아임웹 업로드/썸네일 이미지만)
  const list = [...found].filter((u) => /cdn\.imweb\.me\/(upload|thumbnail)\//.test(u) || /namwondream\.com/.test(u));
  list.forEach((u) => images.has(u) || images.set(u, { url: u }));
  return list;
}

async function downloadImages() {
  await mkdir(IMG_DIR, { recursive: true });
  let done = 0;
  for (const img of images.values()) {
    const ext = (path.extname(new URL(img.url).pathname).toLowerCase().match(/\.(jpe?g|png|gif|webp|svg)$/) || [".jpg"])[0];
    const file = createHash("sha1").update(img.url).digest("hex").slice(0, 16) + ext;
    img.file = `images/${file}`;
    const dest = path.join(IMG_DIR, file);
    try {
      await access(dest);
    } catch {
      try {
        const res = await fetch(img.url, { headers: { "User-Agent": UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        await writeFile(dest, buf);
        img.bytes = buf.length;
      } catch (e) {
        img.error = e.message;
      }
    }
    done++;
    if (done % 20 === 0) console.log(`  이미지 ${done}/${images.size}`);
  }
}

// ---------- 텍스트 ----------
function toText($, root) {
  const c = $(root).clone();
  c.find("script,style,noscript").remove();
  c.find("br").replaceWith("\n");
  c.find("p,div,li,h1,h2,h3,h4,h5,h6,tr,section").each((_, el) => {
    $(el).append("\n");
  });
  c.find("td,th").each((_, el) => {
    $(el).append(" \t ");
  });
  return c
    .text()
    .replace(/​/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanHtml($, root) {
  const c = $(root).clone();
  c.find("script,style,noscript").remove();
  return (c.html() ?? "").replace(/​/g, "").trim();
}

// ---------- 게시판 ----------
async function crawlBoard(board) {
  const ids = new Set();
  for (let page = 1; page <= 50; page++) {
    const $ = await fetchHtml(`/${board}/?page=${page}`);
    const before = ids.size;
    $('a[href*="bmode=view"]').each((_, a) => {
      const m = ($(a).attr("href") || "").match(/idx=(\d+)/);
      if (m) ids.add(m[1]);
    });
    if (ids.size === before) break;
  }
  console.log(`[${board}] 게시글 ${ids.size}건`);

  const posts = [];
  for (const idx of ids) {
    const url = `${BASE}/${board}/?idx=${idx}&bmode=view`;
    const $ = await fetchHtml(url);
    const bodyEl = $(".board_txt_area").first();
    const title = $(".view_tit").first().text().trim();
    // 작성일: 화면의 날짜(.date) → 없으면 검색엔진용 JSON-LD(datePublished)
    let published = null;
    $('script[type="application/ld+json"]').each((_, s) => {
      try {
        const j = JSON.parse($(s).text());
        published ??= j.datePublished ?? null;
      } catch {}
    });
    const date = $(".date").first().text().trim() || (published ?? "").slice(0, 10);
    const views = Number(($(".hit-count").first().text().match(/\d+/) || [0])[0]);
    const attachments = [];
    $('a[href*="/ajax/board_file_download"], a[href*="file_download"], a[download]').each((_, a) => {
      attachments.push({ name: $(a).text().trim(), href: new URL($(a).attr("href"), BASE).href });
    });
    posts.push({
      idx,
      url,
      title,
      date,
      published,
      views,
      html: cleanHtml($, bodyEl),
      text: toText($, bodyEl),
      images: collectImages($, bodyEl),
      attachments,
    });
    console.log(`  - ${date} ${title}`);
  }
  return posts;
}

// ---------- 일반 페이지 ----------
const PAGES = [
  { slug: "home", path: "/home", title: "홈" },
  { slug: "center-project", path: "/center1", title: "남원읍 중심지활성화사업" },
  { slug: "center-story", path: "/center2", title: "센터 설립 스토리" },
  { slug: "center-location", path: "/center3", title: "오시는 길" },
  { slug: "facility", path: "/facility", title: "시설소개" },
  { slug: "facility-fitness", path: "/Fitness", title: "몸키움 피트니스" },
  { slug: "facility-cafe", path: "/cafe", title: "카페남원" },
  { slug: "facility-library", path: "/library", title: "새마을작은도서관" },
  { slug: "facility-studyroom", path: "/studyroom", title: "공유학습실 / 마음키움실" },
  { slug: "programs-intro", path: "/Program", title: "체험·교육 안내" },
  { slug: "programs-past", path: "/Lastprogram", title: "지난 프로그램" },
];

// 모든 페이지에 공통으로 들어가는 섹션(서브메뉴, 하단 문의/메뉴)은 제외
// 메뉴 이름만 나열된 섹션인지: 메뉴 단어를 모두 지웠을 때 남는 글자가 없으면 서브메뉴로 본다.
const MENU_WORDS = [
  "INTRO", "NOTICE", "FACILITY", "APPLICATION", "센터 소개", "센터소개", "시설소개", "시설 안내", "알림마당",
  "남원읍 중심지활성화사업", "남원읍중심지활성화사업", "센터 설립 스토리", "오시는 길",
  "몸키움 피트니스", "카페남원", "새마을작은도서관", "공유학습실/마음키움실", "공유학습실 / 마음키움실",
  "공지사항", "체험·교육 안내", "체험 교육 안내", "지난 프로그램", "활동 갤러리", "활동갤러리",
];
const isChrome = (text) => {
  if (/운영 시간\s*AM 10:00/.test(text)) return true; // 하단 문의 안내
  let rest = text;
  for (const w of MENU_WORDS) rest = rest.split(w).join(" ");
  return rest.replace(/[\s|/·]+/g, "") === "";
};

function extractSections($) {
  const sections = [];
  $(".section_wrap").each((_, el) => {
    const cls = $(el).attr("class") || "";
    const text = toText($, el);
    const imgs = collectImages($, el);
    if (!text && imgs.length === 0) return;
    if (isChrome(text.replace(/\n/g, " "))) return;
    sections.push({
      id: $(el).attr("id"),
      variant: cls.includes("mobile_section") ? "mobile" : "pc",
      text,
      html: cleanHtml($, el),
      images: imgs,
    });
  });
  return sections;
}

async function crawlPages() {
  const pages = [];
  const seen = new Map();
  for (const p of PAGES) {
    const $ = await fetchHtml(p.path);
    const sections = extractSections($);
    const hash = createHash("sha1").update(sections.map((s) => s.text).join("|")).digest("hex");
    const sameAs = seen.get(hash) ?? null;
    if (!sameAs) seen.set(hash, p.slug);
    pages.push({ ...p, url: BASE + p.path, sameAs, sections: sameAs ? [] : sections });
    console.log(`[page] ${p.path} → 섹션 ${sections.length}개${sameAs ? ` (= ${sameAs} 와 동일)` : ""}`);
  }
  return pages;
}

// ---------- 신청서 ----------
const FORMS = [
  { slug: "creative-boardgame", path: "/program19", title: "창의 보드게임" },
  { slug: "kids-art", path: "/program20", title: "우리들은 화가" },
];

async function crawlForms() {
  const forms = [];
  for (const f of FORMS) {
    const $ = await fetchHtml(f.path);
    const fields = [];
    $("input, textarea, select").each((_, el) => {
      const $el = $(el);
      const type = $el.attr("type") || el.tagName;
      if (["hidden", "submit", "button"].includes(type)) return;
      const name = $el.attr("name") || $el.attr("id") || "";
      const group = $el.closest(".form-group, [class*=form_item], [class*=form-item], li, tr");
      const label = toText($, group.find("label, .title, .control-label").first()).split("\n")[0] || "";
      const option = type === "radio" || type === "checkbox" ? $el.parent().text().trim() || $el.attr("value") : undefined;
      fields.push({ name, type, label, option });
    });
    const sections = extractSections($);
    forms.push({ ...f, url: BASE + f.path, fields, sections });
    console.log(`[form] ${f.path} → 입력 항목 ${fields.length}개`);
  }
  return forms;
}

// ---------- 실행 ----------
await mkdir(OUT, { recursive: true });
const notices = await crawlBoard("notice");
const gallery = await crawlBoard("Gallery");
const pages = await crawlPages();
const forms = await crawlForms();
console.log(`이미지 ${images.size}개 내려받는 중…`);
await downloadImages();

const data = {
  crawledAt: new Date().toISOString(),
  source: BASE,
  notices,
  gallery,
  pages,
  forms,
  images: [...images.values()],
};
await writeFile(path.join(OUT, "data.json"), JSON.stringify(data, null, 2));

const failed = data.images.filter((i) => i.error);
console.log("\n=== 수집 완료 ===");
console.log(`공지 ${notices.length} / 갤러리 ${gallery.length} / 페이지 ${pages.length} / 신청서 ${forms.length}`);
console.log(`이미지 ${data.images.length}개 (실패 ${failed.length})`);
failed.forEach((i) => console.log("  실패:", i.url, i.error));
