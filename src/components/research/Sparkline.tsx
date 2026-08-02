"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { t: string; v: number };

/** Small recharts area trend used in Overview + Market. */
export function Sparkline({
  data,
  height = 120,
  showAxes = false,
}: {
  data: Point[];
  height?: number;
  showAxes?: boolean;
}) {
  if (!data || data.length === 0) return null;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="cytSpark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6ea8fe" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#6ea8fe" stopOpacity={0} />
            </linearGradient>
          </defs>
          {showAxes && (
            <>
              <XAxis
                dataKey="t"
                tick={{ fill: "#5b6478", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#5b6478", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
            </>
          )}
          <Tooltip
            contentStyle={{
              background: "#12151d",
              border: "1px solid #232838",
              borderRadius: 10,
              color: "#e8ecf5",
              fontSize: 12,
            }}
            labelStyle={{ color: "#8a93a7" }}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke="#6ea8fe"
            strokeWidth={2}
            fill="url(#cytSpark)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
