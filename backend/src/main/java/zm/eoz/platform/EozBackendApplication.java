package zm.eoz.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EozBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(EozBackendApplication.class, args);
    }
}
