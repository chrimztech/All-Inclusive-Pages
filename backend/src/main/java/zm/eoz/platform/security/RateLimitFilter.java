package zm.eoz.platform.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Per-client sliding-window limits on endpoints that attract abuse: sign-in, sign-up, password reset, two-step
 * codes and public forms. Counts are held in memory per instance, so with several instances the effective limit is
 * multiplied; the per-account lockout in AuthService is what protects a single account regardless.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    /** A group of endpoints sharing one budget. */
    record Rule(String name, int perMinute) {}

    private static final long WINDOW_MS = 60_000;

    private final Rule authRule;
    private final Rule formsRule;
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private volatile long lastSweep = System.currentTimeMillis();

    public RateLimitFilter(int authPerMinute, int formsPerMinute) {
        this.authRule = new Rule("auth", authPerMinute);
        this.formsRule = new Rule("forms", formsPerMinute);
    }

    Rule ruleFor(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return null;
        }
        String path = request.getRequestURI();
        if (path.equals("/api/v1/auth/login") || path.equals("/api/v1/auth/register")
                || path.equals("/api/v1/auth/forgot-password") || path.equals("/api/v1/auth/reset-password")
                || path.equals("/api/v1/auth/mfa/verify")) {
            return authRule;
        }
        if (path.equals("/api/v1/contact") || path.equals("/api/v1/fraud-reports")) {
            return formsRule;
        }
        return null;
    }

    /** Records a hit for {@code key}; true if it is within the limit. */
    boolean allow(String key, int perMinute, long now) {
        Deque<Long> window = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && now - window.peekFirst() >= WINDOW_MS) {
                window.pollFirst();
            }
            if (window.size() >= perMinute) {
                return false;
            }
            window.addLast(now);
            return true;
        }
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain chain)
            throws ServletException, IOException {
        Rule rule = ruleFor(request);
        if (rule != null) {
            long now = System.currentTimeMillis();
            sweep(now);
            if (!allow(rule.name() + "|" + request.getRemoteAddr(), rule.perMinute(), now)) {
                response.setStatus(429);
                response.setHeader("Retry-After", "60");
                response.setContentType("application/problem+json");
                response.getWriter().write("{\"type\":\"https://eoz.zm/problems/rate-limited\",\"title\":\"Too Many Requests\","
                        + "\"status\":429,\"detail\":\"Too many attempts from your connection. Please wait a minute and try again.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    /** Drops idle clients so the map cannot grow without bound. */
    private void sweep(long now) {
        if (now - lastSweep < WINDOW_MS) {
            return;
        }
        lastSweep = now;
        hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                return e.getValue().isEmpty() || now - e.getValue().peekLast() >= WINDOW_MS;
            }
        });
    }
}
