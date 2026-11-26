import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "./config";
import type ko from "./dictionaries/ko.json";

export type Dictionary = typeof ko;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  ko: () => import("./dictionaries/ko.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  zh: () => import("./dictionaries/zh.json").then((m) => m.default),
  ja: () => import("./dictionaries/ja.json").then((m) => m.default),
};

/** 현재 URL의 언어(/ko, /en …)를 읽어 온다. 지원하지 않는 언어면 404. */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  if (!hasLocale(value)) notFound();
  return value;
}

/** 현재 언어의 고정 문구(메뉴, 버튼 등)를 불러온다. */
export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()]();
}
