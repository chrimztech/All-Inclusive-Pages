export const API_BASE_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:8081/api/v1";

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string> | undefined;

  constructor(status: number, message: string, fieldErrors?: Record<string, string> | undefined) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | undefined> | undefined;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== "" && value !== "All" && value !== "All regions") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const init: RequestInit = {
    method: options.method ?? "GET",
    credentials: "include",
  };
  if (options.body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(url.toString(), init);

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const problem = payload as
      | { detail?: string; title?: string; fieldErrors?: Record<string, string> }
      | null;
    throw new ApiError(
      response.status,
      problem?.detail ?? problem?.title ?? "Something went wrong. Please try again.",
      problem?.fieldErrors,
    );
  }

  return (payload as { data: T }).data;
}

export const api = {
  get: <T>(path: string, params?: RequestOptions["params"]) => request<T>(path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Multipart upload — bypasses the JSON request() helper since the body is FormData, not JSON. */
export async function uploadFile<T>(
  path: string,
  file: File,
  fields: Record<string, string>,
): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = payload as { detail?: string; title?: string } | null;
    throw new ApiError(response.status, problem?.detail ?? problem?.title ?? "Upload failed.");
  }
  return (payload as { data: T }).data;
}

export function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

// ===== Response shapes returned by the Spring Boot backend =====

export type PageResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ApiOpportunitySummary = {
  id: string;
  reference: string;
  slug: string;
  title: string;
  categoryCode: string;
  categoryName: string;
  organisationName: string;
  location: string | null;
  region: string | null;
  workMode: string | null;
  verified: boolean;
  opportunityValue: string | null;
  opportunityValueUnit: string | null;
  deadline: string | null;
  publishedAt: string | null;
};

export type ApiOpportunityDetail = ApiOpportunitySummary & {
  description: string;
  responsibilities: string | null;
  requirements: string | null;
  benefits: string | null;
  applicationMode: string;
  applicationUrl: string | null;
  applicationEmail: string | null;
  applicationAddress: string | null;
  source: string | null;
  viewsCount: number;
};

export type ApiCategory = { code: string; name: string; description: string | null };

export type ApiUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  roles: string[];
  opportunityAlertsEnabled: boolean;
  serviceCommsEnabled: boolean;
};

export type ApiApplication = {
  id: string;
  reference: string;
  opportunityId: string;
  opportunityTitle: string;
  organisationName: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
};

export function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const diffMs = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
