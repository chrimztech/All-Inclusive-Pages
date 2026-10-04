package zm.eoz.platform.information;

import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.information.dto.InformationArticleRequest;
import zm.eoz.platform.information.dto.InformationArticleResponse;

@Service
public class InformationHubService {

    private final InformationArticleRepository repository;
    private final AuditService auditService;

    public InformationHubService(InformationArticleRepository repository, AuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Page<InformationArticleResponse> published(String categoryName, String search, Pageable pageable) {
        InformationArticle.Category category = parseCategory(categoryName, true);
        String query = search == null || search.isBlank() ? null : search.trim();
        Page<InformationArticle> articles;
        if (query != null && category != null) {
            articles = repository.searchPublishedInCategory(
                    InformationArticle.Status.PUBLISHED, category, query, pageable);
        } else if (query != null) {
            articles = repository.searchPublished(InformationArticle.Status.PUBLISHED, query, pageable);
        } else if (category != null) {
            articles = repository.findByStatusAndCategoryOrderByFeaturedDescPublishedAtDescCreatedAtDesc(
                    InformationArticle.Status.PUBLISHED, category, pageable);
        } else {
            articles = repository.findByStatusOrderByFeaturedDescPublishedAtDescCreatedAtDesc(
                    InformationArticle.Status.PUBLISHED, pageable);
        }
        return articles.map(InformationArticleResponse::from);
    }

    @Transactional(readOnly = true)
    public InformationArticleResponse publishedBySlug(String slug) {
        InformationArticle article = repository
                .findBySlugAndStatus(slug, InformationArticle.Status.PUBLISHED)
                .orElseThrow(() -> new NotFoundException("Information Hub article not found: " + slug));
        return InformationArticleResponse.from(article);
    }

    @Transactional(readOnly = true)
    public Page<InformationArticleResponse> adminList(Pageable pageable) {
        return repository.findAllByOrderByCreatedAtDesc(pageable).map(InformationArticleResponse::from);
    }

    @Transactional
    public InformationArticleResponse create(InformationArticleRequest request, User actor) {
        InformationArticle article = new InformationArticle();
        article.setSlug(uniqueSlug(request.title()));
        article.setCreatedBy(actor);
        apply(article, request);
        article = repository.save(article);
        auditService.record(
                actor,
                "INFORMATION_ARTICLE_CREATED",
                "InformationArticle",
                article.getId().toString(),
                "Created draft \"" + article.getTitle() + "\"");
        return InformationArticleResponse.from(article);
    }

    @Transactional
    public InformationArticleResponse update(UUID id, InformationArticleRequest request, User actor) {
        InformationArticle article = requireArticle(id);
        apply(article, request);
        auditService.record(
                actor,
                "INFORMATION_ARTICLE_UPDATED",
                "InformationArticle",
                id.toString(),
                "Updated \"" + article.getTitle() + "\"");
        return InformationArticleResponse.from(article);
    }

    @Transactional
    public InformationArticleResponse publish(UUID id, User actor) {
        InformationArticle article = requireArticle(id);
        if (article.getStatus() == InformationArticle.Status.PUBLISHED) {
            throw new BadRequestException("This article is already published.");
        }
        article.setStatus(InformationArticle.Status.PUBLISHED);
        article.setPublishedAt(Instant.now());
        auditService.record(
                actor,
                "INFORMATION_ARTICLE_PUBLISHED",
                "InformationArticle",
                id.toString(),
                "Published \"" + article.getTitle() + "\"");
        return InformationArticleResponse.from(article);
    }

    @Transactional
    public InformationArticleResponse unpublish(UUID id, User actor) {
        InformationArticle article = requireArticle(id);
        if (article.getStatus() == InformationArticle.Status.DRAFT) {
            throw new BadRequestException("This article is already a draft.");
        }
        article.setStatus(InformationArticle.Status.DRAFT);
        auditService.record(
                actor,
                "INFORMATION_ARTICLE_UNPUBLISHED",
                "InformationArticle",
                id.toString(),
                "Unpublished \"" + article.getTitle() + "\"");
        return InformationArticleResponse.from(article);
    }

    @Transactional
    public void delete(UUID id, User actor) {
        InformationArticle article = requireArticle(id);
        repository.delete(article);
        auditService.record(
                actor,
                "INFORMATION_ARTICLE_DELETED",
                "InformationArticle",
                id.toString(),
                "Deleted \"" + article.getTitle() + "\"");
    }

    private static void apply(InformationArticle article, InformationArticleRequest request) {
        article.setTitle(request.title().trim());
        article.setExcerpt(request.excerpt().trim());
        article.setBody(request.body().trim());
        article.setCategory(parseCategory(request.category(), false));
        article.setFeatured(Boolean.TRUE.equals(request.featured()));
        article.setSourceName(blankToNull(request.sourceName()));
        article.setSourceUrl(blankToNull(request.sourceUrl()));
    }

    private String uniqueSlug(String title) {
        String base = Normalizer.normalize(title, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (base.isBlank()) base = "guide";
        if (base.length() > 170) base = base.substring(0, 170).replaceAll("-+$", "");
        String candidate = base;
        int suffix = 2;
        while (repository.existsBySlug(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private static InformationArticle.Category parseCategory(String value, boolean optional) {
        if (value == null || value.isBlank()) {
            if (optional) return null;
            throw new BadRequestException("Choose an article category.");
        }
        try {
            return InformationArticle.Category.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException error) {
            throw new BadRequestException("Unknown Information Hub category: " + value);
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private InformationArticle requireArticle(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Information Hub article not found: " + id));
    }
}
