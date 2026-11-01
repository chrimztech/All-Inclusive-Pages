import { Link } from "@tanstack/react-router";
import { LogIn, UserPlus } from "lucide-react";

/**
 * Shown to signed-out visitors who want to apply: create a free account or log in, then return to the listing to
 * see how to apply.
 */
export function ApplyGate({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const redirect = `/opportunities/${slug}`;
  const options = [
    {
      mode: "signup" as const,
      icon: UserPlus,
      title: "Create an account",
      body: "New to EOZ? Sign up free in under a minute.",
      primary: true,
    },
    {
      mode: "signin" as const,
      icon: LogIn,
      title: "Log in",
      body: "Already have an account? Log in to continue.",
      primary: false,
    },
  ];
  return (
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "md:grid-cols-2"}`}>
      {options.map((o) => (
        <Link
          key={o.mode}
          to="/auth"
          search={{ mode: o.mode, redirect }}
          className={`hover-lift group flex items-start gap-4 rounded-2xl p-5 ring-1 transition-colors ${
            o.primary
              ? "bg-accent/[0.08] ring-accent/30 hover:bg-accent/[0.12]"
              : "bg-white/[0.03] ring-line hover:bg-white/[0.05]"
          }`}
        >
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
              o.primary
                ? "bg-accent/15 text-accent-soft ring-accent/30"
                : "bg-white/[0.04] text-fg ring-line"
            }`}
          >
            <o.icon aria-hidden="true" className="size-5" />
          </span>
          <span>
            <span className="block font-display text-xl tracking-tight group-hover:text-accent-soft">
              {o.title}
            </span>
            <span className="mt-1 block text-sm text-muted">{o.body}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
