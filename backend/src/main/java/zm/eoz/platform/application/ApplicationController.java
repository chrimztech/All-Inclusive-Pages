package zm.eoz.platform.application;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.application.dto.ApplicationRequest;
import zm.eoz.platform.application.dto.ApplicationResponse;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.UserPrincipal;

@RestController
public class ApplicationController {

    private final ApplicationService applicationService;
    private final UserRepository userRepository;

    public ApplicationController(ApplicationService applicationService, UserRepository userRepository) {
        this.applicationService = applicationService;
        this.userRepository = userRepository;
    }

    @PostMapping("/api/v1/opportunities/{opportunityId}/applications")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ApiResponse<ApplicationResponse> apply(
            @PathVariable UUID opportunityId, @RequestBody ApplicationRequest request) {
        return ApiResponse.of(applicationService.apply(opportunityId, request, currentUser()));
    }

    @GetMapping("/api/v1/candidate/applications")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ApiResponse<List<ApplicationResponse>> mine() {
        return ApiResponse.of(applicationService.listMine(currentUser().getId()));
    }

    private zm.eoz.platform.identity.User currentUser() {
        var principal =
                (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
