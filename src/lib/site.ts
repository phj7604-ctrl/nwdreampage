import type { Dictionary } from "@/i18n/get-dictionary";

type NavKey = keyof Dictionary["nav"];

export type MenuItem = { key: NavKey; href: string };
export type MenuGroup = MenuItem & { children: MenuItem[] };

/** 기존 namwondream.com 메뉴 구조를 그대로 옮긴 것. href는 언어 접두어(/ko 등) 없이 적는다. */
export const menu: MenuGroup[] = [
  {
    key: "center",
    href: "/center/project",
    children: [
      { key: "centerProject", href: "/center/project" },
      { key: "centerStory", href: "/center/story" },
      { key: "centerLocation", href: "/center/location" },
    ],
  },
  {
    key: "facility",
    href: "/facility/fitness",
    children: [
      { key: "fitness", href: "/facility/fitness" },
      { key: "cafe", href: "/facility/cafe" },
      { key: "library", href: "/facility/library" },
      { key: "studyroom", href: "/facility/studyroom" },
    ],
  },
  {
    key: "news",
    href: "/notice",
    children: [
      { key: "notice", href: "/notice" },
      { key: "programs", href: "/programs" },
      { key: "pastPrograms", href: "/programs/past" },
      { key: "gallery", href: "/gallery" },
    ],
  },
];

export const applyLink: MenuItem = { key: "apply", href: "/apply" };

/** 하위 페이지 상단 사진 배너 (기존 사이트 배너 사진) — 메뉴 묶음별 */
export const banners: Record<"center" | "facility" | "news" | "apply", { image: string; eyebrow: string }> = {
  center: { image: "/media/migrated/ab5da595d69c47c1.webp", eyebrow: "INTRO" },
  facility: { image: "/media/migrated/18350baf203f0e1f.webp", eyebrow: "FACILITY" },
  news: { image: "/media/migrated/acf28744fe1faca3.webp", eyebrow: "NOTICE" },
  apply: { image: "/media/migrated/a922223f82257f52.webp", eyebrow: "APPLICATION" },
};

/** 메인 화면 큰 배경 사진 (센터 건물) */
export const heroImage = "/media/migrated/1b517fdf2a016553.webp";

/** 센터 기본 정보. 다음 단계에서 관리자 화면(Firestore settings)으로 옮겨 수정 가능하게 한다. */
export const centerInfo = {
  phone: "064-764-9181",
  email: "nw-dream@naver.com",
  kakaoMap: "https://kko.kakao.com/EyLfHR8PxJ",
  naverMap: "https://naver.me/GV26iZTP",
};
