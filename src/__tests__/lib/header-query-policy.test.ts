import { describe, expect, it } from "vitest";

import { getHeaderQueryPolicy } from "@/components/layout/headerQueryPolicy";

describe("getHeaderQueryPolicy", () => {
  it("keeps shell queries disabled before the shell is ready", () => {
    expect(getHeaderQueryPolicy({ isShellReady: false, bellOpen: false })).toEqual({
      shellBootstrapEnabled: false,
      remindersEnabled: false,
      announcementsEnabled: false,
    });
  });

  it("enables only the lightweight shell bootstrap after the shell becomes idle-ready", () => {
    expect(getHeaderQueryPolicy({ isShellReady: true, bellOpen: false })).toEqual({
      shellBootstrapEnabled: true,
      remindersEnabled: false,
      announcementsEnabled: false,
    });
  });

  it("enables reminder and announcement detail queries only when the bell is open", () => {
    expect(getHeaderQueryPolicy({ isShellReady: true, bellOpen: true })).toEqual({
      shellBootstrapEnabled: true,
      remindersEnabled: true,
      announcementsEnabled: true,
    });
  });
});
