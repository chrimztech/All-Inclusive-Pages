import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Award, ExternalLink, Languages, Trash2 } from "lucide-react";
import { Chip, Panel } from "@/components/eoz/SiteShell";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

type Language = { id: string; language: string; proficiency: string };
type Certification = {
  id: string;
  name: string;
  issuer: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  credentialUrl: string | null;
  expired: boolean;
};

const PROFICIENCIES = [
  { value: "BASIC", label: "Basic" },
  { value: "CONVERSATIONAL", label: "Conversational" },
  { value: "FLUENT", label: "Fluent" },
  { value: "NATIVE", label: "Native" },
];

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line focus:ring-accent/40";

function useErrorToast() {
  const { toast } = useToast();
  return (e: unknown, fallback: string) =>
    toast(e instanceof ApiError ? e.message : fallback, "error");
}

export function LanguagesSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fail = useErrorToast();
  const [language, setLanguage] = useState("");
  const [proficiency, setProficiency] = useState("FLUENT");
  const key = ["candidate", "profile", "languages"];
  const listQuery = useQuery({
    queryKey: key,
    queryFn: () => api.get<Language[]>("/candidate/profile/languages"),
  });
  const add = useMutation({
    mutationFn: () => api.post<Language>("/candidate/profile/languages", { language, proficiency }),
    onSuccess: (l) => {
      queryClient.invalidateQueries({ queryKey: key });
      setLanguage("");
      toast(`${l.language} added.`);
    },
    onError: (e) => fail(e, "Could not add the language."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/candidate/profile/languages/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (e) => fail(e, "Could not remove the language."),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (language.trim()) add.mutate();
  };

  return (
    <Panel>
      <div className="label-mono">Languages</div>
      <h2 className="mt-1 flex items-center gap-2 font-display text-2xl">
        <Languages aria-hidden="true" className="size-5 text-accent-soft" />
        Languages you speak
      </h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {(listQuery.data ?? []).map((l) => (
          <li
            key={l.id}
            className="flex items-center gap-2 rounded-full bg-white/[0.04] py-1 pr-1 pl-3 text-sm ring-1 ring-line"
          >
            {l.language}
            <span className="text-xs text-muted">
              {PROFICIENCIES.find((p) => p.value === l.proficiency)?.label ?? l.proficiency}
            </span>
            <button
              type="button"
              aria-label={`Remove ${l.language}`}
              onClick={() => remove.mutate(l.id)}
              className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-rose/10 hover:text-rose"
            >
              <Trash2 aria-hidden="true" className="size-3" />
            </button>
          </li>
        ))}
        {listQuery.isSuccess && listQuery.data.length === 0 ? (
          <li className="text-sm text-muted">
            No languages added yet — English, Bemba, Nyanja, Tonga, Lozi…
          </li>
        ) : null}
      </ul>
      <form onSubmit={submit} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="text-xs text-muted">
          Language
          <input
            value={language}
            maxLength={80}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="e.g. Bemba"
            className={inputCls}
          />
        </label>
        <label className="text-xs text-muted">
          Level
          <select
            value={proficiency}
            onChange={(e) => setProficiency(e.target.value)}
            className={inputCls}
          >
            {PROFICIENCIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={!language.trim() || add.isPending}
          className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
        >
          Add
        </button>
      </form>
    </Panel>
  );
}

export function CertificationsSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fail = useErrorToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    issuer: "",
    issuedOn: "",
    expiresOn: "",
    credentialUrl: "",
  });
  const key = ["candidate", "profile", "certifications"];
  const listQuery = useQuery({
    queryKey: key,
    queryFn: () => api.get<Certification[]>("/candidate/profile/certifications"),
  });
  const add = useMutation({
    mutationFn: () =>
      api.post("/candidate/profile/certifications", {
        name: form.name,
        issuer: form.issuer || undefined,
        issuedOn: form.issuedOn || undefined,
        expiresOn: form.expiresOn || undefined,
        credentialUrl: form.credentialUrl || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      setForm({ name: "", issuer: "", issuedOn: "", expiresOn: "", credentialUrl: "" });
      setOpen(false);
      toast("Certification added.");
    },
    onError: (e) => fail(e, "Could not add the certification."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/candidate/profile/certifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (e) => fail(e, "Could not remove the certification."),
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="label-mono">Certifications</div>
          <h2 className="mt-1 flex items-center gap-2 font-display text-2xl">
            <Award aria-hidden="true" className="size-5 text-accent-soft" />
            Licences & certificates
          </h2>
        </div>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="accent-gradient shrink-0 rounded-md px-3 py-2 text-xs font-medium text-ink"
          >
            Add certification
          </button>
        ) : null}
      </div>
      <div className="mt-5 divide-y divide-line">
        {listQuery.isSuccess && listQuery.data.length === 0 && !open ? (
          <p className="py-4 text-sm text-muted">No certifications added yet.</p>
        ) : null}
        {(listQuery.data ?? []).map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-3 py-4 first:pt-0">
            <div>
              <div className="flex flex-wrap items-center gap-2 font-medium">
                {c.name}
                {c.expired ? <Chip tone="amber">Expired</Chip> : null}
              </div>
              <div className="mt-0.5 text-sm text-muted">
                {[
                  c.issuer,
                  c.issuedOn ? `Issued ${c.issuedOn}` : null,
                  c.expiresOn ? `Expires ${c.expiresOn}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              {c.credentialUrl ? (
                <a
                  href={c.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-accent-soft hover:text-fg"
                >
                  View credential <ExternalLink aria-hidden="true" className="size-3" />
                </a>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Remove ${c.name}?`)) remove.mutate(c.id);
              }}
              className="shrink-0 rounded-md px-2.5 py-1.5 text-xs text-rose ring-1 ring-rose/30 hover:bg-rose/10"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {open ? (
        <form
          className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
        >
          <label className="text-xs text-muted sm:col-span-2">
            Name
            <input
              required
              maxLength={160}
              value={form.name}
              onChange={set("name")}
              className={inputCls}
              placeholder="e.g. CPA Zambia"
            />
          </label>
          <label className="text-xs text-muted">
            Issued by
            <input
              maxLength={160}
              value={form.issuer}
              onChange={set("issuer")}
              className={inputCls}
              placeholder="e.g. ZICA"
            />
          </label>
          <label className="text-xs text-muted">
            Credential link (optional)
            <input
              type="url"
              value={form.credentialUrl}
              onChange={set("credentialUrl")}
              className={inputCls}
              placeholder="https://"
            />
          </label>
          <label className="text-xs text-muted">
            Issue date
            <input
              type="date"
              value={form.issuedOn}
              onChange={set("issuedOn")}
              className={inputCls}
            />
          </label>
          <label className="text-xs text-muted">
            Expiry date (if any)
            <input
              type="date"
              value={form.expiresOn}
              onChange={set("expiresOn")}
              className={inputCls}
            />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={!form.name.trim() || add.isPending}
              className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
            >
              {add.isPending ? "Saving…" : "Save certification"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </Panel>
  );
}
