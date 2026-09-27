import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { api, ApiError, isUnauthenticated } from "@/lib/api-client";

export const Route = createFileRoute("/receipt/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Receipt — Echo Opportunities Zambia" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ReceiptPage,
});

type Receipt = {
  receiptNumber: string;
  invoiceReference: string;
  orderReference: string;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  currency: string;
  amount: number;
  invoiceStatus: string;
  issuedAt: string;
  paidAt: string;
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    total: number;
  }[];
  payments: {
    receivedAt: string;
    method: string | null;
    providerReference: string | null;
    amount: number;
    status: string;
  }[];
  issuer: { name: string; location: string; phone: string | null; email: string | null };
};

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZM", { timeZone: "Africa/Lusaka", dateStyle: "long" });

/** A printable receipt for a paid invoice. Deliberately plain, so "Save as PDF" gives a clean document. */
function ReceiptPage() {
  const { invoiceId } = Route.useParams();
  const router = useRouter();
  const query = useQuery({
    queryKey: ["receipt", invoiceId],
    queryFn: () => api.get<Receipt>(`/services/invoices/${invoiceId}/receipt`),
    retry: false,
  });
  const r = query.data;
  const money = (n: number) =>
    `${r?.currency ?? "ZMW"} ${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <main className="min-h-screen bg-ink px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-2xl items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back
        </button>
        {r ? (
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary px-4 py-2 text-sm"
          >
            <Printer aria-hidden="true" className="size-4" />
            Print / Save as PDF
          </button>
        ) : null}
      </div>

      <article className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-[#071a10] shadow-2xl print:max-w-none print:rounded-none print:shadow-none">
        {query.isLoading ? <p className="text-sm text-gray-500">Loading receipt…</p> : null}
        {query.isError ? (
          <div role="alert" className="text-sm">
            <p className="font-medium">
              {isUnauthenticated(query.error)
                ? "Sign in to view this receipt."
                : query.error instanceof ApiError
                  ? query.error.message
                  : "Could not load the receipt."}
            </p>
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="mt-2 inline-block text-emerald-700 underline"
            >
              Go to sign in
            </Link>
          </div>
        ) : null}
        {r ? (
          <>
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-6">
              <div>
                <div className="text-lg font-semibold">{r.issuer.name}</div>
                <div className="mt-1 text-xs leading-5 text-gray-600">
                  {r.issuer.location}
                  {r.issuer.phone ? <div>{r.issuer.phone}</div> : null}
                  {r.issuer.email ? <div>{r.issuer.email}</div> : null}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold tracking-tight">Receipt</div>
                <div className="mt-1 font-mono text-sm">{r.receiptNumber}</div>
                <div className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-800">
                  PAID {date(r.paidAt)}
                </div>
              </div>
            </header>

            <dl className="grid grid-cols-2 gap-4 py-6 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Received from</dt>
                <dd className="mt-1 font-medium">{r.customerName}</dd>
                <dd className="text-gray-600">{r.customerEmail}</dd>
              </div>
              <div className="text-right">
                <dt className="text-xs uppercase tracking-wide text-gray-500">References</dt>
                <dd className="mt-1">Invoice {r.invoiceReference}</dd>
                <dd className="text-gray-600">
                  Order {r.orderReference} · issued {date(r.issuedAt)}
                </dd>
              </div>
            </dl>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit price</th>
                  <th className="py-2 text-right">Tax</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {r.lines.map((l, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2.5">{l.description}</td>
                    <td className="py-2.5 text-right">{l.quantity}</td>
                    <td className="py-2.5 text-right font-mono">{money(l.unitPrice)}</td>
                    <td className="py-2.5 text-right">{l.taxRate ? `${l.taxRate}%` : "—"}</td>
                    <td className="py-2.5 text-right font-mono">{money(l.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="pt-4 text-right font-medium">
                    Amount paid
                  </td>
                  <td className="pt-4 text-right font-mono text-base font-semibold">
                    {money(r.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {r.payments.length > 0 ? (
              <section className="mt-8">
                <h2 className="text-xs uppercase tracking-wide text-gray-500">Payments received</h2>
                <ul className="mt-2 space-y-1 text-sm">
                  {r.payments.map((p, i) => (
                    <li key={i} className="flex flex-wrap justify-between gap-2">
                      <span>
                        {date(p.receivedAt)} ·{" "}
                        {(p.method ?? "Payment").replace(/_/g, " ").toLowerCase()}
                        {p.providerReference ? ` · ref ${p.providerReference}` : ""}
                        {p.status !== "SUCCEEDED" ? ` · ${p.status.toLowerCase()}` : ""}
                      </span>
                      <span className="font-mono">{money(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {r.invoiceStatus === "PARTIALLY_REFUNDED" || r.invoiceStatus === "REFUNDED" ? (
              <p className="mt-6 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                This invoice was {r.invoiceStatus === "REFUNDED" ? "refunded" : "partly refunded"}{" "}
                after payment. Refunds are listed in your billing history.
              </p>
            ) : null}

            <footer className="mt-10 border-t border-gray-200 pt-4 text-xs leading-5 text-gray-500">
              Thank you. This receipt confirms payment for the professional service above. Ordering
              a CV, cover-letter or similar service is not an application for any vacancy.
            </footer>
          </>
        ) : null}
      </article>
    </main>
  );
}
