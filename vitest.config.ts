import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Streaming tests (CSV exports) often exceed the default 5s under full-suite
    // load due to transform/import overhead — bump to 15s globally so flaky
    // timeout failures stop masking real regressions.
    testTimeout: 15_000,
    exclude: ["backups/**", "node_modules/**", ".next/**", ".worktrees/**", "worktrees/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/prisma.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
