"use client";
import { useEffect, useState } from "react";
import { api } from "../components/api";

const COLORS: Record<string, string> = {
  anthropic: "var(--data-blue)",
  openai: "var(--data-red)",
  google: "var(--data-green)",
  deepseek: "var(--data-teal)",
  ollama: "var(--data-gray)",
};

type Model = {
  model: string;
  provider: string;
  total_calls: string;
  total_cost: number;
  avg_latency_ms: string;
  avg_tokens_per_sec: string;
  total_input_tokens: string;
  total_output_tokens: string;
  error_count: string;
  error_rate: string;
};

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    api<{ models: Model[] }>(`/api/stats/models?days=${days}`)
      .then((d) => setModels(d.models))
      .catch(console.error);
  }, [days]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px" }}>Models</h1>
        <div className="pill-group">
          {[7, 14, 30, 90].map((d) => (
            <button key={d} className={days === d ? "active" : ""} onClick={() => setDays(d)}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340, 1fr))", gap: 12 }}>
        {models.map((m) => (
          <div key={m.model} className="glass" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: COLORS[m.provider] ?? "var(--data-gray)",
              }} />
              <div>
                <div style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 600 }}>{m.model}</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{m.provider}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Stat label="Calls" value={parseInt(m.total_calls).toLocaleString()} />
              <Stat label="Cost" value={`$${m.total_cost.toFixed(4)}`} />
              <Stat label="Avg Latency" value={`${m.avg_latency_ms}ms`} />
              <Stat label="tok/s" value={m.avg_tokens_per_sec ? parseFloat(m.avg_tokens_per_sec).toFixed(1) : "—"} />
              <Stat label="Input Tokens" value={parseInt(m.total_input_tokens).toLocaleString()} />
              <Stat label="Output Tokens" value={parseInt(m.total_output_tokens).toLocaleString()} />
              <Stat label="Errors" value={m.error_count} highlight={parseInt(m.error_count) > 0} />
              <Stat label="Error Rate" value={`${m.error_rate}%`} highlight={parseFloat(m.error_rate) > 5} />
            </div>
          </div>
        ))}

        {models.length === 0 && (
          <div style={{ padding: 40, color: "var(--text-tertiary)", gridColumn: "1 / -1", textAlign: "center" }}>
            No model data yet.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
        {label}
      </div>
      <div style={{
        fontSize: 15, fontWeight: 500, fontVariantNumeric: "tabular-nums",
        color: highlight ? "var(--negative)" : "var(--text-primary)",
      }}>
        {value}
      </div>
    </div>
  );
}
