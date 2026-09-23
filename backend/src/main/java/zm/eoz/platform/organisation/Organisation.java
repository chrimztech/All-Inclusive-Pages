package zm.eoz.platform.organisation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import zm.eoz.platform.identity.User;

@Entity
@Table(name = "organisations")
@Getter
@Setter
@NoArgsConstructor
public class Organisation {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "legal_name", nullable = false)
    private String legalName;

    @Column(name = "trading_name")
    private String tradingName;

    @Column(name = "registration_number")
    private String registrationNumber;

    private String sector;
    private String size;
    private String website;
    private String address;
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false)
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;

    @Column(name = "logo_file_id")
    private UUID logoFileId;

    @Enumerated(EnumType.STRING)
    @Column(name = "business_type")
    private BusinessType businessType;

    @Enumerated(EnumType.STRING)
    @Column(name = "size_band")
    private OrganisationSizeBand sizeBand;

    private String tpin;

    @Column(name = "founded_year")
    private Integer foundedYear;

    @Column(name = "contact_person_name")
    private String contactPersonName;

    @Column(name = "contact_person_role")
    private String contactPersonRole;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name = "linkedin_url")
    private String linkedinUrl;

    @Column(name = "facebook_url")
    private String facebookUrl;

    @ManyToOne
    @jakarta.persistence.JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private Long version;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
