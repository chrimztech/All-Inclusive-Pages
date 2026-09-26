import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ToastProvider } from "../lib/toast";
import { Ambience } from "../components/eoz/SiteShell";

function StatusScreen({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-5 text-fg">
      <Ambience />
      <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0" />
      <div className="fade-in relative max-w-lg text-center">{children}</div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <StatusScreen>
      <div className="text-gradient font-display text-[9rem] leading-none font-light tracking-tighter sm:text-[12rem]">
        404
      </div>
      <h1 className="mt-2 font-display text-3xl tracking-tight">This page has moved on.</h1>
      <p className="mx-auto mt-3 max-w-[40ch] text-muted">
        The link may be out of date, or the listing may have closed. Fresh opportunities are waiting
        on the board.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/opportunities" className="btn-primary px-5 py-3 text-sm">
          Browse opportunities
        </Link>
        <Link to="/" className="btn-secondary px-5 py-3 text-sm">
          Go home
        </Link>
      </div>
    </StatusScreen>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <StatusScreen>
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose/10 font-display text-2xl text-rose ring-1 ring-rose/30">
        !
      </div>
      <h1 className="mt-6 font-display text-3xl tracking-tight">This page didn't load</h1>
      <p className="mx-auto mt-3 max-w-[40ch] text-muted">
        Something went wrong on our end. You can try again, or head back home.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="btn-primary px-5 py-3 text-sm"
        >
          Try again
        </button>
        <a href="/" className="btn-secondary px-5 py-3 text-sm">
          Go home
        </a>
      </div>
    </StatusScreen>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#071a10" },
      { title: "Echo Opportunities Zambia — Verified Opportunities" },
      {
        name: "description",
        content:
          "Verified jobs, internships, scholarships, grants, tenders and training across Zambia, curated and distributed by EOZ in Lusaka.",
      },
      { name: "author", content: "Echo Opportunities Zambia" },
      { property: "og:title", content: "Echo Opportunities Zambia — Verified Opportunities" },
      {
        property: "og:description",
        content:
          "Curated Zambian opportunities with deadlines and official employer application methods.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content: "https://echo-opportunities-zambia.university-o-7503.chatgpt.site/og.png",
      },
      { property: "og:image:width", content: "1731" },
      { property: "og:image:height", content: "909" },
      { property: "og:image:alt", content: "Echo Opportunities Zambia" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content: "https://echo-opportunities-zambia.university-o-7503.chatgpt.site/og.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&family=Inter:wght@300..700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      { rel: "icon", href: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { rel: "icon", href: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </ToastProvider>
    </QueryClientProvider>
  );
}
