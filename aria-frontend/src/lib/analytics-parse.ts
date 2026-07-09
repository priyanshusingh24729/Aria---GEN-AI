/**
 * Minimal client-side parsing for the Analytics dataset selector.
 *
 * The backend takes raw JSON records (`df.to_dict("records")` shape), so we
 * parse whatever the user picks (CSV or JSON) into that exact shape here —
 * no server-side upload step required for this module.
 */

export class DatasetParseError extends Error {}

function inferCell(raw: string): string | number | boolean | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (trimmed.toLowerCase() === "true") return true;
  if (trimmed.toLowerCase() === "false") return false;
  if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  return trimmed;
}

// Handles quoted fields with embedded commas/newlines — no external deps.
function parseCsv(text: string): Record<string, unknown>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) {
    throw new DatasetParseError("The CSV file appears to be empty.");
  }

  const [header, ...body] = nonEmpty;
  return body.map((cells) => {
    const record: Record<string, unknown> = {};
    header.forEach((col, idx) => {
      record[col.trim() || `column_${idx + 1}`] = inferCell(cells[idx] ?? "");
    });
    return record;
  });
}

function parseJson(text: string): Record<string, unknown>[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new DatasetParseError("The file is not valid JSON.");
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) throw new DatasetParseError("The JSON array is empty.");
    if (typeof parsed[0] !== "object" || parsed[0] === null) {
      throw new DatasetParseError("Expected an array of row objects.");
    }
    return parsed as Record<string, unknown>[];
  }

  throw new DatasetParseError("Expected a top-level JSON array of records.");
}

export async function parseDatasetFile(
  file: File
): Promise<{ records: Record<string, unknown>[]; datasetName: string }> {
  const text = await file.text();
  const lowerName = file.name.toLowerCase();
  const datasetName = file.name.replace(/\.(csv|json)$/i, "");

  const records = lowerName.endsWith(".json") ? parseJson(text) : parseCsv(text);
  return { records, datasetName };
}
