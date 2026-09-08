import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";
import { api, ApiError, isUnauthenticated } from "@/lib/api-client";

export const Route = createFileRoute("/candidate/profile")({
  head: () => ({
    meta: [
      { title: "Candidate Profile — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Set your field, region and interests so EOZ matches you with the most relevant Zambian opportunities.",
      },
      { property: "og:title", content: "Candidate Profile — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Manage your matching preferences, skills and documents in the EOZ candidate portal.",
      },
    ],
  }),
  component: Profile,
});

type CandidateProfile = {
  headline: string | null;
  bio: string | null;
  location: string | null;
  educationSummary: string | null;
  experienceSummary: string | null;
  skills: string | null;
  completenessPercent: number;
};

type Document = { id: string; fileName: string; contentType: string; uploadedAt: string };

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

function Profile() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["candidate", "profile"],
    queryFn: () => api.get<CandidateProfile>("/candidate/profile"),
    retry: false,
  });
  const documentsQuery = useQuery({
    queryKey: ["candidate", "documents"],
    queryFn: () => api.get<Document[]>("/candidate/documents"),
    retry: false,
    enabled: profileQuery.isSuccess,
  });

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [educationSummary, setEducationSummary] = useState("");
  const [experienceSummary, setExperienceSummary] = useState("");
  const [skills, setSkills] = useState("");

  useEffect(() => {
    if (profileQuery.data) {
      setHeadline(profileQuery.data.headline ?? "");
      setBio(profileQuery.data.bio ?? "");
      setLocation(profileQuery.data.location ?? "");
      setEducationSummary(profileQuery.data.educationSummary ?? "");
      setExperienceSummary(profileQuery.data.experienceSummary ?? "");
      setSkills(profileQuery.data.skills ?? "");
    }
  }, [profileQuery.data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch<CandidateProfile>("/candidate/profile", {
        headline,
        bio,
        location,
        educationSummary,
        experienceSummary,
        skills,
      }),
    onSuccess: (data) => queryClient.setQueryData(["candidate", "profile"], data),
  });

  const completeness = profileQuery.data?.completenessPercent ?? 0;

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.3 ) — Profile"
        title="Tell us what you're looking for."
        lead="Matching uses your headline, location and skills. Nothing here is shared with employers."
      />
      <DashNav items={CANDIDATE_NAV} />

      {isUnauthenticated(profileQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in as a candidate to manage your profile.</p>
        </Panel>
      ) : null}

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <label>
                <span className="label-mono">Headline</span>
                <input value={headline} onChange={(e) => setHeadline(e.target.value)} className={inputCls} placeholder="e.g. Data Analyst" />
              </label>
              <label>
                <span className="label-mono">Location</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="e.g. Lusaka" />
              </label>
              <label>
                <span className="label-mono">Bio</span>
                <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className={inputCls} />
              </label>
              <label>
                <span className="label-mono">Education summary</span>
                <textarea
                  rows={2}
                  value={educationSummary}
                  onChange={(e) => setEducationSummary(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label>
                <span className="label-mono">Experience summary</span>
                <textarea
                  rows={2}
                  value={experienceSummary}
                  onChange={(e) => setExperienceSummary(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label>
                <span className="label-mono">Skills (comma-separated)</span>
                <input value={skills} onChange={(e) => setSkills(e.target.value)} className={inputCls} placeholder="SQL, Excel, Power BI" />
              </label>
              {save.isError ? (
                <p className="text-xs text-rose-400">
                  {save.error instanceof ApiError ? save.error.message : "Could not save your profile."}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={save.isPending}
                className="accent-gradient w-fit rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
              >
                {save.isPending ? "Saving…" : "Save preferences"}
              </button>
            </form>
          </Panel>
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            <div className="label-mono mb-3">Documents</div>
            {documentsQuery.data?.length ? (
              <ul className="space-y-2 text-sm">
                {documentsQuery.data.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between">
                    <span className="truncate">{doc.fileName}</span>
                    <Chip tone="emerald">Ready</Chip>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No documents uploaded yet.</p>
            )}
            <p className="mt-3 text-xs text-muted">
              Documents are stored for your own use. EOZ never forwards them to employers.
            </p>
          </Panel>
          <Panel>
            <div className="label-mono mb-2">Profile strength</div>
            <div className="h-1.5 rounded-full bg-line">
              <div className="accent-gradient h-1.5 rounded-full" style={{ width: `${completeness}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">{completeness}% complete.</p>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
