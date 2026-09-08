import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { API_BASE_URL, api, ApiError, isUnauthenticated } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

type ProjectDetail = {
  id: string;
  reference: string;
  title: string;
  opportunityTitle: string | null;
  organisationName: string | null;
  status: string;
  confidentiality: string;
  createdAt: string;
};

type Candidate = {
  id: string;
  projectId: string;
  candidateName: string;
  candidateEmail: string | null;
  stage: string;
  source: string | null;
  addedAt: string;
};

type Note = {
  id: string;
  authorName: string;
  classification: string;
  note: string;
  createdAt: string;
};

type Interview = {
  id: string;
  candidateId: string;
  scheduledAt: string;
  mode: string;
  location: string | null;
  notes: string | null;
};

type Feedback = {
  id: string;
  authorName: string;
  rating: number;
  comments: string | null;
  createdAt: string;
};

type ScreeningQuestion = {
  id: string;
  question: string;
  questionType: string;
  knockoutAnswer: string | null;
};

const STAGES = [
  "RECEIVED",
  "SCREENING",
  "LONGLISTED",
  "SHORTLISTED",
  "ASSESSMENT",
  "INTERVIEW",
  "REFERENCE_CHECK",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
];

const field =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/50";

export const Route = createFileRoute("/admin/recruitment/$projectId")({
  head: () => ({ meta: [{ title: "Recruitment project — EOZ Staff" }] }),
  component: ProjectDetailRoute,
});

function ProjectDetailRoute() {
  const { projectId } = Route.useParams();
  const projectQuery = useQuery({
    queryKey: ["admin", "recruitment", projectId],
    queryFn: () => api.get<ProjectDetail>(`/recruitment/projects/${projectId}`),
    retry: false,
  });

  if (projectQuery.isLoading) {
    return (
      <SiteShell>
        <PageIntro eyebrow="( 06.7 ) — Recruitment" title="Loading…" lead="" />
      </SiteShell>
    );
  }

  if (isUnauthenticated(projectQuery.error)) {
    return (
      <SiteShell>
        <PageIntro
          eyebrow="( 06.7 ) — Recruitment"
          title="Sign in required."
          lead="Sign in with a recruitment, manager or admin account to view this project."
        />
        <Link to="/auth" search={{ mode: "signin" }} className="mb-14 inline-block text-sm text-accent-soft">
          Sign in →
        </Link>
      </SiteShell>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <SiteShell>
        <PageIntro eyebrow="( 06.7 ) — Recruitment" title="Project not found." lead="It may have been removed." />
        <Link to="/admin/recruitment" className="mb-14 inline-block text-sm text-accent-soft">
          ← Back to recruitment
        </Link>
      </SiteShell>
    );
  }

  return <ProjectDetailPage project={projectQuery.data} />;
}

