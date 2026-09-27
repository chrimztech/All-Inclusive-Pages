import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { ApiError } from "@/lib/api-client";

/**
 * Accessible error summary for a failed form submission (WCAG 3.3.1): lists every problem the server reported,
 * receives focus so screen readers announce it, and stays visible — unlike a toast — until the next attempt.
 * `labels` maps API field names to the labels people see on the form.
 */
export function FormErrorSummary({
  error,
  labels = {},
}: {
  error: unknown;
  labels?: Record<string, string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  if (!error) return null;

  const fields =
    error instanceof ApiError && error.fieldErrors ? Object.entries(error.fieldErrors) : [];
  const message =
    error instanceof ApiError
      ? error.message
      : "Something went wrong. Check your connection and try again.";
  const pretty = (field: string) =>
    labels[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="form-error-title"
      className="rounded-xl bg-rose/5 p-4 text-sm ring-1 ring-rose/40 outline-none focus-visible:ring-2"
    >
      <div id="form-error-title" className="flex items-center gap-2 font-medium text-rose">
        <AlertTriangle aria-hidden="true" className="size-4" />
        {fields.length > 1
          ? `There are ${fields.length} problems to fix`
          : fields.length === 1
            ? "There is a problem to fix"
            : "This couldn't be saved"}
      </div>
      {fields.length > 0 ? (
        <ul className="mt-2 list-disc space-y-0.5 pl-6 text-fg">
          {fields.map(([field, problem]) => (
            <li key={field}>
              <span className="font-medium">{pretty(field)}</span>: {problem}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-fg">{message}</p>
      )}
    </div>
  );
}
