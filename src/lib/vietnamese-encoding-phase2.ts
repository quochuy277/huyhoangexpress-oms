export const PHASE2_VIETNAMESE_AUDIT_TARGETS = [
  {
    module: "orders",
    paths: ["src/components/orders", "src/app/api/orders"],
  },
  {
    module: "claims",
    paths: ["src/components/claims", "src/app/api/claims"],
  },
  {
    module: "finance",
    paths: ["src/components/finance", "src/app/api/finance"],
  },
  {
    module: "admin",
    paths: ["src/app/(dashboard)/admin", "src/components/admin"],
  },
  {
    module: "status-mapper",
    paths: ["src/lib/status-mapper.ts"],
  },
] as const;
