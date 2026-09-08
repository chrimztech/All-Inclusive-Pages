package zm.eoz.platform.candidate;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.UUID;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode
public class SavedOpportunityId implements Serializable {

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "opportunity_id")
    private UUID opportunityId;

    public SavedOpportunityId(UUID userId, UUID opportunityId) {
        this.userId = userId;
        this.opportunityId = opportunityId;
    }
}
