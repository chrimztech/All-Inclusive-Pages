import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ReceiptText } from "lucide-react";
import { DashNav, EMPLOYER_NAV, StatTile } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { api, isUnauthenticated } from "@/lib/api-client";

export const Route = createFileRoute("/employers/finance")({
  head: () => ({
    meta: [
      { title: "Invoices & Payments - EOZ Employer Portal" },
      {
        name: "description",
        content: "Review invoices, payments and receipts for EOZ services.",
      },
    ],
  }),
  component: EmployerFinance,
});

type Invoice = {
  id: string;
  reference: string;
  orderReference: string;
  packageName: string;
  amount: number;
  currency: string;
  status: string;
  issuedAt: string;
};

const STATUS_TONE: Record<string, "emerald" | "amber" | "rose" | "muted"> = {
  PAID: "emerald",
  UNPAID: "amber",
  PARTIALLY_REFUNDED: "amber",
  REFUNDED: "muted",
};

function EmployerFinance() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["employer", "invoices", "mine"],
    queryFn: () => api.get<Invoice[]>("/services/invoices/mine"),
    retry: false,
  });

  const invoices = data ?? [];
  const amountDue = invoices
    .filter((i) => i.status === "UNPAID")
    .reduce((sum, i) => sum + i.amount, 0);
  const paidThisYear = invoices
    .filter((i) => i.status === "PAID" && new Date(i.issuedAt).getFullYear() === new Date().getFullYear())
    .reduce((sum, i) => sum + i.amount, 0);
  const receipts = invoices.filter((i) => i.status === "PAID").length;
  const currency = invoices[0]?.currency ?? "ZMW";

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.10 ) - Invoices & payments"
        title="Know what is due and paid."
        lead="A single record of service invoices and payment status. EOZ never stores raw card or mobile-money credentials."
      />
      <DashNav items={EMPLOYER_NAV} />

      {isUnauthenticated(error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in to see your invoices.</p>
        </Panel>
      ) : null}

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Amount due" value={`${currency} ${amountDue.toLocaleString()}`} tone="text-rose" />
        <StatTile label="Paid this year" value={`${currency} ${paidThisYear.toLocaleString()}`} />
        <StatTile label="Receipts" value={String(receipts)} />
        <StatTile label="Total invoices" value={String(invoices.length)} />
      </div>
      <Panel className="mb-14 overflow-x-auto">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="label-mono">Billing history</div>
            <h2 className="mt-1 font-display text-2xl">Invoices and receipts</h2>
          </div>
          <ReceiptText aria-hidden="true" className="size-5 text-accent-soft" />
        </div>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : invoices.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No invoices yet.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="label-mono">
              <tr>
                <th className="pb-3">Reference</th>
                <th className="pb-3">Service</th>
                <th className="pb-3">Issued</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-t border-line">
                  <td className="py-4 font-mono text-xs text-accent-soft">{i.reference}</td>
                  <td className="py-4">{i.packageName}</td>
                  <td className="py-4 text-muted">{new Date(i.issuedAt).toLocaleDateString()}</td>
                  <td className="py-4 font-mono text-xs">
                    {i.currency} {i.amount.toLocaleString()}
                  </td>
                  <td className="py-4">
                    <Chip tone={STATUS_TONE[i.status] ?? "muted"}>{i.status.replace(/_/g, " ")}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </SiteShell>
  );
}
