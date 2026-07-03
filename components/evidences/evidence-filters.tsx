"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Select } from "@/components/ui";

/**
 * Barra de filtros del repositorio (client): estado y control vinculado se
 * publican como searchParams (?estado=…&control=…) y el server component
 * re-filtra — la URL es compartible y el back/forward funciona. useTransition
 * expone el estado "actualizando" mientras Next re-renderiza en servidor.
 */

interface ControlOption {
  id: string;
  code: string;
}

export function EvidenceFilters({
  statuses,
  controls,
  currentStatus,
  currentControl,
}: {
  /** Enum evidence_status en orden de display (labels via i18n). */
  statuses: string[];
  controls: ControlOption[];
  currentStatus: string;
  currentControl: string;
}) {
  const t = useTranslations("app.evidences.filters");
  const tStatuses = useTranslations("app.evidences.statuses");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function applyParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  const hasFilters = Boolean(currentStatus || currentControl);

  return (
    <fieldset className="mb-16 flex flex-wrap items-center gap-12 border-0 p-0">
      <legend className="sr-only">{t("legend")}</legend>

      <label
        htmlFor="evidence-filter-status"
        className="text-caption leading-caption tracking-caption font-medium text-carbon"
      >
        {t("statusLabel")}
      </label>
      <Select
        id="evidence-filter-status"
        value={currentStatus}
        onChange={(event) => applyParam("estado", event.target.value)}
        className="w-auto min-w-[170px]"
      >
        <option value="">{t("allStatuses")}</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {tStatuses(status)}
          </option>
        ))}
      </Select>

      <label
        htmlFor="evidence-filter-control"
        className="text-caption leading-caption tracking-caption font-medium text-carbon"
      >
        {t("controlLabel")}
      </label>
      <Select
        id="evidence-filter-control"
        value={currentControl}
        onChange={(event) => applyParam("control", event.target.value)}
        className="w-auto min-w-[190px]"
      >
        <option value="">{t("allControls")}</option>
        <option value="none">{t("noControl")}</option>
        {controls.map((control) => (
          <option key={control.id} value={control.id}>
            {control.code}
          </option>
        ))}
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          onClick={() =>
            startTransition(() => router.replace(pathname, { scroll: false }))
          }
        >
          {t("clear")}
        </Button>
      ) : null}

      {pending ? (
        <span role="status" className="text-caption leading-caption text-carbon">
          {t("updating")}
        </span>
      ) : null}
    </fieldset>
  );
}
