import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Code2,
  Database,
  Layers,
  LayoutTemplate,
  Mail,
  Phone,
  Plug,
  Rocket,
  Search,
  Server,
  ShieldCheck,
  Smartphone,
  Wrench,
} from "lucide-react";
import { SiteShell, Panel } from "@/components/eoz/SiteShell";
import { Reveal, trackSpotlight } from "@/components/eoz/Motion";
import { WhatsAppIcon } from "@/components/eoz/SocialIcons";
import { api, ApiError } from "@/lib/api-client";

/**
 * Public contact details for the developer. Anything left null is simply not shown; enquiries always
 * work through the form below, which lands in the EOZ admin inbox.
 */
const DEVELOPER: {
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  portfolioUrl: string | null;
} = {
  name: "Chrishent Matakala Mutondo",
  email: "chrishentmatakala@yahoo.com",
  whatsapp: "+260 976 911 338",
  portfolioUrl: null,
};

export const Route = createFileRoute("/developer-services")({
  head: () => ({
    meta: [
      { title: "Software Development Services — Web, Mobile & Systems | EOZ" },
      {
        name: "description",
        content:
          "Custom systems, web apps, mobile apps, APIs, databases and ongoing maintenance for Zambian businesses, schools, NGOs and institutions.",
      },
      { property: "og:title", content: "Software Development Services — Web, Mobile & Systems" },
      {
        property: "og:description",
        content:
          "From idea to launch and beyond: full-stack software built and maintained locally.",
      },
    ],
  }),
  component: DeveloperServices,
});

const SERVICES = [
  {
    icon: Layers,
    title: "Custom systems",
    body: "Management systems built around how you actually work — schools, clinics, HR, inventory, finance, bookings and records.",
  },
  {
    icon: LayoutTemplate,
    title: "Web applications & websites",
    body: "Fast, responsive web apps and professional websites with dashboards, portals, sign-in and role-based access.",
  },
  {
    icon: Smartphone,
    title: "Mobile apps",
    body: "Android and iOS apps that work well on everyday phones and patchy connections, published to the app stores.",
  },
  {
    icon: Server,
    title: "Backends & APIs",
    body: "Secure, documented APIs and business logic — authentication, permissions, file handling, notifications and audit trails.",
  },
  {
    icon: Database,
    title: "Databases",
    body: "Database design, migration of old spreadsheets or systems, performance tuning, and automated backups you can restore.",
  },
  {
    icon: Wrench,
    title: "Maintenance & support",
    body: "Bug fixes, updates, security patches, monitoring and new features for systems you already run — ours or someone else's.",
  },
  {
    icon: Plug,
    title: "Integrations",
    body: "Mobile money and card payments, SMS, email, WhatsApp, maps and third-party services connected to your system.",
  },
  {
    icon: Cloud,
    title: "Hosting & deployment",
    body: "Deployment to the cloud or your own server, domains and SSL, CI pipelines and a clear handover so you are never locked in.",
  },
] as const;

const STEPS = [
  {
    icon: Search,
    title: "Discover",
    body: "We talk through the problem, who uses the system and what success looks like. You get a written scope and quote.",
  },
  {
    icon: Code2,
    title: "Design & build",
    body: "Screens first, then the build in short milestones you can see and test as it grows.",
  },
  {
    icon: ShieldCheck,
    title: "Test & launch",
    body: "Security, data and real-device testing before go-live, then training for your team.",
  },
  {
    icon: Rocket,
    title: "Support & grow",
    body: "Maintenance plans keep it secure and up to date, with new features as your needs change.",
  },
] as const;

const STACK = [
  "React",
  "TypeScript",
  "Flutter",
  "React Native",
  "Java & Spring Boot",
  "Node.js",
  "PostgreSQL",
  "MySQL",
  "REST APIs",
  "Docker",
  "Tailwind CSS",
  "Git & CI/CD",
];

const PROJECT_TYPES = [
  "Custom system",
  "Web application",
  "Website",
  "Mobile app",
  "Backend / API",
  "Database work",
  "Maintenance & support",
  "Something else",
];

