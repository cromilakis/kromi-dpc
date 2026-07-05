"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, StatusBadge, type StatusBadgeVariant } from "@/components/ui";
import {
  acceptProposal,
  createCheckoutSession,
  type AcceptProposalError,
  type CreateCheckoutSessionError,
} from "@/lib/actions/proposals";
import type { ClientDashboardProposal } from "@/lib/portal/load-dashboard.server";

/**
 * Tarjeta "Tu propuesta" del portal del cliente (spec company-portal-phase2,
 * tareas 3-4): muestra plan + monto (CLP) + estado de la propuesta más
 * reciente publicada por el consultor, permite aceptarla ('sent' ->
 * 'accepted') vía `acceptProposal`, y una vez aceptada permite pagarla vía
 * `createCheckoutSession` (redirige a Stripe Checkout hosted). El cliente no
 * tiene UPDATE directo en `proposals`/`payments` en RLS — ver comentarios en
 * lib/actions/proposals.ts. Mismo patrón de CertificateActions: useTransition
 * + revalidatePath del server refresca la tarjeta tras aceptar; el pago en
 * cambio navega fuera del sitio (Checkout hosted), así que no hay
 * revalidación local — el estado 'paid' real lo fija el webhook (tarea 5) y
 * se refleja al volver a cargar /portal.
 */

const STATUS_VARIANT: Record<ClientDashboardProposal["status"], StatusBadgeVariant> = {
  draft: "neutral",
  sent: "warning",
  accepted: "active",
  paid: "positive",
  expired: "negative",
};

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function ProposalCard({ proposal }: { proposal: ClientDashboardProposal }) {
  const t = useTranslations("portal.dashboard.proposal");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<AcceptProposalError | null>(null);
  const [isPaying, startPayTransition] = useTransition();
  const [payError, setPayError] = useState<CreateCheckoutSessionError | null>(null);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptProposal(proposal.id);
      if (!result.ok) setError(result.error);
      // ok → revalidatePath("/portal") del server refresca esta tarjeta.
    });
  }

  function handlePay() {
    setPayError(null);
    startPayTransition(async () => {
      const result = await createCheckoutSession(proposal.id);
      if (!result.ok) {
        setPayError(result.error);
        return;
      }
      // Navega fuera del sitio, a Stripe Checkout hosted; el retorno cae en
      // /portal?paid=1 (aviso), pero el estado 'paid' real lo fija el webhook.
      window.location.href = result.url;
    });
  }

  return (
    <Card className="flex flex-col gap-12">
      <p className="text-caption leading-caption tracking-caption text-carbon">{t("title")}</p>
      <div>
        <StatusBadge variant={STATUS_VARIANT[proposal.status]}>
          {t(`status.${proposal.status}`)}
        </StatusBadge>
      </div>
      <p className="text-body-sm text-ink">{proposal.plan}</p>
      <p className="text-[26px] font-semibold leading-[1.15] tracking-[-0.8px] text-ink">
        {clpFormatter.format(proposal.amountClp)}
      </p>

      {proposal.status === "sent" ? (
        <div className="flex flex-col gap-8">
          <Button onClick={handleAccept} disabled={isPending} className="self-start">
            {isPending ? t("accepting") : t("accept")}
          </Button>
          {error ? (
            <p role="alert" className="text-caption text-danger-red">
              {t(`errors.${error}`)}
            </p>
          ) : null}
        </div>
      ) : null}

      {proposal.status === "accepted" ? (
        <div className="flex flex-col gap-8">
          <Button onClick={handlePay} disabled={isPaying} className="self-start">
            {isPaying ? t("paying") : t("pay", { amount: clpFormatter.format(proposal.amountClp) })}
          </Button>
          {payError ? (
            <p role="alert" className="text-caption text-danger-red">
              {t(`payErrors.${payError}`)}
            </p>
          ) : null}
        </div>
      ) : null}

      {proposal.status === "paid" ? (
        <p className="text-caption leading-caption tracking-caption text-carbon">
          {t("paidConfirmation")}
        </p>
      ) : null}
    </Card>
  );
}
