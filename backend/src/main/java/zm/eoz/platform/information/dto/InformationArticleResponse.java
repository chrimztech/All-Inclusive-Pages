package zm.eoz.platform.information.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.information.InformationArticle;

public record InformationArticleResponse(
        UUID id,
        String slug,
        String title,
        String excerpt,
        String body,
        String category,
        boolean featured,
        String status,
        String sourceName,
        String sourceUrl,
        int readingMinutes,
        Instant publishedAt,
        Instant createdAt,
        Instant updatedAt) {

    public static InformationArticleResponse from(InformationArticle article) {
        int words = article.getBody().isBlank() ? 0 : article.getBody().trim().split("\\s+").length;
        int readingMinutes = Math.max(1, (int) Math.ceil(words / 220.0));
        return new InformationArticleResponse(
                article.getId(),
                article.getSlug(),
                article.getTitle(),
                article.getExcerpt(),
                article.getBody(),
                article.getCategory().name(),
                article.isFeatured(),
                article.getStatus().name(),
                article.getSourceName(),
                article.getSourceUrl(),
                readingMinutes,
                article.getPublishedAt(),
                article.getCreatedAt(),
                article.getUpdatedAt());
    }
}
