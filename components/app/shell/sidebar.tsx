"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn, Logo } from "@/components/ui";
import { NavIcon, type NavIconName } from "./nav-icon";
import { useShellCompany } from "./shell-context";

/**
 * Sidebar del shell interno — prototipo §1.4 (isApp): 236px fijos, fondo
 * #fbfbfc, borde derecho Stone, sticky full-height. Dos modos derivados del
 * pathname (estable en SSR, sin flash):
 * - "Consultoría": Panel general / Empresas / Nueva empresa.
 * - "Empresa" (rutas /app/empresas/[id]…): back-link + bloque de contexto de
 *   la empresa (vía ShellContext, con skeleton mientras llega) + los 7 ítems.
 * Activo = ítem cuyo href coincidente es el más largo (así las fichas de
 * control bajo /checklist marcan "Checklist DPC", regla del prototipo).
 * A11y establecida: labels ≤13px en Carbon (Metal del prototipo fallaba AA).
 */

interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: NavIconName;
}

/** id de empresa del pathname (/app/empresas/[id]/…); "nueva" no es empresa. */
function companyIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/app\/empresas\/([^/]+)/);
  if (!match || match[1] === "nueva") return null;
  return match[1];
}

export function AppSidebar() {
  const pathname = usePathname();
  const t = useTranslations("app");
  const tCommon = useTranslations("common");
  const { company } = useShellCompany();

  const companyId = companyIdFromPathname(pathname);
  const inCompany = companyId !== null;

  const items: NavItem[] = inCompany
    ? [
        { key: "summary", href: `/app/empresas/${companyId}`, label: t("nav.summary"), icon: "summary" },
        { key: "checklist", href: `/app/empresas/${companyId}/checklist`, label: t("nav.checklist"), icon: "checklist" },
        { key: "risks", href: `/app/empresas/${companyId}/riesgos`, label: t("nav.risks"), icon: "risks" },
        { key: "solutions", href: `/app/empresas/${companyId}/soluciones`, label: t("nav.solutions"), icon: "solutions" },
        { key: "plan", href: `/app/empresas/${companyId}/plan`, label: t("nav.plan"), icon: "plan" },
        { key: "evidence", href: `/app/empresas/${companyId}/evidencias`, label: t("nav.evidence"), icon: "evidence" },
        { key: "certification", href: `/app/empresas/${companyId}/certificacion`, label: t("nav.certification"), icon: "certification" },
      ]
    : [
        { key: "panel", href: "/app", label: t("nav.panel"), icon: "panel" },
        { key: "companies", href: "/app/empresas", label: t("nav.companies"), icon: "companies" },
        { key: "newCompany", href: "/app/empresas/nueva", label: t("nav.newCompany"), icon: "newCompany" },
      ];

  const activeHref = items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .reduce<NavItem | undefined>(
      (best, item) => (item.href.length > (best?.href.length ?? 0) ? item : best),
      undefined,
    )?.href;

  return (
    <aside className="sticky top-0 flex h-screen w-[236px] shrink-0 flex-col border-r border-stone bg-[#fbfbfc]">
      <div className="flex h-[56px] shrink-0 items-center gap-[9px] border-b border-ash px-[18px]">
        <Logo
          alt={`${tCommon("appName")} — ${tCommon("appFullName")}`}
          height={26}
        />
        <span className="text-body-sm font-semibold tracking-[-0.2px] text-ink">
          {t("shell.brand")}
        </span>
      </div>

      {inCompany ? (
        <div className="border-b border-ash px-[14px] pb-[10px] pt-[14px]">
          <Link
            href="/app/empresas"
            className="mb-12 inline-flex items-center gap-[6px] rounded-tags text-caption font-medium text-carbon transition-colors hover:text-ink"
          >
            {t("shell.backToCompanies")}
          </Link>
          {company ? (
            <div className="flex items-center gap-[10px]">
              <span
                aria-hidden="true"
                className="flex h-32 w-32 shrink-0 items-center justify-center rounded-cards bg-ink text-caption font-semibold text-white"
              >
                {company.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold leading-[1.2] text-ink">
                  {company.name}
                </p>
                {company.sectorName ? (
                  <p className="truncate text-[11px] leading-[1.5] text-carbon">
                    {company.sectorName}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            /* Estado de carga del contexto (primer paint de una carga dura). */
            <div role="status" className="flex items-center gap-[10px]">
              <span className="sr-only">{t("shell.companyLoading")}</span>
              <span
                aria-hidden="true"
                className="h-32 w-32 shrink-0 animate-pulse rounded-cards bg-stone"
              />
              <span
                aria-hidden="true"
                className="h-12 w-[120px] animate-pulse rounded-tags bg-stone"
              />
            </div>
          )}
        </div>
      ) : null}

      <nav
        aria-label={t("shell.sidebarLabel")}
        className="flex-1 overflow-y-auto px-[10px] py-12"
      >
        <p className="px-[10px] pb-8 pt-[6px] text-[11px] font-semibold uppercase tracking-[0.4px] text-carbon">
          {inCompany ? t("shell.companyGroup") : t("shell.consultingGroup")}
        </p>
        <ul className="flex flex-col gap-[2px]">
          {items.map((item) => {
            const active = item.href === activeHref;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-[10px] rounded-cards px-[10px] py-8 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-ash text-ink"
                      : "text-carbon hover:bg-ash hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center",
                      active ? "text-ink" : "text-overcast",
                    )}
                  >
                    <NavIcon name={item.icon} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
