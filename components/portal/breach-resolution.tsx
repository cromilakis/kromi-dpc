"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import {
  setBreachResolution,
  type ResolutionActionError,
} from "@/lib/actions/portal-resolution";

/**
 * Resolución de una brecha por el cliente (sub-proyecto #6): cierre del ciclo
 * de mitigación desde el detalle de la brecha. Marcar como resuelta es
 * reversible ("Reabrir") — la validación definitiva la hace el consultor en
 * la certificación (#7).
 */
export function BreachResolution({
  breachId,
  resolved,
}: {
  breachId: string;
  resolved: boolean;
}) {
  const t = useTranslations("portal.evaluations.resolution");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ResolutionActionError | null>(null);

  function onToggle() {
    setError(null);
    startTransition(async () => {
      const result = await setBreachResolution({ breachId, resolved: !resolved });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-8 rounded-cards border border-stone bg-[#fbfbfc] p-16">
      <p className="text-body-sm font-semibold text-ink">
        {resolved ? t("resolvedTitle") : t("openTitle")}
      </p>
      <p className="max-w-[60ch] text-caption leading-[1.5] text-carbon">
        {resolved ? t("resolvedHint") : t("openHint")}
      </p>
      <div>
        <Button
          variant={resolved ? "secondary" : "primary"}
          onClick={onToggle}
          disabled={pending}
        >
          {pending
            ? t("saving")
            : resolved
              ? t("reopen")
              : t("markResolved")}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-caption leading-caption text-danger-red">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  );
}
