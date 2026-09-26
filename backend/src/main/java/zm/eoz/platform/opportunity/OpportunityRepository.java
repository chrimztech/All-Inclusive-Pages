package zm.eoz.platform.opportunity;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OpportunityRepository
        extends JpaRepository<Opportunity, UUID>, JpaSpecificationExecutor<Opportunity> {

    Optional<Opportunity> findBySlugAndStatus(String slug, OpportunityStatus status);

    Optional<Opportunity> findByReferenceIgnoreCase(String reference);

    Optional<Opportunity> findBySlugIgnoreCase(String slug);

    boolean existsBySlug(String slug);

    Page<Opportunity> findByStatusInOrderByCreatedAtAsc(List<OpportunityStatus> statuses, Pageable pageable);

    Page<Opportunity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Opportunity> findByStatusOrderByCreatedAtDesc(OpportunityStatus status, Pageable pageable);

    long countByStatus(OpportunityStatus status);

    long countByCategoryId(UUID categoryId);

    long countByOrganisationIdAndStatus(UUID organisationId, OpportunityStatus status);

    Page<Opportunity> findByCreatedByIdOrderByCreatedAtDesc(UUID createdById, Pageable pageable);

    List<Opportunity> findByCreatedById(UUID createdById);

    long countByCreatedByIdAndStatus(UUID createdById, OpportunityStatus status);

    long countByCreatedByIdAndStatusIn(UUID createdById, List<OpportunityStatus> statuses);

    List<Opportunity> findByStatusAndScheduledAtBefore(OpportunityStatus status, Instant before);

    List<Opportunity> findBySourceAndStatusNot(String source, OpportunityStatus excludedStatus);

    List<Opportunity> findByTitleIgnoreCaseAndOrganisationNameIgnoreCaseAndStatusNot(
            String title, String organisationName, OpportunityStatus excludedStatus);

    @Query("SELECT o.category.name, COUNT(o) FROM Opportunity o WHERE o.status = 'PUBLISHED' GROUP BY o.category.name")
    List<Object[]> categoryMixRaw();

    @Query("SELECT o.region, COUNT(o) FROM Opportunity o WHERE o.status = 'PUBLISHED' AND o.region IS NOT NULL GROUP BY o.region")
    List<Object[]> regionMixRaw();

    @Modifying
    @Query(
            """
            UPDATE Opportunity o SET o.status = zm.eoz.platform.opportunity.OpportunityStatus.CLOSED
            WHERE o.status = zm.eoz.platform.opportunity.OpportunityStatus.PUBLISHED
              AND o.deadline IS NOT NULL AND o.deadline < :now
            """)
    int closeExpired(@Param("now") Instant now);

    @Query(
            value =
                    """
                    SELECT AVG(EXTRACT(EPOCH FROM (published_at - created_at)) / 3600.0)
                    FROM opportunities WHERE published_at IS NOT NULL AND published_at >= created_at
                    """,
            nativeQuery = true)
    Double averageReviewHours();
}
