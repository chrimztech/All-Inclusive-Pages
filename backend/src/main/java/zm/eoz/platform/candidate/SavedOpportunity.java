package zm.eoz.platform.candidate;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "saved_opportunities")
@Getter
@Setter
@NoArgsConstructor
public class SavedOpportunity {

    @EmbeddedId
    private SavedOpportunityId id;

    @Column(name = "saved_at", nullable = false)
    private Instant savedAt = Instant.now();

    public SavedOpportunity(SavedOpportunityId id) {
        this.id = id;
    }
}
