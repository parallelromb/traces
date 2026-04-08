"use client";
import { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { api } from "../components/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#0071e3", "#5856d6", "#af52de", "#ff3b30", "#ff9500", "#34c759", "#30b0c7", "#ff2d55"];

type Overview = {
  totalCost: number;
  totalSpans: number;
  models: { model: string; totalCost: number; count: number }[];
};

type TimeseriesRow = {
  day: string;
  group_key: string;
  total_cost: string;
};

export default function CostsPage() {
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
  const dailyAvg = overview ? overview.totalCost / days : 0;
  const topModel = overview?.models?.[0];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px" }}>Costs</h1>
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
          <Card label="Total Spend" value={fmt(overview.totalCost)} sub={`${days} days`} />
          <Card label="Daily Average" value={fmt(dailyAvg)} sub="per day" />
          <Card
            label="Top Consumer"
            value={<span style={{ fontSize: 20 }}>{topModel?.model ?? "—"}</span>}
            sub={topModel ? fmt(topModel.totalCost) : undefined}
          />
          <Card label="Total Spans" value={overview.totalSpans.toLocaleString()} sub="billed calls" />
        </div>
      )}

      <div className="glass" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>Daily Cost by Model</div>
        <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 24 }}>
          Stacked daily spend &middot; last {days} days
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timeseries}>
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
              <Bar key={m} dataKey={m} stackId="cost" fill={COLORS[i % COLORS.length]} radius={i === models.length - 1 ? [4, 4, 0, 0] : undefined} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {overview && overview.models.length > 0 && (
        <div className="glass" style={{ padding: 28 }}>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Cost by Model</div>
          {overview.models.map((m, i) => {
            const pct = overview.totalCost > 0 ? (m.totalCost / overview.totalCost) * 100 : 0;
            return (
              <div key={m.model} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < overview.models.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                <div style={{ flex: 1, fontFamily: "monospace", fontSize: 13 }}>{m.model}</div>
                <div style={{ width: 80, textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>{m.count} calls</div>
                <div style={{ width: 100 }}>
                  <div style={{ height: 6, background: "var(--bg-pill)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: 3 }} />
                  </div>
                </div>
                <div style={{ width: 80, textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums", fontSize: 14 }}>
                  ${m.totalCost.toFixed(4)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
