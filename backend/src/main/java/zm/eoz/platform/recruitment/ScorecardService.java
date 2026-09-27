package zm.eoz.platform.recruitment;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.ConflictException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.recruitment.dto.FeedbackRequest;

/**
 * Per-project interview scorecards. When a project defines criteria, every piece of interview feedback must score
 * each one (1-5); the weighted average is reported alongside the interviewer's overall rating. Projects without
 * criteria keep the single overall rating.
 */
@Service
public class ScorecardService {

    public static final int MAX_CRITERIA = 12;
    public static final Set<String> RECOMMENDATIONS = Set.of("STRONG_NO", "NO", "YES", "STRONG_YES");

    public record Criterion(UUID id, String name, String guidance, int weight, int position) {}

    public record Score(UUID criterionId, String name, int weight, int score) {}

    private final JdbcTemplate jdbc;
    private final AuditService auditService;

    public ScorecardService(JdbcTemplate jdbc, AuditService auditService) {
        this.jdbc = jdbc;
        this.auditService = auditService;
    }

    public List<Criterion> list(UUID projectId) {
        return jdbc.query(
                "select id, name, guidance, weight, position from scorecard_criteria where project_id = ? order by position, created_at",
                (rs, i) -> new Criterion(
                        rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("guidance"),
                        rs.getInt("weight"), rs.getInt("position")),
                projectId);
    }

    @Transactional
    public Criterion add(RecruitmentProject project, String name, String guidance, Integer weight, User actor) {
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty()) throw new BadRequestException("Give the criterion a name.");
        int w = weight == null ? 1 : weight;
        if (w < 1 || w > 3) throw new BadRequestException("Weight must be 1, 2 or 3.");
        List<Criterion> existing = list(project.getId());
        if (existing.size() >= MAX_CRITERIA) {
            throw new BadRequestException("A scorecard can have at most " + MAX_CRITERIA + " criteria.");
        }
        if (existing.stream().anyMatch(c -> c.name().equalsIgnoreCase(trimmed))) {
            throw new ConflictException("This scorecard already has a criterion called \"" + trimmed + "\".");
        }
        int position = existing.stream().mapToInt(Criterion::position).max().orElse(-1) + 1;
        UUID id = jdbc.queryForObject(
                "insert into scorecard_criteria (project_id, name, guidance, weight, position) values (?, ?, ?, ?, ?) returning id",
                UUID.class, project.getId(), trimmed, blankToNull(guidance), w, position);
        auditService.record(actor, "SCORECARD_CRITERION_ADDED", "RecruitmentProject", project.getReference(), trimmed);
        return new Criterion(id, trimmed, blankToNull(guidance), w, position);
    }

    /** Removes an unused criterion. Criteria already scored stay, so earlier feedback remains complete. */
    @Transactional
    public void remove(RecruitmentProject project, UUID criterionId, User actor) {
        String name = jdbc.query(
                        "select name from scorecard_criteria where id = ? and project_id = ?",
                        (rs, i) -> rs.getString(1), criterionId, project.getId())
                .stream().findFirst()
                .orElseThrow(() -> new NotFoundException("Criterion not found: " + criterionId));
        Long used = jdbc.queryForObject(
                "select count(*) from interview_feedback_scores where criterion_id = ?", Long.class, criterionId);
        if (used != null && used > 0) {
            throw new ConflictException("\"" + name + "\" has already been scored in " + used
                    + " interview(s), so it can't be removed.");
        }
        jdbc.update("delete from scorecard_criteria where id = ?", criterionId);
        auditService.record(actor, "SCORECARD_CRITERION_REMOVED", "RecruitmentProject", project.getReference(), name);
    }

    /** Validates the request against the project's scorecard; call before saving the feedback. */
    public void validate(UUID projectId, FeedbackRequest request) {
        if (request.recommendation() != null && !RECOMMENDATIONS.contains(request.recommendation())) {
            throw new BadRequestException("Unknown recommendation: " + request.recommendation());
        }
        List<Criterion> criteria = list(projectId);
        List<FeedbackRequest.CriterionScore> scores = request.scores() == null ? List.of() : request.scores();
        if (criteria.isEmpty()) {
            if (!scores.isEmpty()) throw new BadRequestException("This project has no scorecard criteria to score.");
            return;
        }
        Map<UUID, Criterion> byId = new HashMap<>();
        criteria.forEach(c -> byId.put(c.id(), c));
        Set<UUID> seen = new HashSet<>();
        for (FeedbackRequest.CriterionScore s : scores) {
            if (s.criterionId() == null || !byId.containsKey(s.criterionId())) {
                throw new BadRequestException("A score refers to a criterion that is not on this project's scorecard.");
            }
            if (!seen.add(s.criterionId())) throw new BadRequestException("Each criterion can be scored only once.");
            if (s.score() < 1 || s.score() > 5) throw new BadRequestException("Scores must be between 1 and 5.");
        }
        List<String> missing = criteria.stream().filter(c -> !seen.contains(c.id())).map(Criterion::name).toList();
        if (!missing.isEmpty()) throw new BadRequestException("Score every criterion. Missing: " + String.join(", ", missing));
    }

    public void saveScores(UUID feedbackId, List<FeedbackRequest.CriterionScore> scores) {
        if (scores == null) return;
        for (FeedbackRequest.CriterionScore s : scores) {
            jdbc.update("insert into interview_feedback_scores (feedback_id, criterion_id, score) values (?, ?, ?)",
                    feedbackId, s.criterionId(), s.score());
        }
    }

    /** Scores for several pieces of feedback, keyed by feedback id, in scorecard order. */
    public Map<UUID, List<Score>> scoresFor(List<UUID> feedbackIds) {
        Map<UUID, List<Score>> out = new LinkedHashMap<>();
        if (feedbackIds.isEmpty()) return out;
        String in = String.join(",", java.util.Collections.nCopies(feedbackIds.size(), "?"));
        jdbc.query(
                "select s.feedback_id, c.id, c.name, c.weight, s.score from interview_feedback_scores s"
                        + " join scorecard_criteria c on c.id = s.criterion_id"
                        + " where s.feedback_id in (" + in + ") order by c.position, c.created_at",
                rs -> {
                    out.computeIfAbsent(rs.getObject(1, UUID.class), k -> new ArrayList<>())
                            .add(new Score(rs.getObject(2, UUID.class), rs.getString(3), rs.getInt(4), rs.getInt(5)));
                },
                feedbackIds.toArray());
        return out;
    }

    /** Weighted average of criterion scores, to one decimal place; null when nothing was scored. */
    public static Double weighted(List<Score> scores) {
        if (scores == null || scores.isEmpty()) return null;
        int total = 0;
        int weights = 0;
        for (Score s : scores) {
            total += s.score() * s.weight();
            weights += s.weight();
        }
        return Math.round(total * 10.0 / weights) / 10.0;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
