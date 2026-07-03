"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Textarea } from "@/components/ui";
import { saveControlNotes, type SaveNotesState } from "@/lib/actions/assessments";

/**
 * Formulario de hallazgos/notas de la ficha de control (§1.4.6): action de
 * formulario saveControlNotes vía useActionState (progressive enhancement:
 * funciona sin JS). Resultado (guardado / error tipado de la action) en
 * región aria-live; el límite de 4000 chars refleja el schema Zod del server
 * (defensa real en el server, maxLength solo como guía).
 */

const INITIAL_STATE: SaveNotesState = { status: "idle" };
const MAX_TEXT = 4000;

export interface ControlNotesFormProps {
  assessmentControlId: string;
  findings: string | null;
  notes: string | null;
}

export function ControlNotesForm({
  assessmentControlId,
  findings,
  notes,
}: ControlNotesFormProps) {
  const t = useTranslations("app.checklist.control.notes");
  const [state, formAction, pending] = useActionState(saveControlNotes, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-16">
      <input type="hidden" name="assessment_control_id" value={assessmentControlId} />
      <Field label={t("findingsLabel")} htmlFor="control-findings">
        <Textarea
          id="control-findings"
          name="findings"
          defaultValue={findings ?? ""}
          placeholder={t("findingsPlaceholder")}
          maxLength={MAX_TEXT}
          rows={4}
        />
      </Field>
      <Field label={t("notesLabel")} htmlFor="control-notes">
        <Textarea
          id="control-notes"
          name="notes"
          defaultValue={notes ?? ""}
          placeholder={t("notesPlaceholder")}
          maxLength={MAX_TEXT}
          rows={3}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-12">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
        <p
          role="status"
          aria-live="polite"
          className={`text-caption leading-caption ${
            state.status === "error" ? "text-danger-red" : "text-success-green"
          }`}
        >
          {!pending && state.status === "saved" ? t("saved") : null}
          {!pending && state.status === "error" ? t(`errors.${state.error}`) : null}
        </p>
      </div>
    </form>
  );
}
