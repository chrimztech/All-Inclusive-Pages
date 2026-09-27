import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Lock, LogIn } from "lucide-react";
import { Panel, SiteShell } from "@/components/eoz/SiteShell";
import { allows, ruleFor } from "@/lib/access";
import { landingRouteFor, useCurrentUser } from "@/lib/use-current-user";

/**
 * Renders a page only for people allowed to use it (see src/lib/access.ts). Signed-out visitors get a sign-in
 * prompt that returns them here; signed-in people without access get an explanation and a link to their own area.
 * Nothing from the protected page is rendered for them — no menus, headings or empty tables.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const href = useRouterState({ select: (s) => s.location.href });
  const guarded = ruleFor(pathname);
  const { user, isLoading, isSignedOut } = useCurrentUser();

  if (!guarded) return <>{children}</>;

  if (isLoading || (!user && !isSignedOut)) {
    return (
      <SiteShell>
        <div className="py-16" aria-busy="true" aria-label="Checking access">
          <div className="skeleton h-10 w-2/3 max-w-xl rounded-xl" />
          <div className="skeleton mt-6 h-40 rounded-2xl" />
        </div>
      </SiteShell>
    );
  }

  if (!user) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-lg py-20">
          <Panel className="p-8 text-center">
            <LogIn aria-hidden="true" className="mx-auto size-8 text-accent-soft" />
            <h1 className="mt-4 font-display text-3xl">Sign in to continue</h1>
            <p className="mt-2 text-sm text-muted">
              {guarded.label} is available to signed-in accounts only.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/auth"
                search={{ mode: "signin", redirect: href }}
                className="btn-primary px-5 py-2.5 text-sm"
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="btn-secondary px-5 py-2.5 text-sm"
              >
                Create an account
              </Link>
            </div>
          </Panel>
        </section>
      </SiteShell>
    );
  }

  if (!allows(guarded.rule, user)) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-lg py-20">
          <Panel className="p-8 text-center">
            <Lock aria-hidden="true" className="mx-auto size-8 text-amber" />
            <h1 className="mt-4 font-display text-3xl">Not part of your account</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {guarded.label} isn't available to your role. If you need it for your work, ask an
              administrator to give your role the right permission.
            </p>
            <Link
              to={landingRouteFor(user)}
              className="btn-primary mt-6 inline-flex px-5 py-2.5 text-sm"
            >
              Go to your dashboard
            </Link>
          </Panel>
        </section>
      </SiteShell>
    );
  }

  return <>{children}</>;
}
