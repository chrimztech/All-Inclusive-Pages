package zm.eoz.platform.opportunity;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.opportunity.dto.CategoryResponse;

@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {

    private final OpportunityCategoryRepository categoryRepository;

    public CategoryController(OpportunityCategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    public ApiResponse<List<CategoryResponse>> list() {
        return ApiResponse.of(
                categoryRepository.findAll().stream().map(CategoryResponse::from).toList());
    }
}
