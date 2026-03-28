"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DelayedFacetCount } from "@/types/delayed";

export function DelayReasonChart({ data }: { data: DelayedFacetCount[] }) {
  if (!data.length) {
    return (
      <div className="flex h-full min-h-[220px] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-700">Top lý do hoãn giao</h3>
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Chưa có dữ liệu</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[220px] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-slate-700">Top lý do hoãn giao</h3>
      <div className="min-h-[220px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" horizontal vertical={false} />
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              width={140}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#475569", fontWeight: 500 }}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontSize: "12px",
              }}
              formatter={(value) => [`${Number(value ?? 0)} lần`, "Tần suất"]}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              barSize={20}
              label={{ position: "right", fill: "#475569", fontSize: 12, fontWeight: 600 }}
            >
              {data.map((entry, index) => (
                <Cell key={`reason-cell-${index}`} fill={index < 3 ? "#2563eb" : "#93c5fd"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
