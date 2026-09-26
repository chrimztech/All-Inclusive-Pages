package zm.eoz.platform.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI 3 document served at /api/v1/openapi (Swagger UI at /api/v1/docs; both switchable with
 * API_DOCS_ENABLED). Authentication is the HttpOnly {@code eoz_at} cookie set by /auth/login.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI eozOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Echo Opportunities Zambia API")
                        .version("v1")
                        .contact(new Contact().name("Echo Opportunities Zambia").email("echoopportunitieszambia@gmail.com"))
                        .description("""
                                REST API for the EOZ recruitment, opportunities and professional-services platform.

                                **Authentication.** Sign in with `POST /api/v1/auth/login`; the response sets an HttpOnly
                                `eoz_at` cookie (15 minutes) and a refresh cookie (14 days, rotated by `POST /api/v1/auth/refresh`).
                                If two-step verification is on, login returns `{ mfaRequired, challengeId }` instead and
                                `POST /api/v1/auth/mfa/verify` completes it.

                                **Permissions.** Staff endpoints check permissions (for example `OPPORTUNITY_MODERATE`,
                                `FINANCE_MANAGE`, `USER_MANAGE`), not just roles; a missing permission returns 403.

                                **Responses.** Success bodies are wrapped as `{ "data": ... }`. Errors are RFC 7807 problem
                                details with a stable `type`, e.g. `https://eoz.zm/problems/validation-failed`.

                                **Rate limits.** Sign-in, sign-up, password reset, two-step verification and public forms are
                                limited per client; excess requests get 429 with `Retry-After`.
                                """))
                .components(new Components().addSecuritySchemes("session", new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .in(SecurityScheme.In.COOKIE)
                        .name("eoz_at")
                        .description("Session cookie issued by /api/v1/auth/login")))
                .addSecurityItem(new SecurityRequirement().addList("session"));
    }
}
