package zm.eoz.platform.security;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import zm.eoz.platform.identity.User;

public class UserPrincipal implements UserDetails {

    private final UUID id;
    private final String email;
    private final String passwordHash;
    private final boolean enabled;
    private final List<GrantedAuthority> authorities;

    public UserPrincipal(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.passwordHash = user.getPasswordHash();
        this.enabled = user.getStatus() == zm.eoz.platform.identity.UserStatus.ACTIVE;
        List<GrantedAuthority> roleAuthorities = user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName()))
                .map(GrantedAuthority.class::cast)
                .toList();
        // Permission authorities are unprefixed so `hasAuthority('CODE')` checks match the
        // permission table's codes directly, distinct from role-based `hasRole(...)` checks.
        List<GrantedAuthority> permissionAuthorities = user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(permission -> new SimpleGrantedAuthority(permission.getCode()))
                .map(GrantedAuthority.class::cast)
                .distinct()
                .toList();
        this.authorities = java.util.stream.Stream.concat(roleAuthorities.stream(), permissionAuthorities.stream())
                .toList();
    }

    public UUID getId() {
        return id;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
