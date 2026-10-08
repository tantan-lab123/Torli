// Browser-side helpers for importing a business owner's phone contacts.
// Three sources: the phone's contact picker (Chrome on Android), a vCard (.vcf) export
// (works on iPhone and Android), or a CSV export (Google Contacts / Excel).

export interface RawContact {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
}

/** Contact Picker API is only available on Chrome for Android over HTTPS. */
export function isContactPickerSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "contacts" in navigator &&
    typeof (navigator as any).contacts?.select === "function"
  );
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") };
}

export async function pickContactsFromPhone(): Promise<RawContact[]> {
  const picked: Array<{ name?: string[]; tel?: string[]; email?: string[] }> = await (
    navigator as any
  ).contacts.select(["name", "tel", "email"], { multiple: true });
  const out: RawContact[] = [];
  for (const c of picked) {
    const { first, last } = splitName(c.name?.[0] || "");
    for (const tel of c.tel || []) {
      out.push({ first_name: first, last_name: last, phone: tel, email: c.email?.[0] });
    }
  }
  return out;
}

/** vCard 2.1 / 3.0 / 4.0 (what iOS and Android "export contacts" produce). */
export function parseVCard(text: string): RawContact[] {
  // unfold continued lines, normalise newlines
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const out: RawContact[] = [];
  let cur: { fn?: string; n?: string; tels: string[]; email?: string } | null = null;

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith("BEGIN:VCARD")) {
      cur = { tels: [] };
    } else if (upper.startsWith("END:VCARD")) {
      if (cur) {
        let first = "";
        let last = "";
        if (cur.n) {
          const [family = "", given = ""] = cur.n.split(";");
          first = given.trim();
          last = family.trim();
        }
        if (!first && !last && cur.fn) ({ first, last } = splitName(cur.fn));
        for (const tel of cur.tels) out.push({ first_name: first, last_name: last, phone: tel, email: cur.email });
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const key = line.slice(0, idx).split(";")[0].toUpperCase();
      const value = line.slice(idx + 1).trim();
      if (key === "FN") cur.fn = value;
      else if (key === "N") cur.n = value;
      else if (key === "TEL") cur.tels.push(value);
      else if (key === "EMAIL" && !cur.email) cur.email = value;
    }
  }
  return out;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (quoted) {
      if (ch === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === "," || ch === ";" || ch === "\t") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

/** CSV with a header row (English or Hebrew: first name / name / שם פרטי / טלפון / phone / mobile ...). */
export function parseContactsCsv(text: string): RawContact[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const find = (...needles: string[]) =>
    header.findIndex((h) => needles.some((n) => h.includes(n)));

  const iFirst = find("first name", "given name", "שם פרטי", "first");
  const iLast = find("last name", "family name", "שם משפחה", "last");
  const iName = find("full name", "display name", "שם מלא", "name", "שם");
  const iEmail = find("e-mail", "email", "אימייל", "מייל");
  const phoneCols = header
    .map((h, i) => (/phone|mobile|tel|טלפון|נייד|פלאפון/.test(h) ? i : -1))
    .filter((i) => i >= 0);
  if (phoneCols.length === 0) return [];

  const out: RawContact[] = [];
  for (const r of rows.slice(1)) {
    let first = iFirst >= 0 ? (r[iFirst] || "").trim() : "";
    let last = iLast >= 0 ? (r[iLast] || "").trim() : "";
    if (!first && !last && iName >= 0) ({ first, last } = splitName(r[iName] || ""));
    for (const c of phoneCols) {
      // Google Contacts joins several numbers with " ::: "
      for (const phone of (r[c] || "").split(":::")) {
        if (phone.trim()) {
          out.push({
            first_name: first,
            last_name: last,
            phone: phone.trim(),
            email: iEmail >= 0 ? (r[iEmail] || "").trim() || undefined : undefined,
          });
        }
      }
    }
  }
  return out;
}

export async function parseContactsFile(file: File): Promise<RawContact[]> {
  const text = await file.text();
  const looksLikeVcf = /\.vcf$/i.test(file.name) || /BEGIN:VCARD/i.test(text.slice(0, 200));
  return looksLikeVcf ? parseVCard(text) : parseContactsCsv(text);
}
