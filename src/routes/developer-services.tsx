import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Code2,
  Database,
  Layers,
  LayoutTemplate,
  Mail,
  MapPin,
  Network,
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
import { GitHubIcon, WhatsAppIcon } from "@/components/eoz/SocialIcons";
import { api, ApiError } from "@/lib/api-client";

/**
 * Public contact details for the developer. Anything left null is simply not shown; enquiries always
 * work through the form below, which lands in the EOZ admin inbox.
 */
const DEVELOPER: {
  name: string | null;
  title: string;
  location: string;
  email: string | null;
  whatsapp: string | null;
  githubUrl: string | null;
} = {
  name: "Chrishent Matakala Mutondo",
  title: "Systems Developer · Full-stack web & mobile engineer",
  location: "Lusaka, Zambia",
  email: "chrishentmatakala@yahoo.com",
  whatsapp: "+260 976 911 338",
  githubUrl: "https://github.com/chrimztech",
};

export const Route = createFileRoute("/developer-services")({
  head: () => ({
    meta: [
      { title: "Software Development Services — Web, Mobile, AI & Systems | EOZ" },
      {
        name: "description",
        content:
          "Custom systems, web and mobile apps, APIs, databases, AI services and ongoing support for Zambian businesses, schools, clinics, NGOs and institutions.",
      },
      {
        property: "og:title",
        content: "Software Development Services — Web, Mobile, AI & Systems",
      },
      {
        property: "og:description",
        content:
          "From requirements to production: full-stack systems built, deployed and supported locally by a Lusaka-based systems developer.",
      },
    ],
  }),
  component: DeveloperServices,
});

const VALUE = [
  {
    icon: Layers,
    title: "Full-stack engineering",
    body: "Responsive React interfaces, Spring Boot services, REST APIs, authentication, validation and application integration.",
  },
  {
    icon: Network,
    title: "Data & architecture",
    body: "Requirements analysis, domain modelling, PostgreSQL schema design, modular services and maintainable system structure.",
  },
  {
    icon: BrainCircuit,
    title: "Mobile & AI",
    body: "Flutter cross-platform apps, and Python/YOLO AI services integrated with web and backend platforms.",
  },
  {
    icon: Cloud,
    title: "Deployment & support",
    body: "Git workflows, Docker, Linux, Nginx, HTTPS/SSL, production configuration, troubleshooting and documentation.",
  },
] as const;

const SERVICES = [
  {
    icon: ClipboardList,
    title: "Requirements & system design",
    body: "Workflows mapped, use cases and user stories written, data and APIs modelled — a clear specification before any code.",
  },
  {
    icon: Layers,
    title: "Custom systems",
    body: "Management systems built around how you actually work — schools, clinics, counselling, libraries, HR, inventory and records.",
  },
  {
    icon: LayoutTemplate,
    title: "Web applications & websites",
    body: "Fast, responsive web apps and professional websites with dashboards, portals, sign-in and role-based access.",
  },
  {
    icon: Smartphone,
    title: "Mobile apps",
    body: "Flutter apps for Android and iOS that work well on everyday phones and patchy connections.",
  },
  {
    icon: Server,
    title: "Backends & APIs",
    body: "Secure, documented REST APIs and business logic — authentication, permissions, validation, files, notifications and audit trails.",
  },
  {
    icon: Database,
    title: "Databases",
    body: "PostgreSQL design, migrations from old spreadsheets or systems, data integrity, performance tuning and restorable backups.",
  },
  {
    icon: BrainCircuit,
    title: "AI & computer vision",
    body: "Image recognition and classification with Python and YOLO, trained on your data and served to your web and mobile apps.",
  },
  {
    icon: Plug,
    title: "Integrations",
    body: "Mobile money and card payments, SMS, email, WhatsApp, maps and third-party services connected to your system.",
  },
  {
    icon: Cloud,
    title: "Hosting & deployment",
    body: "Docker, Linux and Nginx deployments with domains and HTTPS, on the cloud or your own server, with a clear handover.",
  },
  {
    icon: Wrench,
    title: "Maintenance & support",
    body: "Bug fixes, updates, security patches, user support and new features for systems you already run — mine or someone else's.",
  },
] as const;

