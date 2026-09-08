package zm.eoz.platform.opportunity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "opportunity_categories")
@Getter
@Setter
@NoArgsConstructor
public class OpportunityCategory {
    @Id
    private UUID id;

    private String code;

    private String name;

    private String description;
}
