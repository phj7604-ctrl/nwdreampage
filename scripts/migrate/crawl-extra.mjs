// 1차 수집에서 빠진 콘텐츠 추가 수집 → migration/extra.json (+ migration/images/)
//
//   node scripts/migrate/crawl-extra.mjs
//
// - 시설 안내 상세 페이지: /Fitness1 (운동기구), /studyroom1 (공유학습실·마음키움실)
// - 프로그램 카드(현재 /Program, 지난 /Lastprogram): 사진, 정보, "강의내용" 팝업(회차별 커리큘럼)
// - 메인 팝업 이미지, 공유 미리보기(og) 이미지
import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://namwondream.com";
const UA = "Mozilla/5.0 (compatible; nwdream-migration/1.0)";
const IMG_DIR = path.resolve("migration/images");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(new URL(url, BASE), { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  await sleep(300);
  return cheerio.load(await res.text());
}

/** 아임웹 "모달 메뉴"(강의내용 팝업) HTML */
async function getModal(menuCode, baseCode) {
  const res = await fetch(`${BASE}/ajax/get_modal_menu.cm`, {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
    body: new URLSearchParams({ menu_code: menuCode, base_menu_code: baseCode }),
  });
  await sleep(300);
  const j = await res.json();
  if (j.msg !== "SUCCESS") throw new Error(`modal ${menuCode}: ${j.msg}`);
  return j.html;
}

// ---------- 공통 도우미 ----------
const images = new Map();
function norm(src) {
  if (!src) return null;
  src = src.trim().replace(/^['"]|['"]$/g, "").replace(/&quot;/g, "");
  if (src.startsWith("//")) src = "https:" + src;
  return /^https:\/\/cdn\.imweb\.me\/(upload|thumbnail)\//.test(src) ? src : null;
}
function imagesIn($, el) {
  const found = new Set();
  const html = $(el).html() ?? "";
  $(el)
    .find("img")
    .each((_, i) => {
      const u = norm($(i).attr("data-original") || $(i).attr("data-src") || $(i).attr("src"));
      if (u) found.add(u);
    });
  for (const m of html.matchAll(/(?:https?:)?\/\/cdn\.imweb\.me\/(?:upload|thumbnail)\/[^"'\s)&,]+\.(?:jpe?g|png|gif|webp)/gi)) {
    const u = norm(m[0]);
    if (u) found.add(u);
  }
  const list = [...found];
  list.forEach((u) => images.set(u, { url: u }));
  return list;
}
function toText($, el) {
  const c = $(el).clone();
  c.find("script,style,noscript").remove();
  c.find("br").replaceWith("\n");
  c.find("p,div,li,h1,h2,h3,h4,h5,h6,tr").each((_, e) => {
    $(e).append("\n");
  });
  c.find("td,th").each((_, e) => {
    $(e).append(" \t ");
  });
  return c.text().replace(/​/g, "").replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
/** 표 위주의 깔끔한 HTML (아임웹 스타일·클래스 제거) */
function cleanTables($, el) {
  const out = [];
  $(el)
    .find("table")
    .filter((_, t) => $(t).parents("table").length === 0)
    .each((_, t) => {
      const c = $(t).clone();
      c.find("*").each((_, e) => {
        const keep = ["colspan", "rowspan"];
        for (const a of Object.keys(e.attribs ?? {})) if (!keep.includes(a)) $(e).removeAttr(a);
      });
      c.removeAttr("style").removeAttr("class");
      out.push($.html(c).replace(/​/g, "").replace(/&nbsp;/g, " "));
    });
  return out.join("\n");
}

// ---------- 1) 시설 안내 상세 ----------
async function crawlGuide(pathname, slug, title) {
  const $ = await get(pathname);
  const sections = [];
  $(".section_wrap").each((_, el) => {
    const cls = $(el).attr("class") || "";
    const text = toText($, el);
    const imgs = imagesIn($, el);
    if (!text && !imgs.length) return;
    if (/^INTRO/.test(text) || /운영 시간\s*AM 10:00/.test(text) || /^센터소개\s*남원읍중심지활성화사업/.test(text.replace(/\n/g, " "))) return;
    // JSON-LD 스크립트 텍스트 제거
    sections.push({ id: $(el).attr("id"), variant: cls.includes("mobile_section") ? "mobile" : "pc", text: text.replace(/\{\s*"@context"[\s\S]*?\}\s*/g, "").trim(), images: imgs });
  });
  console.log(`[guide] ${pathname} → 섹션 ${sections.length}개, 사진 ${sections.reduce((a, s) => a + s.images.length, 0)}장`);
  return { slug, title, url: BASE + pathname, sections };
}

// ---------- 2) 프로그램 카드 ----------
function parseInfo(lines) {
  const info = { period: [], place: "", target: "", capacity: null, extra: [] };
  for (const l of lines) {
    const kv = l.match(/^(인원|정원|장소|대상|재료비|수강료|비용|준비물)\s*[:：]\s*(.+)$/);
    if (kv) {
      const [, k, v] = kv;
      if (k === "장소") info.place = v.trim();
      else if (k === "대상") info.target = v.trim();
      else if (k === "인원" || k === "정원") {
        const n = parseInt(v, 10);
        if (Number.isFinite(n)) info.capacity = n;
        else info.extra.push(l);
      } else info.extra.push(l);
    } else if (/\d{4}\.\d{1,2}\.\d{1,2}|매주|차시|\(\s*매/.test(l)) info.period.push(l);
    else info.extra.push(l);
  }
  return info;
}

async function crawlProgramCards(pathname) {
  const $ = await get(pathname);
  const cards = [];
  $(".section_wrap.pc_section").each((si, sec) => {
    const secText = toText($, sec);
    if (/^NOTICE/.test(secText) || !secText) return;
    const group = (secText.split("\n")[0] || "").trim(); // 예) "2026 - 2"
    // 카드 = 사진 1장과 글을 함께 가진 가장 작은 칸(col-dz)
    $(sec)
      .find(".col-dz")
      .filter((_, c) => {
        const imgs = imagesIn($, c).length;
        const txt = toText($, c);
        if (imgs !== 1 || txt.length < 8) return false;
        return !$(c)
          .find(".col-dz")
          .toArray()
          .some((inner) => imagesIn($, inner).length === 1 && toText($, inner).length >= 8);
      })
      .each((ci, c) => {
        const lines = toText($, c)
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !/^(강의내용|신청하기)$/.test(l));
        // 버튼(강의내용·신청하기)은 카드 바깥 칸에 있으므로, 사진이 1장인 범위에서 가장 큰 칸까지 올라가 찾는다
        let scope = $(c);
        for (let p = scope.parent().closest(".col-dz"); p.length && imagesIn($, p).length === 1; p = p.parent().closest(".col-dz")) scope = p;
        const modal = (scope.find('a[href*="openModalMenu"]').attr("href") || "").match(/openModalMenu\('([^']+)',\s*'([^']+)'\)/);
        const applyHref = scope
          .find("a[href]")
          .toArray()
          .map((a) => $(a).attr("href"))
          .find((h) => /^\/program/i.test(h ?? ""));
        // 제목 줄에 날짜가 붙어 있는 경우("우리들은 화가2026.09.05 ~") 분리
        let [title, ...rest] = lines;
        let summary = "";
        const DATE = /^(.*?)(\d{4}\.\d{1,2}\.\d{1,2}.*)$/;
        const glued = title.match(DATE);
        if (glued && glued[1].trim()) {
          title = glued[1].trim();
          rest = [glued[2].trim(), ...rest];
        } else if (rest[0]) {
          // 다음 줄 앞부분(날짜 앞)이 짧으면 제목이 두 줄로 나뉜 것, 길면 소개 문구
          const m = rest[0].match(DATE);
          if (m && m[1].trim()) {
            if (m[1].trim().length <= 12) title = `${title.replace(/,$/, "")} ${m[1].trim()}`;
            else summary = m[1].trim();
            rest = [m[2].trim(), ...rest.slice(1)];
          }
        }
        cards.push({
          page: pathname,
          group,
          order: cards.length,
          title,
          summary,
          lines: rest,
          info: parseInfo(rest),
          image: imagesIn($, c)[0],
          modal: modal ? { code: modal[1], base: modal[2] } : null,
          applyPath: applyHref ?? null,
        });
      });
  });

  for (const card of cards) {
    if (!card.modal) continue;
    const html = await getModal(card.modal.code, card.modal.base);
    const $m = cheerio.load(html);
    card.curriculumTitle = $m(".modal-title").first().text().trim();
    card.curriculumHtml = cleanTables($m, $m(".modal-body"));
    card.curriculumText = toText($m, $m(".modal-body"));
    imagesIn($m, $m(".modal-body"));
  }
  console.log(`[cards] ${pathname} → ${cards.length}개 (강의내용 ${cards.filter((c) => c.curriculumHtml).length}개)`);
  return cards;
}

// ---------- 3) 팝업·공유 이미지 ----------
const POPUP_IMAGE = "https://cdn.imweb.me/upload/S2025021331f3c08da094f/8b015b3d52994.jpg"; // 메인 팝업(카페 운영 안내)
async function crawlMeta() {
  const $ = await get("/home");
  const og = norm($('meta[property="og:image"]').attr("content"));
  if (og) images.set(og, { url: og });
  images.set(POPUP_IMAGE, { url: POPUP_IMAGE });
  return { ogImage: og, popupImage: POPUP_IMAGE };
}

// ---------- 이미지 내려받기 ----------
async function download() {
  await mkdir(IMG_DIR, { recursive: true });
  for (const img of images.values()) {
    const ext = (path.extname(new URL(img.url).pathname).toLowerCase().match(/\.(jpe?g|png|gif|webp)$/) || [".jpg"])[0];
    const file = createHash("sha1").update(img.url).digest("hex").slice(0, 16) + ext;
    img.file = `images/${file}`;
    try {
      await access(path.join(IMG_DIR, file));
    } catch {
      const res = await fetch(img.url, { headers: { "User-Agent": UA } });
      if (!res.ok) {
        img.error = `HTTP ${res.status}`;
        continue;
      }
      await writeFile(path.join(IMG_DIR, file), Buffer.from(await res.arrayBuffer()));
    }
  }
}

const guides = [await crawlGuide("/Fitness1", "facility-fitness-guide", "몸키움 피트니스 시설 안내"), await crawlGuide("/studyroom1", "facility-studyroom-guide", "공유학습실 · 마음키움실 시설 안내")];
const current = await crawlProgramCards("/Program");
const past = await crawlProgramCards("/Lastprogram");
const meta = await crawlMeta();
await download();
await writeFile("migration/extra.json", JSON.stringify({ crawledAt: new Date().toISOString(), guides, current, past, meta, images: [...images.values()] }, null, 2));
const failed = [...images.values()].filter((i) => i.error);
console.log(`\n이미지 ${images.size}개 (실패 ${failed.length})`);
failed.forEach((f) => console.log("  실패", f.url, f.error));
