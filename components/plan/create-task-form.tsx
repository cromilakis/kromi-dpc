"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Field, Input } from "@/components/ui";
import {
  createRemediationItem,
  type RemediationActionError,
} from "@/lib/actions/remediation";

/**
 * Nueva tarea manual del plan — spec plan-adecuacion: título (obligatorio),
 * responsable y vencimiento opcionales → createRemediationItem (sesión + Zod
 * + audit_log en la action). Client component controlado; el revalidatePath
 * de la action refresca la tabla y el progreso del server component.
 */

export function CreateTaskForm({ companyId }: { companyId: string }) {
  const t = useTranslations("app.plan.create");
  const tErrors = useTranslations("app.plan.errors");

  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [responsible, setResponsible] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<RemediationActionError | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    startTransition(async () => {
      const result = await createRemediationItem({
        companyId,
        title: trimmedTitle,
        responsible: responsible.trim() || undefined,
        dueDate: dueDate || undefined,
      });
      if (result.ok) {
        setTitle("");
        setResponsible("");
        setDueDate("");
        setError(null);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <h2 className="mb-16 text-body-sm font-semibold leading-body-sm tracking-body-sm text-ink">
        {t("title")}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-12">
        <div className="grid gap-12 md:grid-cols-[2fr_1.2fr_1fr]">
          <Field label={t("taskLabel")} htmlFor="plan-task-title">
            <Input
              id="plan-task-title"
              required
              maxLength={300}
              placeholder={t("taskPlaceholder")}
              value={title}
              disabled={isPending}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field label={t("responsibleLabel")} htmlFor="plan-task-responsible">
            <Input
              id="plan-task-responsible"
              maxLength={200}
              placeholder={t("responsiblePlaceholder")}
              value={responsible}
              disabled={isPending}
              onChange={(event) => setResponsible(event.target.value)}
            />
          </Field>
          <Field label={t("dueLabel")} htmlFor="plan-task-due">
            <Input
              id="plan-task-due"
              type="date"
              value={dueDate}
              disabled={isPending}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </Field>
        </div>

        {error ? (
          <p
            role="alert"
            className="text-caption leading-caption tracking-caption text-danger-red"
          >
            {tErrors(error)}
          </p>
        ) : null}

        <div>
          <Button type="submit" disabled={isPending || !title.trim()}>
            {isPending ? t("submitting") : t("submit")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
