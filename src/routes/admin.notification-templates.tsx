import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Lock, Mail, RotateCcw } from "lucide-react";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { api, ApiError, isUnauthenticated } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/notification-templates")({
  head: () => ({
    meta: [
      { title: "Email Templates - EOZ Staff" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: TemplatesAdmin,
});

type Template = {
  type: string;
  description: string;
  subjectTemplate: string;
  bodyTemplate: string;
  emailEnabled: boolean;
  customised: boolean;
  alwaysEmail: boolean;
  updatedByName: string | null;
  updatedAt: string | null;
};

const SAMPLE = {
  name: "Chipo Banda",
  title: "Your application was updated",
  body: "Graduate Trainee Programme 2027 (EOZ-OPP-2026-000027) moved to Interview.",
};

function render(template: string) {
  return template
    .replaceAll("{{name}}", SAMPLE.name)
    .replaceAll("{{title}}", SAMPLE.title)
    .replaceAll("{{body}}", SAMPLE.body);
}

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line focus:ring-accent/40";

function TemplatesAdmin() {
  const listQuery = useQuery({
    queryKey: ["admin", "notification-templates"],
    queryFn: () => api.get<Template[]>("/admin/notification-templates"),
    retry: false,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const templates = listQuery.data ?? [];
  const current = templates.find((t) => t.type === selected) ?? templates[0];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.15 ) - Email templates"
        title="The words behind every email."
        lead="Adjust the wording of each email the platform sends. Placeholders keep the specific details — which listing, which order — in every message."
      />
      <DashNav items={ADMIN_NAV} />
      {isUnauthenticated(listQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">
            Sign in with an administrator account to manage email templates.
          </p>
        </Panel>
      ) : null}
      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <nav aria-label="Notification types" className="lg:col-span-4">
          <Panel className="p-2">
            {listQuery.isLoading ? <div className="skeleton m-2 h-40 rounded-xl" /> : null}
            <ul>
              {templates.map((t) => {
                const active = current?.type === t.type;
                return (
                  <li key={t.type}>
                    <button
                      type="button"
                      aria-current={active}
                      onClick={() => setSelected(t.type)}
                      className={`flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        active ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[11px] text-fg">
                          {t.type}
                        </span>
                        <span className="block truncate text-xs text-muted">{t.description}</span>
                      </span>
                      <span className="flex shrink-0 gap-1">
                        {!t.emailEnabled ? <Chip tone="rose">Off</Chip> : null}
                        {t.customised ? <Chip tone="accent">Edited</Chip> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </nav>
        <div className="lg:col-span-8">
          {current ? <TemplateEditor key={current.type} template={current} /> : null}
        </div>
      </section>
    </SiteShell>
  );
}

function TemplateEditor({ template }: { template: Template }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [subject, setSubject] = useState(template.subjectTemplate);
  const [body, setBody] = useState(template.bodyTemplate);
  const [emailEnabled, setEmailEnabled] = useState(template.emailEnabled);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "notification-templates"] });
  const fail = (e: unknown) =>
    toast(e instanceof ApiError ? e.message : "Could not save the template.", "error");

  const save = useMutation({
    mutationFn: () =>
      api.put(`/admin/notification-templates/${template.type}`, {
        subjectTemplate: subject,
        bodyTemplate: body,
        emailEnabled,
      }),
    onSuccess: () => {
      refresh();
      toast("Template saved.");
    },
    onError: fail,
  });
  const reset = useMutation({
    mutationFn: () => api.del<Template>(`/admin/notification-templates/${template.type}`),
    onSuccess: (t) => {
      setSubject(t.subjectTemplate);
      setBody(t.bodyTemplate);
      setEmailEnabled(t.emailEnabled);
      refresh();
      toast("Reset to the default wording.");
    },
    onError: fail,
  });

  const dirty =
    subject !== template.subjectTemplate ||
    body !== template.bodyTemplate ||
    emailEnabled !== template.emailEnabled;
  const keepsDetails = body.includes("{{body}}") || body.includes("{{title}}");

  return (
    <div className="space-y-4">
      <Panel className="p-6">
        <div className="mb-1 font-mono text-sm text-accent-soft">{template.type}</div>
        <p className="mb-5 text-sm text-muted">Sent when: {template.description.toLowerCase()}.</p>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <label className="text-xs text-muted">
            Subject
            <input
              required
              maxLength={255}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="text-xs text-muted">
            Body
            <textarea
              required
              rows={7}
              maxLength={5000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`${inputCls} font-mono text-[13px]`}
            />
          </label>
          <p className="text-xs text-muted">
            Placeholders: <code className="font-mono text-fg">{"{{name}}"}</code> recipient's name,{" "}
            <code className="font-mono text-fg">{"{{title}}"}</code> the message headline,{" "}
            <code className="font-mono text-fg">{"{{body}}"}</code> the message details.
          </p>
          {!keepsDetails ? (
            <p role="alert" className="text-xs text-rose">
              Include {"{{body}}"} or {"{{title}}"} so the email still says what happened.
            </p>
          ) : null}
          <label
            className={`flex items-center gap-2 text-sm ${template.alwaysEmail ? "text-muted" : ""}`}
          >
            <input
              type="checkbox"
              checked={emailEnabled}
              disabled={template.alwaysEmail}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="size-4"
            />
            Send this notification by email
            {template.alwaysEmail ? (
              <span className="inline-flex items-center gap-1 text-xs">
                <Lock aria-hidden="true" className="size-3" /> account-security emails always send
              </span>
            ) : null}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!dirty || !keepsDetails || save.isPending}
              className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
            >
              {save.isPending ? "Saving…" : "Save template"}
            </button>
            {template.customised ? (
              <button
                type="button"
                disabled={reset.isPending}
                onClick={() => {
                  if (window.confirm("Reset this template to the default wording?")) reset.mutate();
                }}
                className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg"
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
                Reset to default
              </button>
            ) : null}
          </div>
          {template.updatedByName && template.updatedAt ? (
            <p className="text-xs text-muted">
              Last edited by {template.updatedByName} on{" "}
              {new Date(template.updatedAt).toLocaleString("en-ZM", { timeZone: "Africa/Lusaka" })}
            </p>
          ) : null}
        </form>
      </Panel>

      <Panel className="p-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Mail aria-hidden="true" className="size-4 text-accent-soft" />
          Preview <span className="font-normal text-muted">with sample details</span>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-line">
          <div className="border-b border-line pb-2 text-sm">
            <span className="text-muted">Subject: </span>
            {render(subject)}
          </div>
          <pre className="mt-3 font-sans text-sm leading-6 whitespace-pre-wrap">{render(body)}</pre>
        </div>
        {!emailEnabled ? (
          <p className="mt-3 text-xs text-amber">
            Email is off: recipients still get the in-app notification.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
