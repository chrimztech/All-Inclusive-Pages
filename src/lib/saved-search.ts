type Searchable = { reference: string; organisationName: string; title: string };

/** Letters and digits only, so "opp 2026 12" and "EOZ-OPP-2026-000012" can meet. */
export function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Matches every word of the query against a listing's reference, organisation or title. */
export function filterSaved<T extends Searchable>(items: T[], query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return items;
  const whole = compact(query);
  return items.filter((o) => {
    const text = `${o.reference} ${o.organisationName} ${o.title}`.toLowerCase();
    if (whole.length >= 3 && compact(o.reference).includes(whole)) return true;
    return words.every(
      (w) => text.includes(w) || (compact(w) !== "" && compact(o.reference).includes(compact(w))),
    );
  });
}
