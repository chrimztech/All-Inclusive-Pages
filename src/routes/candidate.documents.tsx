import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";
import { API_BASE_URL, api, ApiError, isUnauthenticated, uploadFile } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/candidate/documents")({
  head: () => ({ meta: [{ title: "Documents — EOZ Candidate Portal" }] }),
  component: Documents,
});

type Document = { id: string; fileName: string; contentType: string; uploadedAt: string };

function Documents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const documentsQuery = useQuery({
    queryKey: ["candidate", "documents"],
    queryFn: () => api.get<Document[]>("/candidate/documents"),
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["candidate", "documents"] });

  const upload = useMutation({
    mutationFn: (file: File) => uploadFile("/candidate/documents", file, {}),
    onSuccess: () => {
      invalidate();
      toast("Document uploaded.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Upload failed.", "error"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/files/${id}`),
    onSuccess: () => {
      invalidate();
      toast("Document deleted.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not delete the document.", "error"),
  });

  const documents = documentsQuery.data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.4 ) — Documents"
        title="Your application toolkit."
        lead="Keep reusable documents ready for your own applications. EOZ never forwards them to employers."
      />
      <DashNav items={CANDIDATE_NAV} />
      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="label-mono">Saved documents</div>
              <h2 className="mt-1 font-display text-2xl">Private by default</h2>
            </div>
            <div>
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.doc,.docx,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload.mutate(file);
                  e.target.value = "";
                }}
              />
              <button
                disabled={upload.isPending}
                onClick={() => fileInput.current?.click()}
                className="accent-gradient rounded-md px-3 py-2 text-xs font-medium text-ink disabled:opacity-60"
              >
                {upload.isPending ? "Uploading…" : "Upload document"}
              </button>
            </div>
          </div>

          {isUnauthenticated(documentsQuery.error) ? (
            <p className="mt-4 text-sm text-muted">Sign in as a candidate to manage your documents.</p>
          ) : null}

          <div className="mt-5 divide-y divide-line">
            {documents.length === 0 ? <p className="py-4 text-sm text-muted">No documents uploaded yet.</p> : null}
            {documents.map((doc) => (
              <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
                <div>
                  <div className="text-sm">{doc.fileName}</div>
                  <div className="text-xs text-muted">
                    {doc.contentType} · uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Chip tone="emerald">Ready</Chip>
                  <a
                    href={`${API_BASE_URL}/files/${doc.id}/download`}
                    className="text-xs text-muted hover:text-fg"
                  >
                    Download
                  </a>
                  <button
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(doc.id)}
                    className="text-xs text-rose hover:text-fg disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="lg:col-span-4">
          <div className="label-mono">Upload rules</div>
          <ul className="mt-3 space-y-3 text-sm text-muted">
            <li>PDF, DOC, DOCX, PNG or JPEG only</li>
            <li>Maximum file size: 10 MB</li>
            <li>Use clear filenames without passwords</li>
            <li>Delete old versions when no longer needed</li>
          </ul>
        </Panel>
      </section>
    </SiteShell>
  );
}
