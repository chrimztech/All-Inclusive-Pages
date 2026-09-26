import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";
import { API_BASE_URL, api, ApiError, isUnauthenticated, uploadFile } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";
import { useToast } from "@/lib/toast";
import { CertificationsSection, LanguagesSection } from "@/components/eoz/CandidateCredentials";

export const Route = createFileRoute("/candidate/profile")({
  head: () => ({
    meta: [
      { title: "Candidate Profile — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Build a complete candidate profile — CV, photo, work history and education — so employers see the full picture when you apply.",
      },
      { property: "og:title", content: "Candidate Profile — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content:
          "Manage your CV, work history, education and matching preferences in the EOZ candidate portal.",
      },
    ],
  }),
  component: Profile,
});

type Availability = "IMMEDIATE" | "TWO_WEEKS" | "ONE_MONTH" | "NEGOTIABLE";

const AVAILABILITY_LABELS: Record<Availability, string> = {
  IMMEDIATE: "Immediately",
  TWO_WEEKS: "Within 2 weeks",
  ONE_MONTH: "Within 1 month",
  NEGOTIABLE: "Negotiable",
};

type WorkExperience = {
  id: string;
  title: string;
  employerName: string;
  startDate: string | null;
  endDate: string | null;
  current: boolean;
  description: string | null;
  displayOrder: number;
};

type Education = {
  id: string;
  institution: string;
  qualification: string;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  displayOrder: number;
};

type CandidateProfile = {
  headline: string | null;
  bio: string | null;
  location: string | null;
  educationSummary: string | null;
  experienceSummary: string | null;
  skills: string | null;
  photoFileId: string | null;
  resumeFileId: string | null;
  availability: Availability | null;
  salaryExpectationMin: number | null;
  salaryExpectationMax: number | null;
  salaryCurrency: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  workExperience: WorkExperience[];
  education: Education[];
  completenessPercent: number;
};

type UploadedFile = { id: string; fileName: string; contentType: string; sizeBytes: number };

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

const ghostButtonCls =
  "rounded-md px-3 py-2 text-xs text-muted ring-1 ring-line hover:text-fg disabled:opacity-60";

function formatDateRange(start: string | null, end: string | null, current?: boolean): string {
  const fmt = (d: string) => {
    const parsed = new Date(d);
    return Number.isNaN(parsed.getTime())
      ? d
      : parsed.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  };
  const startLabel = start ? fmt(start) : "—";
  const endLabel = current ? "Present" : end ? fmt(end) : "—";
  return `${startLabel} – ${endLabel}`;
}

function PhotoPreview({ fileId }: { fileId: string }) {
  const [failed, setFailed] = useState(false);
  const url = `${API_BASE_URL}/files/${fileId}/download`;

  if (failed) {
    return (
      <a
        href={url}
        className="flex size-16 items-center justify-center rounded-full bg-surface-2 text-center text-[10px] text-accent-soft ring-1 ring-line hover:text-fg"
      >
        Photo ✓
      </a>
    );
  }

  return (
    <img
      src={url}
      alt="Profile"
      onError={() => setFailed(true)}
      className="size-16 rounded-full object-cover ring-1 ring-line"
    />
  );
}

