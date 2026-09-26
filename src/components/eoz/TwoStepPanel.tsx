import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import QRCode from "qrcode";
import { KeyRound } from "lucide-react";
import { Chip, Panel } from "@/components/eoz/SiteShell";
import { api, ApiError } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";
import { useToast } from "@/lib/toast";

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line focus:ring-accent/40";

/** Turn two-step verification on (scan, confirm, save recovery codes) or off (password and a code). */
export function TwoStepPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [password, setPassword] = useState("");
  const fail = (e: unknown, fallback: string) =>
    toast(e instanceof ApiError ? e.message : fallback, "error");

  const start = useMutation({
    mutationFn: () => api.post<{ secret: string; otpauthUri: string }>("/auth/mfa/setup"),
    onSuccess: async (s) => {
      const qr = await QRCode.toDataURL(s.otpauthUri, {
        margin: 1,
        width: 220,
        color: { dark: "#071a10", light: "#ffffff" },
      });
      setSetup({ secret: s.secret, qr });
      setCode("");
    },
    onError: (e) => fail(e, "Could not start set-up."),
  });
  const enable = useMutation({
    mutationFn: () => api.post<string[]>("/auth/mfa/enable", { code: code.trim() }),
    onSuccess: (codes) => {
      setRecoveryCodes(codes);
      setSetup(null);
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast("Two-step verification is on.");
    },
    onError: (e) => fail(e, "That code did not work."),
  });
  const disable = useMutation({
    mutationFn: () => api.post("/auth/mfa/disable", { password, code: code.trim() }),
    onSuccess: () => {
      setDisabling(false);
      setPassword("");
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast("Two-step verification is off.");
    },
    onError: (e) => fail(e, "Could not turn two-step verification off."),
  });

  const enabled = user?.mfaEnabled ?? false;

  const downloadCodes = () => {
    if (!recoveryCodes) return;
    const text = [
      `Echo Opportunities Zambia - recovery codes for ${user?.email ?? "your account"}`,
      "",
      ...recoveryCodes,
      "",
      "Each code works once.",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "eoz-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel className="p-6">
      <div className="mb-1 flex items-center gap-2 text-sm font-medium">
        <KeyRound aria-hidden="true" className="size-4 text-accent-soft" />
        Two-step verification
        <Chip tone={enabled ? "emerald" : "muted"}>{enabled ? "On" : "Off"}</Chip>
      </div>
      <p className="mb-4 text-xs leading-5 text-muted">
        Adds a code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy)
        to every sign-in, so a stolen password alone cannot open your account.
      </p>

      {recoveryCodes ? (
        <div className="rounded-xl bg-amber/5 p-4 ring-1 ring-amber/30">
          <p className="text-sm font-medium text-amber">Save your recovery codes now</p>
          <p className="mt-1 text-xs text-muted">
            If you lose your phone, each code signs you in once. They will not be shown again.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
            {recoveryCodes.map((c) => (
              <li key={c} className="rounded bg-ink/60 px-2 py-1 text-center ring-1 ring-line">
                {c}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={downloadCodes} className="btn-secondary px-3 py-1.5 text-xs">
              Download
            </button>
            <button
              type="button"
              onClick={() =>
                navigator.clipboard?.writeText(recoveryCodes.join("\n")).then(() => toast("Copied."))
              }
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setRecoveryCodes(null)}
              className="text-xs text-muted hover:text-fg"
            >
              I have saved them
            </button>
          </div>
        </div>
      ) : null}

      {!enabled && !setup && !recoveryCodes ? (
        <button
          type="button"
          disabled={start.isPending}
          onClick={() => start.mutate()}
          className="btn-primary px-4 py-2 text-sm"
        >
          {start.isPending ? "Preparing…" : "Turn on two-step verification"}
        </button>
      ) : null}

      {setup ? (
        <form
          className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start"
          onSubmit={(e) => {
            e.preventDefault();
            enable.mutate();
          }}
        >
          <img
            src={setup.qr}
            alt="QR code to add EOZ to your authenticator app"
            className="size-44 rounded-lg bg-white p-1"
          />
          <div className="grid gap-3">
            <ol className="list-decimal space-y-1 pl-4 text-xs text-muted">
              <li>Open your authenticator app and scan the code.</li>
              <li>
                Cannot scan? Enter this key:{" "}
                <code className="break-all font-mono text-fg">{setup.secret}</code>
              </li>
              <li>Type the 6-digit code the app shows.</li>
            </ol>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="123 456"
              aria-label="Code from your authenticator app"
              className="w-40 rounded-md bg-surface-2 px-3 py-2 text-center font-mono text-lg tracking-widest outline-none ring-1 ring-line focus:ring-accent/50"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={enable.isPending || !code.trim()}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
              >
                {enable.isPending ? "Checking…" : "Confirm and turn on"}
              </button>
              <button
                type="button"
                onClick={() => setSetup(null)}
                className="rounded-md px-3 py-2 text-sm text-muted ring-1 ring-line hover:text-fg"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {enabled && !recoveryCodes ? (
        disabling ? (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              disable.mutate();
            }}
          >
            <label className="text-xs text-muted">
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="text-xs text-muted">
              Authenticator or recovery code
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                className={`${inputCls} font-mono`}
              />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={disable.isPending}
                className="rounded-md px-4 py-2 text-sm text-rose ring-1 ring-rose/30 hover:bg-rose/10 disabled:opacity-60"
              >
                {disable.isPending ? "Turning off…" : "Turn off"}
              </button>
              <button
                type="button"
                onClick={() => setDisabling(false)}
                className="text-sm text-muted hover:text-fg"
              >
                Keep it on
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setDisabling(true)}
            className="rounded-md px-3 py-2 text-xs text-muted ring-1 ring-line hover:text-rose"
          >
            Turn off two-step verification
          </button>
        )
      ) : null}
    </Panel>
  );
}
