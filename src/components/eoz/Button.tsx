import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "accent-gradient text-ink hover:brightness-105",
  secondary: "text-muted ring-1 ring-line hover:text-fg hover:bg-surface-2",
  danger: "text-rose ring-1 ring-rose/30 hover:bg-rose/10",
  ghost: "text-accent-soft hover:text-fg",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, loadingText, disabled, className = "", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={rest.type ?? "button"}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> : null}
      {loading && loadingText ? loadingText : children}
    </button>
  );
});
