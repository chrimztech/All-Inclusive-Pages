package zm.eoz.platform.organisation;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrganisationRepository extends JpaRepository<Organisation, UUID> {
    long countByVerificationStatus(VerificationStatus verificationStatus);

    String DIRECTORY_FILTER = " where (:verifiedOnly = false or o.verification_status = 'VERIFIED')"
            + " and (lower(o.legal_name) like :q or lower(coalesce(o.trading_name, '')) like :q"
            + " or lower(coalesce(o.sector, '')) like :q or lower(coalesce(o.address, '')) like :q)";

    /**
     * Public directory. {@code order} is {@code top} (most live listings first — the "top recruiters"),
     * {@code newest} or {@code name}; ties and every other value fall back to name. {@code q} is a
     * lower-cased LIKE pattern.
     */
    @Query(
            value = "select o.* from organisations o" + DIRECTORY_FILTER
                    + " order by"
                    + " case when :order = 'top' then (select count(*) from opportunities p"
                    + "   where p.organisation_id = o.id and p.status = 'PUBLISHED') end desc nulls last,"
                    + " case when :order = 'newest' then o.created_at end desc nulls last,"
                    + " lower(coalesce(o.trading_name, o.legal_name)) asc",
            countQuery = "select count(*) from organisations o" + DIRECTORY_FILTER,
            nativeQuery = true)
    Page<Organisation> directory(
            @Param("order") String order,
            @Param("verifiedOnly") boolean verifiedOnly,
            @Param("q") String q,
            Pageable pageable);

    /** Organisations whose legal or trading name is exactly this (ignoring case and surrounding spaces). */
    @Query("select o from Organisation o where lower(trim(o.legalName)) = lower(:name)"
            + " or lower(trim(coalesce(o.tradingName, ''))) = lower(:name) order by o.createdAt")
    java.util.List<Organisation> findByName(@org.springframework.data.repository.query.Param("name") String name);

    /** Organisations staff can post listings for: matching name, not suspended or rejected, verified first. */
    @Query("select o from Organisation o where (lower(o.legalName) like lower(concat('%', :q, '%'))"
            + " or lower(coalesce(o.tradingName, '')) like lower(concat('%', :q, '%')))"
            + " and o.verificationStatus not in (zm.eoz.platform.organisation.VerificationStatus.SUSPENDED,"
            + " zm.eoz.platform.organisation.VerificationStatus.REJECTED)"
            + " order by case when o.verificationStatus = zm.eoz.platform.organisation.VerificationStatus.VERIFIED then 0 else 1 end,"
            + " o.legalName")
    java.util.List<Organisation> searchPostable(@org.springframework.data.repository.query.Param("q") String q,
            org.springframework.data.domain.Pageable pageable);
}
