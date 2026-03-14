"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
      aria-label="Quay lại"
    >
      <ArrowLeft className="w-5 h-5 text-slate-600" />
    </button>
  );
}
