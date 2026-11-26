import type { Metadata } from "next";
import { getDictionary } from "@/i18n/get-dictionary";
import { AdminGate } from "./admin-gate";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.admin.title, robots: { index: false, follow: false } };
}

export default async function AdminPage() {
  const dict = await getDictionary();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">{dict.admin.title}</h1>
      <AdminGate t={dict.admin} />
    </div>
  );
}
