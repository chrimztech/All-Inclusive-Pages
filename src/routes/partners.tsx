import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { api } from "@/lib/api-client";

const PARTNER_TYPES = [
  {
    t: "Employers & institutions",
    d: "Ministries, corporates, NGOs and colleges that publish verified vacancies, tenders and intakes through EOZ.",
    cta: "Post an opportunity",
    to: "/employers/post" as const,
  },
  {
    t: "Training providers",
    d: "Skills and certification providers whose intakes we distribute to candidates across the ten provinces.",
    cta: "Talk to us",
    to: "/contact" as const,
  },
  {
    t: "Community channels",
    d: "Student unions, youth groups and WhatsApp communities that echo listings to their members.",
    cta: "Talk to us",
    to: "/contact" as const,
  },
];

type PublicStats = {
  verifiedOrganisations: number;
  publishedListings: number;
  applicationsThisWeek: number;
  averageReviewHours: number | null;
};

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Partners — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Partner with Echo Opportunities Zambia: employers, training providers and community channels distributing verified opportunities across Zambia.",
      },
      { property: "og:title", content: "Partners — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Ways organisations and community channels work with EOZ to reach Zambian candidates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Partners,
});

function Partners() {
  const { data } = useQuery({
    queryKey: ["stats", "public"],
    queryFn: () => api.get<PublicStats>("/stats/public"),
  });

  const reviewTime =
    data?.averageReviewHours == null
      ? "—"
      : data.averageReviewHours < 24
        ? `< 1 day`
        : `${Math.round(data.averageReviewHours / 24)} days`;

  const numbers = [
    { k: "Provinces covered", v: "10" },
    { k: "Verified organisations", v: data ? `${data.verifiedOrganisations}` : "—" },
    { k: "Listings distributed", v: data ? `${data.publishedListings}` : "—" },
    { k: "Average review time", v: reviewTime },
  ];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 13 ) — Partners"
        title="Reach candidates in every province, without losing control of your process."
        lead="Partners keep their own application channel. EOZ curates, verifies and distributes — nothing more."
        aside={
          <Panel>
            <Chip>Open</Chip>
            <p className="mt-3 text-sm text-muted">
              Partnerships are free for public-interest listings. Paid placement is limited to featured slots and is always
              labelled.
            </p>
          </Panel>
        }
      />

      <section className="grid gap-4 pb-10 lg:grid-cols-3">
        {PARTNER_TYPES.map((p) => (
          <Panel key={p.t} className="flex flex-col">
            <h2 className="font-display text-xl tracking-tight">{p.t}</h2>
            <p className="mt-2 flex-1 text-sm text-muted">{p.d}</p>
            <Link to={p.to} className="mt-4 text-sm text-amber hover:underline">
              {p.cta} →
            </Link>
          </Panel>
        ))}
      </section>

      <section className="grid gap-4 pb-14 sm:grid-cols-2 lg:grid-cols-4">
        {numbers.map((n) => (
          <Panel key={n.k}>
            <div className="label-mono">{n.k}</div>
            <div className="mt-1 font-display text-3xl text-amber">{n.v}</div>
          </Panel>
        ))}
      </section>
    </SiteShell>
  );
}
