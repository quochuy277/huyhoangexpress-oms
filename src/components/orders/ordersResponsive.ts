export function getOrdersToastClassNames(variant: "success" | "error" | "info") {
  const tone =
    variant === "success"
      ? {
          background: "bg-emerald-50",
          border: "border-emerald-500",
          textColor: "text-emerald-900",
        }
      : variant === "error"
        ? {
            background: "bg-red-50",
            border: "border-red-500",
            textColor: "text-red-900",
          }
        : {
            background: "bg-blue-50",
            border: "border-blue-500",
            textColor: "text-blue-900",
          };

  return {
    container:
      `fixed left-3 right-3 bottom-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-auto z-[9999] rounded-xl px-4 py-3 shadow-lg ${tone.background} border-[1.5px] ${tone.border}`,
    text: `text-[13px] font-semibold ${tone.textColor}`,
    actionButton:
      "ml-0 sm:ml-2 inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white",
    dismissButton:
      "rounded p-1 text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-600",
  };
}

export function getUploadHistoryDialogClassNames() {
  return {
    header: "px-4 sm:px-6 py-4 border-b border-slate-100 bg-white",
    tableHead:
      "px-4 py-3 h-auto text-xs font-bold uppercase tracking-wider text-slate-500",
    footer:
      "px-4 sm:px-6 py-4 bg-slate-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100",
    pagerGroup: "flex flex-col gap-2 sm:flex-row sm:items-center",
    pagerButton:
      "px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-[13px] hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center font-bold shadow-sm",
  };
}

export function getOrderDetailPageGridClassNames() {
  return {
    sectionsWrapper: "grid grid-cols-1 lg:grid-cols-2 gap-4",
    fieldsWrapper: "p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5",
  };
}
