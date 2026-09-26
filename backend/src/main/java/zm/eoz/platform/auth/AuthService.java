package zm.eoz.platform.auth;

import jakarta.servlet.http.HttpServletResponse;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Set;
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

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            RefreshTokenRepository refreshTokenRepository,
            VerificationTokenRepository verificationTokenRepository,
            CandidateProfileRepository candidateProfileRepository,
            OrganisationService organisationService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            NotificationService notificationService) {
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
        user = userRepository.save(user);

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

    @Transactional
    public UserResponse login(LoginRequest request, HttpServletResponse response) {
        User user = userRepository
                .findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password.");
        }
        if (user.getStatus() != zm.eoz.platform.identity.UserStatus.ACTIVE) {
            throw new BadCredentialsException("This account is not active.");
        }
        issueTokens(user, response);
        return toResponse(user);
    }

    @Transactional
    public UserResponse refresh(String refreshTokenValue, HttpServletResponse response) {
        String hash = hash(refreshTokenValue);
        RefreshToken stored = refreshTokenRepository
                .findByTokenHash(hash)
                .filter(t -> !t.isRevoked() && t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new BadCredentialsException("Refresh token is invalid or expired."));
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        User user = stored.getUser();
        issueTokens(user, response);
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

    private void issueTokens(User user, HttpServletResponse response) {
        List<String> roleNames = user.getRoles().stream().map(Role::getName).toList();
        String accessToken = jwtService.issueAccessToken(user.getId(), user.getEmail(), roleNames);

        byte[] randomBytes = new byte[48];
        secureRandom.nextBytes(randomBytes);
        String refreshTokenValue = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(hash(refreshTokenValue));
        refreshToken.setExpiresAt(Instant.now().plus(java.time.Duration.ofDays(14)));
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
                user.isMustChangePassword());
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
        managed.setOpportunityAlertsEnabled(opportunityAlerts);
        managed.setServiceCommsEnabled(serviceComms);
        userRepository.save(managed);
        return toResponse(managed);
    }
}
