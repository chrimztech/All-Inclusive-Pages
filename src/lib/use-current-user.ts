import { useQuery } from "@tanstack/react-query";
import { api, isUnauthenticated, type ApiUser } from "@/lib/api-client";

/** The signed-in user, or null when signed out. Never throws for the anonymous case. */
export function useCurrentUser() {
  const query = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<ApiUser>("/auth/me"),
    retry: false,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isSignedOut: isUnauthenticated(query.error),
  };
}

export function landingRouteFor(user: ApiUser): string {
  if (user.roles.includes("EMPLOYER")) return "/employers/dashboard";
  if (user.roles.includes("ADMIN") || user.roles.includes("MANAGER") || user.roles.includes("AUDITOR")) return "/admin";
  if (
    user.roles.includes("CONTENT_OFFICER") ||
    user.roles.includes("RECRUITMENT_OFFICER") ||
    user.roles.includes("SERVICE_OFFICER") ||
    user.roles.includes("FINANCE_OFFICER")
  ) {
    return "/admin";
  }
  return "/candidate";
}
