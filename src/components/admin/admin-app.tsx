"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { GalleryAdmin } from "./gallery-admin";
import { NoticeAdmin } from "./notice-admin";
import { PopupAdmin } from "./popup-admin";
import { ProgramAdmin } from "./program-admin";
import { SettingsAdmin } from "./settings-admin";
import { UsersAdmin } from "./users-admin";

const TABS = [
  { id: "notices", label: "공지사항" },
  { id: "gallery", label: "활동 갤러리" },
  { id: "programs", label: "체험·교육 신청" },
  { id: "settings", label: "센터 정보·팝업" },
  { id: "users", label: "관리자 계정", superOnly: true },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** 관리자 화면: ?tab=notices&id=문서ID 형태로 화면을 바꾼다 (새로고침해도 유지) */
export function AdminApp() {
  const { role } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabs = TABS.filter((t) => !("superOnly" in t) || role === "super");
  const tab = (tabs.find((t) => t.id === params.get("tab"))?.id ?? "notices") as TabId;
  const id = params.get("id");

  const go = (next: { tab?: TabId; id?: string | null }) => {
    const q = new URLSearchParams();
    q.set("tab", next.tab ?? tab);
    if (next.id) q.set("id", next.id);
    router.push(`${pathname}?${q.toString()}`);
  };

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b border-border pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => go({ tab: t.id, id: null })}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === t.id ? "bg-brand text-white dark:text-background" : "border border-border hover:border-brand hover:text-brand"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "notices" && <NoticeAdmin id={id} open={(i) => go({ id: i })} />}
      {tab === "gallery" && <GalleryAdmin id={id} open={(i) => go({ id: i })} />}
      {tab === "programs" && <ProgramAdmin id={id} open={(i) => go({ id: i })} />}
      {tab === "settings" && (
        <div className="space-y-6">
          <SettingsAdmin />
          <PopupAdmin />
        </div>
      )}
      {tab === "users" && role === "super" && <UsersAdmin />}
    </div>
  );
}
