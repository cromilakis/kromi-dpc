"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui";
import {
  useShellCompany,
  type CompanyPhase,
  type ShellScoreTier,
} from "./shell-context";

/**
 * Topbar del shell interno — prototipo §1.4: 56px, borde inferior Stone,
 * sticky. Muestra el breadcrumb simple: "Panel de administración" en modo
 * consultoría; nombre de empresa + pill de fase (StatusBadge, mapa §3.5) +
 * "Complexity Score {n} · {tramo}" en modo empresa (datos vía ShellContext,
 * skeleton mientras llegan; el tramo llega ya resuelto en servidor).
 * El menú de usuario (nombre/rol/cerrar sesión) vive en el footer del sidebar.
 * A11y establecida: texto ≤13px en Carbon (el #8f99a8 del prototipo falla AA).
 */

const PHASE_VARIANT: Record<CompanyPhase, StatusBadgeVariant> = {
  diagnostico: "neutral",
  propuesta: "warning",
  certificacion: "active",
  revalidacion: "positive",
};

/** Tramo del score → variante semántica (tierColor del prototipo §3.5). */
const SCORE_TIER_VARIANT: Record<ShellScoreTier, StatusBadgeVariant> = {
  low: "positive",
  medium: "active",
  high: "warning",
  critical: "negative",
};

export function AppTopbar() {
  const pathname = usePathname();
  const t = useTranslations("app.shell");
  // Labels de tramo compartidos con el módulo empresas (misma práctica que
  // las fases: un solo catálogo de textos para el mismo concepto).
  const tTiers = useTranslations("app.companies.scoreTiers");
  const { company } = useShellCompany();
  const inCompany = /^\/app\/companies\/(?!new(\/|$))[^/]+/.test(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-[56px] shrink-0 items-center border-b border-stone bg-white px-24">
      <div className="flex min-w-0 items-center gap-12">
        {inCompany ? (
          company ? (
            <>
              <span className="truncate text-[15px] font-semibold text-ink">
                {company.name}
              </span>
              <StatusBadge pill variant={PHASE_VARIANT[company.phase]}>
                {t(`phases.${company.phase}`)}
              </StatusBadge>
              {company.complexityScore !== null ? (
                <span className="flex items-center gap-8 whitespace-nowrap text-caption text-carbon">
                  <span>
                    {t("complexityScore")}{" "}
                    <b className="font-semibold text-ink">
                      {company.complexityScore}
                    </b>
                  </span>
                  {company.scoreTier !== null ? (
                    <StatusBadge variant={SCORE_TIER_VARIANT[company.scoreTier]}>
                      {tTiers(company.scoreTier)}
                    </StatusBadge>
                  ) : null}
                </span>
              ) : null}
            </>
          ) : (
            <div role="status" className="flex items-center gap-12">
              <span className="sr-only">{t("companyLoading")}</span>
              <span
                aria-hidden="true"
                className="h-16 w-[160px] animate-pulse rounded-tags bg-stone"
              />
            </div>
          )
        ) : (
          <span className="text-[15px] font-semibold text-ink">
            {t("adminBreadcrumb")}
          </span>
        )}
      </div>
    </header>
  );
}
