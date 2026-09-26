import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, Phone } from "lucide-react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { api, ApiError, isUnauthenticated, type PageResponse } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/inbox")({
  head: () => ({ meta: [{ title: "Inbox — EOZ Staff Console" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Inbox,
});

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  reason: string;
  message: string;
  status: string;
  createdAt: string;
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "NEW", label: "New" },
  { value: "RESOLVED", label: "Resolved" },
];

function Inbox() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState("NEW");

  const listQuery = useQuery({
    queryKey: ["admin", "inbox", status],
    queryFn: () => api.get<PageResponse<ContactMessage>>("/admin/contact-messages", { status: status || undefined, size: 100 }),
    retry: false,
  });
  const allQuery = useQuery({
    queryKey: ["admin", "inbox", "all"],
    queryFn: () => api.get<PageResponse<ContactMessage>>("/admin/contact-messages", { size: 100 }),
    retry: false,
  });

  const resolve = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/contact-messages/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "inbox"] });
      toast("Marked as resolved.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not update the message.", "error"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/contact-messages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "inbox"] });
      toast("Message deleted.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not delete the message.", "error"),
  });

  const messages = listQuery.data?.items ?? [];
  const all = allQuery.data?.items ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="Inbox"
        title="Enquiries from the public."
        lead="Everything sent through the contact form lands here. Reply by email or phone, then mark it resolved."
      />
      <DashNav items={ADMIN_NAV} />

      {isUnauthenticated(listQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with a staff account that can manage the inbox.</p>
        </Panel>
      ) : null}

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Awaiting reply" value={String(all.filter((m) => m.status === "NEW").length)} tone="text-amber" />
        <StatTile label="Resolved" value={String(all.filter((m) => m.status === "RESOLVED").length)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            onClick={() => setStatus(f.value)}
            className={
              status === f.value
                ? "accent-gradient rounded-full px-3 py-1 text-[11px] font-medium text-ink"
                : "rounded-full px-3 py-1 text-[11px] text-muted ring-1 ring-line hover:text-fg"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 pb-14">
        {listQuery.isSuccess && messages.length === 0 ? (
          <Panel className="py-10 text-center text-sm text-muted">
            {status === "NEW" ? "Nothing waiting for a reply." : "No messages here."}
          </Panel>
        ) : null}
        {messages.map((m) => (
          <Panel key={m.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Chip tone={m.status === "NEW" ? "amber" : "emerald"}>{m.status}</Chip>
                  <Chip>{m.reason.replace(/_/g, " ")}</Chip>
                  <span className="text-xs text-muted">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <div className="font-medium">{m.name}</div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{m.message}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  <a
                    href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your enquiry to EOZ")}`}
                    className="inline-flex items-center gap-1.5 text-accent-soft hover:text-fg"
                  >
                    <Mail aria-hidden="true" className="size-3.5" />
                    {m.email}
                  </a>
                  {m.phone ? (
                    <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1.5 text-accent-soft hover:text-fg">
                      <Phone aria-hidden="true" className="size-3.5" />
                      {m.phone}
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2">
                {m.status === "NEW" ? (
                  <button
                    disabled={resolve.isPending}
                    onClick={() => resolve.mutate(m.id)}
                    className="accent-gradient rounded-md px-3 py-2 text-xs font-medium text-ink disabled:opacity-60"
                  >
                    Mark resolved
                  </button>
                ) : null}
                <button
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete the message from ${m.name}? This cannot be undone.`)) remove.mutate(m.id);
                  }}
                  className="rounded-md px-3 py-2 text-xs text-rose ring-1 ring-rose/30 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </SiteShell>
  );
}
