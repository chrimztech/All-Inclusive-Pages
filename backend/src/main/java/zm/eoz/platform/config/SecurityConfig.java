package zm.eoz.platform.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.JwtAuthFilter;
import zm.eoz.platform.security.JwtService;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${eoz.cors.allowed-origins}")
    private String allowedOrigins;

    @org.springframework.beans.factory.annotation.Value("${eoz.rate-limit.auth-per-minute:20}")
    private int authPerMinute;

    @org.springframework.beans.factory.annotation.Value("${eoz.rate-limit.forms-per-minute:10}")
    private int formsPerMinute;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http,
            JwtService jwtService,
            UserRepository userRepository,
            zm.eoz.platform.identity.RefreshTokenRepository refreshTokenRepository)
            throws Exception {
        // CSRF: session cookies are SameSite=Lax (never sent on cross-site POST/PATCH/DELETE) and CORS is an
        // allow-list, so a token-based CSRF filter would add nothing for this JSON API.
        http.csrf(csrf -> csrf.disable())
                .headers(headers -> headers
                        .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31_536_000))
                        .referrerPolicy(r -> r.policy(
                                org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy
                                        .STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .addHeaderWriter(new org.springframework.security.web.header.writers.StaticHeadersWriter(
                                "Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"))
                        // JSON responses never need to load anything; the Swagger UI pages are exempt.
                        .addHeaderWriter(new org.springframework.security.web.header.writers.DelegatingRequestMatcherHeaderWriter(
                                request -> {
                                    String path = request.getRequestURI();
                                    return !path.startsWith("/api/v1/docs") && !path.startsWith("/api/v1/swagger-ui");
                                },
                                new org.springframework.security.web.header.writers.StaticHeadersWriter(
                                        "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"))))
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Signed-out requests to protected URLs get 401 (sign in), not 403 (not allowed), as RFC 7807 JSON.
                .exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, e) -> {
                    response.setStatus(401);
                    response.setContentType("application/problem+json");
                    response.getWriter().write("{\"type\":\"https://eoz.zm/problems/unauthenticated\",\"title\":\"Unauthorized\","
                            + "\"status\":401,\"detail\":\"Sign in to continue.\"}");
                }))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/v1/auth/**",
                                "/api/v1/opportunities/**",
                                "/api/v1/organisations/**",
                                "/api/v1/categories/**",
                                "/api/v1/services/**",
                                "/api/v1/payments/webhook/**",
                                "/api/v1/settings/public",
                                "/api/v1/stats/public",
                                "/api/v1/fraud-reports",
                                "/api/v1/contact",
                                "/api/v1/unsubscribe",
                                "/api/v1/unsubscribe/**",
                                "/api/v1/testimonials",
                                "/actuator/health",
                                "/actuator/health/liveness",
                                "/actuator/health/readiness",
                                "/api/v1/openapi/**",
                                "/api/v1/docs/**",
                                "/api/v1/swagger-ui/**")
                        .permitAll()
                        .anyRequest()
                        .authenticated())
                .addFilterBefore(
                        new JwtAuthFilter(jwtService, userRepository, refreshTokenRepository),
                        UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(
                        new zm.eoz.platform.security.RateLimitFilter(authPerMinute, formsPerMinute),
                        zm.eoz.platform.security.JwtAuthFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setExposedHeaders(List.of(zm.eoz.platform.common.CorrelationIdFilter.HEADER, "Retry-After"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
