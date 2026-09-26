package zm.eoz.platform.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.auth.dto.ChangePasswordRequest;
import zm.eoz.platform.auth.dto.ForgotPasswordRequest;
import zm.eoz.platform.auth.dto.LoginRequest;
import zm.eoz.platform.auth.dto.NotificationPreferencesRequest;
import zm.eoz.platform.auth.dto.RegisterRequest;
import zm.eoz.platform.auth.dto.ResetPasswordRequest;
import zm.eoz.platform.auth.dto.UserResponse;
import zm.eoz.platform.auth.dto.VerifyEmailRequest;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.CookieUtil;
import zm.eoz.platform.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    private final ConsentService consentService;

    public AuthController(AuthService authService, UserRepository userRepository, ConsentService consentService) {
        this.consentService = consentService;
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/register")
    public ApiResponse<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.of(authService.register(request));
    }

    @PostMapping("/login")
    public ApiResponse<Object> login(
            @Valid @RequestBody LoginRequest request, HttpServletRequest http, HttpServletResponse response) {
        AuthService.LoginOutcome outcome = authService.login(request, response, http);
        if (outcome.challengeId() != null) {
            return ApiResponse.of(java.util.Map.of("mfaRequired", true, "challengeId", outcome.challengeId()));
        }
        return ApiResponse.of(outcome.user());
    }

    public record MfaVerifyRequest(java.util.UUID challengeId, String code) {}

    public record MfaCodeRequest(String code) {}

    public record MfaDisableRequest(String password, String code) {}

    @PostMapping("/mfa/verify")
    public ApiResponse<UserResponse> verifyMfa(
            @RequestBody MfaVerifyRequest request, HttpServletRequest http, HttpServletResponse response) {
        if (request.challengeId() == null) {
            throw new BadRequestException("Sign-in expired. Start again.");
        }
        return ApiResponse.of(authService.verifyMfa(request.challengeId(), request.code(), response, http));
    }

    @PostMapping("/mfa/setup")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ApiResponse<AuthService.MfaSetup> startMfaSetup() {
        return ApiResponse.of(authService.startMfaSetup(currentUser()));
    }

    @PostMapping("/mfa/enable")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ApiResponse<java.util.List<String>> enableMfa(@RequestBody MfaCodeRequest request) {
        return ApiResponse.of(authService.enableMfa(currentUser(), request.code()));
    }

    @PostMapping("/mfa/disable")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> disableMfa(@RequestBody MfaDisableRequest request) {
        authService.disableMfa(currentUser(), request.password(), request.code());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refresh")
    public ApiResponse<UserResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = readCookie(request, CookieUtil.REFRESH_COOKIE)
                .orElseThrow(() -> new BadRequestException("No refresh token present."));
        return ApiResponse.of(authService.refresh(refreshToken, response, request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        readCookie(request, CookieUtil.REFRESH_COOKIE).ifPresentOrElse(
                token -> authService.logout(token, response), () -> authService.logout(null, response));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request.token());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.email());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ApiResponse<UserResponse> me() {
        return ApiResponse.of(toResponse(currentUser()));
    }

    @PostMapping("/change-password")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(currentUser(), request.currentPassword(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    @org.springframework.web.bind.annotation.PatchMapping("/profile")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ApiResponse<UserResponse> updateProfile(
            @Valid @RequestBody zm.eoz.platform.auth.dto.UpdateProfileRequest request) {
        return ApiResponse.of(authService.updateProfile(currentUser(), request.fullName(), request.phone()));
    }

    @org.springframework.web.bind.annotation.PatchMapping("/notification-preferences")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ApiResponse<UserResponse> updateNotificationPreferences(
            @Valid @RequestBody NotificationPreferencesRequest request) {
        return ApiResponse.of(authService.updateNotificationPreferences(
                currentUser(), request.opportunityAlertsEnabled(), request.serviceCommsEnabled()));
    }

    @org.springframework.web.bind.annotation.GetMapping("/sessions")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ApiResponse<java.util.List<AuthService.SessionView>> sessions(HttpServletRequest http) {
        return ApiResponse.of(authService.sessions(currentUser(), currentSession(http)));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/sessions/{sessionId}")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> revokeSession(@org.springframework.web.bind.annotation.PathVariable java.util.UUID sessionId) {
        authService.revokeSession(currentUser(), sessionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sessions/revoke-others")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ApiResponse<Integer> revokeOtherSessions(HttpServletRequest http) {
        return ApiResponse.of(authService.revokeOtherSessions(currentUser(), currentSession(http)));
    }

    /** The signed-in user's consent history, newest first. */
    @org.springframework.web.bind.annotation.GetMapping("/consents")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ApiResponse<java.util.List<ConsentService.ConsentEvent>> consents() {
        return ApiResponse.of(consentService.history(currentUser().getId()));
    }

    private static java.util.UUID currentSession(HttpServletRequest http) {
        Object sid = http.getAttribute(zm.eoz.platform.security.JwtAuthFilter.SESSION_ATTRIBUTE);
        return sid instanceof java.util.UUID id ? id : null;
    }

    private User currentUser() {
        var principal = (UserPrincipal)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository
                .findById(principal.getId())
                .orElseThrow(() -> new BadRequestException("User no longer exists."));
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.isEmailVerified(),
                user.getRoles().stream().map(zm.eoz.platform.identity.Role::getName).toList(),
                user.isOpportunityAlertsEnabled(),
                user.isServiceCommsEnabled(),
                user.isMustChangePassword(),
                user.isMfaEnabled());
    }

    private java.util.Optional<String> readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return java.util.Optional.empty();
        }
        for (Cookie c : cookies) {
            if (c.getName().equals(name)) {
                return java.util.Optional.ofNullable(c.getValue());
            }
        }
        return java.util.Optional.empty();
    }
}