const BUDGETS = [
  "Not sure yet",
  "Under K10,000",
  "K10,000 – K50,000",
  "K50,000 – K150,000",
  "Over K150,000",
];
const TIMELINES = ["Flexible", "Within a month", "1–3 months", "3–6 months", "6+ months"];

function DeveloperServices() {
  return (
    <SiteShell>
      <section className="relative -mx-5 px-5 pt-12 pb-16 lg:-mx-8 lg:px-8 lg:pt-20">
        <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 -top-20" />
        <div className="relative grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="fade-in inline-flex items-center gap-2 rounded-full bg-accent/[0.07] py-1 pr-3.5 pl-2.5 ring-1 ring-accent/20">
              <Code2 aria-hidden="true" className="size-3.5 text-accent-soft" />
              <span className="eyebrow !text-[10.5px]">Developer services</span>
            </div>
            <h1
              className="fade-in mt-6 text-balance font-display text-[2.6rem] leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-[4.5rem]"
              style={{ animationDelay: "80ms" }}
            >
              Software that <em className="text-gradient font-light italic">works</em> for your
              organisation.
            </h1>
            <p
              className="fade-in mt-6 max-w-[56ch] text-pretty text-base leading-7 text-muted lg:text-lg lg:leading-8"
              style={{ animationDelay: "160ms" }}
            >
              Custom systems, web and mobile apps, backends and databases — designed, built and
              maintained end to end{DEVELOPER.name ? ` by ${DEVELOPER.name}` : ""}. For businesses,
              schools, clinics, NGOs and institutions across Zambia.
            </p>
            <div className="fade-in mt-8 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
              <a href="#enquire" className="btn-primary px-6 py-3.5 text-sm">
                Start a project
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
              {DEVELOPER.whatsapp ? (
                <a
                  href={`https://wa.me/${DEVELOPER.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hello, I found your developer services on Echo Opportunities Zambia and would like to discuss a project.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-6 py-3.5 text-sm"
                >
                  <WhatsAppIcon className="size-4 text-accent-soft" />
                  Chat on WhatsApp
                </a>
              ) : null}
              <a href="#services" className="btn-secondary px-6 py-3.5 text-sm">
                What I build
              </a>
            </div>
          </div>

          <div className="fade-in lg:col-span-5" style={{ animationDelay: "300ms" }}>
            <div className="glass-strong relative overflow-hidden rounded-3xl p-6 ring-1 ring-white/10">
              <div className="mb-4 flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-rose/70" />
                <span className="size-2.5 rounded-full bg-amber/70" />
                <span className="size-2.5 rounded-full bg-emerald/70" />
                <span className="ml-2 font-mono text-[10px] text-muted">project.ts</span>
              </div>
              <pre className="overflow-x-auto font-mono text-[12.5px] leading-6 text-fg/85">
                <code>
                  <span className="text-accent-soft">const</span> project = {"{"}
                  {"\n  "}frontend: <span className="text-amber">"web + mobile"</span>,{"\n  "}
                  backend: <span className="text-amber">"secure APIs"</span>,{"\n  "}database:{" "}
                  <span className="text-amber">"PostgreSQL"</span>,{"\n  "}support:{" "}
                  <span className="text-amber">"ongoing"</span>,{"\n"}
                  {"}"};{"\n\n"}
                  <span className="text-accent-soft">await</span> launch(project);{" "}
                  <span className="text-muted">// ✓ live</span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="scroll-mt-24 py-12">
        <Reveal className="mb-10 max-w-2xl">
          <div className="eyebrow mb-4">What I build</div>
          <h2 className="text-balance font-display text-4xl leading-[1.05] tracking-tight lg:text-5xl">
            Front end, back end, database — and everything after launch.
          </h2>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={(i % 4) * 80}>
              <div
                onMouseMove={trackSpotlight}
                className="spotlight ring-gradient glass hover-lift flex h-full flex-col rounded-2xl p-6 ring-1 ring-line"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent-soft ring-1 ring-accent/20">
                  <s.icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-5 font-display text-xl tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-16">
        <Reveal className="mb-10 max-w-2xl">
          <div className="eyebrow mb-4">How it works</div>
          <h2 className="font-display text-4xl leading-[1.05] tracking-tight lg:text-5xl">
            Clear steps, no surprises.
          </h2>
        </Reveal>
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 100}>
              <div className="glass relative h-full rounded-2xl p-6 ring-1 ring-line">
                <span className="absolute top-5 right-5 font-mono text-xs text-muted">
                  0{i + 1}
                </span>
                <step.icon aria-hidden="true" className="size-6 text-accent-soft" />
                <h3 className="mt-5 font-display text-xl tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="py-12">
        <Reveal>
          <div
            className="grid gap-8 rounded-3xl p-6 ring-1 ring-white/10 sm:p-10 lg:grid-cols-12 lg:items-center"
            style={{
              background:
                "radial-gradient(600px 300px at 100% 0%, rgba(255,214,10,0.10), transparent 60%), radial-gradient(600px 320px at 0% 100%, rgba(36,180,92,0.18), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
            }}
          >
            <div className="lg:col-span-6">
              <div className="eyebrow mb-4">Recent work</div>
              <h2 className="font-display text-3xl leading-tight tracking-tight lg:text-4xl">
                The platform you are using right now.
              </h2>
              <p className="mt-4 max-w-[52ch] text-muted">
                Echo Opportunities Zambia runs on a full-stack system: a React web app, a Spring
                Boot API and a PostgreSQL database, with role-based portals for candidates,
                employers and staff, moderation, recruitment tracking, payments, notifications and
                tested backups.
              </p>
              <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
                {[
                  "Candidate, employer & staff portals",
                  "Permissions for 10 staff roles",
                  "Recruitment pipeline & shortlists",
                  "Service orders, invoices & payments",
                  "Alerts, reminders & notifications",
                  "Backups with restore safety checks",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-accent-soft"
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-6">
              <div className="label-mono mb-3">Tools I work with</div>
              <ul className="flex flex-wrap gap-2">
                {STACK.map((t) => (
                  <li
                    key={t}
                    className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm text-fg/85 ring-1 ring-line"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="enquire" className="scroll-mt-24 py-16">
        <div className="grid gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <div className="eyebrow mb-4">Start a project</div>
            <h2 className="font-display text-4xl leading-[1.05] tracking-tight lg:text-5xl">
              Tell me what you need.
            </h2>
            <p className="mt-4 max-w-[46ch] text-muted">
              Describe the problem in your own words — no technical language needed. You will get a
              reply with questions or a proposed scope and quote.
            </p>
            {DEVELOPER.name || DEVELOPER.email || DEVELOPER.whatsapp ? (
              <div className="glass mt-6 rounded-2xl p-5 ring-1 ring-line">
                {DEVELOPER.name ? (
                  <div className="flex items-center gap-3">
                    <span className="accent-gradient flex size-11 shrink-0 items-center justify-center rounded-full font-display text-base font-semibold text-ink">
                      {DEVELOPER.name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")}
                    </span>
                    <div>
                      <div className="font-display text-lg leading-tight">{DEVELOPER.name}</div>
                      <div className="text-xs text-muted">
                        Full-stack software developer · Zambia
                      </div>
                    </div>
                  </div>
                ) : null}
                <ul className="mt-4 space-y-2.5 text-sm">
                  {DEVELOPER.whatsapp ? (
                    <li className="flex items-center gap-2.5">
                      <Phone aria-hidden="true" className="size-4 text-accent-soft" />
                      <a
                        href={`tel:${DEVELOPER.whatsapp.replace(/[^\d+]/g, "")}`}
                        className="hover:text-accent-soft"
                      >
                        {DEVELOPER.whatsapp}
                      </a>
                      <a
                        href={`https://wa.me/${DEVELOPER.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent-soft ring-1 ring-accent/25 hover:text-fg"
                      >
                        WhatsApp
                      </a>
                    </li>
                  ) : null}
                  {DEVELOPER.email ? (
                    <li className="flex items-center gap-2.5">
                      <Mail aria-hidden="true" className="size-4 text-accent-soft" />
                      <a
                        href={`mailto:${DEVELOPER.email}`}
                        className="break-all hover:text-accent-soft"
                      >
                        {DEVELOPER.email}
                      </a>
                    </li>
                  ) : null}
                  {DEVELOPER.portfolioUrl ? (
                    <li>
                      <a
                        href={DEVELOPER.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-soft hover:text-fg"
                      >
                        Portfolio ↗
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
            <p className="mt-6 max-w-[46ch] text-xs leading-5 text-muted">
              This is an independent software development service listed with EOZ's permission. It
              is separate from EOZ's opportunity listings and professional career services.
            </p>
          </Reveal>
          <div className="lg:col-span-7">
            <EnquiryForm />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

const inputCls =
  "mt-1 w-full rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-sm text-fg outline-none ring-1 ring-line transition-shadow placeholder:text-muted/70 focus:ring-accent/50";

function EnquiryForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [projectType, setProjectType] = useState(PROJECT_TYPES[0]!);
  const [budget, setBudget] = useState(BUDGETS[0]!);
  const [timeline, setTimeline] = useState(TIMELINES[0]!);
  const [details, setDetails] = useState("");

  const send = useMutation({
    mutationFn: () =>
      api.post("/contact", {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        reason: `Developer services — ${projectType}`,
        message: [
          organisation.trim() ? `Organisation: ${organisation.trim()}` : null,
          `Project type: ${projectType}`,
          `Budget: ${budget}`,
          `Timeline: ${timeline}`,
          "",
          details.trim(),
        ]
          .filter((line) => line !== null)
          .join("\n"),
      }),
  });

  if (send.isSuccess) {
    return (
      <Panel className="flex h-full flex-col items-center justify-center p-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald/10 ring-1 ring-emerald/30">
          <CheckCircle2 aria-hidden="true" className="size-7 text-emerald" />
        </span>
        <h3 className="mt-5 font-display text-2xl">Enquiry received.</h3>
        <p className="mt-2 max-w-[40ch] text-sm text-muted">
          Thank you, {name.split(" ")[0]}. You will hear back at {email}, usually within two working
          days.
        </p>
        <Link to="/" className="mt-6 text-sm text-accent-soft">
          Back to EOZ →
        </Link>
      </Panel>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send.mutate();
  };

  return (
    <Panel className="p-6 sm:p-8">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <label className="text-xs text-muted">
          Your name
          <input
            required
            maxLength={255}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="text-xs text-muted">
          Email
          <input
            required
            type="email"
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="text-xs text-muted">
          Phone / WhatsApp (optional)
          <input
            maxLength={50}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="text-xs text-muted">
          Organisation (optional)
          <input
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="text-xs text-muted sm:col-span-2">
          What do you need?
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className={inputCls}
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Budget
          <select value={budget} onChange={(e) => setBudget(e.target.value)} className={inputCls}>
            {BUDGETS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Timeline
          <select
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            className={inputCls}
          >
            {TIMELINES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted sm:col-span-2">
          Project details
          <textarea
            required
            minLength={20}
            maxLength={4000}
            rows={6}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="What should the system do? Who will use it? Do you have an existing system or spreadsheet?"
            className={inputCls}
          />
        </label>
        {send.isError ? (
          <p role="alert" className="text-sm text-rose sm:col-span-2">
            {send.error instanceof ApiError
              ? send.error.message
              : "Could not send your enquiry. Please try again."}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={send.isPending}
            className="btn-primary px-6 py-3 text-sm disabled:opacity-60"
          >
            {send.isPending ? "Sending…" : "Send enquiry"}
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </form>
    </Panel>
  );
}
