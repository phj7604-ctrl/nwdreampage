"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";

/** 관리자로 로그인한 경우에만 헤더에 "관리자 모드" 배지를 보여 준다. */
export function AdminBadge({ href, label }: { href: string; label: string }) {
  const { role } = useAuth();
  if (!role) return null;
  return (
    <Link
      href={href}
      className="hidden rounded-full bg-accent px-3 py-1 text-xs font-bold text-black sm:inline-block"
    >
      {label}
    </Link>
  );
}
