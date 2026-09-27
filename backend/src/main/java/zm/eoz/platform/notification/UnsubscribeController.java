package zm.eoz.platform.notification;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;

/** Public, token-authorised email unsubscribe. No sign-in needed; the signed token is the authority. */
@RestController
@RequestMapping("/api/v1/unsubscribe")
@Tag(name = "Email unsubscribe")
public class UnsubscribeController {

    private final UnsubscribeService unsubscribeService;

    public UnsubscribeController(UnsubscribeService unsubscribeService) {
        this.unsubscribeService = unsubscribeService;
    }

    @GetMapping
    @Operation(summary = "What a link covers and the current preferences (email masked)")
    public ApiResponse<UnsubscribeService.Status> status(@RequestParam String token) {
        return ApiResponse.of(unsubscribeService.status(token));
    }

    /**
     * Unsubscribe. Also the RFC 8058 one-click target: mail clients POST the form body
     * {@code List-Unsubscribe=One-Click}, which binds to nothing and is ignored.
     */
    @PostMapping
    @Operation(summary = "Stop the emails a link covers (also the one-click List-Unsubscribe target)")
    public ApiResponse<UnsubscribeService.Status> unsubscribe(
            @RequestParam String token, @RequestParam(required = false) UnsubscribeService.Scope only) {
        return ApiResponse.of(unsubscribeService.unsubscribe(token, only));
    }

    @PostMapping("/undo")
    @Operation(summary = "Resubscribe after an accidental unsubscribe")
    public ApiResponse<UnsubscribeService.Status> undo(@RequestParam String token) {
        return ApiResponse.of(unsubscribeService.resubscribe(token));
    }
}
