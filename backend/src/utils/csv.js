// ─────────────────────────────────────────────────────────────
// CredChain Backend — zero-dependency CSV parser
// Good enough for credential bulk-upload sheets: handles quoted fields,
// embedded commas/newlines inside quotes, escaped double-quotes (""),
// and CRLF or LF line endings. Returns an array of row objects keyed by
// the header row. Not a full RFC-4180 streaming parser — but robust for
// the spreadsheets institutions actually export.
// ─────────────────────────────────────────────────────────────

/**
 * Tokenise CSV text into a 2-D array of cells, honouring quotes.
 * @param {string} text
 * @returns {string[][]} rows of raw string cells
 */
function tokenize(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'; // escaped quote
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      // swallow; the \n (or end) closes the row
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // Flush the final field/row if the file didn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Parse CSV text into objects keyed by the (lower-cased, trimmed) header row.
 * Fully blank lines are skipped.
 * @param {string} text
 * @returns {Array<Object<string,string>>}
 */
function parseCsv(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return [];

  const rows = tokenize(text).filter(
    (r) => !(r.length === 1 && r[0].trim() === '')
  );
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());

  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] !== undefined ? cells[idx] : '').trim();
    });
    return obj;
  });
}

module.exports = { parseCsv };
