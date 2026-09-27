import { useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

/** Order-independent snapshot of a flat form-values object. */
function snapshot(values: Record<string, unknown>) {
  return JSON.stringify(values, Object.keys(values).sort());
}

/**
 * Warns before leaving a form with unsaved edits — in-app navigation shows an accessible dialog, and closing or
 * reloading the tab shows the browser's own prompt.
 *
 * The first values seen are treated as saved. Call {@link resetTo} with the saved values whenever the form is
 * (re)loaded from the server, e.g. in the effect that fills the fields. Render {@code prompt} anywhere.
 */
export function useUnsavedChanges(
  values: Record<string, unknown>,
  { disabled = false }: { disabled?: boolean } = {},
): { dirty: boolean; resetTo: (saved: Record<string, unknown>) => void; prompt: ReactNode } {
  const current = snapshot(values);
  const [baseline, setBaseline] = useState(current);
  const dirty = !disabled && current !== baseline;
  const resetTo = useCallback((saved: Record<string, unknown>) => setBaseline(snapshot(saved)), []);

  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: () => dirty,
    withResolver: true,
  });

  const prompt =
    blocker.status === "blocked" ? (
      <UnsavedChangesDialog onStay={blocker.reset} onLeave={blocker.proceed} />
    ) : null;

  return { dirty, resetTo, prompt };
}

function UnsavedChangesDialog({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  const stayRef = useRef<HTMLButtonElement>(null);
  const leaveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    stayRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onStay();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
        aria-describedby="unsaved-desc"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onStay();
          }
          // Keep focus inside the dialog.
          if (e.key === "Tab") {
            const first = stayRef.current;
            const last = leaveRef.current;
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
        className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl ring-1 ring-line"
      >
        <div className="flex items-start gap-3">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber" />
          <div>
            <h2 id="unsaved-title" className="font-display text-lg">
              Leave without saving?
            </h2>
            <p id="unsaved-desc" className="mt-1 text-sm text-muted">
              You have changes on this page that haven't been saved. If you leave now, they'll be
              lost.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            ref={stayRef}
            type="button"
            onClick={onStay}
            className="btn-primary px-4 py-2 text-sm"
          >
            Keep editing
          </button>
          <button
            ref={leaveRef}
            type="button"
            onClick={onLeave}
            className="rounded-md px-4 py-2 text-sm text-rose ring-1 ring-rose/30 hover:bg-rose/10"
          >
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}
