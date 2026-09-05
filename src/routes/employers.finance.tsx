import { createFileRoute } from "@tanstack/react-router";
import { Download, ReceiptText } from "lucide-react";
import { DashNav, EMPLOYER_NAV, StatTile } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";

export const Route = createFileRoute("/employers/finance")({
  head: () => ({
    meta: [
      { title: "Invoices & Payments - EOZ Employer Portal" },
      {
        name: "description",
        content: "Review quotes, invoices, payments and receipts for EOZ services.",
      },
    ],
  }),
  component: EmployerFinance,
});

const TRANSACTIONS = [
  ["INV-2026-018", "Job advertising package", "5 Sep 2026", "K 450", "Paid"],
  ["QT-2026-027", "Senior Data Analyst recruitment", "3 Sep 2026", "K 3,500", "Quote ready"],
  ["INV-2026-011", "Business promotion campaign", "12 Aug 2026", "K 600", "Paid"],
  ["INV-2026-006", "Team interview training", "29 Jul 2026", "K 1,500", "Overdue"],
];

function EmployerFinance() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.10 ) - Invoices & payments"
        title="Know what is quoted, due and paid."
        lead="A single record of service quotes, invoices, payment references and downloadable receipts. EOZ never stores raw card or mobile-money credentials."
      />
      <DashNav items={EMPLOYER_NAV} />
      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Open quotes" value="1" />
        <StatTile label="Amount due" value="K 1,500" tone="text-rose" />
        <StatTile label="Paid this year" value="K 8,940" />
        <StatTile label="Receipts" value="7" />
      </div>
      <Panel className="mb-14 overflow-x-auto">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="label-mono">Billing history</div>
            <h2 className="mt-1 font-display text-2xl">Quotes, invoices and receipts</h2>
          </div>
          <ReceiptText aria-hidden="true" className="size-5 text-accent-soft" />
        </div>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="label-mono">
            <tr>
              <th className="pb-3">Reference</th>
              <th className="pb-3">Description</th>
              <th className="pb-3">Issued</th>
              <th className="pb-3">Amount</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {TRANSACTIONS.map(([reference, description, issued, amount, status]) => (
              <tr key={reference} className="border-t border-line">
                <td className="py-4 font-mono text-xs text-accent-soft">{reference}</td>
                <td className="py-4">{description}</td>
                <td className="py-4 text-muted">{issued}</td>
                <td className="py-4 font-mono text-xs">{amount}</td>
                <td className="py-4">
                  <Chip
                    tone={status === "Paid" ? "emerald" : status === "Overdue" ? "rose" : "amber"}
                  >
                    {status}
                  </Chip>
                </td>
                <td className="py-4">
                  <button
                    type="button"
                    aria-label={`Download ${reference}`}
                    className="text-muted hover:text-accent-soft"
                  >
                    <Download aria-hidden="true" className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </SiteShell>
  );
}
