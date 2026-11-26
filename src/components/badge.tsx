import type { ReactNode } from "react";

export function Badge({ tone, children }: { tone: "brand" | "accent" | "muted"; children: ReactNode }) {
  const styles = {
    brand: "bg-brand-soft text-brand",
    accent: "bg-accent text-black",
    muted: "bg-border text-muted",
  }[tone];
  return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${styles}`}>{children}</span>;
}
