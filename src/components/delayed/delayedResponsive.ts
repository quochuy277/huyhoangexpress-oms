export function shouldUseDelayedMobileCards(width: number) {
  return width < 768;
}

export function getDelayedFilterSheetClassNames() {
  return {
    trigger:
      "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm md:hidden",
    overlay: "fixed inset-0 z-[100] bg-slate-950/40 md:hidden",
    panel:
      "fixed inset-x-0 bottom-0 z-[101] max-h-[85vh] rounded-t-3xl border border-slate-200 bg-white p-4 shadow-2xl md:hidden",
  };
}

export function getDelayedDialogClassNames() {
  return {
    shell:
      "fixed inset-0 z-[9999] bg-white sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[480px] sm:max-w-[calc(100vw-32px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-blue-600 sm:shadow-xl",
    body: "flex flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3 sm:px-6",
  };
}
