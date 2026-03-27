import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const CLAIM_FILES = [
  "src/components/claims/ClaimsClient.tsx",
  "src/components/claims/ClaimDetailDrawer.tsx",
  "src/components/shared/AddClaimFromPageDialog.tsx",
  "src/lib/claims-config.ts",
];

const MOJIBAKE_PATTERN = /Ã|Â|â€|áº|á»|Æ°|Æ¡/;

describe("claims text encoding", () => {
  it.each(CLAIM_FILES)("keeps Vietnamese labels readable in %s", (relativePath) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const content = readFileSync(absolutePath, "utf8");

    expect(content).not.toMatch(MOJIBAKE_PATTERN);
  });
});
