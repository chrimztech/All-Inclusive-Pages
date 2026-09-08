package zm.eoz.platform.storage;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

@Entity
@Table(name = "file_assets")
@Getter
@Setter
@NoArgsConstructor
public class FileAsset {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "owner_type", nullable = false)
    private String ownerType;

    @Column(name = "owner_id", nullable = false)
    private String ownerId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "storage_key", nullable = false, unique = true)
    private String storageKey;

    @ManyToOne
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt = Instant.now();
}
