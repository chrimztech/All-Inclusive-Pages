import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ORG } from "@/lib/eoz-data";

export type OrgSettings = {
  name: string;
  shortName: string;
  tagline: string;
  email: string;
  phone: string;
  location: string;
  social: {
    whatsapp: string;
    facebook: string;
    linkedin: string;
    tiktok: string;
  };
};

const FALLBACK: OrgSettings = {
  name: ORG.name,
  shortName: ORG.short,
  tagline: ORG.tagline,
  email: ORG.email,
  phone: ORG.phone,
  location: ORG.location,
  social: ORG.social,
};

/** Public organisation contact details — live from the backend, editable by admins. */
export function useOrgSettings(): OrgSettings {
  const { data } = useQuery({
    queryKey: ["settings", "public"],
    queryFn: () => api.get<Record<string, string>>("/settings/public"),
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return FALLBACK;

  return {
    name: data["org.name"] ?? FALLBACK.name,
    shortName: data["org.short_name"] ?? FALLBACK.shortName,
    tagline: data["org.tagline"] ?? FALLBACK.tagline,
    email: data["org.email"] ?? FALLBACK.email,
    phone: data["org.phone"] ?? FALLBACK.phone,
    location: data["org.location"] ?? FALLBACK.location,
    social: {
      whatsapp: data["org.social.whatsapp"] ?? FALLBACK.social.whatsapp,
      facebook: data["org.social.facebook"] ?? FALLBACK.social.facebook,
      linkedin: data["org.social.linkedin"] ?? FALLBACK.social.linkedin,
      tiktok: data["org.social.tiktok"] ?? FALLBACK.social.tiktok,
    },
  };
}
