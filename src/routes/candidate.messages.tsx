import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";
import { PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { api, isUnauthenticated } from "@/lib/api-client";

export const Route = createFileRoute("/candidate/messages")({
  head: () => ({
    meta: [
      { title: "Messages - EOZ Candidate Portal" },
      {
        name: "description",
        content: "Secure messages about EOZ-hosted services and authorised recruitment activity.",
      },
    ],
  }),
  component: CandidateMessages,
});

type Order = {
  id: string;
  reference: string;
  packageName: string;
  status: string;
};

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  fromCustomer: boolean;
  message: string;
  sentAt: string;
};

function CandidateMessages() {
  const queryClient = useQueryClient();
  const ordersQuery = useQuery({
    queryKey: ["candidate", "service-orders"],
    queryFn: () => api.get<Order[]>("/services/orders/mine"),
    retry: false,
  });
  const orders = ordersQuery.data ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!selectedId && orders.length > 0) {
      setSelectedId(orders[0]!.id);
    }
  }, [orders, selectedId]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  const messagesQuery = useQuery({
    queryKey: ["service-order-messages", selectedId],
    queryFn: () => api.get<Message[]>(`/services/orders/${selectedId}/messages`),
    enabled: !!selectedId,
  });

  const sendMutation = useMutation({
    mutationFn: () => api.post<Message>(`/services/orders/${selectedId}/messages`, { message: draft }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["service-order-messages", selectedId] });
    },
  });

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.8 ) - Messages"
        title="Private conversations, tied to the work."
        lead="Use secure messages for EOZ service orders and support only. Apply to third-party vacancies through the employer route."
      />
      <DashNav items={CANDIDATE_NAV} />

      {isUnauthenticated(ordersQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in to see your messages.</p>
        </Panel>
      ) : null}

      <section className="grid gap-4 pb-14 lg:grid-cols-12">
        <Panel className="lg:col-span-4">
          <div className="label-mono mb-3">Conversations</div>
          {ordersQuery.isLoading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted">
              You have no service orders yet. Order a service to start a conversation.
            </p>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <button
                  type="button"
                  key={order.id}
                  onClick={() => setSelectedId(order.id)}
                  className={`w-full rounded-lg p-3 text-left ring-1 transition-colors ${selectedId === order.id ? "bg-accent/10 ring-accent/35" : "ring-line hover:bg-surface-2"}`}
                >
                  <div className="text-sm">{order.packageName}</div>
                  <div className="mt-1 font-mono text-[10px] text-muted">{order.reference}</div>
                  <p className="mt-2 text-xs text-muted">{order.status.replace(/_/g, " ")}</p>
                </button>
              ))}
            </div>
          )}
        </Panel>
        <Panel className="flex min-h-[480px] flex-col lg:col-span-8">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">
              Select a conversation to view messages.
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
                <div>
                  <h2 className="font-display text-2xl">{selected.packageName}</h2>
                  <div className="font-mono text-[10px] text-muted">{selected.reference}</div>
                </div>
                <ShieldCheck aria-label="Private conversation" className="size-5 text-accent-soft" />
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto py-5">
                {messagesQuery.isLoading ? (
                  <p className="text-sm text-muted">Loading messages…</p>
                ) : !messagesQuery.data?.length ? (
                  <p className="text-sm text-muted">
                    No messages yet on this order. Send the first one below.
                  </p>
                ) : (
                  messagesQuery.data.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-xl p-3 text-sm ${m.fromCustomer ? "ml-auto rounded-tr-sm bg-accent/15" : "rounded-tl-sm bg-surface-2"}`}
                    >
                      <p>{m.message}</p>
                      <span className="mt-2 block text-[10px] text-muted">
                        {m.fromCustomer ? "You" : m.senderName} ·{" "}
                        {new Date(m.sentAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (draft.trim()) sendMutation.mutate();
                }}
                className="flex gap-2 border-t border-line pt-4"
              >
                <label className="sr-only" htmlFor="message">
                  Write a message
                </label>
                <textarea
                  id="message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={2}
                  placeholder="Write a secure message"
                  className="min-h-11 flex-1 resize-none rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/50"
                />
                <button
                  type="submit"
                  disabled={sendMutation.isPending}
                  aria-label="Send message"
                  className="accent-gradient grid size-11 place-items-center self-end rounded-md text-ink disabled:opacity-60"
                >
                  <Send aria-hidden="true" className="size-4" />
                </button>
              </form>
            </>
          )}
        </Panel>
      </section>
    </SiteShell>
  );
}
