package zm.eoz.platform.security;

import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** On start-up, encrypts any two-step secrets still stored as plaintext (saved before encryption existed). */
@Slf4j
@Component
public class LegacySecretEncryptor implements ApplicationRunner {

    private final JdbcTemplate jdbc;
    private final SecretCipher cipher;

    public LegacySecretEncryptor(JdbcTemplate jdbc, SecretCipher cipher) {
        this.jdbc = jdbc;
        this.cipher = cipher;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "select id, mfa_secret from users where mfa_secret is not null and mfa_secret not like 'v1:%' for update");
        for (Map<String, Object> row : rows) {
            jdbc.update("update users set mfa_secret = ? where id = ?",
                    cipher.encrypt((String) row.get("mfa_secret")), row.get("id"));
        }
        if (!rows.isEmpty()) log.info("Encrypted {} legacy two-step secret(s)", rows.size());
    }
}
