import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "Page not found — Echo Opportunities Zambia" },
      { name: "description", content: "This page does not exist on the Echo Opportunities Zambia platform." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Page not found — Echo Opportunities Zambia" },
      { property: "og:description", content: "This page does not exist on the EOZ platform." },
    ],
  }),
  component: NotFoundPage,
});

function NotFoundPage() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 404 ) — Not found"
        title="This page has closed."
        lead="Listings expire and pages move. Start again from discovery or the opportunity board."
      />
      <Panel className="mb-14 flex flex-wrap gap-3">
        <Link to="/" className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink">
          Back to discovery
        </Link>
        <Link to="/opportunities" className="rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg">
          Browse opportunities
        </Link>
        <Link to="/faq" className="rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg">
          Read the FAQ
        </Link>
      </Panel>
    </SiteShell>
  );
}
