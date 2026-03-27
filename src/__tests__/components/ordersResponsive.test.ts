import { describe, expect, test } from "vitest";
import {
  getOrderDetailPageGridClassNames,
  getOrdersToastClassNames,
  getUploadHistoryDialogClassNames,
} from "@/components/orders/ordersResponsive";

describe("ordersResponsive", () => {
  test("returns mobile-first toast classes for orders notifications", () => {
    expect(getOrdersToastClassNames("success").container).toContain(
      "fixed left-3 right-3 bottom-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-auto z-[9999] rounded-xl px-4 py-3 shadow-lg",
    );
    expect(getOrdersToastClassNames("success").text).toContain(
      "text-[13px] font-semibold",
    );
    expect(getOrdersToastClassNames("info").container).toContain("sm:right-6");
  });

  test("returns upload history dialog footer classes with stacked mobile layout", () => {
    expect(getUploadHistoryDialogClassNames()).toMatchObject({
      header: "px-4 sm:px-6 py-4 border-b border-slate-100 bg-white",
      footer:
        "px-4 sm:px-6 py-4 bg-slate-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100",
      pagerButton:
        "px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-[13px] hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center font-bold shadow-sm",
    });
  });

  test("returns order detail page grid classes with single-column mobile fallback", () => {
    expect(getOrderDetailPageGridClassNames()).toMatchObject({
      sectionsWrapper: "grid grid-cols-1 lg:grid-cols-2 gap-4",
      fieldsWrapper: "p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5",
    });
  });
});
