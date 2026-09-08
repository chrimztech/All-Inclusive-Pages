import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { ORG } from "@/lib/eoz-data";
import { useOrgSettings } from "@/lib/use-org-settings";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact EOZ — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Reach Echo Opportunities Zambia in Lusaka by phone or email for listings, services, partnerships or corrections.",
      },
      { property: "og:title", content: "Contact EOZ — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Phone, email and enquiry form for the Echo Opportunities Zambia team in Lusaka.",
      },
    ],
  }),
  component: Contact,
});

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

const REASONS = [
  "Listing correction",
  "Employer registration",
  "Professional services",
  "Partnership",
  "Other",
];

function Contact() {
  const org = useOrgSettings();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/contact", { name, email, phone: phone || undefined, reason, message }),
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not send this enquiry.", "error"),
  });

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 09 ) — Contact"
        title="Talk to the EOZ team."
        lead="Listing corrections, service bookings, partnership enquiries and employer registration all start here."
      />

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel>
            {mutation.isSuccess ? (
              <p className="py-6 text-sm text-emerald-400">
                Enquiry sent. The EOZ team will reply by email or phone shortly.
              </p>
            ) : (
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate();
                }}
              >
                <label>
                  <span className="label-mono">Name</span>
                  <input
                    required
                    className={inputCls}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  <span className="label-mono">Email</span>
                  <input
                    required
                    type="email"
                    className={inputCls}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  <span className="label-mono">Phone</span>
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
                <label>
                  <span className="label-mono">Reason</span>
                  <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
                    {REASONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="sm:col-span-2">
                  <span className="label-mono">Message</span>
                  <textarea
                    required
                    rows={5}
                    className={inputCls}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink sm:col-span-2 sm:justify-self-start disabled:opacity-60"
                >
                  {mutation.isPending ? "Sending…" : "Send enquiry"}
                </button>
              </form>
            )}
          </Panel>
        </div>
        <aside className="space-y-4 lg:col-span-5">
          <Panel>
            <div className="label-mono mb-3">Direct</div>
            <p className="text-sm">
              <a href={`tel:${org.phone.replace(/\s/g, "")}`} className="hover:text-accent-soft">
                {org.phone}
              </a>
            </p>
            <p className="mt-1 text-sm">
              <a href={`mailto:${org.email}`} className="hover:text-accent-soft">
                {org.email}
              </a>
            </p>
            <p className="mt-3 text-sm text-muted">{org.location}</p>
          </Panel>
          <Panel>
            <div className="label-mono mb-3">Follow &amp; distribution channels</div>
            <div className="flex flex-wrap gap-3 text-sm">
              <a href={org.social.whatsapp} target="_blank" rel="noreferrer" className="text-accent-soft hover:text-fg">
                WhatsApp channel
              </a>
              <a href={org.social.facebook} target="_blank" rel="noreferrer" className="text-accent-soft hover:text-fg">
                Facebook
              </a>
              <a href={org.social.linkedin} target="_blank" rel="noreferrer" className="text-accent-soft hover:text-fg">
                LinkedIn
              </a>
              <a href={org.social.tiktok} target="_blank" rel="noreferrer" className="text-accent-soft hover:text-fg">
                TikTok
              </a>
            </div>
          </Panel>
          <Panel>
            <div className="label-mono mb-2">Please note</div>
            <p className="text-xs text-muted">{ORG.disclaimer}</p>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
