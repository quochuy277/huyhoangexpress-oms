type InlineStaffNoteSaveStateInput = {
  previousValue: string;
  draftValue: string;
  ok: boolean;
  errorMessage?: string;
};

export function buildInlineStaffNoteSaveState({
  previousValue,
  draftValue,
  ok,
  errorMessage,
}: InlineStaffNoteSaveStateInput) {
  const trimmedDraft = draftValue.trim();

  if (ok) {
    return {
      value: trimmedDraft,
      previousValue: trimmedDraft,
      saved: true,
      error: null,
      editing: false,
    };
  }

  return {
    value: previousValue,
    previousValue,
    saved: false,
    error: errorMessage || "Khong the luu ghi chu",
    editing: true,
  };
}
