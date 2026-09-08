package zm.eoz.platform.organisation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record MemberInviteRequest(@NotBlank @Email String email, String roleInOrg) {}
