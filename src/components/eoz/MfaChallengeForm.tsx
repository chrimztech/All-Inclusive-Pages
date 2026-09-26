import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { api, ApiError, type ApiUser } from "@/lib/api-client";

/** Second sign-in step: a 6-digit authenticator code, or one of the account's recovery codes. */
export function MfaChallengeForm({
  challengeId,
  onSuccess,
  onCancel,
}: {
  challengeId: string;
  onSuccess: (user: ApiUser) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const verify = useMutation({
    mutationFn: () => api.post<ApiUser>("/auth/mfa/verify", { challengeId, code: code.trim() }),
    onSuccess,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim()) verify.mutate();
  };

  return (
    <form className="grid gap-4" onSubmit={submit} aria-labelledby="mfa-heading">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/30">
          <ShieldCheck aria-hidden="true" className="size-5 text-accent-soft" />
        </span>
        <div>
          <h2 id="mfa-heading" className="font-display text-xl">
            Two-step verification
          </h2>
          <p className="text-xs text-muted">
            {useRecovery
              ? "Enter one of the recovery codes you saved. Each works once."
              : "Enter the 6-digit code from your authenticator app."}
          </p>
        </div>
      </div>
      <label className="grid gap-1">
        <span className="label-mono">{useRecovery ? "Recovery code" : "Authentication code"}</span>
        <input
          autoFocus
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode={useRecovery ? "text" : "numeric"}
          autoComplete="one-time-code"
          pattern={useRecovery ? undefined : "[0-9 ]{6,7}"}
          maxLength={useRecovery ? 11 : 7}
          placeholder={useRecovery ? "xxxxx-xxxxx" : "123 456"}
          className="rounded-md bg-surface-2 px-3 py-3 text-center font-mono text-xl tracking-[0.3em] outline-none ring-1 ring-line focus:ring-accent/50"
        />
      </label>
      {verify.isError ? (
        <p role="alert" className="text-sm text-rose">
          {verify.error instanceof ApiError ? verify.error.message : "Could not verify the code."}
        </p>
      ) : null}
      <button type="submit" disabled={verify.isPending || !code.trim()} className="btn-primary px-4 py-3 text-sm disabled:opacity-60">
        {verify.isPending ? "Verifying…" : "Verify and sign in"}
      </button>
      <div className="flex flex-wrap justify-between gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setUseRecovery((v) => !v);
            setCode("");
          }}
          className="inline-flex items-center gap-1 text-accent-soft hover:text-fg"
        >
          <KeyRound aria-hidden="true" className="size-3.5" />
          {useRecovery ? "Use authenticator code" : "Use a recovery code instead"}
        </button>
        <button type="button" onClick={onCancel} className="text-muted hover:text-fg">
          Back to sign in
        </button>
      </div>
    </form>
  );
}
