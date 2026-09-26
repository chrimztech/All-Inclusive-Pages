import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, Sparkles, Users } from "lucide-react";
import { SiteShell, Panel } from "@/components/eoz/SiteShell";
import { PasswordInput } from "@/components/eoz/PasswordInput";
import { ORG } from "@/lib/eoz-data";
import { api, ApiError, type ApiUser } from "@/lib/api-client";
import { landingRouteFor } from "@/lib/use-current-user";
import { useToast } from "@/lib/toast";

const TRUST_POINTS = [
  { icon: ShieldCheck, text: "Every listing verified against its original source before it reaches you." },
  { icon: Users, text: "One account for candidates, employers and SMEs — free to browse and apply." },
  { icon: Sparkles, text: "You always apply through the employer's own official channel, never ours." },
] as const;

type Mode = "signin" | "signup" | "register";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode: Mode; redirect?: string } => {
    const raw = search["mode"];
    const mode: Mode = raw === "signup" || raw === "register" ? "signup" : "signin";
    const redirect = typeof search["redirect"] === "string" ? search["redirect"] : undefined;
    return redirect ? { mode, redirect } : { mode };
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

const BUSINESS_TYPE_OPTIONS = [
  {
    value: "INFORMAL_SME",
    label: "Small or informal business — no registration number yet, that's OK",
  },
  { value: "SOLE_PROPRIETORSHIP", label: "Sole proprietorship" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "LIMITED_COMPANY", label: "Limited company" },
  { value: "COOPERATIVE", label: "Cooperative" },
  { value: "NGO_NONPROFIT", label: "NGO / non-profit" },
  { value: "GOVERNMENT", label: "Government" },
  { value: "OTHER", label: "Other" },
] as const;

const SIZE_BAND_OPTIONS = [
  { value: "MICRO_1_4", label: "1–4 people" },
  { value: "SMALL_5_49", label: "5–49 people" },
  { value: "MEDIUM_50_249", label: "50–249 people" },
  { value: "LARGE_250_PLUS", label: "250+ people" },
] as const;

const AVAILABILITY_OPTIONS = [
  { value: "IMMEDIATE", label: "Immediately" },
  { value: "TWO_WEEKS", label: "Within 2 weeks" },
  { value: "ONE_MONTH", label: "Within a month" },
  { value: "NEGOTIABLE", label: "Negotiable" },
] as const;

function Auth() {
  const { mode, redirect } = Route.useSearch();
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
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [organisationSector, setOrganisationSector] = useState("");
  const [organisationRegistrationNumber, setOrganisationRegistrationNumber] = useState("");
  const [organisationWebsite, setOrganisationWebsite] = useState("");
  const [organisationBusinessType, setOrganisationBusinessType] = useState<string>("INFORMAL_SME");
  const [organisationSizeBand, setOrganisationSizeBand] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  const landingTo = (user: ApiUser) => redirect ?? landingRouteFor(user);

  const loginMutation = useMutation({
    mutationFn: () => api.post<ApiUser>("/auth/login", { email, password }),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate({ to: landingTo(user) });
    },
    onError: (error) =>
      toast(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
        "error",
      ),
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
        skills: accountType === "CANDIDATE" ? skills || undefined : undefined,
        availability: accountType === "CANDIDATE" ? availability || undefined : undefined,
        organisationName: accountType === "EMPLOYER" ? organisationName || undefined : undefined,
        organisationSector:
          accountType === "EMPLOYER" ? organisationSector || undefined : undefined,
        organisationRegistrationNumber:
          accountType === "EMPLOYER" ? organisationRegistrationNumber || undefined : undefined,
        organisationWebsite:
          accountType === "EMPLOYER" ? organisationWebsite || undefined : undefined,
        organisationBusinessType:
          accountType === "EMPLOYER" ? organisationBusinessType || undefined : undefined,
        organisationSizeBand:
          accountType === "EMPLOYER" ? organisationSizeBand || undefined : undefined,
      }),
    onSuccess: () => {
      loginMutation.mutate();
    },
    onError: (error) =>
      toast(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
        "error",
      ),
  });

  const pending = loginMutation.isPending || registerMutation.isPending;
  const strength = passwordStrength(password);

  return (
    <SiteShell>
      <section className="grid gap-10 py-10 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-16">
        <div className="fade-in relative hidden overflow-hidden rounded-2xl p-10 ring-1 ring-line lg:block">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(160deg, rgba(36,180,92,0.22), rgba(255,214,10,0.10) 55%, transparent 85%)",
            }}
          />
          <div className="glow-pulse pointer-events-none absolute -right-16 -top-16 -z-10 size-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 -z-10 size-64 rounded-full bg-amber/10 blur-3xl" />

          <img src="/logo-mark.png" alt="" className="size-14 rounded-xl object-cover ring-1 ring-line" />
          <h2 className="mt-8 text-balance font-display text-4xl leading-[1.08] tracking-tight xl:text-5xl">
            Every opportunity,
            <br />
            <em className="font-light italic text-accent-soft">verified</em> and within reach.
          </h2>
          <p className="mt-4 max-w-[38ch] text-pretty text-sm leading-6 text-muted">
            Jobs, internships, scholarships, grants, tenders and training — curated for Zambian
            talent, distributed for free.
          </p>
          <ul className="mt-10 space-y-5">
            {TRUST_POINTS.map((point) => (
              <li key={point.text} className="flex items-start gap-3">
                <span className="glass mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-accent/30">
                  <point.icon aria-hidden="true" className="size-4 text-accent-soft" />
                </span>
                <span className="text-sm leading-6 text-fg/90">{point.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="fade-in mx-auto w-full max-w-md lg:mx-0">
          <div className="eyebrow mb-4">( 10 ) — Access</div>
          <h1 className="font-display text-4xl tracking-tight">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {isSignup
              ? "One account covers candidate tracking, employer posting and staff review — your role is assigned after verification."
              : "Sign in to your candidate, employer or staff portal."}
          </p>

          <Panel className="mt-6 shadow-2xl shadow-black/30">
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
                          ? "press accent-gradient glow-ring rounded-md px-4 py-2 text-sm font-medium text-ink transition-transform"
                          : "press rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line transition-all hover:text-fg hover:ring-accent/30"
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
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputCls}
                  />
                </label>
              ) : null}
              <label className={isSignup ? "" : "sm:col-span-2"}>
                <span className="label-mono">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
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
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Lusaka"
                    className={inputCls}
                  />
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
                <label>
                  <span className="label-mono">Top skills (optional)</span>
                  <input
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. SQL, Excel, Power BI"
                    className={inputCls}
                  />
                </label>
                <label>
                  <span className="label-mono">Availability (optional)</span>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Prefer not to say</option>
                    {AVAILABILITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-muted sm:col-span-2">
                  You can add your photo, CV and full work history after signing up, from your
                  profile.
                </p>
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
                <label className="sm:col-span-2">
                  <span className="label-mono">Business type</span>
                  <select
                    value={organisationBusinessType}
                    onChange={(e) => setOrganisationBusinessType(e.target.value)}
                    className={inputCls}
                  >
                    {BUSINESS_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label-mono">Team size (optional)</span>
                  <select
                    value={organisationSizeBand}
                    onChange={(e) => setOrganisationSizeBand(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Prefer not to say</option>
                    {SIZE_BAND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label-mono">Registration number (optional)</span>
                  <input
                    value={organisationRegistrationNumber}
                    onChange={(e) => setOrganisationRegistrationNumber(e.target.value)}
                    placeholder="PACRA number, if you have one"
                    className={inputCls}
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="label-mono">Website (optional)</span>
                  <input
                    value={organisationWebsite}
                    onChange={(e) => setOrganisationWebsite(e.target.value)}
                    placeholder="e.g. https://example.zm"
                    className={inputCls}
                  />
                </label>
                <p className="text-xs text-muted sm:col-span-2">
                  Your organisation will be registered immediately and marked pending verification
                  by EOZ staff — small and informal businesses are welcome and can post
                  opportunities right away.
                </p>
              </div>
            ) : null}

            <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <label>
                <span className="label-mono">Password</span>
                <PasswordInput
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                />
                {isSignup && password ? (
                  <div className="mt-2">
                    <div className="h-1 rounded-full bg-line">
                      <div
                        className={`h-1 rounded-full ${strength.tone}`}
                        style={{ width: `${strength.percent}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-muted">{strength.label} password</div>
                  </div>
                ) : null}
              </label>
              {isSignup ? (
                <label>
                  <span className="label-mono">Confirm password</span>
                  <PasswordInput
                    required
                    minLength={8}
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
            {passwordMismatch ? (
              <p className="text-xs text-rose-400">Passwords do not match.</p>
            ) : null}

            {isSignup ? (
              <label className="flex items-start gap-2 text-xs text-muted">
                <input
                  required
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 size-3.5"
                />
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
                className="press accent-gradient glow-ring rounded-md px-5 py-2.5 text-sm font-medium text-ink transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
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
            search={{ mode: isSignup ? "signin" : "signup", ...(redirect ? { redirect } : {}) }}
            className="text-accent-soft"
          >
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
        <p className="mt-6 text-xs text-muted">{ORG.disclaimer}</p>
        </div>
      </section>
    </SiteShell>
  );
}
