"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { useMemo } from "react";

interface Props {
  orders: any[];
}

export function DelayDistributionChart({ orders }: Props) {
  const data = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    
    let c1 = 0, c2 = 0, c3 = 0, c4 = 0;
    orders.forEach(o => {
      if (o.delayCount >= 4) c4++;
      else if (o.delayCount === 3) c3++;
      else if (o.delayCount === 2) c2++;
      else c1++;
    });

    return [
      { name: "1 lần", count: c1, fill: "#10b981" }, // Emerald 500
      { name: "2 lần", count: c2, fill: "#f59e0b" }, // Amber 500
      { name: "3 lần", count: c3, fill: "#f97316" }, // Orange 500
      { name: "4+ lần", count: c4, fill: "#ef4444" }, // Red 500
    ];
  }, [orders]);

  if (data.length === 0) {
    return (
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Phân bố số lần hoãn giao</h3>
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Chưa có dữ liệu</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-bold text-slate-700 mb-4">Phân bố số lần hoãn giao</h3>
      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" width={60} axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }} />
            <Tooltip 
              cursor={{fill: '#f8fafc'}}
              contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px'}}
              formatter={(value: any) => [`${value} đơn`, 'Số lượng'] as any}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#475569', fontSize: 13, fontWeight: 600 }}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
