import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { Suspense } from "react";
import { locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { QuickLinks } from "@/components/quick-links";
import "../globals.css";

const notoKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://namwondream.com"),
    title: { default: dict.meta.title, template: `%s | ${dict.meta.siteName}` },
    description: dict.meta.description,
    // 카카오톡·문자 등으로 링크를 보낼 때 보이는 미리보기
    openGraph: {
      type: "website",
      siteName: dict.meta.siteName,
      title: dict.meta.title,
      description: dict.meta.description,
      locale,
      images: [{ url: "/og.jpg", width: 1200, height: 630 }],
    },
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${notoKr.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          {/* 센터 정보(Firestore)를 읽으므로 본문을 먼저 보여 주고 하단은 이어서 표시 */}
          <Suspense fallback={<footer className="mt-auto h-64 border-t border-border bg-surface" />}>
            <SiteFooter />
          </Suspense>
          <QuickLinks />
        </Providers>
      </body>
    </html>
  );
}
