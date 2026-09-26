package zm.eoz.platform.auth;

import jakarta.servlet.http.HttpServletResponse;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.auth.dto.LoginRequest;
import zm.eoz.platform.auth.dto.RegisterRequest;
import zm.eoz.platform.auth.dto.UserResponse;
import zm.eoz.platform.candidate.CandidateProfile;
import zm.eoz.platform.candidate.CandidateProfileRepository;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.ConflictException;
import zm.eoz.platform.identity.RefreshToken;
import zm.eoz.platform.identity.RefreshTokenRepository;
import zm.eoz.platform.identity.Role;
import zm.eoz.platform.identity.RoleRepository;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.identity.VerificationToken;
import zm.eoz.platform.identity.VerificationTokenRepository;
import zm.eoz.platform.notification.NotificationService;
import zm.eoz.platform.organisation.OrganisationService;
import zm.eoz.platform.organisation.dto.OrganisationCreateRequest;
import zm.eoz.platform.security.CookieUtil;
import zm.eoz.platform.security.JwtService;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final VerificationTokenRepository verificationTokenRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final OrganisationService organisationService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final NotificationService notificationService;
    private final SecureRandom secureRandom = new SecureRandom();

    private final zm.eoz.platform.audit.AuditService auditService;
    private final ConsentService consentService;
    private final zm.eoz.platform.security.SecurityAlertService securityAlertService;
    private final zm.eoz.platform.security.TotpService totpService;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            RefreshTokenRepository refreshTokenRepository,
            VerificationTokenRepository verificationTokenRepository,
            CandidateProfileRepository candidateProfileRepository,
            OrganisationService organisationService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            NotificationService notificationService,
            zm.eoz.platform.audit.AuditService auditService,
            ConsentService consentService,
            zm.eoz.platform.security.SecurityAlertService securityAlertService,
            zm.eoz.platform.security.TotpService totpService,
            org.springframework.jdbc.core.JdbcTemplate jdbc) {
        this.securityAlertService = securityAlertService;
        this.totpService = totpService;
        this.jdbc = jdbc;
        this.auditService = auditService;
        this.consentService = consentService;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.verificationTokenRepository = verificationTokenRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.organisationService = organisationService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.notificationService = notificationService;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException("An account with this email already exists.");
        }
        Role role = roleRepository
                .findByName(request.accountType())
                .orElseThrow(() -> new IllegalStateException("Role not seeded: " + request.accountType()));

        User user = new User();
        user.setFullName(request.fullName());
        user.setEmail(request.email().toLowerCase());
        user.setPhone(request.phone());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRoles(Set.of(role));
        user = userRepository.saveAndFlush(user); // consents are written with plain SQL and reference this row
        consentService.record(user.getId(), ConsentService.Type.TERMS, true, "REGISTRATION");
        consentService.record(user.getId(), ConsentService.Type.PRIVACY, true, "REGISTRATION");
        consentService.record(user.getId(), ConsentService.Type.OPPORTUNITY_ALERTS, user.isOpportunityAlertsEnabled(), "REGISTRATION");
        consentService.record(user.getId(), ConsentService.Type.SERVICE_COMMS, user.isServiceCommsEnabled(), "REGISTRATION");

        if ("CANDIDATE".equals(request.accountType())
                && (notBlank(request.location()) || notBlank(request.headline()) || notBlank(request.skills()))) {
            CandidateProfile profile = new CandidateProfile(user.getId());
            profile.setLocation(request.location());
            profile.setHeadline(request.headline());
            profile.setSkills(request.skills());
            if (notBlank(request.availability())) {
                try {
                    profile.setAvailability(zm.eoz.platform.candidate.Availability.valueOf(request.availability()));
                } catch (IllegalArgumentException ignored) {
                    // Leave unset rather than fail registration over an invalid enum value from an older client.
                }
            }
            candidateProfileRepository.save(profile);
        }

        if ("EMPLOYER".equals(request.accountType()) && notBlank(request.organisationName())) {
            organisationService.register(
                    new OrganisationCreateRequest(
                            request.organisationName(),
                            null,
                            request.organisationRegistrationNumber(),
                            request.organisationSector(),
                            null,
                            request.organisationWebsite(),
                            null,
                            request.organisationBusinessType(),
                            request.organisationSizeBand(),
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null),
                    user);
        }

        String token = issueVerificationToken(user, VerificationToken.Type.EMAIL_VERIFY, java.time.Duration.ofDays(2));
        notificationService.notify(
                user,
                "EMAIL_VERIFICATION",
                "Verify your EOZ account",
                "Welcome to Echo Opportunities Zambia. Verify your email using this code: " + token);

        return toResponse(user);
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    @Transactional
    public void verifyEmail(String token) {
        VerificationToken vt = verificationTokenRepository
                .findByTokenHashAndType(hash(token), VerificationToken.Type.EMAIL_VERIFY)
                .filter(t -> t.getUsedAt() == null && t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new BadRequestException("This verification link is invalid or has expired."));
        vt.setUsedAt(Instant.now());
        User user = vt.getUser();
        user.setEmailVerified(true);
    }

    @Transactional
    public void forgotPassword(String email) {
        // Always succeed regardless of whether the email is registered, to avoid account enumeration.
        userRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
            String token = issueVerificationToken(user, VerificationToken.Type.PASSWORD_RESET, java.time.Duration.ofHours(1));
            notificationService.notify(
                    user,
                    "PASSWORD_RESET",
                    "Reset your EOZ password",
                    "Use this code to reset your password (valid for 1 hour): " + token);
        });
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        VerificationToken vt = verificationTokenRepository
                .findByTokenHashAndType(hash(token), VerificationToken.Type.PASSWORD_RESET)
                .filter(t -> t.getUsedAt() == null && t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new BadRequestException("This reset link is invalid or has expired."));
        vt.setUsedAt(Instant.now());
        User user = vt.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        // Revoke all existing sessions so a compromised account can't stay logged in after reset.
        refreshTokenRepository.findByUser_IdAndRevokedFalse(user.getId()).forEach(rt -> rt.setRevoked(true));
    }

    private String issueVerificationToken(User user, VerificationToken.Type type, java.time.Duration ttl) {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        VerificationToken vt = new VerificationToken();
        vt.setUser(user);
        vt.setType(type);
        vt.setTokenHash(hash(token));
        vt.setExpiresAt(Instant.now().plus(ttl));
        verificationTokenRepository.save(vt);
        return token;
    }

    static final int MAX_FAILED_LOGINS = 5;
    static final java.time.Duration LOCKOUT = java.time.Duration.ofMinutes(15);
    static final int MAX_MFA_ATTEMPTS = 5;

    /** Either a signed-in user, or a pending second step identified by {@code challengeId}. */
    public record LoginOutcome(UserResponse user, UUID challengeId) {}

    /**
     * Password sign-in. Five wrong passwords in a row lock the account for 15 minutes and alert its owner and the
     * administrators. With two-step verification on, no session is issued yet: the caller gets a short-lived
     * challenge to complete with an authenticator or recovery code.
     */
    @Transactional(noRollbackFor = {BadCredentialsException.class, zm.eoz.platform.common.exception.TooManyRequestsException.class})
    public LoginOutcome login(
            LoginRequest request, HttpServletResponse response, jakarta.servlet.http.HttpServletRequest http) {
        User user = userRepository
                .findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
            long minutes = Math.max(1, java.time.Duration.between(Instant.now(), user.getLockedUntil()).toMinutes() + 1);
            throw new zm.eoz.platform.common.exception.TooManyRequestsException(
                    "This account is temporarily locked after too many failed sign-in attempts. Try again in about "
                            + minutes + " minute" + (minutes == 1 ? "" : "s") + ", or reset your password.");
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            registerFailedLogin(user, http);
            throw new BadCredentialsException("Invalid email or password.");
        }
        if (user.getStatus() != zm.eoz.platform.identity.UserStatus.ACTIVE) {
            throw new BadCredentialsException("This account is not active.");
        }
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        if (user.isMfaEnabled()) {
            UUID challengeId = UUID.randomUUID();
            jdbc.update("insert into mfa_challenges (id, user_id, expires_at) values (?, ?, now() + interval '5 minutes')",
                    challengeId, user.getId());
            return new LoginOutcome(null, challengeId);
        }
        issueTokens(user, response, UUID.randomUUID(), http);
        return new LoginOutcome(toResponse(user), null);
    }

    private void registerFailedLogin(User user, jakarta.servlet.http.HttpServletRequest http) {
        int failures = user.getFailedLoginCount() + 1;
        if (failures < MAX_FAILED_LOGINS) {
            user.setFailedLoginCount(failures);
            return;
        }
        user.setFailedLoginCount(0);
        user.setLockedUntil(Instant.now().plus(LOCKOUT));
        String from = http != null ? http.getRemoteAddr() : "unknown";
        auditService.record(null, "LOGIN_LOCKED", "User", user.getId().toString(),
                MAX_FAILED_LOGINS + " failed sign-ins; locked for " + LOCKOUT.toMinutes() + " minutes (from " + from + ")");
        notificationService.notify(user, "ACCOUNT_LOCKED", "Your EOZ account was temporarily locked",
                "We locked your account for " + LOCKOUT.toMinutes() + " minutes after " + MAX_FAILED_LOGINS
                        + " wrong passwords in a row. If this wasn't you, reset your password and review where you're signed in.");
        securityAlertService.alertAdministrators("Account locked after failed sign-ins",
                user.getEmail() + " was locked after " + MAX_FAILED_LOGINS + " consecutive failed sign-ins from " + from + ".");
    }

    /** Completes a two-step sign-in with an authenticator code or a one-time recovery code. */
    @Transactional(noRollbackFor = BadCredentialsException.class)
    public UserResponse verifyMfa(
            UUID challengeId, String code, HttpServletResponse response, jakarta.servlet.http.HttpServletRequest http) {
        java.util.Map<String, Object> challenge = jdbc.queryForList(
                        "select user_id, attempts, used, expires_at > now() as live from mfa_challenges where id = ?",
                        challengeId)
                .stream()
                .findFirst()
                .orElseThrow(() -> new BadCredentialsException("Sign-in expired. Start again."));
        if (Boolean.TRUE.equals(challenge.get("used")) || !Boolean.TRUE.equals(challenge.get("live"))
                || ((Number) challenge.get("attempts")).intValue() >= MAX_MFA_ATTEMPTS) {
            throw new zm.eoz.platform.common.exception.BadRequestException(
                    "This sign-in has expired or had too many wrong codes. Sign in again.");
        }
        User user = userRepository.findById((UUID) challenge.get("user_id")).orElseThrow();
        if (!acceptSecondFactor(user, code)) {
            jdbc.update("update mfa_challenges set attempts = attempts + 1 where id = ?", challengeId);
            throw new zm.eoz.platform.common.exception.BadRequestException("That code isn't right. Check your authenticator app and try again.");
        }
        jdbc.update("update mfa_challenges set used = true where id = ?", challengeId);
        issueTokens(user, response, UUID.randomUUID(), http);
        return toResponse(user);
    }

    public record MfaSetup(String secret, String otpauthUri) {}

    /** Starts enrolment: a fresh secret that only takes effect once a code from it is confirmed. */
    @Transactional
    public MfaSetup startMfaSetup(User actor) {
        User user = userRepository.findById(actor.getId()).orElseThrow();
        if (user.isMfaEnabled()) {
            throw new zm.eoz.platform.common.exception.ConflictException("Two-step verification is already on.");
        }
        String secret = totpService.newSecret();
        user.setMfaSecret(secret);
        user.setMfaLastStep(null);
        return new MfaSetup(secret, totpService.otpauthUri(secret, user.getEmail()));
    }

    /** Confirms enrolment with a code from the app. @return one-time recovery codes, shown once */
    @Transactional
    public java.util.List<String> enableMfa(User actor, String code) {
        User user = userRepository.findById(actor.getId()).orElseThrow();
        if (user.isMfaEnabled()) {
            throw new zm.eoz.platform.common.exception.ConflictException("Two-step verification is already on.");
        }
        long step = totpService.verify(user.getMfaSecret(), code, null);
        if (step < 0) {
            throw new zm.eoz.platform.common.exception.BadRequestException("That code isn't right. Check the time on your phone and try again.");
        }
        user.setMfaEnabled(true);
        user.setMfaLastStep(step);
        java.util.List<String> codes = new java.util.ArrayList<>();
        jdbc.update("delete from mfa_recovery_codes where user_id = ?", user.getId());
        for (int i = 0; i < 8; i++) {
            byte[] bytes = new byte[5];
            secureRandom.nextBytes(bytes);
            String raw = java.util.HexFormat.of().formatHex(bytes);
            String recovery = raw.substring(0, 5) + "-" + raw.substring(5);
            codes.add(recovery);
            jdbc.update("insert into mfa_recovery_codes (user_id, code_hash) values (?, ?)", user.getId(), hash(recovery));
        }
        auditService.record(user, "MFA_ENABLED", "User", user.getId().toString(), "Turned on two-step verification");
        notificationService.notify(user, "SECURITY_NOTICE", "Two-step verification is on",
                "Signing in to EOZ now needs a code from your authenticator app. Keep your recovery codes somewhere safe.");
        return codes;
    }

    /** Turns two-step off; needs the password and a current code (or a recovery code). */
    @Transactional
    public void disableMfa(User actor, String password, String code) {
        User user = userRepository.findById(actor.getId()).orElseThrow();
        if (!user.isMfaEnabled()) {
            throw new zm.eoz.platform.common.exception.BadRequestException("Two-step verification is not on.");
        }
        if (password == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new zm.eoz.platform.common.exception.BadRequestException("Your password is not correct.");
        }
        if (!acceptSecondFactor(user, code)) {
            throw new zm.eoz.platform.common.exception.BadRequestException("That code isn't right.");
        }
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        user.setMfaLastStep(null);
        jdbc.update("delete from mfa_recovery_codes where user_id = ?", user.getId());
        auditService.record(user, "MFA_DISABLED", "User", user.getId().toString(), "Turned off two-step verification");
        notificationService.notify(user, "SECURITY_NOTICE", "Two-step verification was turned off",
                "If this wasn't you, change your password now and sign out of other devices.");
    }

    private boolean acceptSecondFactor(User user, String code) {
        if (code == null || code.isBlank()) return false;
        long step = totpService.verify(user.getMfaSecret(), code, user.getMfaLastStep());
        if (step >= 0) {
            user.setMfaLastStep(step);
            return true;
        }
        String normalised = code.trim().toLowerCase(java.util.Locale.ROOT);
        return jdbc.update("update mfa_recovery_codes set used_at = now() where user_id = ? and code_hash = ? and used_at is null",
                user.getId(), hash(normalised)) == 1;
    }

    @Transactional
    public UserResponse refresh(
            String refreshTokenValue, HttpServletResponse response, jakarta.servlet.http.HttpServletRequest http) {
        String hash = hash(refreshTokenValue);
        RefreshToken stored = refreshTokenRepository
                .findByTokenHash(hash)
                .filter(t -> !t.isRevoked() && t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new BadCredentialsException("Refresh token is invalid or expired."));
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        User user = stored.getUser();
        issueTokens(user, response, stored.getSessionId(), http);
        return toResponse(user);
    }

    @Transactional
    public void logout(String refreshTokenValue, HttpServletResponse response) {
        if (refreshTokenValue != null) {
            refreshTokenRepository.findByTokenHash(hash(refreshTokenValue)).ifPresent(t -> {
                t.setRevoked(true);
                refreshTokenRepository.save(t);
            });
        }
        CookieUtil.clear(response, CookieUtil.ACCESS_COOKIE);
        CookieUtil.clear(response, CookieUtil.REFRESH_COOKIE);
    }

    private void issueTokens(
            User user, HttpServletResponse response, UUID sessionId, jakarta.servlet.http.HttpServletRequest http) {
        List<String> roleNames = user.getRoles().stream().map(Role::getName).toList();
        String accessToken = jwtService.issueAccessToken(user.getId(), user.getEmail(), roleNames, sessionId);

        byte[] randomBytes = new byte[48];
        secureRandom.nextBytes(randomBytes);
        String refreshTokenValue = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(hash(refreshTokenValue));
        refreshToken.setExpiresAt(Instant.now().plus(java.time.Duration.ofDays(14)));
        refreshToken.setSessionId(sessionId);
        if (http != null) {
            String agent = http.getHeader("User-Agent");
            refreshToken.setUserAgent(agent == null ? null : agent.substring(0, Math.min(agent.length(), 255)));
            refreshToken.setIpAddress(http.getRemoteAddr());
        }
        refreshTokenRepository.save(refreshToken);

        CookieUtil.set(response, CookieUtil.ACCESS_COOKIE, accessToken, 15 * 60);
        CookieUtil.set(response, CookieUtil.REFRESH_COOKIE, refreshTokenValue, 14 * 24 * 60 * 60);
    }

    /** Refresh tokens are high-entropy random values; a fast digest is sufficient to hash them for storage/lookup. */
    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.isEmailVerified(),
                user.getRoles().stream().map(Role::getName).toList(),
                user.isOpportunityAlertsEnabled(),
                user.isServiceCommsEnabled(),
                user.isMustChangePassword(),
                user.isMfaEnabled());
    }

    @Transactional
    public void changePassword(User user, String currentPassword, String newPassword) {
        User managed = userRepository.findById(user.getId()).orElseThrow();
        if (!passwordEncoder.matches(currentPassword, managed.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect.");
        }
        if (passwordEncoder.matches(newPassword, managed.getPasswordHash())) {
            throw new BadRequestException("Choose a new password that is different from your current one.");
        }
        managed.setPasswordHash(passwordEncoder.encode(newPassword));
        managed.setMustChangePassword(false);
        userRepository.save(managed);
        refreshTokenRepository.findByUser_IdAndRevokedFalse(managed.getId()).forEach(rt -> rt.setRevoked(true));
    }

    public record SessionView(
            UUID id, String device, String ipAddress, Instant signedInAt, Instant lastActiveAt, boolean current) {}

    /** The user's live sessions, newest activity first. */
    @Transactional(readOnly = true)
    public List<SessionView> sessions(User user, UUID currentSessionId) {
        return refreshTokenRepository
                .findByUser_IdAndRevokedFalseAndExpiresAtAfterOrderByCreatedAtDesc(user.getId(), Instant.now())
                .stream()
                .map(active -> {
                    Instant signedIn = refreshTokenRepository.findBySessionIdOrderByCreatedAtAsc(active.getSessionId())
                            .get(0)
                            .getCreatedAt();
                    return new SessionView(
                            active.getSessionId(),
                            describeDevice(active.getUserAgent()),
                            active.getIpAddress(),
                            signedIn,
                            active.getCreatedAt(),
                            active.getSessionId().equals(currentSessionId));
                })
                .toList();
    }

    /** Signs one of the user's own sessions out everywhere it is used. */
    @Transactional
    public void revokeSession(User user, UUID sessionId) {
        List<RefreshToken> rows = refreshTokenRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        if (rows.isEmpty() || !rows.get(0).getUser().getId().equals(user.getId())) {
            throw new zm.eoz.platform.common.exception.NotFoundException("Session not found.");
        }
        rows.forEach(t -> t.setRevoked(true));
        auditService.record(user, "SESSION_REVOKED", "User", user.getId().toString(), "Signed out one session");
    }

    /** Signs out every session except the one making the request. @return sessions signed out */
    @Transactional
    public int revokeOtherSessions(User user, UUID currentSessionId) {
        int count = 0;
        java.util.Set<UUID> sessionsSeen = new java.util.HashSet<>();
        for (RefreshToken t : refreshTokenRepository.findByUser_IdAndRevokedFalse(user.getId())) {
            if (!t.getSessionId().equals(currentSessionId)) {
                t.setRevoked(true);
                if (sessionsSeen.add(t.getSessionId())) count++;
            }
        }
        auditService.record(user, "SESSIONS_REVOKED", "User", user.getId().toString(), "Signed out " + count + " other session(s)");
        return count;
    }

    private static String describeDevice(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) return "Unknown device";
        String ua = userAgent.toLowerCase(java.util.Locale.ROOT);
        String browser = ua.contains("edg/") ? "Edge" : ua.contains("opr/") || ua.contains("opera") ? "Opera"
                : ua.contains("firefox") ? "Firefox" : ua.contains("chrome") ? "Chrome" : ua.contains("safari") ? "Safari"
                : "Browser";
        String os = ua.contains("android") ? "Android" : ua.contains("iphone") || ua.contains("ipad") ? "iOS"
                : ua.contains("windows") ? "Windows" : ua.contains("mac os") ? "macOS" : ua.contains("linux") ? "Linux"
                : "Unknown OS";
        return browser + " on " + os;
    }

    @Transactional
    public UserResponse updateProfile(User user, String fullName, String phone) {
        User managed = userRepository.findById(user.getId()).orElseThrow();
        managed.setFullName(fullName.trim());
        managed.setPhone(phone == null || phone.isBlank() ? null : phone.trim());
        userRepository.save(managed);
        return toResponse(managed);
    }

    @Transactional
    public UserResponse updateNotificationPreferences(User user, boolean opportunityAlerts, boolean serviceComms) {
        User managed = userRepository.findById(user.getId()).orElseThrow();
        if (managed.isOpportunityAlertsEnabled() != opportunityAlerts) {
            consentService.record(managed.getId(), ConsentService.Type.OPPORTUNITY_ALERTS, opportunityAlerts, "ACCOUNT_SETTINGS");
        }
        if (managed.isServiceCommsEnabled() != serviceComms) {
            consentService.record(managed.getId(), ConsentService.Type.SERVICE_COMMS, serviceComms, "ACCOUNT_SETTINGS");
        }
        managed.setOpportunityAlertsEnabled(opportunityAlerts);
        managed.setServiceCommsEnabled(serviceComms);
        userRepository.save(managed);
        return toResponse(managed);
    }
}
