package zm.eoz.platform.recruitment;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecruitmentProjectRepository extends JpaRepository<RecruitmentProject, UUID> {
    Page<RecruitmentProject> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
