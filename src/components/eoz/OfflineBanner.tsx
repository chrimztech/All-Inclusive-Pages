import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Wifi, WifiOff } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** Browser connectivity; always "online" during server rendering. */
function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/**
 * Fixed notice while the browser is offline. On reconnect it briefly confirms, and re-fetches data and resumes
 * any paused saves so screens are current again without a manual reload.
 */
export function OfflineBanner() {
  const online = useOnline();
  const queryClient = useQueryClient();
  const [justReconnected, setJustReconnected] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setJustReconnected(true);
    void queryClient.resumePausedMutations();
    void queryClient.invalidateQueries();
    const t = window.setTimeout(() => setJustReconnected(false), 4000);
    return () => window.clearTimeout(t);
  }, [online, queryClient]);

  if (online && !justReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 print:hidden"
    >
      {online ? (
        <div className="flex items-center gap-2 rounded-full bg-surface-2/95 px-4 py-2 text-sm text-fg shadow-lg ring-1 ring-accent/40 backdrop-blur">
          <Wifi aria-hidden="true" className="size-4 text-accent-soft" />
          Back online. Everything is up to date.
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-surface-2/95 px-4 py-2.5 text-sm text-fg shadow-lg ring-1 ring-amber/40 backdrop-blur">
          <span className="flex items-center gap-2">
            <WifiOff aria-hidden="true" className="size-4 text-amber" />
            You're offline. Changes can't be saved until you reconnect.
          </span>
          <span className="text-xs text-muted">
            We'll refresh this page's data when you're back.
          </span>
        </div>
      )}
    </div>
  );
}
