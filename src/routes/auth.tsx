import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, Panel } from "@/components/eoz/SiteShell";
import { ORG } from "@/lib/eoz-data";
import { api, ApiError, type ApiUser } from "@/lib/api-client";
import { landingRouteFor } from "@/lib/use-current-user";
import { useToast } from "@/lib/toast";

type Mode = "signin" | "signup" | "register";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = search["mode"];
    const mode: Mode = raw === "signup" || raw === "register" ? "signup" : "signin";
    return { mode };
  },
  head: () => ({
    meta: [
      { title: "Sign In or Create an Account — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Access the EOZ candidate, employer or staff portal to track opportunities, publish listings and manage verification.",
      },
      { property: "og:title", content: "Sign In or Create an Account — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "One account for candidates, employers and EOZ staff.",
      },
    ],
  }),
  component: Auth,
});

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

function passwordStrength(password: string): { label: string; tone: string; percent: number } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { label: "Weak", tone: "bg-rose", percent: 25 };
  if (score <= 3) return { label: "Okay", tone: "bg-amber", percent: 60 };
  return { label: "Strong", tone: "bg-emerald", percent: 100 };
}

function Auth() {
  const { mode } = Route.useSearch();
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<"CANDIDATE" | "EMPLOYER">("CANDIDATE");
  const [location, setLocation] = useState("");
  const [headline, setHeadline] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [organisationSector, setOrganisationSector] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  const loginMutation = useMutation({
    mutationFn: () => api.post<ApiUser>("/auth/login", { email, password }),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate({ to: landingRouteFor(user) });
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Something went wrong. Please try again.", "error"),
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      api.post<ApiUser>("/auth/register", {
        fullName,
        email,
        password,
        accountType,
        phone: phone || undefined,
        location: accountType === "CANDIDATE" ? location || undefined : undefined,
        headline: accountType === "CANDIDATE" ? headline || undefined : undefined,
        organisationName: accountType === "EMPLOYER" ? organisationName || undefined : undefined,
        organisationSector: accountType === "EMPLOYER" ? organisationSector || undefined : undefined,
      }),
    onSuccess: () => {
      loginMutation.mutate();
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Something went wrong. Please try again.", "error"),
  });

  const pending = loginMutation.isPending || registerMutation.isPending;
  const strength = passwordStrength(password);

  return (
    <SiteShell>
      <section className="mx-auto max-w-2xl py-14">
        <div className="eyebrow mb-4">( 10 ) — Access</div>
        <h1 className="font-display text-4xl tracking-tight">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {isSignup
            ? "One account covers candidate tracking, employer posting and staff review — your role is assigned after verification."
            : "Sign in to your candidate, employer or staff portal."}
        </p>

        <Panel className="mt-6">
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (isSignup) {
                if (password !== confirmPassword) {
                  setPasswordMismatch(true);
                  return;
                }
                setPasswordMismatch(false);
                registerMutation.mutate();
              } else {
                loginMutation.mutate();
              }
            }}
          >
            {isSignup ? (
              <div className="grid gap-2">
                <span className="label-mono">I am a</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["CANDIDATE", "EMPLOYER"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAccountType(type)}
                      className={
                        accountType === type
                          ? "accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink"
                          : "rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg"
                      }
                    >
                      {type === "CANDIDATE" ? "Candidate / job seeker" : "Employer / organisation"}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              {isSignup ? (
                <label className="sm:col-span-2">
                  <span className="label-mono">Full name</span>
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
                </label>
              ) : null}
              <label className={isSignup ? "" : "sm:col-span-2"}>
                <span className="label-mono">Email</span>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </label>
              {isSignup ? (
                <label>
                  <span className="label-mono">Phone (optional)</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0977 123 456"
                    className={inputCls}
                  />
                </label>
              ) : null}
            </div>

            {isSignup && accountType === "CANDIDATE" ? (
              <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                <label>
                  <span className="label-mono">Current location (optional)</span>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lusaka" className={inputCls} />
                </label>
                <label>
                  <span className="label-mono">Headline (optional)</span>
                  <input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Data Analyst"
                    className={inputCls}
                  />
                </label>
              </div>
            ) : null}

            {isSignup && accountType === "EMPLOYER" ? (
              <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                <label>
                  <span className="label-mono">Organisation name</span>
                  <input
                    required
                    value={organisationName}
                    onChange={(e) => setOrganisationName(e.target.value)}
                    placeholder="e.g. Mfumu Analytics Ltd"
                    className={inputCls}
                  />
                </label>
                <label>
                  <span className="label-mono">Sector (optional)</span>
                  <input
                    value={organisationSector}
                    onChange={(e) => setOrganisationSector(e.target.value)}
                    placeholder="e.g. Technology"
                    className={inputCls}
                  />
                </label>
                <p className="text-xs text-muted sm:col-span-2">
                  Your organisation will be registered immediately and marked pending verification by EOZ staff.
                </p>
              </div>
            ) : null}

            <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <label>
                <span className="label-mono">Password</span>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                />
                {isSignup && password ? (
                  <div className="mt-2">
                    <div className="h-1 rounded-full bg-line">
                      <div className={`h-1 rounded-full ${strength.tone}`} style={{ width: `${strength.percent}%` }} />
                    </div>
                    <div className="mt-1 text-[10px] text-muted">{strength.label} password</div>
                  </div>
                ) : null}
              </label>
              {isSignup ? (
                <label>
                  <span className="label-mono">Confirm password</span>
                  <input
                    required
                    minLength={8}
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordMismatch(false);
                    }}
                    className={inputCls}
                  />
                </label>
              ) : null}
            </div>
            {passwordMismatch ? <p className="text-xs text-rose-400">Passwords do not match.</p> : null}

            {isSignup ? (
              <label className="flex items-start gap-2 text-xs text-muted">
                <input required type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-3.5" />
                <span>
                  I agree to the{" "}
                  <Link to="/terms" className="text-accent-soft hover:text-fg">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-accent-soft hover:text-fg">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <button
                type="submit"
                disabled={pending || (isSignup && !agreed)}
                className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
              >
                {pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
              </button>
              {!isSignup ? (
                <Link to="/forgot-password" className="text-xs text-accent-soft hover:text-fg">
                  Forgot password?
                </Link>
              ) : null}
            </div>
          </form>
        </Panel>

        <p className="mt-4 text-sm text-muted">
          {isSignup ? "Already registered? " : "No account yet? "}
          <Link
            to="/auth"
            search={{ mode: isSignup ? "signin" : "signup" }}
            className="text-accent-soft"
          >
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
        <p className="mt-6 text-xs text-muted">{ORG.disclaimer}</p>
      </section>
    </SiteShell>
  );
}
