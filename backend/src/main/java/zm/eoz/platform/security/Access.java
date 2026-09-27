package zm.eoz.platform.security;

import java.util.Set;
import zm.eoz.platform.identity.User;

/**
 * Permission checks inside services, for rules that depend on the record as well as the person (e.g. "the
 * customer, or someone with SERVICE_VIEW"). Always check permission codes rather than role names, so that changing a
 * role's permissions on the Permissions page changes what that role can do everywhere.
 */
public final class Access {

    private Access() {}

    /** True when the user's roles grant any of the given permission codes. */
    public static boolean hasAny(User user, String... permissions) {
        if (user == null) return false;
        Set<String> wanted = Set.of(permissions);
        return user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .anyMatch(permission -> wanted.contains(permission.getCode()));
    }
}
