/** Organisation initials on a tile whose hue is derived from the name, so each employer keeps a stable colour. */
export function Monogram({ name, className = "size-10" }: { name: string; className?: string }) {
  const letters = name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = 95 + (hash % 70); // stays in the brand's gold-to-green band
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-xl font-display text-sm font-medium ring-1 ring-white/10 ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 55% 30% / 0.9), hsl(${hue + 20} 60% 18% / 0.9))`,
        color: `hsl(${hue} 70% 82%)`,
      }}
    >
      {letters || "·"}
    </span>
  );
}
