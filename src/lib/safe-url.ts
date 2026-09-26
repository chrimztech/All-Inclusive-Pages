/** Returns the URL only if it is an absolute http(s) link; anything else (javascript:, data:, relative) is refused. */
export function safeHttpUrl(value: string | null | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}
