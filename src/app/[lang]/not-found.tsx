import Link from "next/link";

const MESSAGES = [
  { lang: "ko", title: "페이지를 찾을 수 없습니다", body: "주소가 바뀌었거나 삭제된 글일 수 있어요.", home: "홈으로" },
  { lang: "en", title: "Page not found", body: "The address may have changed or the post was removed.", home: "Home" },
  { lang: "zh", title: "找不到页面", body: "地址可能已更改或内容已删除。", home: "首页" },
  { lang: "ja", title: "ページが見つかりません", body: "アドレスが変更されたか、削除された可能性があります。", home: "ホーム" },
];

/** 사이트 안에서 notFound() 가 불렸을 때 (예: 없는 하위 메뉴 주소) — 머리말·꼬리말과 함께 표시 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-6xl font-bold text-brand">404</p>
      <div className="mt-8 space-y-5">
        {MESSAGES.map((m, i) => (
          <div key={m.lang} lang={m.lang} className={i === 0 ? "" : "text-sm"}>
            <h1 className={i === 0 ? "text-2xl font-bold" : "font-semibold text-muted"}>{m.title}</h1>
            <p className="mt-1 text-muted">{m.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {MESSAGES.map((m) => (
          <Link
            key={m.lang}
            href={`/${m.lang}`}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
              m.lang === "ko" ? "bg-brand text-white dark:text-background" : "border border-border hover:border-brand hover:text-brand"
            }`}
          >
            {m.home}
          </Link>
        ))}
      </div>
    </div>
  );
}
