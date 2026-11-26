import Link from "next/link";
import { Badge } from "@/components/badge";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { HomePopup } from "@/components/home-popup";
import { MapEmbed } from "@/components/map-embed";
import { formatDate, getGallery, getNotices, getPage, getPopup, getSettings, stripCategory, tr } from "@/lib/content";
import { FACILITIES, facilityCover, facilitySlugs } from "@/lib/facility";
import { centerInfo, heroImage, menu } from "@/lib/site";

function BoxHeader({ title, href, more }: { title: string; href: string; more: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xl font-bold">{title}</h2>
      <Link href={href} className="text-sm text-muted hover:text-brand">
        {more} +
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const [dict, locale, notices, gallery, settings, popup, facilityPage] = await Promise.all([
    getDictionary(),
    getLocale(),
    getNotices(),
    getGallery(),
    getSettings(),
    getPopup(),
    getPage("facility"),
  ]);
  const info = {
    phone: settings?.phone || centerInfo.phone,
    hours: tr(settings?.hours, locale) || dict.footer.hoursValue,
    kakaoMap: settings?.kakaoMap || centerInfo.kakaoMap,
    naverMap: settings?.naverMap || centerInfo.naverMap,
    address: tr(settings?.address, locale),
    addressKo: tr(settings?.address, "ko"),
  };
  const p = (href: string) => `/${locale}${href}`;
  const facilities = facilitySlugs.map((slug) => {
    const item = menu.find((g) => g.key === "facility")!.children.find((c) => c.key === FACILITIES[slug].key)!;
    return { key: item.key, href: item.href, label: dict.nav[item.key], cover: facilityPage ? facilityCover(slug, facilityPage.sections) : undefined };
  });

  return (
    <>
      {popup && (
        <HomePopup
          image={popup.image}
          title={tr(popup.title, locale)}
          link={popup.link}
          labels={{ hideToday: dict.common.hideToday, close: dict.common.close }}
        />
      )}
      {/* 메인 비주얼: 센터 건물 사진 */}
      <section className="relative isolate overflow-hidden bg-brand-strong">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImage} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/45 to-black/10" />
        <div className="mx-auto max-w-6xl px-4 py-24 text-white sm:py-36">
          <p className="mb-3 font-medium text-white/85">{dict.home.eyebrow}</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{dict.home.title}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">
            {dict.home.intro1}
            <br />
            {dict.home.intro2}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={p("/apply")} className="rounded-full bg-white px-6 py-3 font-semibold text-brand hover:bg-brand-soft">
              {dict.nav.apply}
            </Link>
            <Link href={p("/programs")} className="rounded-full border border-white/70 px-6 py-3 font-semibold text-white hover:bg-white/10">
              {dict.nav.programs}
            </Link>
          </div>
        </div>
      </section>
      {/* 공지사항 / 활동 갤러리 — Firestore 최신 글 */}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-border bg-surface p-6">
          <BoxHeader title={dict.home.notice} href={p("/notice")} more={dict.common.more} />
          {notices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{dict.home.emptyList}</p>
          ) : (
            <ul className="divide-y divide-border">
              {notices.slice(0, 5).map((n) => (
                <li key={n.id}>
                  <Link href={p(`/notice/${n.id}`)} className="flex items-center gap-3 py-3 hover:text-brand">
                    {n.category && <Badge tone="brand">{n.category}</Badge>}
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {stripCategory(tr(n.title, locale)).replace(/\s*【[^】]*】\s*$/, "")}
                    </span>
                    <time className="shrink-0 text-xs text-muted" dateTime={n.publishedAt}>
                      {formatDate(n.publishedAt, locale)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-surface p-6">
          <BoxHeader title={dict.home.gallery} href={p("/gallery")} more={dict.common.more} />
          {gallery.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{dict.home.emptyList}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {gallery.slice(0, 4).map((g) => (
                <li key={g.id}>
                  <Link href={p(`/gallery/${g.id}`)} className="group block">
                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-brand-soft">
                      {g.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.images[0].src} alt="" loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm group-hover:text-brand">{tr(g.title, locale)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 시설 안내: 사진 카드 */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="mb-6 text-2xl font-bold">{dict.home.facilities}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {facilities.map((f) => (
            <Link key={f.key} href={p(f.href)} className="group relative isolate flex aspect-[4/3] items-end overflow-hidden rounded-2xl bg-brand-strong p-4">
              {f.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.cover} alt="" loading="lazy" className="absolute inset-0 -z-10 size-full object-cover transition duration-300 group-hover:scale-105" />
              )}
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 to-transparent" />
              <span className="font-semibold text-white">{f.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 프로그램 안내 배너 */}
      <section className="bg-brand text-white dark:text-background">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-2xl leading-snug font-bold sm:text-3xl">{dict.home.ctaTitle}</p>
            <p className="mt-3 opacity-85">{dict.home.ctaBody}</p>
          </div>
          <Link href={p("/programs")} className="shrink-0 rounded-full bg-white px-6 py-3 font-semibold text-brand hover:bg-brand-soft">
            {dict.home.ctaButton} →
          </Link>
        </div>
      </section>

      {/* 문의 + 지도 */}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[1fr_1.3fr] lg:items-center">
        <div>
          <p className="font-medium text-brand">{dict.home.contactTitle}</p>
          <h2 className="mt-1 text-3xl font-bold">{dict.home.title}</h2>
          <p className="mt-4 leading-relaxed text-muted">{dict.home.contactBody}</p>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">{dict.footer.hours}</dt>
            <dd>{info.hours}</dd>
            {info.address && (
              <>
                <dt className="text-muted">{dict.content.address}</dt>
                <dd>{info.address}</dd>
              </>
            )}
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href={`tel:${info.phone}`} className="rounded-full bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-strong dark:text-background">
              {dict.home.call} {info.phone}
            </a>
            <a href={info.kakaoMap} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#FEE500] px-5 py-2.5 font-medium text-black">
              {dict.home.kakaoMap}
            </a>
            <a href={info.naverMap} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#03C75A] px-5 py-2.5 font-medium text-white">
              {dict.home.naverMap}
            </a>
          </div>
        </div>
        {info.addressKo && <MapEmbed address={info.addressKo} locale={locale} title={dict.home.location} />}
      </section>    </>
  );
}
