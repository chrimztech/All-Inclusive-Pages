package zm.eoz.platform.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;

public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain chain)
            throws ServletException, IOException {

        extractCookie(request, CookieUtil.ACCESS_COOKIE)
                .flatMap(jwtService::parse)
                .ifPresent(claims -> authenticate(claims, request.getRequestURI()));

        chain.doFilter(request, response);
    }

    private void authenticate(Claims claims, String path) {
        UUID userId = UUID.fromString(claims.getSubject());
        Optional<User> user = userRepository.findById(userId);
        if (user.isEmpty() || user.get().getStatus() != zm.eoz.platform.identity.UserStatus.ACTIVE) {
            return;
        }
        // A user still on their one-time password may only use the auth endpoints (to change it or sign out);
        // everywhere else they are treated as anonymous until the password has been replaced.
        if (user.get().isMustChangePassword() && !path.startsWith("/api/v1/auth/")) {
            return;
        }
        UserPrincipal principal = new UserPrincipal(user.get());
        var auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private Optional<String> extractCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        for (Cookie cookie : cookies) {
            if (cookie.getName().equals(name)) {
                return Optional.ofNullable(cookie.getValue());
            }
        }
        return Optional.empty();
    }
}
