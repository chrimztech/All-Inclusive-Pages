import { useEffect, useState } from "react";

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

const NOT_TIMED: CountdownParts = {
  days: Infinity,
  hours: 0,
  minutes: 0,
  seconds: 0,
  expired: false,
};

function computeParts(deadline: string | null): CountdownParts {
  if (!deadline) return NOT_TIMED;
  const remainingMs = new Date(deadline).getTime() - Date.now();
  const expired = remainingMs <= 0;
  const clamped = Math.max(0, remainingMs);
  return {
    days: Math.floor(clamped / 86_400_000),
    hours: Math.floor((clamped % 86_400_000) / 3_600_000),
    minutes: Math.floor((clamped % 3_600_000) / 60_000),
    seconds: Math.floor((clamped % 60_000) / 1_000),
    expired,
  };
}

/**
 * Live-ticking countdown to a deadline. `intervalMs` defaults to a minute, cheap enough for a page
 * full of listing cards; pass 1000 on a single detail view for a second-by-second tick.
 */
export function useCountdown(deadline: string | null, intervalMs = 60_000): CountdownParts {
  const [parts, setParts] = useState(() => computeParts(deadline));

  useEffect(() => {
    setParts(computeParts(deadline));
    if (!deadline) return;
    const id = setInterval(() => setParts(computeParts(deadline)), intervalMs);
    return () => clearInterval(id);
  }, [deadline, intervalMs]);

  return parts;
}

export function formatCountdown(parts: CountdownParts): string {
  if (parts.expired) return "Closed";
  if (parts.days === Infinity) return "No deadline";
  if (parts.days > 0) return `${parts.days}d ${parts.hours}h left`;
  if (parts.hours > 0) return `${parts.hours}h ${parts.minutes}m left`;
  return `${parts.minutes}m ${parts.seconds}s left`;
}

export function countdownTone(parts: CountdownParts): "rose" | "amber" | "accent" | "muted" {
  if (parts.expired) return "muted";
  if (parts.days === Infinity) return "accent";
  if (parts.days < 1) return "rose";
  if (parts.days <= 3) return "rose";
  if (parts.days <= 10) return "amber";
  return "accent";
}
