"use client";
import { useEffect, useState } from "react";
import { api } from "../components/api";

type Trace = {
  id: string;
  name: string;
  userId: string;
  sessionId: string;
  createdAt: string;
  spanCount: number;
  totalLatency: number;
  totalCost: number;
};

type Span = {
  id: string;
  name: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: string;
  latencyMs: number;
  tokensPerSec: string;
  status: string;
  error: string | null;
  input: any;
  output: any;
};

type TraceDetail = Trace & { spans: Span[] };

const COLORS: Record<string, string> = {
  anthropic: "var(--data-blue)",
  openai: "var(--data-red)",
  google: "var(--data-green)",
  ollama: "var(--data-gray)",
};

export default function TracesPage() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<TraceDetail | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);

  useEffect(() => {
    const params = search ? `?name=${encodeURIComponent(search)}` : "";
    api<{ items: Trace[]; total: number }>(`/api/traces${params}`)
      .then((d) => { setTraces(d.items); setTotal(d.total); })
      .catch(console.error);
  }, [search]);

  const openTrace = (id: string) => {
    api<TraceDetail>(`/api/traces/${id}`).then((d) => { setDetail(d); setSelectedSpan(null); }).catch(console.error);
  };

  if (detail) {
    const maxLatency = Math.max(...detail.spans.map((s) => s.latencyMs || 1), 1);
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => setDetail(null)} style={{ fontSize: 13, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
            &larr; Back to Traces
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px" }}>{detail.name ?? "Trace"}</h1>
          <span style={{ fontSize: 13, color: "var(--text-tertiary)", fontFamily: "monospace" }}>{detail.id.slice(0, 8)}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: selectedSpan ? "1fr 380px" : "1fr", gap: 20 }}>
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Span Waterfall</div>
            {detail.spans.map((span) => {
              const width = Math.max(((span.latencyMs || 0) / maxLatency) * 100, 4);
              const color = COLORS[span.provider ?? ""] ?? "var(--data-gray)";
              return (
                <div key={span.id} onClick={() => setSelectedSpan(span.id === selectedSpan?.id ? null : span)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                    background: selectedSpan?.id === span.id ? "var(--bg-pill-active)" : "transparent" }}>
                  <div style={{ width: 140, fontSize: 13, fontWeight: 500, flexShrink: 0 }}>{span.name ?? "span"}</div>
                  <div style={{ flex: 1, height: 24, background: "var(--bg-pill)", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ width: `${width}%`, height: "100%", background: color, opacity: 0.8, borderRadius: 6,
                      display: "flex", alignItems: "center", paddingLeft: 8 }}>
                      <span style={{ fontSize: 11, color: "white", fontWeight: 500 }}>{span.latencyMs}ms</span>
                    </div>
                  </div>
                  <div style={{ width: 80, fontSize: 12, color: "var(--text-tertiary)", fontFamily: "monospace", textAlign: "right" }}>
                    {span.model}
                  </div>
                </div>
              );
            })}
          </div>
          {selectedSpan && (
            <div className="glass" style={{ padding: 24, alignSelf: "start" }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{selectedSpan.name}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <Row label="Model" value={selectedSpan.model} />
                <Row label="Provider" value={selectedSpan.provider} />
                <Row label="Latency" value={`${selectedSpan.latencyMs}ms`} />
                <Row label="Tokens" value={`${selectedSpan.inputTokens} in / ${selectedSpan.outputTokens} out`} />
                <Row label="Cost" value={`$${parseFloat(selectedSpan.costUsd ?? "0").toFixed(6)}`} />
                <Row label="tok/s" value={selectedSpan.tokensPerSec ? parseFloat(selectedSpan.tokensPerSec).toFixed(1) : "—"} />
                <Row label="Status" value={
                  <span className={`badge badge-${selectedSpan.status}`}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: selectedSpan.status === "ok" ? "var(--positive)" : "var(--negative)" }} />
                    {selectedSpan.status}
                  </span>
                } />
                {selectedSpan.error && <Row label="Error" value={<span style={{ color: "var(--negative)" }}>{selectedSpan.error}</span>} />}
                {selectedSpan.input && (
                  <div>
                    <div style={{ color: "var(--text-tertiary)", marginBottom: 4, fontWeight: 500 }}>Input</div>
                    <pre style={{ fontSize: 12, background: "var(--bg-pill)", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 200, whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(selectedSpan.input, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedSpan.output && (
                  <div>
                    <div style={{ color: "var(--text-tertiary)", marginBottom: 4, fontWeight: 500 }}>Output</div>
                    <pre style={{ fontSize: 12, background: "var(--bg-pill)", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 200, whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(selectedSpan.output, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px" }}>Traces</h1>
        <input placeholder="Search traces..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: 14, padding: "8px 14px", border: "1px solid var(--border)", borderRadius: 8,
            background: "rgba(0,0,0,0.03)", color: "var(--text-primary)", outline: "none", width: 280 }} />
      </div>
      <div className="glass" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Name", "User", "Spans", "Latency", "Cost", "Time"].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)",
                  textTransform: "uppercase", letterSpacing: "0.03em", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {traces.map((t) => (
              <tr key={t.id} style={{ cursor: "pointer", borderBottom: "1px solid var(--border)" }} onClick={() => openTrace(t.id)}>
                <td style={{ padding: "14px 16px", fontWeight: 500 }}>{t.name ?? "—"}</td>
                <td style={{ padding: "14px 16px", color: "var(--text-secondary)", fontSize: 13 }}>{t.userId ?? "—"}</td>
                <td style={{ padding: "14px 16px", fontVariantNumeric: "tabular-nums" }}>{t.spanCount}</td>
                <td style={{ padding: "14px 16px", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", fontSize: 13 }}>{t.totalLatency?.toLocaleString()}ms</td>
                <td style={{ padding: "14px 16px", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", fontSize: 13 }}>${Number(t.totalCost).toFixed(4)}</td>
                <td style={{ padding: "14px 16px", color: "var(--text-tertiary)", fontSize: 13 }}>{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {traces.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>No traces yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-tertiary)" }}>{total} traces total</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <span style={{ fontFamily: typeof value === "string" ? "monospace" : undefined, fontSize: 13 }}>{value}</span>
    </div>
  );
}
