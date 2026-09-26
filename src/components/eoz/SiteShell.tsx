import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { trackSpotlight } from "./Motion";
import { NotificationBell } from "./NotificationBell";
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
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 640px at 8% -12%, rgba(22,120,62,0.50), transparent 60%), radial-gradient(1000px 560px at 100% -4%, rgba(255,214,10,0.16), transparent 55%), radial-gradient(900px 700px at 50% 125%, rgba(36,180,92,0.14), transparent 60%), linear-gradient(180deg, #081d12 0%, #071a10 40%, #06160d 100%)",
        }}
      />
      <div
        className="glow-pulse absolute inset-0"
        style={{
          background:
            "radial-gradient(760px 420px at 78% 14%, rgba(255,214,10,0.12), transparent 65%)",
        }}
      />
      <div className="grain absolute inset-0" />
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className="group flex items-center gap-3"
      aria-label="Echo Opportunities Zambia — home"
    >
      <span className="relative">
        <span className="absolute -inset-1 rounded-lg accent-gradient opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-50" />
        <img
          src="/logo-mark.png"
          alt=""
          className="relative size-9 rounded-lg object-cover ring-1 ring-white/10 transition-transform duration-500 ease-[var(--ease-eoz)] group-hover:scale-105"
        />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-[15px] font-medium tracking-tight whitespace-nowrap">
          Echo Opportunities{" "}
          <span className="hidden font-sans text-xs font-normal text-muted sm:inline">Zambia</span>
        </span>
        {compact ? null : <span className="label-mono hidden sm:block">Lusaka · ZM</span>}
      </span>
    </Link>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-line bg-ink/75 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl backdrop-saturate-150"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <BrandMark />
        <nav
          aria-label="Primary"
          className="hidden items-center gap-0.5 rounded-full bg-white/[0.03] p-1 text-[13px] ring-1 ring-line backdrop-blur-md lg:flex"
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full px-3.5 py-1.5 text-muted transition-all duration-300 hover:bg-white/[0.05] hover:text-fg"
              activeProps={{
                className:
                  "!bg-white/[0.09] !text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/10",
              }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <AccountMenu />
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="press flex size-10 items-center justify-center rounded-lg text-fg ring-1 ring-line transition-colors hover:bg-white/5 lg:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-x-0 top-[68px] bottom-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            aria-label="Mobile"
            className="glass-strong fade-in relative mx-3 mt-2 rounded-2xl p-2 ring-1 ring-line"
            style={{ backgroundColor: "rgba(8,29,18,0.92)" }}
          >
            {NAV.map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                className="fade-in flex items-center justify-between rounded-xl px-4 py-3.5 text-[15px] text-muted transition-colors hover:bg-white/5 hover:text-fg"
                activeProps={{ className: "!text-fg bg-white/[0.06]" }}
                activeOptions={{ exact: item.to === "/" }}
                style={{ animationDelay: `${i * 35}ms` }}
              >
                {item.label}
                <ArrowUpRight className="size-4 opacity-40" />
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function AccountMenu() {
  const { user, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // An account still on its one-time password can only use the account page until it has chosen its own.
  useEffect(() => {
    if (user?.mustChangePassword && pathname !== "/account") {
      navigate({ to: "/account" });
    }
  }, [user?.mustChangePassword, pathname, navigate]);

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
    return <div className="skeleton h-9 w-24 rounded-lg" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          to="/auth"
          search={{ mode: "signin" }}
          className="hidden rounded-lg px-3.5 py-2 text-sm text-muted transition-colors hover:text-fg sm:inline-flex"
        >
          Sign in
        </Link>
        <Link
          to="/auth"
          search={{ mode: "signup" }}
          className="btn-primary px-4 py-2 text-sm whitespace-nowrap"
        >
          Get started
          <ArrowRight aria-hidden="true" className="hidden size-3.5 sm:block" />
        </Link>
      </div>
    );
  }

  const dashboardTo = landingRouteFor(user);
  const accountTo = "/account";
  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm text-muted ring-1 ring-line transition-all hover:bg-white/[0.04] hover:text-fg hover:ring-accent/30"
      >
        <span className="accent-gradient flex size-7 items-center justify-center rounded-full font-mono text-[11px] font-semibold text-ink">
          {initials || "·"}
        </span>
        <span className="hidden max-w-[12ch] truncate sm:inline">{user.fullName}</span>
        <ChevronDown
          aria-hidden="true"
          className={`size-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="glass-strong fade-in absolute right-0 z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-xl text-sm ring-1 ring-line"
            style={{ backgroundColor: "rgba(8,29,18,0.94)" }}
          >
            <div className="border-b border-line px-4 py-3">
              <div className="truncate font-medium text-fg">{user.fullName}</div>
              <div className="label-mono mt-0.5 truncate normal-case tracking-normal">
                {user.email}
              </div>
            </div>
            <div className="p-1.5">
              {!user.emailVerified ? (
                <Link
                  to="/verify-email"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-amber hover:bg-white/5"
                >
                  <span className="size-1.5 rounded-full bg-amber" />
                  Verify your email
                </Link>
              ) : null}
              <Link
                to={dashboardTo}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-white/5"
              >
                <LayoutDashboard aria-hidden="true" className="size-4 text-muted" />
                Dashboard
              </Link>
              <Link
                to={accountTo}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-white/5"
              >
                <ShieldCheck aria-hidden="true" className="size-4 text-muted" />
                Account & security
              </Link>
            </div>
            <div className="border-t border-line p-1.5">
              <button
                type="button"
                disabled={logout.isPending}
                onClick={() => logout.mutate()}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-rose hover:bg-rose/10 disabled:opacity-60"
              >
                <LogOut aria-hidden="true" className="size-4" />
                {logout.isPending ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function socialLinks(social: {
  whatsapp: string;
  facebook: string;
  linkedin: string;
  tiktok: string;
}) {
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
      { to: "/developer-services", label: "Developer services" },
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

function FooterCta() {
  const org = useOrgSettings();
  return (
    <div className="mx-auto max-w-7xl px-5 pt-20 lg:px-8">
      <div
        className="relative overflow-hidden rounded-3xl p-8 ring-1 ring-white/10 sm:p-12 lg:p-14"
        style={{
          background:
            "radial-gradient(600px 300px at 0% 0%, rgba(255,214,10,0.18), transparent 60%), radial-gradient(700px 360px at 100% 100%, rgba(36,180,92,0.30), transparent 60%), linear-gradient(135deg, #0d2c1b, #0a2215)",
        }}
      >
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="eyebrow mb-4">Stay ahead</div>
            <h2 className="text-balance font-display text-3xl leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl">
              Never miss a <em className="text-gradient font-light italic">verified</em> opportunity
              again.
            </h2>
            <p className="mt-4 max-w-[52ch] text-pretty text-muted">
              Create a free account for tailored alerts and application tracking, or follow our
              channel for daily updates.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:justify-end">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="btn-primary px-6 py-3.5 text-sm"
            >
              Create free account
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <a
              href={org.social.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary px-6 py-3.5 text-sm"
            >
              <WhatsAppIcon className="size-4 text-accent-soft" />
              Follow on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const org = useOrgSettings();
  return (
    <footer className="relative z-10 mt-20 overflow-hidden border-t border-line">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,214,10,0.5), rgba(124,227,164,0.5), transparent)",
        }}
      />
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <BrandMark />
            <p className="mt-5 max-w-[42ch] text-sm leading-6 text-muted">{org.tagline}</p>
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
                  className="flex size-9 items-center justify-center rounded-full bg-white/[0.03] text-accent-soft ring-1 ring-line transition-all duration-300 hover:-translate-y-0.5 hover:text-fg hover:ring-accent/40 hover:shadow-[0_0_16px_-2px_rgba(124,227,164,0.5)]"
                >
                  <s.Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <div className="mb-4 text-xs font-medium tracking-wide text-fg">{col.heading}</div>
                <ul className="space-y-3 text-sm text-muted">
                  {col.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="inline-block transition-all duration-300 hover:translate-x-0.5 hover:text-fg"
                      >
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
      <div
        aria-hidden="true"
        className="pointer-events-none -mt-6 -mb-[0.24em] select-none text-center font-display text-[34vw] leading-none font-semibold tracking-tighter whitespace-nowrap lg:text-[22rem]"
        style={{
          background: "linear-gradient(180deg, rgba(124,227,164,0.07), transparent 75%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        EOZ
      </div>
    </footer>
  );
}

/** Routes whose own layout already ends in a call to action, or where one would get in the way. */
const NO_FOOTER_CTA =
  /^\/(auth|admin|candidate|employers\/|account|forgot-password|reset-password|verify-email)/;

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUser();
  const showCta = !user && !NO_FOOTER_CTA.test(pathname);
  return (
    <div className="relative min-h-screen bg-ink font-sans text-fg antialiased">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-surface-2 focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <Ambience />
      <Header />
      <main id="main" className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
        {children}
      </main>
      {showCta ? <FooterCta /> : null}
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
    <section className="relative grid gap-8 pt-12 pb-8 lg:grid-cols-12 lg:items-end lg:pt-16">
      <div className="lg:col-span-8">
        <div className="fade-in mb-5 inline-flex items-center gap-2 rounded-full bg-accent/[0.07] py-1 pr-3.5 pl-2.5 ring-1 ring-accent/20">
          <span className="size-1.5 rounded-full bg-accent-soft shadow-[0_0_10px_2px_rgba(124,227,164,0.6)]" />
          <span className="eyebrow !text-[10.5px]">{eyebrow}</span>
        </div>
        <h1
          className="fade-in text-balance font-display text-[2.5rem] leading-[1.02] font-normal tracking-[-0.02em] sm:text-5xl lg:text-[4.25rem]"
          style={{ animationDelay: "80ms" }}
        >
          {title}
        </h1>
        {lead ? (
          <p
            className="fade-in mt-6 max-w-[58ch] text-pretty text-base leading-7 text-muted lg:text-lg lg:leading-8"
            style={{ animationDelay: "160ms" }}
          >
            {lead}
          </p>
        ) : null}
      </div>
      {aside ? (
        <div className="fade-in lg:col-span-4" style={{ animationDelay: "240ms" }}>
          {aside}
        </div>
      ) : null}
    </section>
  );
}

export function Panel({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  /** Adds a hover lift, gradient edge and pointer spotlight, for panels that act as clickable cards. */
  interactive?: boolean;
}) {
  return (
    <div
      onMouseMove={interactive ? trackSpotlight : undefined}
      className={`glass rounded-2xl p-5 ring-1 ring-line ${interactive ? "hover-lift spotlight ring-gradient" : ""} ${className}`}
    >
      {children}
    </div>
  );
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
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] tracking-wide ring-1 ring-inset transition-colors duration-200 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
