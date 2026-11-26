import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { applyLink, menu } from "@/lib/site";
import { AdminBadge } from "./admin-badge";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const p = (href: string) => `/${locale}${href}`;

  const groups = menu.map((g) => ({
    label: dict.nav[g.key],
    href: p(g.href),
    children: g.children.map((c) => ({ label: dict.nav[c.key], href: p(c.href) })),
  }));
  const apply = { label: dict.nav[applyLink.key], href: p(applyLink.href) };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={`/${locale}`} className="flex items-center gap-2 font-bold text-brand">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-sm text-white dark:text-background">
            N
          </span>
          <span className="text-lg tracking-tight">{dict.meta.siteName}</span>
        </Link>

        <nav className="hidden h-full items-center gap-1 lg:flex">
          {groups.map((g) => (
            <div key={g.href} className="group relative flex h-full items-center">
              <Link
                href={g.href}
                className="rounded-md px-4 py-2 font-medium text-foreground hover:text-brand"
              >
                {g.label}
              </Link>
              <div className="invisible absolute top-full left-1/2 min-w-48 -translate-x-1/2 rounded-xl border border-border bg-surface p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                {g.children.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="block rounded-lg px-3 py-2 text-sm whitespace-nowrap text-foreground hover:bg-brand-soft hover:text-brand"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <Link
            href={apply.href}
            className="ml-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong dark:text-background"
          >
            {apply.label}
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <AdminBadge href={p("/admin")} label={dict.admin.badge} />
          <LanguageSwitcher current={locale} label={dict.common.language} />
          <ThemeToggle labels={dict.common.theme} />
          <MobileMenu
            groups={groups}
            apply={apply}
            labels={{ menu: dict.common.menu, close: dict.common.close }}
          />
        </div>
      </div>
    </header>
  );
}
