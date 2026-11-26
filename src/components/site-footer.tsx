import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getSettings, tr } from "@/lib/content";
import { centerInfo, menu } from "@/lib/site";

export async function SiteFooter() {
  const [dict, locale, settings] = await Promise.all([getDictionary(), getLocale(), getSettings()]);
  // 관리자 화면 '센터 정보'에서 수정한 값 (없으면 기본값)
  const info = {
    phone: settings?.phone || centerInfo.phone,
    email: settings?.email || centerInfo.email,
    hours: tr(settings?.hours, locale) || dict.footer.hoursValue,
    address: tr(settings?.address, locale),
  };

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[2fr_1fr]">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {menu.map((g) => (
            <div key={g.key}>
              <p className="mb-3 font-semibold">{dict.nav[g.key]}</p>
              <ul className="space-y-2 text-sm text-muted">
                {g.children.map((c) => (
                  <li key={c.key}>
                    <Link href={`/${locale}${c.href}`} className="hover:text-brand">
                      {dict.nav[c.key]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-3 font-semibold">{dict.footer.contact}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">{dict.footer.hours}</dt>
            <dd>{info.hours}</dd>
            <dt className="text-muted">{dict.footer.phone}</dt>
            <dd>
              <a href={`tel:${info.phone}`} className="hover:text-brand">
                {info.phone}
              </a>
            </dd>
            <dt className="text-muted">{dict.footer.email}</dt>
            <dd>
              <a href={`mailto:${info.email}`} className="hover:text-brand">
                {info.email}
              </a>
            </dd>
            {info.address && (
              <>
                <dt className="text-muted">{dict.content.address}</dt>
                <dd>{info.address}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-muted">
          <span>{dict.footer.copyright}</span>
          <Link href={`/${locale}/admin`} className="hover:text-brand">
            ADMIN
          </Link>
        </div>
      </div>
    </footer>
  );
}
