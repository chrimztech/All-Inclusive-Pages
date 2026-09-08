package zm.eoz.platform.candidate;

import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.opportunity.OpportunityRepository;
import zm.eoz.platform.opportunity.dto.OpportunitySummaryResponse;
import zm.eoz.platform.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/candidate/saved")
@PreAuthorize("hasRole('CANDIDATE')")
public class SavedOpportunityController {

    private final SavedOpportunityRepository savedRepository;
    private final OpportunityRepository opportunityRepository;

    public SavedOpportunityController(
            SavedOpportunityRepository savedRepository, OpportunityRepository opportunityRepository) {
        this.savedRepository = savedRepository;
        this.opportunityRepository = opportunityRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ApiResponse<List<OpportunitySummaryResponse>> list() {
        return ApiResponse.of(savedRepository.findById_UserIdOrderBySavedAtDesc(currentUserId()).stream()
                .map(s -> opportunityRepository.findById(s.getId().getOpportunityId()).orElse(null))
                .filter(java.util.Objects::nonNull)
                .map(OpportunitySummaryResponse::from)
                .toList());
    }

    @PostMapping("/{opportunityId}")
    @Transactional
    public ResponseEntity<Void> save(@PathVariable UUID opportunityId) {
        if (!opportunityRepository.existsById(opportunityId)) {
            throw new NotFoundException("Opportunity not found: " + opportunityId);
        }
        savedRepository.save(new SavedOpportunity(new SavedOpportunityId(currentUserId(), opportunityId)));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{opportunityId}")
    @Transactional
    public ResponseEntity<Void> unsave(@PathVariable UUID opportunityId) {
        savedRepository.deleteById(new SavedOpportunityId(currentUserId(), opportunityId));
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return ((UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getId();
    }
}
