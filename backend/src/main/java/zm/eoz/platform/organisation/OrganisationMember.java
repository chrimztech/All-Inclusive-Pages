package zm.eoz.platform.organisation;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.MapsId;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import zm.eoz.platform.identity.User;

@Entity
@Table(name = "organisation_members")
@Getter
@Setter
@NoArgsConstructor
public class OrganisationMember {

    public enum RoleInOrg {
        OWNER,
        MEMBER
    }

    public enum Status {
        ACTIVE,
        INVITED
    }

    @EmbeddedId
    private Id id;

    @ManyToOne
    @MapsId("organisationId")
    @jakarta.persistence.JoinColumn(name = "organisation_id")
    private Organisation organisation;

    @ManyToOne
    @MapsId("userId")
    @jakarta.persistence.JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_in_org", nullable = false)
    private RoleInOrg roleInOrg = RoleInOrg.MEMBER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.ACTIVE;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public OrganisationMember(Organisation organisation, User user) {
        this.organisation = organisation;
        this.user = user;
        this.id = new Id(organisation.getId(), user.getId());
    }

    @jakarta.persistence.Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @EqualsAndHashCode
    public static class Id implements Serializable {
        @Column(name = "organisation_id")
        private UUID organisationId;

        @Column(name = "user_id")
        private UUID userId;

        public Id(UUID organisationId, UUID userId) {
            this.organisationId = organisationId;
            this.userId = userId;
        }
    }
}
