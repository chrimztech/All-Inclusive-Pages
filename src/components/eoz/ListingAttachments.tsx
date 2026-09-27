import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { API_BASE_URL, api, ApiError, uploadFile } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

type Attachment = {
  id: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number | null;
  uploadedAt: string;
};

const MAX = 5;

function size(bytes: number | null) {
  if (bytes == null) return "";
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1048576).toFixed(1)} MB`;
}

/**
 * Documents attached to a listing (official advert, terms of reference…). `editable` shows upload and remove for
 * people who manage the listing; otherwise it's the public, read-only list (rendered only when there are files).
 */
export function ListingAttachments({
  opportunityId,
  editable = false,
}: {
  opportunityId: string;
  editable?: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const key = ["opportunity", opportunityId, "attachments"];
  const query = useQuery({
    queryKey: key,
    queryFn: () => api.get<Attachment[]>(`/opportunities/${opportunityId}/attachments`),
    retry: false,
  });
  const fail = (e: unknown, fallback: string) =>
    toast(e instanceof ApiError ? e.message : fallback, "error");

  const upload = useMutation({
    mutationFn: (file: File) =>
      uploadFile<Attachment>(`/opportunities/manage/${opportunityId}/attachments`, file, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      toast("Document attached.");
    },
    onError: (e) => fail(e, "Could not attach the document."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/opportunities/manage/${opportunityId}/attachments/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      toast("Document removed.");
    },
    onError: (e) => fail(e, "Could not remove the document."),
  });

  const files = query.data ?? [];
  if (!editable && files.length === 0) return null;

  return (
    <section aria-labelledby={`attachments-${opportunityId}`} className="mt-6">
      <h3 id={`attachments-${opportunityId}`} className="label-mono mb-3 flex items-center gap-2">
        <Paperclip aria-hidden="true" className="size-3.5" />
        {editable ? `Attachments (${files.length}/${MAX})` : "Documents"}
      </h3>
      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm ring-1 ring-line"
            >
              <a
                href={`${API_BASE_URL}/opportunities/attachments/${f.id}/download`}
                className="flex min-w-0 items-center gap-2 hover:text-accent-soft"
              >
                <FileText aria-hidden="true" className="size-4 shrink-0 text-accent-soft" />
                <span className="truncate">{f.fileName}</span>
                <span className="shrink-0 text-xs text-muted">{size(f.sizeBytes)}</span>
              </a>
              {editable ? (
                <button
                  type="button"
                  aria-label={`Remove ${f.fileName}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Remove "${f.fileName}" from this listing?`))
                      remove.mutate(f.id);
                  }}
                  className="rounded-md p-1.5 text-muted ring-1 ring-line hover:text-rose disabled:opacity-60"
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : editable ? (
        <p className="text-xs text-muted">
          No documents yet. Attach the official advert or terms of reference so candidates can check
          the details at source.
        </p>
      ) : null}
      {editable && files.length < MAX ? (
        <>
          <input
            ref={input}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="sr-only"
            aria-label="Choose a document to attach"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={upload.isPending}
            onClick={() => input.current?.click()}
            className="btn-secondary mt-3 px-3 py-1.5 text-xs disabled:opacity-60"
          >
            <Upload aria-hidden="true" className="size-3.5" />
            {upload.isPending ? "Uploading…" : "Attach document"}
          </button>
          <p className="mt-1 text-[11px] text-muted">PDF, Word, PNG or JPEG, up to 10 MB.</p>
        </>
      ) : null}
    </section>
  );
}
