import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { ORG } from "@/lib/eoz-data";
import { useOrgSettings } from "@/lib/use-org-settings";
import { api } from "@/lib/api-client";
import { useCurrentUser, landingRouteFor } from "@/lib/use-current-user";
import { FacebookIcon, LinkedInIcon, TikTokIcon, WhatsAppIcon } from "./SocialIcons";

const NAV = [
  { to: "/", label: "Discover" },
  { to: "/opportunities", label: "Opportunities" },
  { to: "/organisations", label: "Organisations" },
  { to: "/candidates", label: "Candidates" },
  { to: "/content", label: "Content" },
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
          <img
            src="/logo-mark.png"
            alt="Echo Opportunities Zambia"
            className="size-8 rounded-md object-cover"
          />
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
        <AccountMenu />
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

function AccountMenu() {
  const { user, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const logout = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["me"], null);
      queryClient.clear();
      setOpen(false);
      navigate({ to: "/" });
    },
  });

  if (isLoading) {
    return <div className="h-9 w-24" />;
  }

  if (!user) {
    return (
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
    );
  }

  const dashboardTo = landingRouteFor(user);
  const accountTo = user.roles.includes("CANDIDATE") ? "/candidate/account" : dashboardTo;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted ring-1 ring-line transition-colors hover:text-fg"
      >
        <UserIcon aria-hidden="true" className="size-4" />
        <span className="hidden max-w-[12ch] truncate sm:inline">{user.fullName}</span>
        <ChevronDown aria-hidden="true" className="size-3.5" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="glass-strong absolute right-0 z-50 mt-2 w-56 rounded-lg p-2 text-sm ring-1 ring-line">
            {!user.emailVerified ? (
              <Link
                to="/verify-email"
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-amber hover:bg-surface-2"
              >
                Verify your email
              </Link>
            ) : null}
            <Link
              to={dashboardTo}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 hover:bg-surface-2"
            >
              Dashboard
            </Link>
            <Link
              to={accountTo}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 hover:bg-surface-2"
            >
              Account & security
            </Link>
            <button
              type="button"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-rose hover:bg-surface-2 disabled:opacity-60"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {logout.isPending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function socialLinks(social: { whatsapp: string; facebook: string; linkedin: string; tiktok: string }) {
  return [
    { label: "WhatsApp", href: social.whatsapp, Icon: WhatsAppIcon },
    { label: "Facebook", href: social.facebook, Icon: FacebookIcon },
    { label: "LinkedIn", href: social.linkedin, Icon: LinkedInIcon },
    { label: "TikTok", href: social.tiktok, Icon: TikTokIcon },
  ] as const;
}

const FOOTER_COLUMNS = [
  {
    heading: "Platform",
    links: [
      { to: "/", label: "Discover" },
      { to: "/opportunities", label: "Opportunity board" },
      { to: "/organisations", label: "Organisations" },
      { to: "/candidates", label: "Candidates" },
      { to: "/employers", label: "Employers" },
      { to: "/services", label: "Services" },
    ],
  },
  {
    heading: "Company",
    links: [
      { to: "/about", label: "About EOZ" },
      { to: "/partners", label: "Partners" },
      { to: "/how-it-works", label: "How it works" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Trust & safety",
    links: [
      { to: "/scam-warning", label: "Scam warning" },
      { to: "/report", label: "Report a listing" },
      { to: "/verification", label: "Verification standards" },
      { to: "/faq", label: "FAQ" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { to: "/privacy", label: "Privacy policy" },
      { to: "/terms", label: "Terms of service" },
      { to: "/cookie-notice", label: "Cookie notice" },
    ],
  },
] as const;

function Footer() {
  const org = useOrgSettings();
  return (
    <footer className="relative z-10 border-t border-line">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/logo-mark.png"
                alt="Echo Opportunities Zambia"
                className="size-8 rounded-md object-cover"
              />
              <div className="leading-tight">
                <div className="font-display text-[15px] font-medium tracking-tight">
                  Echo Opportunities <span className="font-sans text-xs text-muted">Zambia</span>
                </div>
                <div className="label-mono">Lusaka · ZM</div>
              </div>
            </Link>
            <p className="mt-4 max-w-[42ch] text-sm leading-6 text-muted">{org.tagline}</p>
            <div className="mt-5 space-y-1.5 text-sm text-muted">
              <div>{org.location}</div>
              <a href={`tel:${org.phone.replace(/\s/g, "")}`} className="block hover:text-fg">
                {org.phone}
              </a>
              <a href={`mailto:${org.email}`} className="block hover:text-fg">
                {org.email}
              </a>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              {socialLinks(org.social).map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`EOZ on ${s.label}`}
                  title={s.label}
                  className="flex size-8 items-center justify-center rounded-full text-accent-soft ring-1 ring-line transition-colors hover:text-fg hover:ring-accent/40"
                >
                  <s.Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <div className="label-mono mb-4">{col.heading}</div>
                <ul className="space-y-2.5 text-sm text-muted">
                  {col.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to} className="transition-colors hover:text-fg">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-[70ch] text-xs leading-5 text-muted">{ORG.disclaimer}</p>
          <div className="flex shrink-0 items-center gap-4 whitespace-nowrap text-xs text-muted">
            <span className="font-mono">
              © {new Date().getFullYear()} {org.shortName}. All rights reserved.
            </span>
            <Link to="/admin" className="hover:text-fg">
              Staff console
            </Link>
          </div>
        </div>
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
