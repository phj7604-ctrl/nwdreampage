export const locales = ["ko", "en", "zh", "ja"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ko";

export const localeLabels: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  zh: "中文",
  ja: "日本語",
};

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

/** 쿠키 이름: 사용자가 마지막으로 고른 언어 */
export const LOCALE_COOKIE = "NEXT_LOCALE";