function Profile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const photoInput = useRef<HTMLInputElement>(null);
  const resumeInput = useRef<HTMLInputElement>(null);

  const profileQuery = useQuery({
    queryKey: ["candidate", "profile"],
    queryFn: () => api.get<CandidateProfile>("/candidate/profile"),
    retry: false,
  });

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState<Availability | "">("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("ZMW");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  useEffect(() => {
    if (profileQuery.data) {
      const p = profileQuery.data;
      setHeadline(p.headline ?? "");
      setBio(p.bio ?? "");
      setLocation(p.location ?? "");
      setSkills(p.skills ?? "");
      setAvailability(p.availability ?? "");
      setSalaryMin(p.salaryExpectationMin != null ? String(p.salaryExpectationMin) : "");
      setSalaryMax(p.salaryExpectationMax != null ? String(p.salaryExpectationMax) : "");
      setSalaryCurrency(p.salaryCurrency ?? "ZMW");
      setLinkedinUrl(p.linkedinUrl ?? "");
      setPortfolioUrl(p.portfolioUrl ?? "");
    }
  }, [profileQuery.data]);

  const saveDetails = useMutation({
    mutationFn: () =>
      api.patch<CandidateProfile>("/candidate/profile", {
        headline: headline || null,
        bio: bio || null,
        location: location || null,
        skills: skills || null,
        availability: availability || null,
        salaryExpectationMin: salaryMin.trim() === "" ? null : Number(salaryMin),
        salaryExpectationMax: salaryMax.trim() === "" ? null : Number(salaryMax),
        salaryCurrency: salaryCurrency || null,
        linkedinUrl: linkedinUrl || null,
        portfolioUrl: portfolioUrl || null,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["candidate", "profile"], data);
      toast("Profile saved.");
    },
    onError: (error) =>
      toast(error instanceof ApiError ? error.message : "Could not save your profile.", "error"),
  });

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new ApiError(401, "Sign in to upload a photo.");
      const uploaded = await uploadFile<UploadedFile>("/files", file, {
        ownerType: "CANDIDATE_DOCUMENT",
        ownerId: user.id,
      });
      return api.patch<CandidateProfile>("/candidate/profile/photo", { fileId: uploaded.id });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["candidate", "profile"], data);
      toast("Photo updated.");
    },
    onError: (error) =>
      toast(error instanceof ApiError ? error.message : "Could not upload your photo.", "error"),
  });

  const uploadResume = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new ApiError(401, "Sign in to upload a CV.");
      const uploaded = await uploadFile<UploadedFile>("/files", file, {
        ownerType: "CANDIDATE_DOCUMENT",
        ownerId: user.id,
      });
      return api.patch<CandidateProfile>("/candidate/profile/resume", { fileId: uploaded.id });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["candidate", "profile"], data);
      toast("CV uploaded.");
    },
    onError: (error) =>
      toast(error instanceof ApiError ? error.message : "Could not upload your CV.", "error"),
  });

  const profile = profileQuery.data;
  const completeness = profile?.completenessPercent ?? 0;

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.3 ) — Profile"
        title="Give employers the full picture."
        lead="Your CV, work history, education and preferences are what employers see when you apply — keep them current."
      />
      <DashNav items={CANDIDATE_NAV} />

      {isUnauthenticated(profileQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in as a candidate to manage your profile.</p>
        </Panel>
      ) : null}

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Panel>
            <div className="label-mono">CV / Résumé</div>
            <h2 className="mt-1 font-display text-2xl">Employers see this when you apply</h2>
            <p className="mt-2 text-sm text-muted">
              Upload a PDF or Word document (max 10MB). It's attached automatically when you submit
              an application, so keep it current and well formatted.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                ref={resumeInput}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadResume.mutate(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={uploadResume.isPending}
                onClick={() => resumeInput.current?.click()}
                className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
              >
                {uploadResume.isPending
                  ? "Uploading…"
                  : profile?.resumeFileId
                    ? "Replace CV"
                    : "Upload CV"}
              </button>
              {profile?.resumeFileId ? (
                <>
                  <Chip tone="emerald">Uploaded</Chip>
                  <a
                    href={`${API_BASE_URL}/files/${profile.resumeFileId}/download`}
                    className="text-xs text-accent-soft hover:text-fg"
                  >
                    View current CV
                  </a>
                </>
              ) : (
                <span className="text-xs text-muted">No CV uploaded yet.</span>
              )}
            </div>
            {uploadResume.isError ? (
              <p className="mt-2 text-xs text-rose-400">
                {uploadResume.error instanceof ApiError
                  ? uploadResume.error.message
                  : "Upload failed."}
              </p>
            ) : null}
          </Panel>

          <Panel>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveDetails.mutate();
              }}
            >
              <div>
                <div className="label-mono">Profile photo</div>
                <div className="mt-2 flex items-center gap-4">
                  {profile?.photoFileId ? (
                    <PhotoPreview fileId={profile.photoFileId} />
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-full bg-surface-2 text-[10px] text-muted ring-1 ring-line">
                      No photo
                    </div>
                  )}
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadPhoto.mutate(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploadPhoto.isPending}
                    onClick={() => photoInput.current?.click()}
                    className={ghostButtonCls}
                  >
                    {uploadPhoto.isPending ? "Uploading…" : "Change photo"}
                  </button>
                </div>
                {uploadPhoto.isError ? (
                  <p className="mt-2 text-xs text-rose-400">
                    {uploadPhoto.error instanceof ApiError
                      ? uploadPhoto.error.message
                      : "Upload failed."}
                  </p>
                ) : null}
              </div>

              <label>
                <span className="label-mono">Headline</span>
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Data Analyst"
                />
              </label>
              <label>
                <span className="label-mono">Location</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Lusaka"
                />
              </label>
              <label>
                <span className="label-mono">Bio</span>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label>
                <span className="label-mono">Skills (comma-separated)</span>
                <input
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className={inputCls}
                  placeholder="SQL, Excel, Power BI"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="label-mono">Availability</span>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value as Availability | "")}
                    className={inputCls}
                  >
                    <option value="">Not specified</option>
                    {Object.entries(AVAILABILITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label-mono">Currency</span>
                  <input
                    value={salaryCurrency}
                    onChange={(e) => setSalaryCurrency(e.target.value)}
                    className={inputCls}
                    placeholder="ZMW"
                  />
                </label>
                <label>
                  <span className="label-mono">Min salary expectation</span>
                  <input
                    type="number"
                    min="0"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    className={inputCls}
                  />
                </label>
                <label>
                  <span className="label-mono">Max salary expectation</span>
                  <input
                    type="number"
                    min="0"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    className={inputCls}
                  />
                </label>
                <label>
                  <span className="label-mono">LinkedIn URL</span>
                  <input
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className={inputCls}
                    placeholder="https://linkedin.com/in/…"
                  />
                </label>
                <label>
                  <span className="label-mono">Portfolio URL</span>
                  <input
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className={inputCls}
                    placeholder="https://…"
                  />
                </label>
              </div>

              {saveDetails.isError ? (
                <p className="text-xs text-rose-400">
                  {saveDetails.error instanceof ApiError
                    ? saveDetails.error.message
                    : "Could not save your profile."}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={saveDetails.isPending}
                className="accent-gradient w-fit rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
              >
                {saveDetails.isPending ? "Saving…" : "Save profile"}
              </button>
            </form>
          </Panel>

          <WorkExperienceSection experience={profile?.workExperience ?? []} />
          <EducationSection education={profile?.education ?? []} />
          <LanguagesSection />
          <CertificationsSection />
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            <div className="label-mono mb-2">Profile strength</div>
            <div className="h-1.5 rounded-full bg-line">
              <div
                className="accent-gradient h-1.5 rounded-full"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">{completeness}% complete.</p>
            <p className="mt-3 text-xs text-muted">
              Add a photo, CV, work history and education to raise your completeness score and stand
              out to employers.
            </p>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}

type ExperienceValues = {
  title: string;
  employerName: string;
  startDate: string | null;
  endDate: string | null;
  current: boolean;
  description: string | null;
};

function WorkExperienceSection({ experience }: { experience: WorkExperience[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["candidate", "profile"] });

  const create = useMutation({
    mutationFn: (values: ExperienceValues) =>
      api.post("/candidate/profile/experience", { ...values, displayOrder: experience.length }),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast("Work experience added.");
    },
    onError: (error) =>
      toast(error instanceof ApiError ? error.message : "Could not add work experience.", "error"),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      values,
      displayOrder,
    }: {
      id: string;
      values: ExperienceValues;
      displayOrder: number;
    }) => api.patch(`/candidate/profile/experience/${id}`, { ...values, displayOrder }),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast("Work experience updated.");
    },
    onError: (error) =>
      toast(
        error instanceof ApiError ? error.message : "Could not update work experience.",
        "error",
      ),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/candidate/profile/experience/${id}`),
    onSuccess: () => {
      invalidate();
      toast("Work experience removed.");
    },
    onError: (error) =>
      toast(
        error instanceof ApiError ? error.message : "Could not remove work experience.",
        "error",
      ),
  });

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="label-mono">Work experience</div>
          <h2 className="mt-1 font-display text-2xl">Show your track record</h2>
        </div>
        {editingId !== "new" ? (
          <button
            type="button"
            onClick={() => setEditingId("new")}
            className="accent-gradient shrink-0 rounded-md px-3 py-2 text-xs font-medium text-ink"
          >
            Add experience
          </button>
        ) : null}
      </div>

      <div className="mt-5 divide-y divide-line">
        {experience.length === 0 && editingId !== "new" ? (
          <p className="py-4 text-sm text-muted">No work experience added yet.</p>
        ) : null}
        {experience.map((entry) =>
          editingId === entry.id ? (
            <div key={entry.id} className="py-4 first:pt-0">
              <ExperienceForm
                initial={entry}
                submitting={update.isPending}
                onCancel={() => setEditingId(null)}
                onSave={(values) =>
                  update.mutate({ id: entry.id, values, displayOrder: entry.displayOrder })
                }
              />
            </div>
          ) : (
            <div
              key={entry.id}
              className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0"
            >
              <div>
                <div className="text-sm font-medium">{entry.title}</div>
                <div className="text-sm text-muted">{entry.employerName}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {formatDateRange(entry.startDate, entry.endDate, entry.current)}
                </div>
                {entry.description ? (
                  <p className="mt-2 max-w-[60ch] text-sm text-muted">{entry.description}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingId(entry.id)}
                  className="text-xs text-muted hover:text-fg"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm("Remove this work experience entry?"))
                      remove.mutate(entry.id);
                  }}
                  className="text-xs text-rose hover:text-fg disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
        {editingId === "new" ? (
          <div className="py-4 first:pt-0">
            <ExperienceForm
              submitting={create.isPending}
              onCancel={() => setEditingId(null)}
              onSave={(values) => create.mutate(values)}
            />
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function ExperienceForm({
  initial,
  onSave,
  onCancel,
  submitting,
}: {
  initial?: WorkExperience;
  onSave: (values: ExperienceValues) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [employerName, setEmployerName] = useState(initial?.employerName ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [current, setCurrent] = useState(initial?.current ?? false);
  const [description, setDescription] = useState(initial?.description ?? "");

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          title,
          employerName,
          startDate: startDate || null,
          endDate: current ? null : endDate || null,
          current,
          description: description || null,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="label-mono">Job title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
            placeholder="e.g. Data Analyst"
          />
        </label>
        <label>
          <span className="label-mono">Employer</span>
          <input
            required
            value={employerName}
            onChange={(e) => setEmployerName(e.target.value)}
            className={inputCls}
            placeholder="e.g. ZamBank"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="label-mono">Start date</span>
          <input
            type="date"
            value={startDate ?? ""}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls}
          />
        </label>
        <label>
          <span className="label-mono">End date</span>
          <input
            type="date"
            value={current ? "" : (endDate ?? "")}
            disabled={current}
            onChange={(e) => setEndDate(e.target.value)}
            className={`${inputCls} disabled:opacity-50`}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={current}
          onChange={(e) => setCurrent(e.target.checked)}
          className="size-4 accent-accent"
        />
        I currently work here
      </label>
      <label>
        <span className="label-mono">Description</span>
        <textarea
          rows={3}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
          placeholder="Key responsibilities and achievements"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="accent-gradient w-fit rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save entry"}
        </button>
        <button type="button" onClick={onCancel} className={ghostButtonCls}>
          Cancel
        </button>
      </div>
    </form>
  );
}

type EducationValues = {
  institution: string;
  qualification: string;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
};

function EducationSection({ education }: { education: Education[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["candidate", "profile"] });

  const create = useMutation({
    mutationFn: (values: EducationValues) =>
      api.post("/candidate/profile/education", { ...values, displayOrder: education.length }),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast("Education added.");
    },
    onError: (error) =>
      toast(error instanceof ApiError ? error.message : "Could not add education.", "error"),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      values,
      displayOrder,
    }: {
      id: string;
      values: EducationValues;
      displayOrder: number;
    }) => api.patch(`/candidate/profile/education/${id}`, { ...values, displayOrder }),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast("Education updated.");
    },
    onError: (error) =>
      toast(error instanceof ApiError ? error.message : "Could not update education.", "error"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/candidate/profile/education/${id}`),
    onSuccess: () => {
      invalidate();
      toast("Education removed.");
    },
    onError: (error) =>
      toast(error instanceof ApiError ? error.message : "Could not remove education.", "error"),
  });

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="label-mono">Education</div>
          <h2 className="mt-1 font-display text-2xl">Qualifications</h2>
        </div>
        {editingId !== "new" ? (
          <button
            type="button"
            onClick={() => setEditingId("new")}
            className="accent-gradient shrink-0 rounded-md px-3 py-2 text-xs font-medium text-ink"
          >
            Add education
          </button>
        ) : null}
      </div>

      <div className="mt-5 divide-y divide-line">
        {education.length === 0 && editingId !== "new" ? (
          <p className="py-4 text-sm text-muted">No education added yet.</p>
        ) : null}
        {education.map((entry) =>
          editingId === entry.id ? (
            <div key={entry.id} className="py-4 first:pt-0">
              <EducationForm
                initial={entry}
                submitting={update.isPending}
                onCancel={() => setEditingId(null)}
                onSave={(values) =>
                  update.mutate({ id: entry.id, values, displayOrder: entry.displayOrder })
                }
              />
            </div>
          ) : (
            <div
              key={entry.id}
              className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0"
            >
              <div>
                <div className="text-sm font-medium">{entry.qualification}</div>
                <div className="text-sm text-muted">
                  {entry.institution}
                  {entry.fieldOfStudy ? ` · ${entry.fieldOfStudy}` : ""}
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {formatDateRange(entry.startDate, entry.endDate)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingId(entry.id)}
                  className="text-xs text-muted hover:text-fg"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm("Remove this education entry?")) remove.mutate(entry.id);
                  }}
                  className="text-xs text-rose hover:text-fg disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
        {editingId === "new" ? (
          <div className="py-4 first:pt-0">
            <EducationForm
              submitting={create.isPending}
              onCancel={() => setEditingId(null)}
              onSave={(values) => create.mutate(values)}
            />
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function EducationForm({
  initial,
  onSave,
  onCancel,
  submitting,
}: {
  initial?: Education;
  onSave: (values: EducationValues) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [institution, setInstitution] = useState(initial?.institution ?? "");
  const [qualification, setQualification] = useState(initial?.qualification ?? "");
  const [fieldOfStudy, setFieldOfStudy] = useState(initial?.fieldOfStudy ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          institution,
          qualification,
          fieldOfStudy: fieldOfStudy || null,
          startDate: startDate || null,
          endDate: endDate || null,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="label-mono">Institution</span>
          <input
            required
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            className={inputCls}
            placeholder="e.g. University of Zambia"
          />
        </label>
        <label>
          <span className="label-mono">Qualification</span>
          <input
            required
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
            className={inputCls}
            placeholder="e.g. BSc Computer Science"
          />
        </label>
      </div>
      <label>
        <span className="label-mono">Field of study</span>
        <input
          value={fieldOfStudy ?? ""}
          onChange={(e) => setFieldOfStudy(e.target.value)}
          className={inputCls}
          placeholder="Optional"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="label-mono">Start date</span>
          <input
            type="date"
            value={startDate ?? ""}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls}
          />
        </label>
        <label>
          <span className="label-mono">End date</span>
          <input
            type="date"
            value={endDate ?? ""}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="accent-gradient w-fit rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save entry"}
        </button>
        <button type="button" onClick={onCancel} className={ghostButtonCls}>
          Cancel
        </button>
      </div>
    </form>
  );
}
