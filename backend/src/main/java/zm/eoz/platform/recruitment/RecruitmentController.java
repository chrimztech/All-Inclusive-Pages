package zm.eoz.platform.recruitment;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.PageResponse;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.recruitment.dto.AnswerResult;
import zm.eoz.platform.recruitment.dto.AnswerSubmission;
import zm.eoz.platform.recruitment.dto.BulkStageChangeRequest;
import zm.eoz.platform.recruitment.dto.BulkStageChangeResult;
import zm.eoz.platform.recruitment.dto.FeedbackRequest;
import zm.eoz.platform.recruitment.dto.FeedbackResponse;
import zm.eoz.platform.recruitment.dto.InterviewRequest;
import zm.eoz.platform.recruitment.dto.InterviewResponse;
import zm.eoz.platform.recruitment.dto.NoteRequest;
import zm.eoz.platform.recruitment.dto.NoteResponse;
import zm.eoz.platform.recruitment.dto.PipelineCandidateRequest;
import zm.eoz.platform.recruitment.dto.PipelineCandidateResponse;
import zm.eoz.platform.recruitment.dto.RecruitmentProjectRequest;
import zm.eoz.platform.recruitment.dto.RecruitmentProjectResponse;
import zm.eoz.platform.recruitment.dto.ScreeningQuestionRequest;
import zm.eoz.platform.recruitment.dto.ScreeningQuestionResponse;
import zm.eoz.platform.recruitment.dto.StageChangeRequest;
import zm.eoz.platform.recruitment.dto.TagRequest;
import zm.eoz.platform.recruitment.dto.TalentPoolCandidateResponse;
import zm.eoz.platform.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/recruitment")
@PreAuthorize("hasAuthority('APPLICATION_MANAGE')")
public class RecruitmentController {

    private final RecruitmentService recruitmentService;
    private final UserRepository userRepository;

    public RecruitmentController(RecruitmentService recruitmentService, UserRepository userRepository) {
        this.recruitmentService = recruitmentService;
        this.userRepository = userRepository;
    }

    @PostMapping("/projects")
    public ApiResponse<RecruitmentProjectResponse> createProject(@Valid @RequestBody RecruitmentProjectRequest request) {
        return ApiResponse.of(recruitmentService.createProject(request, currentUser()));
    }

    @GetMapping("/projects")
    public ApiResponse<PageResponse<RecruitmentProjectResponse>> listProjects(Pageable pageable) {
        return ApiResponse.of(PageResponse.from(recruitmentService.listProjects(pageable)));
    }

    @GetMapping("/projects/{id}")
    public ApiResponse<RecruitmentProjectResponse> getProject(@PathVariable UUID id) {
        return ApiResponse.of(recruitmentService.getProject(id));
    }

    @GetMapping("/projects/{id}/candidates")
    public ApiResponse<List<PipelineCandidateResponse>> listCandidates(@PathVariable UUID id) {
        return ApiResponse.of(recruitmentService.listCandidates(id));
    }

    @PostMapping("/projects/{id}/candidates")
    public ApiResponse<PipelineCandidateResponse> addCandidate(
            @PathVariable UUID id, @Valid @RequestBody PipelineCandidateRequest request) {
        return ApiResponse.of(recruitmentService.addCandidate(id, request, currentUser()));
    }

    @PostMapping("/candidates/{id}/stage")
    public ApiResponse<PipelineCandidateResponse> moveStage(@PathVariable UUID id, @Valid @RequestBody StageChangeRequest request) {
        return ApiResponse.of(recruitmentService.moveStage(id, request.stage(), currentUser()));
    }

    @PostMapping("/candidates/{id}/notes")
    public ApiResponse<NoteResponse> addNote(@PathVariable UUID id, @Valid @RequestBody NoteRequest request) {
        return ApiResponse.of(recruitmentService.addNote(id, request, currentUser()));
    }

    @GetMapping("/candidates/{id}/notes")
    public ApiResponse<List<NoteResponse>> listNotes(@PathVariable UUID id) {
        return ApiResponse.of(recruitmentService.listNotes(id));
    }

    @PostMapping("/candidates/{id}/interviews")
    public ApiResponse<InterviewResponse> scheduleInterview(@PathVariable UUID id, @Valid @RequestBody InterviewRequest request) {
        return ApiResponse.of(recruitmentService.scheduleInterview(id, request, currentUser()));
    }

    @GetMapping("/candidates/{id}/interviews")
    public ApiResponse<List<InterviewResponse>> listInterviews(@PathVariable UUID id) {
        return ApiResponse.of(recruitmentService.listInterviews(id));
    }

    @PostMapping("/interviews/{id}/feedback")
    public ApiResponse<FeedbackResponse> addFeedback(@PathVariable UUID id, @Valid @RequestBody FeedbackRequest request) {
        return ApiResponse.of(recruitmentService.addFeedback(id, request, currentUser()));
    }

    @GetMapping("/interviews/{id}/feedback")
    public ApiResponse<List<FeedbackResponse>> listFeedback(@PathVariable UUID id) {
        return ApiResponse.of(recruitmentService.listFeedback(id));
    }

    @PostMapping("/candidates/{id}/tags")
    public ApiResponse<Void> addTag(@PathVariable UUID id, @Valid @RequestBody TagRequest request) {
        recruitmentService.addTag(id, request.tag());
        return ApiResponse.of(null);
    }

    @GetMapping("/talent-pool")
    public ApiResponse<List<TalentPoolCandidateResponse>> talentPool(
            @RequestParam(required = false) String tag, @RequestParam(required = false) String q) {
        return ApiResponse.of(recruitmentService.searchTalentPool(tag, q));
    }

    @PostMapping("/projects/{id}/questions")
    public ApiResponse<ScreeningQuestionResponse> addQuestion(@PathVariable UUID id, @Valid @RequestBody ScreeningQuestionRequest request) {
        return ApiResponse.of(recruitmentService.addQuestion(id, request, currentUser()));
    }

    @GetMapping("/projects/{id}/questions")
    public ApiResponse<List<ScreeningQuestionResponse>> listQuestions(@PathVariable UUID id) {
        return ApiResponse.of(recruitmentService.listQuestions(id));
    }

    @PostMapping("/candidates/{id}/answers")
    public ApiResponse<AnswerResult> submitAnswers(@PathVariable UUID id, @Valid @RequestBody AnswerSubmission submission) {
        return ApiResponse.of(recruitmentService.submitAnswers(id, submission, currentUser()));
    }

    @PostMapping("/projects/{id}/candidates/bulk-stage")
    public ApiResponse<BulkStageChangeResult> bulkStageChange(@PathVariable UUID id, @Valid @RequestBody BulkStageChangeRequest request) {
        return ApiResponse.of(recruitmentService.bulkChangeStage(request.candidateIds(), request.stage(), currentUser()));
    }

    @GetMapping("/projects/{id}/shortlist/export")
    public ResponseEntity<String> exportShortlist(@PathVariable UUID id, @RequestParam(required = false) String stage) {
        String csv = recruitmentService.exportShortlistCsv(id, stage);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header("Content-Disposition", "attachment; filename=\"shortlist.csv\"")
                .body(csv);
    }

    private User currentUser() {
        var principal =
                (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
