package zm.eoz.platform.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

public final class CookieUtil {

    public static final String ACCESS_COOKIE = "eoz_at";
    public static final String REFRESH_COOKIE = "eoz_rt";

    private CookieUtil() {}

    public static void set(HttpServletResponse response, String name, String value, int maxAgeSeconds) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(maxAgeSeconds);
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
    }

    public static void clear(HttpServletResponse response, String name) {
        Cookie cookie = new Cookie(name, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }
}
