"use client";
import { useEffect, useState } from "react";
import { Card } from "./components/Card";
import { api } from "./components/api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#0071e3", "#5856d6", "#af52de", "#ff3b30", "#ff9500", "#34c759", "#30b0c7", "#ff2d55"];

type Overview = {
  totalTraces: number;
  totalSpans: number;
  totalCost: number;
  avgLatencyMs: number;
  errorRate: number;
  models: { model: string; provider: string; count: number; totalCost: number; avgLatencyMs: number }[];
};

type TimeseriesRow = {
  day: string;
  group_key: string;
  count: string;
  total_cost: string;
  avg_latency: string;
};

export default function OverviewPage() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [timeseries, setTimeseries] = useState<any[]>([]);
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    api<Overview>(`/api/stats/overview?days=${days}`).then(setOverview).catch(console.error);
    api<{ data: TimeseriesRow[] }>(`/api/stats/timeseries?days=${days}`).then((res) => {
      const dayMap = new Map<string, any>();
      const modelSet = new Set<string>();
      for (const row of res.data ?? []) {
        const d = row.day?.split("T")[0] ?? row.day;
        if (!dayMap.has(d)) dayMap.set(d, { day: d });
        const key = row.group_key ?? "unknown";
        modelSet.add(key);
        dayMap.get(d)![key] = parseFloat(row.total_cost);
      }
      setModels([...modelSet]);
      setTimeseries([...dayMap.values()].sort((a, b) => a.day.localeCompare(b.day)));
    }).catch(console.error);
  }, [days]);

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px" }}>Overview</h1>
        <div className="pill-group">
          {[7, 14, 30, 90].map((d) => (
            <button key={d} className={days === d ? "active" : ""} onClick={() => setDays(d)}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {overview && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          <Card label="Total Traces" value={overview.totalTraces.toLocaleString()} sub={`${days} days`} />
          <Card label="Total Cost" value={fmt(overview.totalCost)} sub={`${overview.totalSpans} spans`} />
          <Card label="Avg Latency" value={`${overview.avgLatencyMs.toLocaleString()}ms`} sub="across all models" />
          <Card
            label="Error Rate"
            value={`${(overview.errorRate * 100).toFixed(1)}%`}
            sub={overview.errorRate === 0 ? "No errors" : undefined}
          />
        </div>
      )}

      <div className="glass" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>Daily Cost by Model</div>
        <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 24 }}>
          Stacked daily spend &middot; last {days} days
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={timeseries}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--text-tertiary)" }}
              tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
            <YAxis tick={{ fontSize: 12, fill: "var(--text-tertiary)" }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ background: "rgba(255,255,255,0.95)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13 }}
              formatter={(v: any) => [`$${Number(v).toFixed(4)}`]}
            />
            <Legend />
            {models.map((m, i) => (
              <Area key={m} type="monotone" dataKey={m} stackId="cost" stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]} fillOpacity={0.3} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {overview && overview.models.length > 0 && (
        <div className="glass" style={{ padding: 28 }}>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Active Models</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Model", "Provider", "Calls", "Cost", "Avg Latency"].map((h) => (
                  <th key={h} style={{ textAlign: "left", fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)",
                    textTransform: "uppercase", letterSpacing: "0.03em", padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overview.models.map((m) => (
                <tr key={m.model} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 13 }}>{m.model}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--text-secondary)" }}>{m.provider}</td>
                  <td style={{ padding: "12px 14px", fontVariantNumeric: "tabular-nums" }}>{m.count}</td>
                  <td style={{ padding: "12px 14px", fontVariantNumeric: "tabular-nums" }}>${m.totalCost.toFixed(4)}</td>
                  <td style={{ padding: "12px 14px", fontVariantNumeric: "tabular-nums" }}>{m.avgLatencyMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
