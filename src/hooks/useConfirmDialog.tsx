"use client";

import { useCallback, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { ConfirmDialogTone } from "@/lib/confirm-dialog";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  icon?: React.ReactNode;
};

type OpenState = ConfirmOptions & { open: boolean };

const EMPTY_STATE: OpenState = {
  open: false,
  title: "",
  description: "",
};

// Imperative replacement for window.confirm(). Returns a Promise<boolean>
// and an element to render. Use like:
//   const { confirm, element } = useConfirmDialog();
//   ...
//   if (!(await confirm({ title, description, tone: "danger" }))) return;
//   ...
//   return <>{element}...</>
export function useConfirmDialog() {
  const [state, setState] = useState<OpenState>(EMPTY_STATE);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  const handleClose = useCallback(() => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setState(EMPTY_STATE);
  }, []);

  const handleConfirm = useCallback(() => {
    resolverRef.current?.(true);
    resolverRef.current = null;
    setState(EMPTY_STATE);
  }, []);

  const element = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel ?? "Xác nhận"}
      cancelLabel={state.cancelLabel ?? "Hủy"}
      tone={state.tone ?? "info"}
      icon={state.icon ?? <AlertTriangle size={26} />}
      onConfirm={handleConfirm}
      onClose={handleClose}
    />
  );

  return { confirm, element };
}
