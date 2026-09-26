package zm.eoz.platform.candidate;

import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.ConflictException;
import zm.eoz.platform.common.exception.NotFoundException;

/** A candidate's languages and certifications. Every query is scoped to the signed-in candidate. */
@Service
public class CandidateCredentialsService {

    public static final Set<String> PROFICIENCIES = Set.of("BASIC", "CONVERSATIONAL", "FLUENT", "NATIVE");

    public record Language(UUID id, String language, String proficiency) {}

    public record Certification(
            UUID id, String name, String issuer, LocalDate issuedOn, LocalDate expiresOn, String credentialUrl, boolean expired) {}

    private final JdbcTemplate jdbc;

    public CandidateCredentialsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Language> languages(UUID userId) {
        return jdbc.query(
                "select id, language, proficiency from candidate_languages where user_id = ? order by created_at",
                (rs, i) -> new Language(rs.getObject("id", UUID.class), rs.getString("language"), rs.getString("proficiency")),
                userId);
    }

    @Transactional
    public Language addLanguage(UUID userId, String language, String proficiency) {
        String name = required(language, "Language", 80);
        String level = proficiency == null ? "" : proficiency.trim().toUpperCase(java.util.Locale.ROOT);
        if (!PROFICIENCIES.contains(level)) {
            throw new BadRequestException("Proficiency must be one of " + PROFICIENCIES + ".");
        }
        Integer exists = jdbc.queryForObject(
                "select count(*) from candidate_languages where user_id = ? and lower(language) = lower(?)",
                Integer.class, userId, name);
        if (exists != null && exists > 0) {
            throw new ConflictException(name + " is already on your profile.");
        }
        UUID id = UUID.randomUUID();
        jdbc.update("insert into candidate_languages (id, user_id, language, proficiency) values (?, ?, ?, ?)",
                id, userId, name, level);
        return new Language(id, name, level);
    }

    @Transactional
    public void removeLanguage(UUID userId, UUID id) {
        if (jdbc.update("delete from candidate_languages where id = ? and user_id = ?", id, userId) == 0) {
            throw new NotFoundException("Language not found.");
        }
    }

    public List<Certification> certifications(UUID userId) {
        LocalDate today = LocalDate.now();
        return jdbc.query(
                "select * from candidate_certifications where user_id = ? order by issued_on desc nulls last, created_at desc",
                (rs, i) -> {
                    Date expires = rs.getDate("expires_on");
                    Date issued = rs.getDate("issued_on");
                    LocalDate expiresOn = expires == null ? null : expires.toLocalDate();
                    return new Certification(
                            rs.getObject("id", UUID.class),
                            rs.getString("name"),
                            rs.getString("issuer"),
                            issued == null ? null : issued.toLocalDate(),
                            expiresOn,
                            rs.getString("credential_url"),
                            expiresOn != null && expiresOn.isBefore(today));
                },
                userId);
    }

    @Transactional
    public UUID addCertification(
            UUID userId, String name, String issuer, LocalDate issuedOn, LocalDate expiresOn, String credentialUrl) {
        String title = required(name, "Certification name", 160);
        if (issuedOn != null && issuedOn.isAfter(LocalDate.now())) {
            throw new BadRequestException("The issue date cannot be in the future.");
        }
        if (issuedOn != null && expiresOn != null && expiresOn.isBefore(issuedOn)) {
            throw new BadRequestException("The expiry date must be after the issue date.");
        }
        String url = credentialUrl == null || credentialUrl.isBlank() ? null : credentialUrl.trim();
        if (url != null && !(url.startsWith("https://") || url.startsWith("http://"))) {
            throw new BadRequestException("The credential link must start with http:// or https://.");
        }
        if (url != null && url.length() > 500) {
            throw new BadRequestException("The credential link is too long.");
        }
        UUID id = UUID.randomUUID();
        jdbc.update(
                "insert into candidate_certifications (id, user_id, name, issuer, issued_on, expires_on, credential_url, created_at)"
                        + " values (?, ?, ?, ?, ?, ?, ?, ?)",
                id, userId, title, issuer == null || issuer.isBlank() ? null : issuer.trim(),
                issuedOn == null ? null : Date.valueOf(issuedOn), expiresOn == null ? null : Date.valueOf(expiresOn),
                url, java.sql.Timestamp.from(Instant.now()));
        return id;
    }

    @Transactional
    public void removeCertification(UUID userId, UUID id) {
        if (jdbc.update("delete from candidate_certifications where id = ? and user_id = ?", id, userId) == 0) {
            throw new NotFoundException("Certification not found.");
        }
    }

    private static String required(String value, String field, int max) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(field + " is required.");
        }
        String trimmed = value.trim();
        if (trimmed.length() > max) {
            throw new BadRequestException(field + " must be " + max + " characters or fewer.");
        }
        return trimmed;
    }
}
