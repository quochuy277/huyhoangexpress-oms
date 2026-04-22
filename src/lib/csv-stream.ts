// Shared CSV streaming helpers used by export routes.
//
// Why a module:
//   - `orders/delayed/export`, `orders/export`, `claims/export` all need the
//     same escape rules + BOM + streaming pattern. Historically `escapeCsvCell`
//     lived in `delayed-query.ts` (because that was the first caller). Now it
//     has 3+ callers, so it belongs in a neutral module.
//   - Streaming in chunks keeps peak memory low on large exports (10K+ rows),
//     which matters on constrained hosts (Vercel Hobby = 512 MB / 30s budget).
//
// Usage pattern (callers own the DB loop):
//
//   const stream = new ReadableStream({
//     async start(controller) {
//       controller.enqueue(encodeCsvHeader(columns));
//       let skip = 0;
//       while (true) {
//         const batch = await prisma.order.findMany({ where, select, skip, take: BATCH });
//         if (batch.length === 0) break;
//         controller.enqueue(encodeCsvRows(batch.map(buildRow)));
//         if (batch.length < BATCH) break;
//         skip += BATCH;
//       }
//       controller.close();
//     },
//   });

const encoder = new TextEncoder();

/** Escape a single CSV cell: wrap in quotes, double any internal quotes. */
export function escapeCsvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

/** Join one row's values into a CSV line (no trailing newline). */
export function rowToCsvLine(row: readonly unknown[]): string {
  return row.map((value) => escapeCsvCell(value)).join(",");
}

/**
 * Encode header row as a Uint8Array with UTF-8 BOM prefix so Excel opens the
 * file with correct encoding (Vietnamese diacritics). Only call this once at
 * the start of the stream.
 */
export function encodeCsvHeader(columns: readonly string[]): Uint8Array {
  return encoder.encode(`\uFEFF${rowToCsvLine(columns)}\n`);
}

/**
 * Encode a batch of rows as a Uint8Array. Each row ends with `\n`, including
 * the last — so consecutive batches concatenate cleanly without double blank
 * lines.
 */
export function encodeCsvRows(rows: readonly (readonly unknown[])[]): Uint8Array {
  if (rows.length === 0) return new Uint8Array(0);
  return encoder.encode(rows.map((row) => rowToCsvLine(row)).join("\n") + "\n");
}
