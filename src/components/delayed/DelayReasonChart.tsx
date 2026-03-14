"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { useMemo } from "react";

interface Props {
  orders: any[];
}

export function DelayReasonChart({ orders }: Props) {
  const data = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const rMap: Record<string, number> = {};
    orders.forEach((o: any) => {
      o.uniqueReasons.forEach((r: string) => {
        rMap[r] = (rMap[r] || 0) + 1;
      });
    });

    return Object.entries(rMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7); // Top 7 reasons
  }, [orders]);

  if (data.length === 0) {
    return (
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Top lý do hoãn giao</h3>
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Chưa có dữ liệu</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-bold text-slate-700 mb-4">Top lý do hoãn giao</h3>
      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={140} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} 
            />
            <Tooltip 
              cursor={{fill: '#f8fafc'}}
              contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}}
              formatter={(value: any) => [`${value} lần`, 'Tần suất'] as any}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#475569', fontSize: 12, fontWeight: 600 }}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index < 3 ? '#3b82f6' : '#93c5fd'} /> // Blue palette
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
