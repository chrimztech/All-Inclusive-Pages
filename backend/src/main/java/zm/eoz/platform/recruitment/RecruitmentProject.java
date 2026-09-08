package zm.eoz.platform.recruitment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.opportunity.Opportunity;
import zm.eoz.platform.organisation.Organisation;

@Entity
@Table(name = "recruitment_projects")
@Getter
@Setter
@NoArgsConstructor
public class RecruitmentProject {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(nullable = false)
    private String title;

    @ManyToOne
    @JoinColumn(name = "opportunity_id")
    private Opportunity opportunity;

    @ManyToOne
    @JoinColumn(name = "organisation_id")
    private Organisation organisation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecruitmentProjectStatus status = RecruitmentProjectStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Confidentiality confidentiality = Confidentiality.STANDARD;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public enum Confidentiality {
        STANDARD,
        CONFIDENTIAL
    }
}
