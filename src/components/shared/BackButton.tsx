"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  from?: string;
}

export function BackButton({ from }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (from) {
      router.push(from);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleBack}
      className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
      aria-label="Quay lại"
    >
      <ArrowLeft className="w-5 h-5 text-slate-600" />
    </button>
  );
}
