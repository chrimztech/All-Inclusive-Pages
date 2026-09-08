package zm.eoz.platform.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI eozOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Echo Opportunities Zambia API")
                        .description("REST API for the EOZ recruitment, opportunities and professional-services platform")
                        .version("v1"));
    }
}
