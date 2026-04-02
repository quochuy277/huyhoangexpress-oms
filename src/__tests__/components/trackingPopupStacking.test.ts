import { describe, expect, test } from "vitest";

import { getTrackingPopupLayer } from "@/components/tracking/trackingPopupStacking";

describe("tracking popup stacking", () => {
  test("uses the default popup layer when no base z-index is provided", () => {
    expect(getTrackingPopupLayer()).toEqual({
      overlayZIndex: 10000,
      shellZIndex: 10001,
    });
  });

  test("raises the tracking popup above nested dialogs when a higher base z-index is provided", () => {
    expect(getTrackingPopupLayer(10240)).toEqual({
      overlayZIndex: 10240,
      shellZIndex: 10241,
    });
  });
});
