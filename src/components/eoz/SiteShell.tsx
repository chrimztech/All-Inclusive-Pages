import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ORG } from "@/lib/eoz-data";

const NAV = [
  { to: "/", label: "Discover" },
  { to: "/opportunities", label: "Opportunities" },
  { to: "/organisations", label: "Organisations" },
  { to: "/candidates", label: "Candidates" },
  { to: "/employers", label: "Employers" },
  { to: "/services", label: "Services" },
] as const;

export function Ambience() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1400px 700px at 10% -10%, rgba(18,110,55,0.55), transparent 58%), radial-gradient(1200px 600px at 100% 0%, rgba(255,214,10,0.20), transparent 52%), radial-gradient(900px 700px at 50% 130%, rgba(255,214,10,0.16), transparent 60%), radial-gradient(1000px 600px at 50% 45%, rgba(6,60,30,0.65), transparent 75%)",
        }}
      />
      <div
        className="glow-pulse pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(800px 460px at 78% 18%, rgba(255,214,10,0.14), transparent 65%)",
        }}
      />
    </>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="accent-gradient grid size-8 place-items-center rounded-md font-display text-sm font-semibold text-ink">
            E
          </div>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-medium tracking-tight">
              Echo Opportunities <span className="font-sans text-xs text-muted">Zambia</span>
            </div>
            <div className="label-mono">Lusaka · ZM</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-7 text-sm lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-muted transition-colors hover:text-fg"
              activeProps={{ className: "text-fg" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="hidden rounded-md px-3 py-2 text-sm text-muted transition-colors hover:text-fg sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink"
          >
            Get started
          </Link>
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t border-line px-5 py-2 text-sm lg:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="shrink-0 text-muted"
            activeProps={{ className: "text-fg" }}
            activeOptions={{ exact: item.to === "/" }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 mx-auto max-w-7xl border-t border-line px-5 py-8 lg:px-8">
      <div className="flex flex-col justify-between gap-3 text-xs text-muted lg:flex-row lg:items-center">
        <div className="max-w-[80ch]">{ORG.disclaimer}</div>
        <div className="font-mono whitespace-nowrap">
          {ORG.phone} · {ORG.email}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted">
        <Link to="/about" className="hover:text-fg">
          About
        </Link>
        <Link to="/contact" className="hover:text-fg">
          Contact
        </Link>
        <Link to="/faq" className="hover:text-fg">
          FAQ
        </Link>
        <Link to="/scam-warning" className="hover:text-fg">
          Scam warning
        </Link>
        <Link to="/privacy" className="hover:text-fg">
          Privacy
        </Link>
        <Link to="/terms" className="hover:text-fg">
          Terms
        </Link>
        <Link to="/cookie-notice" className="hover:text-fg">
          Cookies
        </Link>
        <Link to="/admin" className="hover:text-fg">
          Staff console
        </Link>
        <Link to="/scam-warning" className="hover:text-fg">
          Scam warning
        </Link>
        <span className="font-mono">
          © {new Date().getFullYear()} {ORG.short}
        </span>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-ink font-sans text-fg antialiased">
      <Ambience />
      <Header />
      <main className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">{children}</main>
      <Footer />
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  lead,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  aside?: ReactNode;
}) {
  return (
    <section className="grid gap-8 pt-10 pb-6 lg:grid-cols-12 lg:items-end lg:pt-14">
      <div className="fade-in lg:col-span-8">
        <div className="eyebrow mb-4">{eyebrow}</div>
        <h1 className="text-balance font-display text-4xl leading-[1.05] tracking-tight lg:text-6xl">
          {title}
        </h1>
        {lead ? (
          <p className="mt-5 max-w-[56ch] text-pretty text-base text-muted lg:text-lg">{lead}</p>
        ) : null}
      </div>
      {aside ? <div className="fade-in lg:col-span-4">{aside}</div> : null}
    </section>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-xl p-5 ring-1 ring-line ${className}`}>{children}</div>;
}

export function Chip({
  tone = "accent",
  children,
}: {
  tone?: "accent" | "emerald" | "amber" | "rose" | "muted";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    accent: "bg-accent/15 text-accent-soft ring-accent/30",
    emerald: "bg-emerald/10 text-emerald ring-emerald/30",
    amber: "bg-amber/10 text-amber ring-amber/30",
    rose: "bg-rose/10 text-rose ring-rose/30",
    muted: "bg-line text-muted ring-line",
  };
  return (
    <span className={`rounded px-2 py-0.5 font-mono text-[10px] ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}