function ProjectDetailPage({ project }: { project: ProjectDetail }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  function errorMessage(error: unknown, fallback: string) {
    return error instanceof ApiError ? error.message : fallback;
  }
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState(STAGES[0]);
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateSource, setCandidateSource] = useState("");
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "interviews" | "screening">("notes");
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("TEXT");
  const [knockoutAnswer, setKnockoutAnswer] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [noteText, setNoteText] = useState("");
  const [noteClassification, setNoteClassification] = useState("PRIVATE_INTERNAL");
  const [schedulingInterview, setSchedulingInterview] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewMode, setInterviewMode] = useState("ONLINE");
  const [interviewLocation, setInterviewLocation] = useState("");
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState("");

  const candidatesQuery = useQuery({
    queryKey: ["admin", "recruitment", project.id, "candidates"],
    queryFn: () => api.get<Candidate[]>(`/recruitment/projects/${project.id}/candidates`),
  });
  const candidates = candidatesQuery.data ?? [];

  const invalidateCandidates = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "recruitment", project.id, "candidates"] });

  const addCandidate = useMutation({
    mutationFn: () =>
      api.post(`/recruitment/projects/${project.id}/candidates`, {
        candidateName,
        candidateEmail: candidateEmail || undefined,
        source: candidateSource || undefined,
      }),
    onSuccess: () => {
      setCandidateName("");
      setCandidateEmail("");
      setCandidateSource("");
      setAddingCandidate(false);
      invalidateCandidates();
      toast("Candidate added.");
    },
    onError: (error) => toast(errorMessage(error, "Could not add candidate."), "error"),
  });

  const changeStage = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => api.post(`/recruitment/candidates/${id}/stage`, { stage }),
    onSuccess: () => {
      invalidateCandidates();
      toast("Stage updated.");
    },
    onError: (error) => toast(errorMessage(error, "Could not change stage."), "error"),
  });

  const bulkChangeStage = useMutation({
    mutationFn: () =>
      api.post(`/recruitment/projects/${project.id}/candidates/bulk-stage`, {
        candidateIds: Array.from(selected),
        stage: bulkStage,
      }),
    onSuccess: () => {
      const count = selected.size;
      setSelected(new Set());
      invalidateCandidates();
      toast(`Moved ${count} candidate${count === 1 ? "" : "s"}.`);
    },
    onError: (error) => toast(errorMessage(error, "Could not move selected candidates."), "error"),
  });

  const notesQuery = useQuery({
    queryKey: ["admin", "recruitment-candidate-notes", activeCandidateId],
    queryFn: () => api.get<Note[]>(`/recruitment/candidates/${activeCandidateId}/notes`),
    enabled: !!activeCandidateId,
  });

  const addNote = useMutation({
    mutationFn: () =>
      api.post(`/recruitment/candidates/${activeCandidateId}/notes`, { note: noteText, classification: noteClassification }),
    onSuccess: () => {
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["admin", "recruitment-candidate-notes", activeCandidateId] });
      toast("Note added.");
    },
    onError: (error) => toast(errorMessage(error, "Could not add note."), "error"),
  });

  const interviewsQuery = useQuery({
    queryKey: ["admin", "recruitment-candidate-interviews", activeCandidateId],
    queryFn: () => api.get<Interview[]>(`/recruitment/candidates/${activeCandidateId}/interviews`),
    enabled: !!activeCandidateId && activeTab === "interviews",
  });

  const invalidateInterviews = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "recruitment-candidate-interviews", activeCandidateId] });

  const scheduleInterview = useMutation({
    mutationFn: () =>
      api.post(`/recruitment/candidates/${activeCandidateId}/interviews`, {
        scheduledAt: new Date(interviewDate).toISOString(),
        mode: interviewMode,
        location: interviewLocation || undefined,
      }),
    onSuccess: () => {
      setInterviewDate("");
      setInterviewLocation("");
      setSchedulingInterview(false);
      invalidateInterviews();
      toast("Interview scheduled.");
    },
    onError: (error) => toast(errorMessage(error, "Could not schedule interview."), "error"),
  });

  const feedbackQuery = useQuery({
    queryKey: ["admin", "recruitment-interview-feedback", activeInterviewId],
    queryFn: () => api.get<Feedback[]>(`/recruitment/interviews/${activeInterviewId}/feedback`),
    enabled: !!activeInterviewId,
  });

  const addFeedback = useMutation({
    mutationFn: () =>
      api.post(`/recruitment/interviews/${activeInterviewId}/feedback`, {
        rating: feedbackRating,
        comments: feedbackComments || undefined,
      }),
    onSuccess: () => {
      setFeedbackComments("");
      queryClient.invalidateQueries({ queryKey: ["admin", "recruitment-interview-feedback", activeInterviewId] });
      toast("Feedback recorded.");
    },
    onError: (error) => toast(errorMessage(error, "Could not record feedback."), "error"),
  });

  const questionsQuery = useQuery({
    queryKey: ["admin", "recruitment", project.id, "questions"],
    queryFn: () => api.get<ScreeningQuestion[]>(`/recruitment/projects/${project.id}/questions`),
  });
  const questions = questionsQuery.data ?? [];

  const addQuestion = useMutation({
    mutationFn: () =>
      api.post(`/recruitment/projects/${project.id}/questions`, {
        question: questionText,
        questionType,
        knockoutAnswer: knockoutAnswer || undefined,
      }),
    onSuccess: () => {
      setQuestionText("");
      setKnockoutAnswer("");
      setAddingQuestion(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "recruitment", project.id, "questions"] });
      toast("Question added.");
    },
    onError: (error) => toast(errorMessage(error, "Could not add question."), "error"),
  });

  const submitAnswers = useMutation({
    mutationFn: () =>
      api.post<{ anyKnockedOut: boolean; candidateStage: string }>(`/recruitment/candidates/${activeCandidateId}/answers`, {
        answers: questions.map((q) => ({ questionId: q.id, answer: answerDrafts[q.id] ?? "" })),
      }),
    onSuccess: (result) => {
      setAnswerDrafts({});
      invalidateCandidates();
      toast(
        result.anyKnockedOut ? "A knockout answer was recorded — candidate moved to Rejected." : "Answers recorded.",
        result.anyKnockedOut ? "error" : "success",
      );
    },
    onError: (error) => toast(errorMessage(error, "Could not record answers."), "error"),
  });

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeCandidate = candidates.find((c) => c.id === activeCandidateId);

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.7 ) — Recruitment"
        title={project.title}
        lead={`Ref ${project.reference}${project.organisationName ? ` · ${project.organisationName}` : ""}${project.opportunityTitle ? ` · ${project.opportunityTitle}` : ""}`}
        aside={
          <Panel>
            <Chip tone={project.status === "OPEN" ? "emerald" : "muted"}>{project.status}</Chip>
            <p className="mt-3 text-xs text-muted">
              {project.confidentiality === "CONFIDENTIAL" ? "Confidential engagement" : "Standard engagement"}
            </p>
            <a
              href={`${API_BASE_URL}/recruitment/projects/${project.id}/shortlist/export`}
              className="mt-4 block rounded-md px-3 py-2 text-center text-sm ring-1 ring-line hover:text-accent-soft"
            >
              Export shortlist (CSV) →
            </a>
          </Panel>
        }
      />
      <DashNav items={ADMIN_NAV} />
      <Link to="/admin/recruitment" className="mb-4 inline-block text-sm text-muted hover:text-fg">
        ← All recruitment projects
      </Link>

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="label-mono">Candidates ({candidates.length})</div>
              <button
                type="button"
                onClick={() => setAddingCandidate((v) => !v)}
                className="rounded-md px-3 py-1.5 text-xs text-muted ring-1 ring-line hover:text-fg"
              >
                {addingCandidate ? "Cancel" : "Add candidate"}
              </button>
            </div>

            {addingCandidate ? (
              <form
                className="mt-4 grid gap-3 border-b border-line pb-4 sm:grid-cols-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  addCandidate.mutate();
                }}
              >
                <label>
                  <span className="label-mono">Name</span>
                  <input required value={candidateName} onChange={(e) => setCandidateName(e.target.value)} className={field} />
                </label>
                <label>
                  <span className="label-mono">Email (optional)</span>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    className={field}
                  />
                </label>
                <label>
                  <span className="label-mono">Source (optional)</span>
                  <input value={candidateSource} onChange={(e) => setCandidateSource(e.target.value)} className={field} />
                </label>
                <button
                  type="submit"
                  disabled={addCandidate.isPending}
                  className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60 sm:col-span-3 sm:justify-self-start"
                >
                  {addCandidate.isPending ? "Adding…" : "Add to pipeline"}
                </button>
              </form>
            ) : null}

            {selected.size > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md bg-surface-2 p-3 text-sm">
                <span className="text-xs text-muted">{selected.size} selected</span>
                <select value={bulkStage} onChange={(e) => setBulkStage(e.target.value)} className="rounded-md bg-ink px-2 py-1 text-xs ring-1 ring-line">
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={bulkChangeStage.isPending}
                  onClick={() => bulkChangeStage.mutate()}
                  className="accent-gradient rounded-md px-3 py-1 text-xs font-medium text-ink disabled:opacity-60"
                >
                  {bulkChangeStage.isPending ? "Applying…" : "Move selected"}
                </button>
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="label-mono">
                  <tr>
                    <th className="pb-2">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="pb-2">Candidate</th>
                    <th className="pb-2">Stage</th>
                    <th className="pb-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} className="border-t border-line">
                      <td className="py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleSelected(c.id)}
                          className="size-3.5"
                        />
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => setActiveCandidateId(c.id)}
                          className={`text-left hover:text-accent-soft ${activeCandidateId === c.id ? "text-accent-soft" : ""}`}
                        >
                          {c.candidateName}
                        </button>
                        {c.candidateEmail ? <div className="text-xs text-muted">{c.candidateEmail}</div> : null}
                      </td>
                      <td className="py-3">
                        <select
                          value={c.stage}
                          onChange={(e) => changeStage.mutate({ id: c.id, stage: e.target.value })}
                          disabled={changeStage.isPending}
                          className="rounded-md bg-surface-2 px-2 py-1 text-xs ring-1 ring-line"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-muted">{c.source ?? "—"}</td>
                    </tr>
                  ))}
                  {!candidatesQuery.isLoading && candidates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-muted">
                        No candidates in this pipeline yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <aside className="lg:col-span-4">
          <Panel>
            {!activeCandidate ? (
              <>
                <div className="label-mono">Candidate detail</div>
                <p className="mt-3 text-sm text-muted">Select a candidate to view notes and interviews.</p>
              </>
            ) : (
              <>
                <p className="text-sm">{activeCandidate.candidateName}</p>
                <div className="mt-3 flex gap-2 border-b border-line pb-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("notes")}
                    className={`rounded-md px-3 py-1 text-xs ${activeTab === "notes" ? "accent-gradient text-ink" : "text-muted ring-1 ring-line"}`}
                  >
                    Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("interviews")}
                    className={`rounded-md px-3 py-1 text-xs ${activeTab === "interviews" ? "accent-gradient text-ink" : "text-muted ring-1 ring-line"}`}
                  >
                    Interviews
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("screening")}
                    className={`rounded-md px-3 py-1 text-xs ${activeTab === "screening" ? "accent-gradient text-ink" : "text-muted ring-1 ring-line"}`}
                  >
                    Screening
                  </button>
                </div>

                {activeTab === "notes" ? (
                  <>
                    <div className="mt-3 max-h-64 space-y-3 overflow-y-auto">
                      {notesQuery.isLoading ? <p className="text-xs text-muted">Loading…</p> : null}
                      {(notesQuery.data ?? []).map((n) => (
                        <div key={n.id} className="rounded-md bg-surface-2 p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted">{n.authorName}</span>
                            <Chip tone={n.classification === "CLIENT_VISIBLE" ? "emerald" : "muted"}>
                              {n.classification === "CLIENT_VISIBLE" ? "Client-visible" : "Private"}
                            </Chip>
                          </div>
                          <p className="mt-1">{n.note}</p>
                        </div>
                      ))}
                      {notesQuery.isSuccess && (notesQuery.data ?? []).length === 0 ? (
                        <p className="text-xs text-muted">No notes yet.</p>
                      ) : null}
                    </div>
                    <form
                      className="mt-3 grid gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        addNote.mutate();
                      }}
                    >
                      <textarea
                        required
                        rows={3}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add a note"
                        className={field}
                      />
                      <select
                        value={noteClassification}
                        onChange={(e) => setNoteClassification(e.target.value)}
                        className={field}
                      >
                        <option value="PRIVATE_INTERNAL">Private (internal only)</option>
                        <option value="CLIENT_VISIBLE">Client-visible</option>
                      </select>
                      <button
                        type="submit"
                        disabled={addNote.isPending}
                        className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60 justify-self-start"
                      >
                        {addNote.isPending ? "Saving…" : "Add note"}
                      </button>
                    </form>
                  </>
                ) : activeTab === "interviews" ? (
                  <>
                    <div className="mt-3 max-h-64 space-y-3 overflow-y-auto">
                      {interviewsQuery.isLoading ? <p className="text-xs text-muted">Loading…</p> : null}
                      {(interviewsQuery.data ?? []).map((iv) => (
                        <button
                          type="button"
                          key={iv.id}
                          onClick={() => setActiveInterviewId(iv.id === activeInterviewId ? null : iv.id)}
                          className={`block w-full rounded-md p-2 text-left text-xs ring-1 ${activeInterviewId === iv.id ? "bg-accent/10 ring-accent/35" : "bg-surface-2 ring-transparent hover:ring-line"}`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{new Date(iv.scheduledAt).toLocaleString()}</span>
                            <Chip tone="muted">{iv.mode}</Chip>
                          </div>
                          {iv.location ? <div className="mt-1 text-muted">{iv.location}</div> : null}
                        </button>
                      ))}
                      {interviewsQuery.isSuccess && (interviewsQuery.data ?? []).length === 0 ? (
                        <p className="text-xs text-muted">No interviews scheduled yet.</p>
                      ) : null}
                    </div>

                    {activeInterviewId ? (
                      <div className="mt-3 border-t border-line pt-3">
                        <div className="label-mono">Feedback</div>
                        <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                          {(feedbackQuery.data ?? []).map((f) => (
                            <div key={f.id} className="rounded-md bg-surface-2 p-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-muted">{f.authorName}</span>
                                <span className="text-amber">{"★".repeat(f.rating)}</span>
                              </div>
                              {f.comments ? <p className="mt-1">{f.comments}</p> : null}
                            </div>
                          ))}
                          {feedbackQuery.isSuccess && (feedbackQuery.data ?? []).length === 0 ? (
                            <p className="text-xs text-muted">No feedback yet.</p>
                          ) : null}
                        </div>
                        <form
                          className="mt-2 grid gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            addFeedback.mutate();
                          }}
                        >
                          <select
                            value={feedbackRating}
                            onChange={(e) => setFeedbackRating(Number(e.target.value))}
                            className={field}
                          >
                            {[5, 4, 3, 2, 1].map((r) => (
                              <option key={r} value={r}>
                                {"★".repeat(r)} ({r}/5)
                              </option>
                            ))}
                          </select>
                          <textarea
                            rows={2}
                            value={feedbackComments}
                            onChange={(e) => setFeedbackComments(e.target.value)}
                            placeholder="Comments (optional)"
                            className={field}
                          />
                          <button
                            type="submit"
                            disabled={addFeedback.isPending}
                            className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60 justify-self-start"
                          >
                            {addFeedback.isPending ? "Saving…" : "Add feedback"}
                          </button>
                        </form>
                      </div>
                    ) : null}

                    <div className="mt-3 border-t border-line pt-3">
                      {schedulingInterview ? (
                        <form
                          className="grid gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            scheduleInterview.mutate();
                          }}
                        >
                          <label>
                            <span className="label-mono">Date & time</span>
                            <input
                              required
                              type="datetime-local"
                              value={interviewDate}
                              onChange={(e) => setInterviewDate(e.target.value)}
                              className={field}
                            />
                          </label>
                          <select value={interviewMode} onChange={(e) => setInterviewMode(e.target.value)} className={field}>
                            <option value="ONLINE">Online</option>
                            <option value="IN_PERSON">In person</option>
                            <option value="PHONE">Phone</option>
                          </select>
                          <input
                            value={interviewLocation}
                            onChange={(e) => setInterviewLocation(e.target.value)}
                            placeholder="Location or link (optional)"
                            className={field}
                          />
                          <button
                            type="submit"
                            disabled={scheduleInterview.isPending}
                            className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60 justify-self-start"
                          >
                            {scheduleInterview.isPending ? "Scheduling…" : "Schedule interview"}
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSchedulingInterview(true)}
                          className="w-full rounded-md px-3 py-2 text-xs text-muted ring-1 ring-line hover:text-fg"
                        >
                          + Schedule interview
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-3 max-h-72 space-y-3 overflow-y-auto">
                      {questionsQuery.isLoading ? <p className="text-xs text-muted">Loading…</p> : null}
                      {questions.length === 0 && questionsQuery.isSuccess ? (
                        <p className="text-xs text-muted">No screening questions set up for this project yet.</p>
                      ) : null}
                      {questions.map((q) => (
                        <div key={q.id} className="rounded-md bg-surface-2 p-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span>{q.question}</span>
                            {q.knockoutAnswer ? <Chip tone="rose">Knockout: {q.knockoutAnswer}</Chip> : null}
                          </div>
                          {q.questionType === "YES_NO" ? (
                            <select
                              value={answerDrafts[q.id] ?? ""}
                              onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              className="mt-2 w-full rounded-md bg-ink px-2 py-1 text-xs ring-1 ring-line"
                            >
                              <option value="">Not answered</option>
                              <option value="YES">Yes</option>
                              <option value="NO">No</option>
                            </select>
                          ) : (
                            <input
                              value={answerDrafts[q.id] ?? ""}
                              onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Candidate's answer"
                              className="mt-2 w-full rounded-md bg-ink px-2 py-1 text-xs ring-1 ring-line"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {questions.length > 0 ? (
                      <button
                        type="button"
                        disabled={submitAnswers.isPending}
                        onClick={() => submitAnswers.mutate()}
                        className="accent-gradient mt-3 w-full rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                      >
                        {submitAnswers.isPending ? "Submitting…" : "Record answers"}
                      </button>
                    ) : null}

                    <div className="mt-3 border-t border-line pt-3">
                      {addingQuestion ? (
                        <form
                          className="grid gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            addQuestion.mutate();
                          }}
                        >
                          <textarea
                            required
                            rows={2}
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            placeholder="Question"
                            className={field}
                          />
                          <select value={questionType} onChange={(e) => setQuestionType(e.target.value)} className={field}>
                            <option value="TEXT">Free text</option>
                            <option value="YES_NO">Yes / No</option>
                          </select>
                          <input
                            value={knockoutAnswer}
                            onChange={(e) => setKnockoutAnswer(e.target.value)}
                            placeholder="Knockout answer (optional, e.g. NO)"
                            className={field}
                          />
                          <button
                            type="submit"
                            disabled={addQuestion.isPending}
                            className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60 justify-self-start"
                          >
                            {addQuestion.isPending ? "Adding…" : "Add question"}
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddingQuestion(true)}
                          className="w-full rounded-md px-3 py-2 text-xs text-muted ring-1 ring-line hover:text-fg"
                        >
                          + Add screening question
                        </button>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
