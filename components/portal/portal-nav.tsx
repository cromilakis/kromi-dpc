"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui";

const ITEMS = [
  { href: "/portal", key: "home", exact: true },
  { href: "/portal/evaluaciones", key: "evaluations", exact: false },
] as const;

export function PortalNav() {
  const pathname = usePathname();
  const t = useTranslations("portal.nav");
  return (
    <nav className="flex items-center gap-4" aria-label={t("label")}>
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-buttons px-12 py-8 text-[13px] font-medium transition-colors",
              active ? "bg-ash text-ink" : "text-carbon hover:bg-ash hover:text-ink",
            )}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
