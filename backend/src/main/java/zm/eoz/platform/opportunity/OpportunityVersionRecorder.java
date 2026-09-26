package zm.eoz.platform.opportunity;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PostUpdate;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import zm.eoz.platform.security.UserPrincipal;

/**
 * Keeps a version history of every listing. Runs as a JPA entity listener, so every path that changes a
 * listing — edits, moderation, scheduling, expiry jobs, extensions — is captured without each having to
 * remember to. A version is written only when the content or status actually changed; counters such as
 * views do not count, so page views never create versions.
 */
@Component
public class OpportunityVersionRecorder implements ApplicationContextAware {

    public record Version(int versionNo, String status, Map<String, Object> snapshot, String changedByName, Instant createdAt) {}

    private static ApplicationContext context;

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public OpportunityVersionRecorder(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) {
        context = applicationContext;
    }

    /** JPA listener entry point; JPA instantiates listeners itself, so it reaches the Spring bean statically. */
    public static class Listener {
        @PostPersist
        @PostUpdate
        void afterChange(Opportunity opportunity) {
            if (context != null) {
                context.getBean(OpportunityVersionRecorder.class).record(opportunity);
            }
        }
    }

    void record(Opportunity o) {
        Map<String, Object> snapshot = snapshot(o);
        String json;
        try {
            json = objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialise listing snapshot", e);
        }
        String hash = sha256(json);
        List<String> last = jdbc.queryForList(
                "select content_hash from opportunity_versions where opportunity_id = ? order by version_no desc limit 1",
                String.class, o.getId());
        if (!last.isEmpty() && last.get(0).equals(hash)) {
            return;
        }
        jdbc.update(
                "insert into opportunity_versions (opportunity_id, version_no, status, snapshot, content_hash, changed_by_name)"
                        + " values (?, (select coalesce(max(version_no), 0) + 1 from opportunity_versions where opportunity_id = ?),"
                        + " ?, cast(? as jsonb), ?, ?) on conflict (opportunity_id, version_no) do nothing",
                o.getId(), o.getId(), o.getStatus().name(), json, hash, actorName());
    }

    public List<Version> history(UUID opportunityId) {
        return jdbc.query(
                "select version_no, status, snapshot::text as snapshot, changed_by_name, created_at from opportunity_versions"
                        + " where opportunity_id = ? order by version_no desc",
                (rs, i) -> new Version(
                        rs.getInt("version_no"),
                        rs.getString("status"),
                        parse(rs.getString("snapshot")),
                        rs.getString("changed_by_name"),
                        toInstant(rs.getTimestamp("created_at"))),
                opportunityId);
    }

    /** The fields that make up a listing's meaning; counters and bookkeeping are deliberately left out. */
    static Map<String, Object> snapshot(Opportunity o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("title", o.getTitle());
        m.put("category", o.getCategory() != null ? o.getCategory().getName() : null);
        m.put("organisationName", o.getOrganisationName());
        m.put("description", o.getDescription());
        m.put("responsibilities", o.getResponsibilities());
        m.put("requirements", o.getRequirements());
        m.put("benefits", o.getBenefits());
        m.put("location", o.getLocation());
        m.put("region", o.getRegion());
        m.put("workMode", o.getWorkMode());
        m.put("employmentType", o.getEmploymentType() != null ? o.getEmploymentType().name() : null);
        m.put("workArrangement", o.getWorkArrangement() != null ? o.getWorkArrangement().name() : null);
        m.put("experienceLevel", o.getExperienceLevel() != null ? o.getExperienceLevel().name() : null);
        m.put("salaryMin", o.getSalaryMin() != null ? o.getSalaryMin().toPlainString() : null);
        m.put("salaryMax", o.getSalaryMax() != null ? o.getSalaryMax().toPlainString() : null);
        m.put("deadline", o.getDeadline() != null ? o.getDeadline().toString() : null);
        m.put("applicationMode", o.getApplicationMode() != null ? o.getApplicationMode().name() : null);
        m.put("applicationUrl", o.getApplicationUrl());
        m.put("applicationEmail", o.getApplicationEmail());
        m.put("applicationAddress", o.getApplicationAddress());
        m.put("source", o.getSource());
        m.put("status", o.getStatus() != null ? o.getStatus().name() : null);
        m.put("verified", o.isVerified());
        m.put("featured", o.isFeatured());
        return m;
    }

    private String actorName() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            List<String> names = jdbc.queryForList("select full_name from users where id = ?", String.class, principal.getId());
            if (!names.isEmpty()) return names.get(0);
        }
        return "System";
    }

    private Map<String, Object> parse(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Instant toInstant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
