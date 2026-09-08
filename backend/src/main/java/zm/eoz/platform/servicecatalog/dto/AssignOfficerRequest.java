package zm.eoz.platform.servicecatalog.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AssignOfficerRequest(@NotNull UUID officerId) {}
