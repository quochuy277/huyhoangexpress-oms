import { vi, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset } from "vitest-mock-extended";

export const prismaMock = mockDeep<PrismaClient>();

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

beforeEach(() => {
  mockReset(prismaMock);
});
