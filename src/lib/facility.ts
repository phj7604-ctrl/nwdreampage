import { isDecorImage, type PageSection } from "@/lib/content";

// 기존 사이트는 시설 4곳을 한 페이지(facility)에 모아 두었으므로,
// 섹션 첫 줄의 시설 이름으로 나눠 각 시설 페이지에 보여 준다.
export const FACILITIES = {
  fitness: { key: "fitness", match: "피트니스" },
  cafe: { key: "cafe", match: "카페" },
  library: { key: "library", match: "도서관" },
  studyroom: { key: "studyroom", match: "공유학습실" },
} as const;
export type FacilitySlug = keyof typeof FACILITIES;
export const facilitySlugs = Object.keys(FACILITIES) as FacilitySlug[];
export const isFacilitySlug = (s: string): s is FacilitySlug => s in FACILITIES;

// 시설별 상세 안내 페이지 (기존 /Fitness1, /studyroom1)
export const FACILITY_GUIDES: Partial<Record<FacilitySlug, string>> = {
  fitness: "facility-fitness-guide",
  studyroom: "facility-studyroom-guide",
};

export function sectionsFor(slug: FacilitySlug, sections: PageSection[]) {
  let current: FacilitySlug | null = null;
  return [...sections]
    .sort((a, b) => a.order - b.order)
    .filter((s) => {
      const first = (s.text.ko ?? "").split("\n")[0];
      const hit = facilitySlugs.find((k) => first.includes(FACILITIES[k].match));
      if (hit) current = hit;
      return current === slug;
    });
}

/** 시설 대표 사진 (메인 화면 카드용) */
export function facilityCover(slug: FacilitySlug, sections: PageSection[]) {
  return sectionsFor(slug, sections)
    .flatMap((s) => s.images.map((i) => i.src))
    .find((src) => !isDecorImage(src));
}
