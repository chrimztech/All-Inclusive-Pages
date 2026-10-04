import type { InformationArticleCategory } from "@/lib/api-client";

export const INFORMATION_CATEGORIES: Record<
  InformationArticleCategory,
  { label: string; shortLabel: string; description: string }
> = {
  OPPORTUNITY_GUIDES: {
    label: "Opportunity guides",
    shortLabel: "Opportunities",
    description: "Understand listings, eligibility and the steps between discovery and submission.",
  },
  APPLICATION_ADVICE: {
    label: "Application advice",
    shortLabel: "Applications",
    description: "Practical help for CVs, cover letters, interviews and stronger submissions.",
  },
  CAREER_GROWTH: {
    label: "Career growth",
    shortLabel: "Career growth",
    description: "Build useful skills, make deliberate moves and tell your professional story.",
  },
  WORKPLACE: {
    label: "Workplace",
    shortLabel: "Workplace",
    description: "Navigate work, communication, performance and professional relationships.",
  },
  BUSINESS: {
    label: "Business & funding",
    shortLabel: "Business",
    description: "Clear guidance for tenders, grants, enterprise readiness and sustainable growth.",
  },
  TRUST_SAFETY: {
    label: "Trust & safety",
    shortLabel: "Trust & safety",
    description: "Verify opportunities, recognise warning signs and protect your information.",
  },
};

export const INFORMATION_CATEGORY_KEYS = Object.keys(
  INFORMATION_CATEGORIES,
) as InformationArticleCategory[];

export function articleDate(value: string | null) {
  if (!value) return "Not published";
  return new Intl.DateTimeFormat("en-ZM", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lusaka",
  }).format(new Date(value));
}