const PROJECTS = [
  {
    title: "UNZA Digital Library Ecosystem",
    stack: ["React", "Spring Boot", "PostgreSQL", "Flutter"],
    body: "A multi-platform institutional system for publishing, managing and accessing learning and research resources: responsive frontend modules, REST services, database structures, mobile integration and production deployment.",
  },
  {
    title: "UNZA Counselling System",
    stack: ["React", "Spring Boot", "PostgreSQL", "Flutter"],
    body: "Web, backend and mobile components that digitise counselling workflows and student-support administration, with secure structured records and user-centred interfaces.",
  },
  {
    title: "UNZA Clinic Management Platform",
    stack: ["React", "Spring Boot", "PostgreSQL"],
    body: "An integrated full-stack platform for clinic workflows, service records and daily operations, with responsive frontend modules, backend business logic and relational data.",
  },
  {
    title: "UNZA Student and Staff Mobile Apps",
    stack: ["Flutter", "Dart", "REST APIs"],
    body: "Android and iOS apps giving access to university digital services: interface implementation, application logic, REST integration, testing and maintenance.",
  },
  {
    title: "School Management System",
    stack: ["React", "Spring Boot", "PostgreSQL", "Docker"],
    body: "An academic and administrative platform covering student, staff and operational workflows, with frontend and backend services and containerised production deployment.",
  },
  {
    title: "Cattle AI Recognition and Tracking Platform",
    stack: ["Python / YOLO", "Flutter", "React", "Spring Boot"],
    body: "A multi-service identification and tracking solution across AI, mobile, web, backend and database layers, with a trained YOLO model exposed through its own AI service.",
  },
] as const;

const MORE_PROJECTS = [
  {
    title: "Environmental Monitoring and EHS Safety Suite",
    body: "Structured reporting, operational visibility and mobile field access.",
  },
  {
    title: "CEMIS and Sanitation Services",
    body: "Java backend services for structured data capture and workflow processing.",
  },
  {
    title: "Art Canvas Zambia",
    body: "Marketplace and learning-platform concept for artists, classes and commerce.",
  },
  {
    title: "REHEPA Aerospace",
    body: "Responsive corporate web presence for aerial and geospatial services.",
  },
  {
    title: "Frontend Database Builder, CMS & prototypes",
    body: "Reusable interfaces, data-driven experiences and service integration.",
  },
] as const;

const STACK = [
  {
    label: "Languages",
    items: [
      "Java",
      "TypeScript",
      "JavaScript",
      "Dart",
      "Python",
      "PHP",
      "SQL",
      "Golang",
      "HTML5",
      "CSS3",
    ],
  },
  {
    label: "Web & backend",
    items: [
      "React",
      "Spring Boot",
      "REST APIs",
      "Laravel",
      "Authentication",
      "Service integration",
    ],
  },
  { label: "Mobile", items: ["Flutter", "Dart", "Android", "iOS"] },
  {
    label: "Data & AI",
    items: ["PostgreSQL", "Relational modelling", "Migrations", "YOLO", "AI service integration"],
  },
  {
    label: "Deployment",
    items: [
      "Git",
      "GitHub",
      "Docker",
      "Nginx",
      "HTTPS/SSL",
      "Linux",
      "Windows",
      "Render",
      "Maven",
      "npm",
    ],
  },
  {
    label: "Analysis & design",
    items: [
      "Requirements",
      "Process mapping",
      "Use cases",
      "User stories",
      "Data modelling",
      "API design",
    ],
  },
  {
    label: "Architecture",
    items: ["Layered applications", "Modular services", "Domain modelling", "REST integration"],
  },
  {
    label: "Quality & support",
    items: [
      "Testing",
      "Debugging",
      "User acceptance",
      "Documentation",
      "Troubleshooting",
      "User support",
    ],
  },
] as const;

const STEPS = [
  {
    icon: Search,
    title: "Analyse",
    body: "Talk to the people who will use it, document requirements, map workflows and agree what success looks like. You get a written scope and quote.",
  },
  {
    icon: Code2,
    title: "Design",
    body: "Model the data, APIs, modules, permissions, user journeys and integrations, with acceptance criteria you sign off.",
  },
  {
    icon: ShieldCheck,
    title: "Build & test",
    body: "Frontend, backend and database built in short milestones you can see and test, then integrated, debugged and validated.",
  },
  {
    icon: Rocket,
    title: "Deploy & improve",
    body: "Configure production, release safely, document the system, train and support your team, and keep improving from feedback.",
  },
] as const;

