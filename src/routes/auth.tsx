import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, Panel } from "@/components/eoz/SiteShell";
import { ORG } from "@/lib/eoz-data";

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

function Auth() {
  const { mode } = Route.useSearch();
  const isSignup = mode === "signup";

  return (
    <SiteShell>
      <section className="mx-auto max-w-md py-14">
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
          <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
            {isSignup ? (
              <label>
                <span className="label-mono">Full name</span>
                <input className={inputCls} />
              </label>
            ) : null}
            <label>
              <span className="label-mono">Email</span>
              <input type="email" className={inputCls} />
            </label>
            <label>
              <span className="label-mono">Password</span>
              <input type="password" className={inputCls} />
            </label>
            {isSignup ? (
              <label>
                <span className="label-mono">I am a</span>
                <select className={inputCls}>
                  <option>Candidate</option>
                  <option>Employer</option>
                </select>
              </label>
            ) : null}
            <button className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink">
              {isSignup ? "Create account" : "Sign in"}
            </button>
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
