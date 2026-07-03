"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { signIn, type SignInErrorCode, type SignInState } from "@/lib/actions/auth";

/**
 * Formulario de login (client) — useActionState sobre la server action
 * signIn: estado de carga (pending), error genérico (nunca revela si la
 * cuenta existe) y ?next= saneado en servidor. Los strings llegan por props
 * desde el server component (reparto documentado en app/login/page.tsx).
 * Caja de error del prototipo §1.2: 13px Danger Red sobre #f6e9e8.
 */

export interface LoginFormLabels {
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  submit: string;
  submitting: string;
  errors: Record<SignInErrorCode, string>;
}

export function LoginForm({
  next,
  labels,
}: {
  next?: string;
  labels: LoginFormLabels;
}) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signIn,
    null,
  );

  return (
    <form action={formAction}>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label={labels.email} htmlFor="login-email" className="mb-[14px]">
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={320}
          placeholder={labels.emailPlaceholder}
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "login-error" : undefined}
        />
      </Field>
      <Field label={labels.password} htmlFor="login-password" className="mb-8">
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          placeholder={labels.passwordPlaceholder}
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "login-error" : undefined}
        />
      </Field>

      {state?.error ? (
        <p
          id="login-error"
          role="alert"
          className="mt-16 rounded-cards border border-danger-red/15 bg-[#f6e9e8] px-12 py-[10px] text-[13px] leading-[1.5] text-danger-red"
        >
          {labels.errors[state.error]}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="mt-20 w-full px-[18px] py-[11px]"
      >
        {pending ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}
