package zm.eoz.platform.recruitment;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.ReferenceNumberService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.opportunity.OpportunityRepository;
import zm.eoz.platform.organisation.OrganisationRepository;
import zm.eoz.platform.recruitment.dto.NoteRequest;
import zm.eoz.platform.recruitment.dto.NoteResponse;
import zm.eoz.platform.recruitment.dto.PipelineCandidateRequest;
import zm.eoz.platform.recruitment.dto.PipelineCandidateResponse;
import zm.eoz.platform.recruitment.dto.FeedbackRequest;
import zm.eoz.platform.recruitment.dto.FeedbackResponse;
import zm.eoz.platform.recruitment.dto.AnswerResult;
import zm.eoz.platform.recruitment.dto.AnswerSubmission;
import zm.eoz.platform.recruitment.dto.BulkStageChangeResult;
import zm.eoz.platform.recruitment.dto.InterviewRequest;
import zm.eoz.platform.recruitment.dto.InterviewResponse;
import zm.eoz.platform.recruitment.dto.RecruitmentProjectRequest;
import zm.eoz.platform.recruitment.dto.RecruitmentProjectResponse;
import zm.eoz.platform.recruitment.dto.ScreeningQuestionRequest;
import zm.eoz.platform.recruitment.dto.ScreeningQuestionResponse;
import zm.eoz.platform.recruitment.dto.TalentPoolCandidateResponse;

@Service
public class RecruitmentService {

    private final RecruitmentProjectRepository projectRepository;
    private final PipelineCandidateRepository candidateRepository;
    private final PipelineNoteRepository noteRepository;
    private final InterviewRepository interviewRepository;
    private final InterviewFeedbackRepository interviewFeedbackRepository;
    private final CandidateTagRepository candidateTagRepository;
    private final ScreeningQuestionRepository screeningQuestionRepository;
    private final CandidateAnswerRepository candidateAnswerRepository;
    private final OpportunityRepository opportunityRepository;
    private final OrganisationRepository organisationRepository;
    private final ReferenceNumberService referenceNumberService;
    private final AuditService auditService;

    public RecruitmentService(
            RecruitmentProjectRepository projectRepository,
            PipelineCandidateRepository candidateRepository,
            PipelineNoteRepository noteRepository,
            InterviewRepository interviewRepository,
            InterviewFeedbackRepository interviewFeedbackRepository,
            CandidateTagRepository candidateTagRepository,
            ScreeningQuestionRepository screeningQuestionRepository,
            CandidateAnswerRepository candidateAnswerRepository,
            OpportunityRepository opportunityRepository,
            OrganisationRepository organisationRepository,
            ReferenceNumberService referenceNumberService,
            AuditService auditService) {
        this.projectRepository = projectRepository;
        this.candidateRepository = candidateRepository;
        this.noteRepository = noteRepository;
        this.screeningQuestionRepository = screeningQuestionRepository;
        this.candidateAnswerRepository = candidateAnswerRepository;
        this.interviewRepository = interviewRepository;
        this.interviewFeedbackRepository = interviewFeedbackRepository;
        this.candidateTagRepository = candidateTagRepository;
        this.opportunityRepository = opportunityRepository;
        this.organisationRepository = organisationRepository;
        this.referenceNumberService = referenceNumberService;
        this.auditService = auditService;
    }

