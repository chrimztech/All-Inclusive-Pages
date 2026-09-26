import { createFileRoute } from "@tanstack/react-router";
import { API_BASE_URL } from "@/lib/api-client";

/** Public pages that should be indexed. Portals, admin and auth screens are deliberately left out. */
const STATIC_PATHS = [
  "/",
  "/opportunities",
  "/organisations",
  "/candidates",
  "/employers",
  "/services",
  "/developer-services",
  "/content",
  "/about",
  "/how-it-works",
  "/partners",
  "/contact",
  "/faq",
  "/verification",
  "/scam-warning",
  "/report",
  "/privacy",
  "/terms",
  "/cookie-notice",
];

type Page<T> = { data?: { items?: T[]; totalPages?: number } };
type Listing = { slug: string; publishedAt: string | null };
type Organisation = { id: string };

const MAX_PAGES = 20;

async function fetchAll<T>(path: string, params: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await fetch(`${API_BASE_URL}${path}?${params}&size=200&page=${page}`);
    if (!response.ok) break;
    const body = (await response.json()) as Page<T>;
    items.push(...(body.data?.items ?? []));
    if (page + 1 >= (body.data?.totalPages ?? 1)) break;
  }
  return items;
}

function escapeXml(value: string) {
  return value.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );
}

function url(loc: string, lastmod?: string | null, priority?: string) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        // The sitemap still lists the static pages if the API is unreachable.
        const [listings, organisations] = await Promise.all([
          fetchAll<Listing>("/opportunities", "order=newest").catch(() => []),
          fetchAll<Organisation>("/organisations", "order=name").catch(() => []),
        ]);
        const entries = [
          ...STATIC_PATHS.map((path) =>
            url(`${origin}${path}`, null, path === "/" ? "1.0" : "0.6"),
          ),
          ...listings.map((l) =>
            url(`${origin}/opportunities/${encodeURIComponent(l.slug)}`, l.publishedAt, "0.8"),
          ),
          ...organisations.map((o) => url(`${origin}/organisations/${o.id}`, null, "0.5")),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
