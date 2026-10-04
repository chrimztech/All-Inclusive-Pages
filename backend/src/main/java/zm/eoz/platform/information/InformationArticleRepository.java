package zm.eoz.platform.information;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InformationArticleRepository extends JpaRepository<InformationArticle, UUID> {

    boolean existsBySlug(String slug);

    Optional<InformationArticle> findBySlugAndStatus(String slug, InformationArticle.Status status);

    Page<InformationArticle> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<InformationArticle> findByStatusOrderByFeaturedDescPublishedAtDescCreatedAtDesc(
            InformationArticle.Status status, Pageable pageable);

    Page<InformationArticle> findByStatusAndCategoryOrderByFeaturedDescPublishedAtDescCreatedAtDesc(
            InformationArticle.Status status, InformationArticle.Category category, Pageable pageable);

    @Query("""
            select article from InformationArticle article
            where article.status = :status
              and (lower(article.title) like lower(concat('%', :query, '%'))
                   or lower(article.excerpt) like lower(concat('%', :query, '%'))
                   or lower(article.body) like lower(concat('%', :query, '%')))
            order by article.featured desc, article.publishedAt desc, article.createdAt desc
            """)
    Page<InformationArticle> searchPublished(
            @Param("status") InformationArticle.Status status,
            @Param("query") String query,
            Pageable pageable);

    @Query("""
            select article from InformationArticle article
            where article.status = :status
              and article.category = :category
              and (lower(article.title) like lower(concat('%', :query, '%'))
                   or lower(article.excerpt) like lower(concat('%', :query, '%'))
                   or lower(article.body) like lower(concat('%', :query, '%')))
            order by article.featured desc, article.publishedAt desc, article.createdAt desc
            """)
    Page<InformationArticle> searchPublishedInCategory(
            @Param("status") InformationArticle.Status status,
            @Param("category") InformationArticle.Category category,
            @Param("query") String query,
            Pageable pageable);
}
