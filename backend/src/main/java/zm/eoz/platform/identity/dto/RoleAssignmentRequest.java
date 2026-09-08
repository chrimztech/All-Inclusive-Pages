package zm.eoz.platform.identity.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record RoleAssignmentRequest(@NotEmpty List<String> roles) {}
