import { useQuery } from "@tanstack/react-query";
import { api, isUnauthenticated, type ApiUser } from "@/lib/api-client";
import { isEmployer, isStaff } from "@/lib/access";

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

/** Where someone lands after signing in: their own area, decided by the same rules as src/lib/access.ts. */
export function landingRouteFor(user: ApiUser): string {
  if (user.roles.includes("EMPLOYER")) return "/employers/dashboard";
  if (isStaff(user)) return "/admin";
  if (user.roles.includes("CANDIDATE")) return "/candidate";
  if (isEmployer(user)) return "/employers/dashboard";
  return "/account";
}

/**
 * `can("PERM", …)`: whether the signed-in person holds any of the permissions (admins hold them all). Use it to hide
 * actions a page's visitor can't perform — the API refuses them anyway.
 */
export function useCan() {
  const { user } = useCurrentUser();
  return (...permissions: string[]) =>
    !!user &&
    (user.roles.includes("ADMIN") || permissions.some((p) => user.permissions.includes(p)));
}
