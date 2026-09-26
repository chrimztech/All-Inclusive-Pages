import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { FileText, Upload } from "lucide-react";
import { API_BASE_URL, api, ApiError, uploadFile } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

type Evidence = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedByName: string | null;
};

const ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg";

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * An organisation's verification evidence (registration certificate, TPIN letter, ...). Members can upload;
 * reviewers see the same list read-only. Submitting evidence moves a pending organisation to "under review".
 */
export function VerificationDocuments({
  organisationId,
  canUpload,
}: {
  organisationId: string;
  canUpload: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const key = ["organisations", organisationId, "verification-documents"];

  const docsQuery = useQuery({
    queryKey: key,
    queryFn: () => api.get<Evidence[]>(`/organisations/${organisationId}/verification-documents`),
    retry: false,
  });
  const upload = useMutation({
    mutationFn: (file: File) =>
      uploadFile<Evidence>(`/organisations/${organisationId}/verification-documents`, file, {}),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ["employer", "organisation"] });
      queryClient.invalidateQueries({ queryKey: ["organisations"] });
      toast(`${doc.fileName} uploaded. EOZ will review it.`);
    },
    onError: (error) =>
      toast(error instanceof ApiError ? error.message : "Upload failed.", "error"),
  });

  const docs = docsQuery.data ?? [];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="label-mono">Verification documents</span>
        {canUpload ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              aria-label="Upload a verification document"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={upload.isPending}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-accent-soft ring-1 ring-accent/30 transition-colors hover:bg-accent/10 disabled:opacity-60"
            >
              <Upload aria-hidden="true" className="size-3.5" />
              {upload.isPending ? "Uploading…" : "Upload"}
            </button>
          </>
        ) : null}
      </div>
      {canUpload ? (
        <p className="mb-3 text-xs text-muted">
          PACRA certificate, TPIN letter or similar — PDF, Word or image, up to 10 MB.
        </p>
      ) : null}
      {docsQuery.isLoading ? <div className="skeleton h-10 rounded-lg" /> : null}
      {docsQuery.isError ? <p className="text-xs text-rose">Could not load documents.</p> : null}
      {docsQuery.isSuccess && docs.length === 0 ? (
        <p className="text-xs text-muted">No documents submitted yet.</p>
      ) : null}
      <ul className="space-y-2">
        {docs.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs ring-1 ring-line"
          >
            <FileText aria-hidden="true" className="size-4 shrink-0 text-accent-soft" />
            <a
              href={`${API_BASE_URL}/files/${d.id}/download`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-fg hover:text-accent-soft"
            >
              {d.fileName}
            </a>
            <span className="shrink-0 text-muted">
              {formatSize(d.sizeBytes)} · {new Date(d.uploadedAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Review = {
  decision: string;
  notes: string | null;
  reviewerName: string | null;
  reviewedAt: string;
};

const DECISION_TONE: Record<string, string> = {
  VERIFIED: "text-emerald",
  REJECTED: "text-rose",
  SUSPENDED: "text-amber",
  UNDER_REVIEW: "text-accent-soft",
};

/** Verification decisions with reviewer notes, newest first. Visible to members and reviewers. */
export function VerificationReviews({
  organisationId,
  limit,
}: {
  organisationId: string;
  limit?: number;
}) {
  const reviewsQuery = useQuery({
    queryKey: ["organisations", organisationId, "verification-reviews"],
    queryFn: () => api.get<Review[]>(`/organisations/${organisationId}/verification-reviews`),
    retry: false,
  });
  const reviews = (reviewsQuery.data ?? []).slice(0, limit ?? 50);
  if (reviewsQuery.isLoading) return <div className="skeleton h-10 rounded-lg" />;
  if (reviewsQuery.isError) return null;
  return (
    <div>
      <span className="label-mono">Review history</span>
      {reviews.length === 0 ? <p className="mt-2 text-xs text-muted">No decisions yet.</p> : null}
      <ol className="mt-2 space-y-2">
        {reviews.map((r, i) => (
          <li
            key={`${r.reviewedAt}-${i}`}
            className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs ring-1 ring-line"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-medium ${DECISION_TONE[r.decision] ?? ""}`}>
                {r.decision.replace(/_/g, " ")}
              </span>
              <span className="text-muted">
                {new Date(r.reviewedAt).toLocaleString("en-ZM", { timeZone: "Africa/Lusaka" })}
                {r.reviewerName ? ` · ${r.reviewerName}` : ""}
              </span>
            </div>
            {r.notes ? <p className="mt-1 text-fg/85">{r.notes}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