    @Transactional
    public RecruitmentProjectResponse createProject(RecruitmentProjectRequest request, User actor) {
        RecruitmentProject project = new RecruitmentProject();
        project.setReference(referenceNumberService.next("EOZ-REC"));
        project.setTitle(request.title());
        if (request.opportunityId() != null) {
            project.setOpportunity(opportunityRepository
                    .findById(request.opportunityId())
                    .orElseThrow(() -> new NotFoundException("Opportunity not found: " + request.opportunityId())));
        }
        if (request.organisationId() != null) {
            project.setOrganisation(organisationRepository
                    .findById(request.organisationId())
                    .orElseThrow(() -> new NotFoundException("Organisation not found: " + request.organisationId())));
        }
        if (request.confidentiality() != null) {
            try {
                project.setConfidentiality(RecruitmentProject.Confidentiality.valueOf(request.confidentiality()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Unknown confidentiality: " + request.confidentiality());
            }
        }
        project.setCreatedBy(actor);
        project = projectRepository.save(project);
        auditService.record(actor, "PROJECT_CREATED", "RecruitmentProject", project.getReference(), "Created \"" + project.getTitle() + "\"");
        return RecruitmentProjectResponse.from(project);
    }

    @Transactional(readOnly = true)
    public Page<RecruitmentProjectResponse> listProjects(Pageable pageable) {
        return projectRepository.findAllByOrderByCreatedAtDesc(pageable).map(RecruitmentProjectResponse::from);
    }

    @Transactional(readOnly = true)
    public RecruitmentProjectResponse getProject(UUID id) {
        return RecruitmentProjectResponse.from(
                projectRepository.findById(id).orElseThrow(() -> new NotFoundException("Project not found: " + id)));
    }

    @Transactional
    public RecruitmentProjectResponse changeProjectStatus(UUID id, String status, User actor) {
        RecruitmentProject project =
                projectRepository.findById(id).orElseThrow(() -> new NotFoundException("Project not found: " + id));
        RecruitmentProjectStatus target;
        try {
            target = RecruitmentProjectStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown status: " + status);
        }
        project.setStatus(target);
        project.setUpdatedAt(java.time.Instant.now());
        projectRepository.save(project);
        auditService.record(
                actor, "PROJECT_STATUS_CHANGED", "RecruitmentProject", project.getReference(), "Set status to " + target);
        return RecruitmentProjectResponse.from(project);
    }

    @Transactional(readOnly = true)
    public List<PipelineCandidateResponse> listCandidates(UUID projectId) {
        return candidateRepository.findByProjectIdOrderByAddedAtAsc(projectId).stream()
                .map(PipelineCandidateResponse::from)
                .toList();
    }

    @Transactional
    public PipelineCandidateResponse addCandidate(UUID projectId, PipelineCandidateRequest request, User actor) {
        RecruitmentProject project =
                projectRepository.findById(projectId).orElseThrow(() -> new NotFoundException("Project not found: " + projectId));
        PipelineCandidate candidate = new PipelineCandidate();
        candidate.setProject(project);
        candidate.setCandidateName(request.candidateName());
        candidate.setCandidateEmail(request.candidateEmail());
        candidate.setSource(request.source());
        candidate = candidateRepository.save(candidate);
        auditService.record(
                actor, "CANDIDATE_ADDED", "RecruitmentProject", project.getReference(), "Added " + candidate.getCandidateName());
        return PipelineCandidateResponse.from(candidate);
    }

    @Transactional
    public PipelineCandidateResponse moveStage(UUID candidateId, String stage, User actor) {
        PipelineCandidate candidate = candidateRepository
                .findById(candidateId)
                .orElseThrow(() -> new NotFoundException("Candidate not found: " + candidateId));
        PipelineStage target;
        try {
            target = PipelineStage.valueOf(stage);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown stage: " + stage);
        }
        candidate.setStage(target);
        candidate.setUpdatedAt(java.time.Instant.now());
        auditService.record(
                actor,
                "STAGE_CHANGED",
                "PipelineCandidate",
                candidate.getId().toString(),
                candidate.getCandidateName() + " moved to " + target);
        return PipelineCandidateResponse.from(candidate);
    }

    @Transactional
    public NoteResponse addNote(UUID candidateId, NoteRequest request, User actor) {
        PipelineCandidate candidate = candidateRepository
                .findById(candidateId)
                .orElseThrow(() -> new NotFoundException("Candidate not found: " + candidateId));
        PipelineNote note = new PipelineNote();
        note.setCandidate(candidate);
        note.setAuthor(actor);
        note.setNote(request.note());
        if (request.classification() != null) {
            try {
                note.setClassification(PipelineNote.Classification.valueOf(request.classification()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Unknown classification: " + request.classification());
            }
        }
        return NoteResponse.from(noteRepository.save(note));
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> listNotes(UUID candidateId) {
        return noteRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId).stream()
                .map(NoteResponse::from)
                .toList();
    }

    @Transactional
    public InterviewResponse scheduleInterview(UUID candidateId, InterviewRequest request, User actor) {
        PipelineCandidate candidate = requireCandidate(candidateId);
        Interview interview = new Interview();
        interview.setCandidate(candidate);
        interview.setScheduledAt(request.scheduledAt());
        if (request.mode() != null) {
            try {
                interview.setMode(Interview.Mode.valueOf(request.mode()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Unknown interview mode: " + request.mode());
            }
        }
        interview.setLocation(request.location());
        interview.setNotes(request.notes());
        interview.setCreatedBy(actor);
        interview = interviewRepository.save(interview);
        auditService.record(
                actor, "INTERVIEW_SCHEDULED", "PipelineCandidate", candidateId.toString(),
                "Interview scheduled for " + candidate.getCandidateName());
        return InterviewResponse.from(interview);
    }

    @Transactional(readOnly = true)
    public List<InterviewResponse> listInterviews(UUID candidateId) {
        return interviewRepository.findByCandidateIdOrderByScheduledAtAsc(candidateId).stream()
                .map(InterviewResponse::from)
                .toList();
    }

    @Transactional
    public FeedbackResponse addFeedback(UUID interviewId, FeedbackRequest request, User actor) {
        Interview interview =
                interviewRepository.findById(interviewId).orElseThrow(() -> new NotFoundException("Interview not found: " + interviewId));
        InterviewFeedback feedback = new InterviewFeedback();
        feedback.setInterview(interview);
        feedback.setAuthor(actor);
        feedback.setRating(request.rating());
        feedback.setComments(request.comments());
        return FeedbackResponse.from(interviewFeedbackRepository.save(feedback));
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> listFeedback(UUID interviewId) {
        return interviewFeedbackRepository.findByInterviewIdOrderByCreatedAtDesc(interviewId).stream()
                .map(FeedbackResponse::from)
                .toList();
    }

    @Transactional
    public void addTag(UUID candidateId, String tag) {
        requireCandidate(candidateId);
        String normalized = tag.trim().toLowerCase();
        if (candidateTagRepository.findById_CandidateId(candidateId).stream()
                .noneMatch(t -> t.getId().getTag().equals(normalized))) {
            candidateTagRepository.save(new CandidateTag(new CandidateTag.CandidateTagId(candidateId, normalized)));
        }
    }

    @Transactional(readOnly = true)
    public List<TalentPoolCandidateResponse> searchTalentPool(String tag, String query) {
        List<PipelineCandidate> candidates;
        if (tag != null && !tag.isBlank()) {
            candidates = candidateRepository.findByIdIn(candidateTagRepository.findCandidateIdsByTag(tag.trim().toLowerCase()));
        } else {
            candidates = candidateRepository.findAll();
        }
        String normalizedQuery = query != null ? query.toLowerCase() : null;
        return candidates.stream()
                .filter(c -> normalizedQuery == null || c.getCandidateName().toLowerCase().contains(normalizedQuery))
                .map(c -> TalentPoolCandidateResponse.from(
                        c,
                        candidateTagRepository.findById_CandidateId(c.getId()).stream()
                                .map(t -> t.getId().getTag())
                                .toList()))
                .toList();
    }

    private PipelineCandidate requireCandidate(UUID candidateId) {
        return candidateRepository.findById(candidateId).orElseThrow(() -> new NotFoundException("Candidate not found: " + candidateId));
    }

    @Transactional
    public ScreeningQuestionResponse addQuestion(UUID projectId, ScreeningQuestionRequest request, User actor) {
        RecruitmentProject project =
                projectRepository.findById(projectId).orElseThrow(() -> new NotFoundException("Project not found: " + projectId));
        ScreeningQuestion question = new ScreeningQuestion();
        question.setProject(project);
        question.setQuestion(request.question());
        question.setKnockoutAnswer(request.knockoutAnswer());
        if (request.questionType() != null) {
            try {
                question.setQuestionType(ScreeningQuestion.Type.valueOf(request.questionType()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Unknown question type: " + request.questionType());
            }
        }
        question = screeningQuestionRepository.save(question);
        auditService.record(actor, "SCREENING_QUESTION_ADDED", "RecruitmentProject", project.getReference(), request.question());
        return ScreeningQuestionResponse.from(question);
    }

    @Transactional(readOnly = true)
    public List<ScreeningQuestionResponse> listQuestions(UUID projectId) {
        return screeningQuestionRepository.findByProjectIdOrderByCreatedAtAsc(projectId).stream()
                .map(ScreeningQuestionResponse::from)
                .toList();
    }

    /**
     * Records a candidate's screening answers and applies knockout logic: if any answer matches
     * its question's configured knockout value (case-insensitive), the candidate is automatically
     * moved to REJECTED with an audited, private-internal note explaining why — a human can still
     * review and reverse the decision, satisfying the "human-reviewable" fairness requirement.
     */
    @Transactional
    public AnswerResult submitAnswers(UUID candidateId, AnswerSubmission submission, User actor) {
        PipelineCandidate candidate = requireCandidate(candidateId);
        boolean anyKnockedOut = false;
        for (AnswerSubmission.Item item : submission.answers()) {
            ScreeningQuestion question = screeningQuestionRepository
                    .findById(item.questionId())
                    .orElseThrow(() -> new NotFoundException("Question not found: " + item.questionId()));
            boolean knockedOut = question.getKnockoutAnswer() != null
                    && question.getKnockoutAnswer().equalsIgnoreCase(nullToEmpty(item.answer()).trim());
            CandidateAnswer answer = new CandidateAnswer();
            answer.setCandidate(candidate);
            answer.setQuestion(question);
            answer.setAnswer(item.answer());
            answer.setKnockedOut(knockedOut);
            candidateAnswerRepository.save(answer);
            anyKnockedOut = anyKnockedOut || knockedOut;
        }

        if (anyKnockedOut && candidate.getStage() != PipelineStage.REJECTED) {
            candidate.setStage(PipelineStage.REJECTED);
            candidate.setUpdatedAt(java.time.Instant.now());
            PipelineNote note = new PipelineNote();
            note.setCandidate(candidate);
            note.setAuthor(actor);
            note.setClassification(PipelineNote.Classification.PRIVATE_INTERNAL);
            note.setNote("Automatically rejected: a screening answer matched a configured knockout criterion. Reviewable by staff.");
            noteRepository.save(note);
            auditService.record(
                    actor, "SCREENING_KNOCKOUT", "PipelineCandidate", candidateId.toString(),
                    candidate.getCandidateName() + " auto-rejected by screening knockout");
        }

        return new AnswerResult(anyKnockedOut, candidate.getStage().name());
    }

    /**
     * Moves multiple candidates to the same stage in one audited action. Requires the caller to
     * have already confirmed the set (the frontend shows a preview before calling this).
     */
    @Transactional
    public BulkStageChangeResult bulkChangeStage(List<UUID> candidateIds, String stage, User actor) {
        PipelineStage target;
        try {
            target = PipelineStage.valueOf(stage);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown stage: " + stage);
        }
        List<PipelineCandidate> candidates = candidateRepository.findByIdIn(candidateIds);
        for (PipelineCandidate candidate : candidates) {
            candidate.setStage(target);
            candidate.setUpdatedAt(java.time.Instant.now());
        }
        auditService.record(
                actor, "BULK_STAGE_CHANGE", "PipelineCandidate", String.join(",", candidateIds.stream().map(UUID::toString).toList()),
                "Moved " + candidates.size() + " candidate(s) to " + target);
        return new BulkStageChangeResult(candidates.size(), candidates.stream().map(PipelineCandidate::getId).toList(), target.name());
    }

    @Transactional(readOnly = true)
    public String exportShortlistCsv(UUID projectId, String stage) {
        PipelineStage filterStage = stage != null ? parseStageOrThrow(stage) : PipelineStage.SHORTLISTED;
        List<PipelineCandidate> candidates = candidateRepository.findByProjectIdOrderByAddedAtAsc(projectId).stream()
                .filter(c -> c.getStage() == filterStage)
                .toList();

        StringBuilder csv = new StringBuilder("Name,Email,Stage,Source,Added\n");
        for (PipelineCandidate c : candidates) {
            csv.append(csvField(c.getCandidateName())).append(',')
                    .append(csvField(c.getCandidateEmail())).append(',')
                    .append(csvField(c.getStage().name())).append(',')
                    .append(csvField(c.getSource())).append(',')
                    .append(csvField(c.getAddedAt().toString()))
                    .append('\n');
        }
        return csv.toString();
    }

    private PipelineStage parseStageOrThrow(String stage) {
        try {
            return PipelineStage.valueOf(stage);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown stage: " + stage);
        }
    }

    private String csvField(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        return escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n") ? "\"" + escaped + "\"" : escaped;
    }

    private String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
