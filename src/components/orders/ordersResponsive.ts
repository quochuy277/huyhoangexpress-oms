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
      `fixed left-3 right-3 bottom-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-auto z-[9999] rounded-xl px-4 py-3 shadow-lg border-[1.5px] ${tone.background} ${tone.border}`,
    text: `text-[13px] font-semibold ${tone.textColor}`,
    actionButton:
      "ml-0 inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white sm:ml-2",
    dismissButton:
      "rounded p-1 text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-600",
  };
}

export function getUploadHistoryDialogClassNames() {
  return {
    header: "px-4 sm:px-6 py-4 border-b border-slate-100 bg-white",
    tableHead:
      "h-auto px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500",
    footer:
      "px-4 sm:px-6 py-4 bg-slate-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100",
    pagerGroup: "flex flex-col gap-2 sm:flex-row sm:items-center",
    pagerButton:
      "px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-[13px] hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center font-bold shadow-sm",
  };
}

export function getOrderStaffNoteDialogClassNames() {
  return {
    content:
      "w-[calc(100vw-1.5rem)] max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl",
    header: "border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/50 px-5 py-5 sm:px-6",
    body: "space-y-4 bg-white px-5 py-5 sm:px-6",
    metaGrid: "grid grid-cols-1 gap-3 rounded-xl bg-slate-50/80 p-3.5 ring-1 ring-slate-100 sm:grid-cols-3",
    metaItem: "space-y-1 rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm",
    metaLabel: "text-[11px] font-semibold uppercase tracking-wide text-slate-400",
    metaValue: "text-sm font-semibold text-slate-800",
    textarea:
      "min-h-[140px] w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
    footer:
      "flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6",
    status: "text-[13px] font-medium",
  };
}

export function getOrderDetailPageGridClassNames() {
  return {
    sectionsWrapper: "grid grid-cols-1 lg:grid-cols-2 gap-4",
    fieldsWrapper: "p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5",
  };
}
