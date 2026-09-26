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
        http.csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
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
                                "/api/v1/testimonials",
                                "/actuator/health",
                                "/api/v1/openapi/**",
                                "/api/v1/docs/**")
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
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
