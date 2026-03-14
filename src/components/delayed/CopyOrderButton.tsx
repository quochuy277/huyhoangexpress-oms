"use client";

import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import { ProcessedDelayedOrder } from "@/lib/delay-analyzer";

interface Props {
  order: ProcessedDelayedOrder;
}

export function CopyOrderButton({ order }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `Mã đơn: ${order.carrierOrderCode || order.requestCode}\nTên: ${order.receiverName} - SĐT: ${order.receiverPhone}\nĐC: ${order.fullAddress}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    
    // Fallback toast visual inside button
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className={`mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase tracking-wide transition-all font-semibold
        ${copied 
            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`}
    >
      {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "✓ Đã copy vào bộ nhớ tạm" : "📋 Copy"}
    </button>
  );
}
