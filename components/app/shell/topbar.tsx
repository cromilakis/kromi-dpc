"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui";
import { signOut } from "@/lib/actions/auth";
import {
  useShellCompany,
  type CompanyPhase,
  type ShellScoreTier,
} from "./shell-context";

/**
 * Topbar del shell interno — prototipo §1.4: 56px, borde inferior Stone,
 * sticky. Izquierda: breadcrumb simple — "Panel de administración" en modo
 * consultoría; nombre de empresa + pill de fase (StatusBadge, mapa §3.5) +
 * "Complexity Score {n} · {tramo}" en modo empresa (datos vía ShellContext,
 * skeleton mientras llegan; el tramo llega ya resuelto en servidor).
 * Derecha: menú de usuario (<details> mejorado: se cierra con Escape —
 * devolviendo el foco al trigger — y al interactuar/tabular fuera) con
 * nombre, rol y "Cerrar sesión" (server action signOut).
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

export interface AppTopbarProps {
  userName: string;
  userInitials: string;
  userRole: "consultant" | "admin" | null;
}

export function AppTopbar({ userName, userInitials, userRole }: AppTopbarProps) {
  const pathname = usePathname();
  const t = useTranslations("app.shell");
  // Labels de tramo compartidos con el módulo empresas (misma práctica que
  // las fases: un solo catálogo de textos para el mismo concepto).
  const tTiers = useTranslations("app.companies.scoreTiers");
  const { company } = useShellCompany();
  const inCompany = /^\/app\/empresas\/(?!nueva(\/|$))[^/]+/.test(pathname);

  // Menú de usuario: <details> con cierre por Escape (foco de vuelta al
  // trigger) y por interacción fuera del menú (click/tap).
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const menu = menuRef.current;
      if (
        menu?.open &&
        event.target instanceof Node &&
        !menu.contains(event.target)
      ) {
        menu.open = false;
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-[56px] shrink-0 items-center justify-between border-b border-stone bg-white px-24">
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

      <details
        ref={menuRef}
        className="group relative"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuRef.current?.open) {
            menuRef.current.open = false;
            menuRef.current.querySelector<HTMLElement>("summary")?.focus();
          }
        }}
        onBlur={(event) => {
          // Tab fuera del menú abierto → se cierra (focusout burbujea).
          const menu = menuRef.current;
          if (
            menu?.open &&
            !(
              event.relatedTarget instanceof Node &&
              menu.contains(event.relatedTarget)
            )
          ) {
            menu.open = false;
          }
        }}
      >
        <summary className="flex cursor-pointer list-none items-center gap-8 rounded-buttons px-8 py-4 transition-colors hover:bg-ash [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden="true"
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white"
          >
            {userInitials}
          </span>
          <span className="max-w-[180px] truncate text-[13px] font-medium text-carbon">
            {userName}
          </span>
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-overcast transition-transform group-open:rotate-180"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] rounded-cards border border-stone bg-white p-8 shadow-subtle-2">
          <div className="px-8 py-[6px]">
            <p className="truncate text-[13px] font-semibold text-ink">
              {userName}
            </p>
            {userRole ? (
              <p className="text-caption text-carbon">
                {t(`userMenu.roles.${userRole}`)}
              </p>
            ) : null}
          </div>
          <div aria-hidden="true" className="my-4 h-px bg-ash" />
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-buttons border border-stone bg-white px-8 py-8 text-[13px] font-medium text-carbon transition-colors hover:bg-ash hover:text-ink"
            >
              {t("userMenu.signOut")}
            </button>
          </form>
        </div>
      </details>
    </header>
  );
}