const PROJECT_TYPES = [
  "Custom system",
  "Web application",
  "Website",
  "Mobile app",
  "Backend / API",
  "Database work",
  "AI / computer vision",
  "Requirements & system design",
  "Deployment & hosting",
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

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

function StackChips({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <li
          key={t}
          className="rounded-full bg-white/[0.04] px-2.5 py-1 text-xs text-fg/85 ring-1 ring-line"
        >
          {t}
        </li>
      ))}
    </ul>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <Reveal className="mb-10 max-w-3xl">
      <div className="eyebrow mb-4">{eyebrow}</div>
      <h2 className="text-balance font-display text-4xl leading-[1.05] tracking-tight lg:text-5xl">
        {title}
      </h2>
    </Reveal>
  );
}

function DeveloperServices() {
  const waLink = DEVELOPER.whatsapp
    ? `https://wa.me/${DEVELOPER.whatsapp.replace(/\D/g, "")}`
    : null;
  return (
    <SiteShell>
      <section className="relative -mx-5 px-5 pt-12 pb-16 lg:-mx-8 lg:px-8 2xl:-mx-12 2xl:px-12 lg:pt-20">
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
              className="fade-in mt-6 max-w-[60ch] text-pretty text-base leading-7 text-muted lg:text-lg lg:leading-8"
              style={{ animationDelay: "160ms" }}
            >
              Custom systems, web and mobile apps, APIs, databases and AI services — analysed,
              designed, built, deployed and supported end to end
              {DEVELOPER.name ? ` by ${DEVELOPER.name}` : ""}, a systems developer who builds
              institutional platforms for the University of Zambia. For businesses, schools,
              clinics, NGOs and institutions across Zambia.
            </p>
            <div className="fade-in mt-8 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
              <a href="#enquire" className="btn-primary px-6 py-3.5 text-sm">
                Start a project
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
              {waLink ? (
                <a
                  href={`${waLink}?text=${encodeURIComponent("Hello, I found your developer services on Echo Opportunities Zambia and would like to discuss a project.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-6 py-3.5 text-sm"
                >
                  <WhatsAppIcon className="size-4 text-accent-soft" />
                  Chat on WhatsApp
                </a>
              ) : null}
              <a href="#work" className="btn-secondary px-6 py-3.5 text-sm">
                See my work
              </a>
            </div>
          </div>

          <div className="fade-in lg:col-span-5" style={{ animationDelay: "300ms" }}>
            <div className="glass-strong relative overflow-hidden rounded-3xl p-6 ring-1 ring-white/10 sm:p-7">
              {DEVELOPER.name ? (
                <div className="flex items-center gap-4">
                  <span className="accent-gradient flex size-14 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-semibold text-ink">
                    {initials(DEVELOPER.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-xl leading-tight">{DEVELOPER.name}</div>
                    <div className="mt-0.5 text-xs text-muted">{DEVELOPER.title}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <MapPin aria-hidden="true" className="size-3" />
                      {DEVELOPER.location}
                    </div>
                  </div>
                </div>
              ) : null}
              <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Now", "Systems Developer, UNZA CICT"],
                  ["Delivers", "Web · Mobile · API · AI"],
                  ["Core stack", "React · Spring Boot · PostgreSQL"],
                  ["Mobile", "Flutter for Android & iOS"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-line">
                    <dt className="label-mono">{k}</dt>
                    <dd className="mt-1 leading-snug text-fg/90">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                {DEVELOPER.githubUrl ? (
                  <a
                    href={DEVELOPER.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs ring-1 ring-line hover:text-accent-soft"
                  >
                    <GitHubIcon className="size-3.5" />
                    {DEVELOPER.githubUrl.replace(/^https?:\/\//, "")}
                  </a>
                ) : null}
                {DEVELOPER.email ? (
                  <a
                    href={`mailto:${DEVELOPER.email}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs ring-1 ring-line hover:text-accent-soft"
                  >
                    <Mail aria-hidden="true" className="size-3.5" />
                    Email
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 py-12">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <div className="eyebrow mb-4">About</div>
            <h2 className="text-balance font-display text-4xl leading-[1.05] tracking-tight lg:text-5xl">
              Technical delivery with a people-first approach.
            </h2>
            <div className="mt-6 space-y-4 text-muted">
              <p>
                A full-stack systems developer with practical experience analysing, designing,
                developing, integrating, testing and deploying institutional web and mobile systems
                for the University of Zambia.
              </p>
              <p>
                Years of teaching and supporting users mean systems are built around the people who
                use them — clear interfaces, sensible workflows and patient support.
              </p>
              <p>
                Turns operational requirements into secure, maintainable architecture, structured
                data models, responsive interfaces and production-ready services.
              </p>
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {VALUE.map((v, i) => (
              <Reveal key={v.title} delay={(i % 2) * 80}>
                <div className="glass h-full rounded-2xl p-6 ring-1 ring-line">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent-soft ring-1 ring-accent/20">
                    <v.icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-5 font-display text-xl tracking-tight">{v.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="scroll-mt-24 py-12">
        <SectionHeading
          eyebrow="What I build"
          title="From requirements to production — and everything after launch."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={(i % 5) * 70}>
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

      <section id="work" className="scroll-mt-24 py-16">
        <SectionHeading
          eyebrow="Selected work"
          title="Institutional systems delivered across web, mobile, data and AI."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PROJECTS.map((p, i) => (
            <Reveal key={p.title} delay={(i % 3) * 80}>
              <article className="glass hover-lift flex h-full flex-col rounded-2xl p-6 ring-1 ring-line">
                <span className="font-mono text-xs text-muted">0{i + 1}</span>
                <h3 className="mt-3 font-display text-xl leading-snug tracking-tight">{p.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted">{p.body}</p>
                <div className="mt-5">
                  <StackChips items={p.stack} />
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-6">
          <div
            className="grid gap-8 rounded-3xl p-6 ring-1 ring-white/10 sm:p-10 lg:grid-cols-12 lg:items-center"
            style={{
              background:
                "radial-gradient(600px 300px at 100% 0%, rgba(255,214,10,0.10), transparent 60%), radial-gradient(600px 320px at 0% 100%, rgba(36,180,92,0.18), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
            }}
          >
            <div className="lg:col-span-6">
              <div className="eyebrow mb-4">Also built</div>
              <h3 className="font-display text-3xl leading-tight tracking-tight lg:text-4xl">
                The platform you are using right now.
              </h3>
              <p className="mt-4 max-w-[52ch] text-muted">
                Echo Opportunities Zambia runs on a full-stack system: a React web app, a Spring
                Boot API and a PostgreSQL database, with role-based portals for candidates,
                employers and staff, moderation, recruitment tracking, payments, notifications and
                tested backups.
              </p>
            </div>
            <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:col-span-6">
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
        </Reveal>

        <Reveal className="mt-10">
          <div className="label-mono mb-4">More projects</div>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {MORE_PROJECTS.map((p) => (
              <li key={p.title} className="rounded-2xl bg-white/[0.02] p-5 ring-1 ring-line">
                <div className="font-medium leading-snug">{p.title}</div>
                <p className="mt-1.5 text-sm leading-6 text-muted">{p.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <section id="stack" className="scroll-mt-24 py-12">
        <SectionHeading eyebrow="Skills & technology" title="The tools behind the work." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STACK.map((group, i) => (
            <Reveal key={group.label} delay={(i % 4) * 70}>
              <div className="glass h-full rounded-2xl p-5 ring-1 ring-line">
                <div className="label-mono mb-3">{group.label}</div>
                <StackChips items={group.items} />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-16">
        <SectionHeading eyebrow="How it works" title="A clear lifecycle, no surprises." />
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
                      {initials(DEVELOPER.name)}
                    </span>
                    <div>
                      <div className="font-display text-lg leading-tight">{DEVELOPER.name}</div>
                      <div className="text-xs text-muted">
                        {DEVELOPER.title} · {DEVELOPER.location}
                      </div>
                    </div>
                  </div>
                ) : null}
                <ul className="mt-4 space-y-2.5 text-sm">
                  {DEVELOPER.whatsapp && waLink ? (
                    <li className="flex items-center gap-2.5">
                      <Phone aria-hidden="true" className="size-4 text-accent-soft" />
                      <a
                        href={`tel:${DEVELOPER.whatsapp.replace(/[^\d+]/g, "")}`}
                        className="hover:text-accent-soft"
                      >
                        {DEVELOPER.whatsapp}
                      </a>
                      <a
                        href={waLink}
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
                  {DEVELOPER.githubUrl ? (
                    <li className="flex items-center gap-2.5">
                      <GitHubIcon className="size-4 text-accent-soft" />
                      <a
                        href={DEVELOPER.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent-soft"
                      >
                        {DEVELOPER.githubUrl.replace(/^https?:\/\//, "")}
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
