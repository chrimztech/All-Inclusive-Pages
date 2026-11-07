/** Application email addresses for a listing: one or more "To" addresses plus optional CC and BCC. */

export type EmailKind = "to" | "cc" | "bcc";
export type EmailRow = { id: number; kind: EmailKind; address: string };
export type EmailFields = {
  applicationEmail: string;
  applicationCc: string;
  applicationBcc: string;
};

let nextRowId = 1;
export const newEmailRow = (kind: EmailKind, address = ""): EmailRow => ({
  id: nextRowId++,
  kind,
  address,
});
const split = (value: string | null | undefined) =>
  (value ?? "")
    .split(/[,;\s]+/)
    .map((a) => a.trim())
    .filter(Boolean);

/** Rows for the editor from the stored comma-separated fields (always at least one "To" row). */
export function emailRowsFrom(
  to: string | null | undefined,
  cc?: string | null,
  bcc?: string | null,
): EmailRow[] {
  const rows = [
    ...split(to).map((a) => newEmailRow("to", a)),
    ...split(cc).map((a) => newEmailRow("cc", a)),
    ...split(bcc).map((a) => newEmailRow("bcc", a)),
  ];
  return rows.some((r) => r.kind === "to") ? rows : [newEmailRow("to"), ...rows];
}

/** The comma-separated To / CC / BCC fields the API expects. */
export function emailFieldsFrom(rows: EmailRow[]): EmailFields {
  const join = (kind: EmailKind) =>
    rows
      .filter((r) => r.kind === kind && r.address.trim())
      .map((r) => r.address.trim())
      .join(", ");
  return { applicationEmail: join("to"), applicationCc: join("cc"), applicationBcc: join("bcc") };
}

export const MAX_EMAILS = 10;
