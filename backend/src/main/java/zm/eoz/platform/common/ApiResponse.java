package zm.eoz.platform.common;

/** Consistent success envelope for API responses. */
public record ApiResponse<T>(T data) {
    public static <T> ApiResponse<T> of(T data) {
        return new ApiResponse<>(data);
    }
}
