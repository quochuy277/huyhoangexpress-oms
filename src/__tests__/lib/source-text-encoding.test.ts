import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const SOURCE_ROOT = path.join(process.cwd(), "src");
const DOCS_ROOT = path.join(process.cwd(), "docs");
const PLAN_FILE = path.join(process.env.USERPROFILE ?? "C:\\Users\\Admin", ".claude", "plans", "virtual-stargazing-hinton.md");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".md"]);
const MOJIBAKE_FRAGMENTS = [
  "TÃ",
  "Tá»",
  "Ä",
  "Ä‘",
  "ChÆ°a",
  "NhÃ",
  "há»‡",
  "Lá»—i",
  "Ã¡",
  "Ã¢",
  "Ã£",
  "Ã¨",
  "Ã©",
  "Ãª",
  "Ã¬",
  "Ã­",
  "Ã²",
  "Ã³",
  "Ã´",
  "Ãµ",
  "Ã¹",
  "Ãº",
  "Ã½",
  "Ä",
  "Ä‘",
  "Æ°",
  "Æ¡",
  "áº",
  "á»",
  "â€",
  "â†",
  "ðŸ",
  "ï¿½",
  "�",
];

function collectSourceFiles(dirPath: string, files: string[] = []) {
  for (const entry of readdirSync(dirPath)) {
    const fullPath = path.join(dirPath, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      if (entry === "__tests__") {
        continue;
      }

      collectSourceFiles(fullPath, files);
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry))) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectFiles() {
  return [
    ...collectSourceFiles(SOURCE_ROOT),
    ...collectSourceFiles(DOCS_ROOT),
    PLAN_FILE,
  ];
}

describe("source text encoding", () => {
  it("keeps app source, docs, and the phase plan free from mojibake fragments", () => {
    const offenders = collectFiles().filter((filePath) => {
      const content = readFileSync(filePath, "utf8");
      return MOJIBAKE_FRAGMENTS.some((fragment) => content.includes(fragment));
    });

    expect(offenders).toEqual([]);
  });
});

