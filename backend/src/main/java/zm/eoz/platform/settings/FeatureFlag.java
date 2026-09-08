package zm.eoz.platform.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "feature_flags")
@Getter
@Setter
@NoArgsConstructor
public class FeatureFlag {

    @Id
    private String key;

    @Column(nullable = false)
    private boolean enabled;

    private String description;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
