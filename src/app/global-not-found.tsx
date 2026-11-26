import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다 | 남원드림센터",
  robots: { index: false },
};

const MESSAGES = [
  { lang: "ko", title: "페이지를 찾을 수 없습니다", body: "주소가 바뀌었거나 삭제된 글일 수 있어요.", home: "홈으로" },
  { lang: "en", title: "Page not found", body: "The address may have changed or the post was removed.", home: "Home" },
  { lang: "zh", title: "找不到页面", body: "地址可能已更改或内容已删除。", home: "首页" },
  { lang: "ja", title: "ページが見つかりません", body: "アドレスが変更されたか、削除された可能性があります。", home: "ホーム" },
];

/** 어떤 주소와도 맞지 않을 때(없는 글 포함) 보여 주는 404 페이지 — 4개 언어 */
export default function GlobalNotFound() {
  return (
    <html lang="ko">
      <body className="flex min-h-screen items-center justify-center px-4 py-16">
        <main className="w-full max-w-md text-center">
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
              <a
                key={m.lang}
                href={`/${m.lang}`}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                  m.lang === "ko" ? "bg-brand text-white" : "border border-border hover:border-brand hover:text-brand"
                }`}
              >
                {m.home}
              </a>
            ))}
          </div>
        </main>
      </body>
    </html>
  );
}
