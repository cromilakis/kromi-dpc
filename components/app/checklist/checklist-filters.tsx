"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Select } from "@/components/ui";
import { CONTROL_STATUS_ORDER } from "./status-meta";

/**
 * Filtro del checklist por estado. El estado vive en la URL (searchParam
 * `estado` — deep-linkeable): cada cambio navega con router.replace dentro
 * de una transition y el server component re-renderiza la lista. La
 * navegación por dominio NO vive acá: la resuelve el rail de dominios del
 * prototipo (§1.4.5) con links server-rendered; este componente solo
 * PRESERVA el `dominio` activo al cambiar el estado. El select es
 * no-controlado con `key` por valor: el feedback es inmediato y la prop
 * re-sincroniza al volver la navegación (p. ej. tras "Limpiar filtro").
 * El estado pendiente se anuncia vía role="status".
 */

export interface ChecklistFiltersProps {
  /** Valor activo del filtro de estado ("" = todos). */
  status: string;
  /** Código de dominio activo ("" = todos) — se preserva en la URL. */
  domain: string;
}

export function ChecklistFilters({ status, domain }: ChecklistFiltersProps) {
  const t = useTranslations("app.checklist");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function navigate(nextStatus: string) {
    const params = new URLSearchParams();
    if (nextStatus) params.set("estado", nextStatus);
    if (domain) params.set("dominio", domain);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  return (
    <fieldset>
      <legend className="sr-only">{t("filters.legend")}</legend>
      <div className="flex flex-wrap items-end gap-12">
        <Field
          label={t("filters.statusLabel")}
          htmlFor="checklist-filter-status"
          className="w-[190px] max-sm:w-full"
        >
          <Select
            id="checklist-filter-status"
            key={status}
            defaultValue={status}
            onChange={(event) => navigate(event.target.value)}
          >
            <option value="">{t("filters.allStatuses")}</option>
            {CONTROL_STATUS_ORDER.map((value) => (
              <option key={value} value={value}>
                {t(`statuses.${value}`)}
              </option>
            ))}
          </Select>
        </Field>
        {status ? (
          <Button variant="ghost" onClick={() => navigate("")}>
            {t("filters.clear")}
          </Button>
        ) : null}
        <p role="status" aria-live="polite" className="pb-8 text-caption leading-caption text-carbon">
          {isPending ? t("filters.updating") : ""}
        </p>
      </div>
    </fieldset>
  );
}
