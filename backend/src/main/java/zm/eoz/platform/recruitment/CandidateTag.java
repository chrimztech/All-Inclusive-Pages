package zm.eoz.platform.recruitment;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "candidate_tags")
@Getter
@Setter
@NoArgsConstructor
public class CandidateTag {

    @EmbeddedId
    private CandidateTagId id;

    public CandidateTag(CandidateTagId id) {
        this.id = id;
    }

    @jakarta.persistence.Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @lombok.EqualsAndHashCode
    public static class CandidateTagId implements java.io.Serializable {
        @Column(name = "candidate_id")
        private java.util.UUID candidateId;

        @Column(name = "tag")
        private String tag;

        public CandidateTagId(java.util.UUID candidateId, String tag) {
            this.candidateId = candidateId;
            this.tag = tag;
        }
    }
}
