"use client";
import { useEffect, useRef, useState } from "react";

type LiveSpan = {
  id: string;
  traceId: string;
  name: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: string;
  latencyMs: number;
  status: string;
  createdAt: string;
};

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "var(--data-blue)",
  openai: "var(--data-red)",
  google: "var(--data-green)",
  ollama: "var(--data-gray)",
};

export default function LivePage() {
  const [spans, setSpans] = useState<LiveSpan[]>([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3100").replace(/^http/, "ws");
    const ws = new WebSocket(`${wsUrl}/api/live`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (e) => {
      if (pausedRef.current) return;
      try {
        const span = JSON.parse(e.data);
        setSpans((prev) => [span, ...prev].slice(0, 200));
      } catch {}
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    if (!paused && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [spans, paused]);

  const filtered = filter
    ? spans.filter((s) => s.model?.includes(filter) || s.name?.includes(filter) || s.provider?.includes(filter))
    : spans;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px" }}>Live Feed</h1>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: connected ? "var(--positive)" : "var(--negative)",
              animation: connected ? "pulse 2s infinite" : "none",
            }}
          />
          <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            placeholder="Filter by model, name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              fontSize: 13, padding: "7px 12px", border: "1px solid var(--border)",
              borderRadius: 8, background: "rgba(0,0,0,0.03)", outline: "none", width: 200,
            }}
          />
          <button
            onClick={() => setPaused(!paused)}
            style={{
              fontSize: 13, fontWeight: 500, padding: "7px 16px", border: "none",
              borderRadius: 8, cursor: "pointer",
              background: paused ? "var(--accent)" : "var(--bg-pill-active)",
              color: paused ? "white" : "var(--text-primary)",
            }}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => setSpans([])}
            style={{
              fontSize: 13, padding: "7px 16px", border: "none", borderRadius: 8,
              cursor: "pointer", background: "var(--bg-pill)", color: "var(--text-secondary)",
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <div
        ref={feedRef}
        className="glass"
        style={{ padding: 0, overflow: "hidden", maxHeight: "calc(100vh - 160px)", overflowY: "auto" }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "var(--blur)", zIndex: 1 }}>
            <tr>
              {["Time", "Name", "Model", "Tokens", "Latency", "Cost", "Status"].map((h) => (
                <th key={h} style={{
                  textAlign: "left", fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)",
                  textTransform: "uppercase", letterSpacing: "0.03em", padding: "10px 14px",
                  borderBottom: "1px solid var(--border)",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id ?? i} style={{
                borderBottom: "1px solid var(--border)",
                animation: i === 0 && !paused ? "fadeIn 0.3s ease" : "none",
              }}>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                  {new Date(s.createdAt).toLocaleTimeString()}
                </td>
                <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500 }}>
                  {s.name ?? "—"}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: PROVIDER_COLORS[s.provider] ?? "var(--data-gray)" }} />
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>{s.model}</span>
                  </span>
                </td>
                <td style={{ padding: "10px 14px", fontVariantNumeric: "tabular-nums", fontSize: 12, fontFamily: "monospace" }}>
                  {s.inputTokens + s.outputTokens}
                </td>
                <td style={{ padding: "10px 14px", fontVariantNumeric: "tabular-nums", fontSize: 12, fontFamily: "monospace" }}>
                  {s.latencyMs}ms
                </td>
                <td style={{ padding: "10px 14px", fontVariantNumeric: "tabular-nums", fontSize: 12, fontFamily: "monospace" }}>
                  ${parseFloat(s.costUsd ?? "0").toFixed(4)}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span className={`badge badge-${s.status}`}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.status === "ok" ? "var(--positive)" : "var(--negative)" }} />
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 60, textAlign: "center", color: "var(--text-tertiary)", fontSize: 14 }}>
                  {connected ? "Waiting for spans... Send data to the ingest API." : "Connecting to WebSocket..."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
