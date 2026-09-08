package zm.eoz.platform.backup;

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

@Entity
@Table(name = "system_backups")
@Getter
@Setter
@NoArgsConstructor
public class SystemBackup {

    public enum Status {
        RUNNING,
        SUCCESS,
        FAILED
    }

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "error_message")
    private String errorMessage;

    @ManyToOne
    @JoinColumn(name = "triggered_by")
    private User triggeredBy;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;
}
