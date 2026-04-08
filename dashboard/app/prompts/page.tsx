"use client";
import { useEffect, useState } from "react";
import { api } from "../components/api";

type Prompt = {
  id: string;
  name: string;
  version: number;
  template: string;
  variables: any;
  metadata: any;
  createdAt: string;
};

type PromptVersions = {
  name: string;
  versions: Prompt[];
};

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selected, setSelected] = useState<PromptVersions | null>(null);
  const [diffIdx, setDiffIdx] = useState<number | null>(null);

  useEffect(() => {
    api<{ items: Prompt[] }>("/api/prompts")
      .then((d) => setPrompts(d.items ?? []))
      .catch(console.error);
  }, []);

  const openPrompt = (name: string) => {
    api<PromptVersions>(`/api/prompts/${encodeURIComponent(name)}`)
      .then((d) => { setSelected(d); setDiffIdx(null); })
      .catch(console.error);
  };

  if (selected) {
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => setSelected(null)} style={{ fontSize: 13, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
            &larr; Back to Prompts
          </button>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px", marginBottom: 24 }}>
          {selected.name}
          <span style={{ fontSize: 14, color: "var(--text-tertiary)", fontWeight: 400, marginLeft: 12 }}>
            {selected.versions.length} versions
          </span>
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
          <div className="glass" style={{ padding: 16, alignSelf: "start" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)" }}>Versions</div>
            {selected.versions.map((v, i) => (
              <div
                key={v.id}
                onClick={() => setDiffIdx(i)}
                style={{
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                  background: diffIdx === i ? "var(--bg-pill-active)" : "transparent",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 500 }}>v{v.version}</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {new Date(v.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          <div className="glass" style={{ padding: 24 }}>
            {diffIdx !== null ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                  Version {selected.versions[diffIdx].version}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16 }}>
                  {new Date(selected.versions[diffIdx].createdAt).toLocaleString()}
                </div>
                <pre style={{
                  fontSize: 13, lineHeight: 1.6, background: "var(--bg-pill)", padding: 20,
                  borderRadius: 10, overflow: "auto", maxHeight: 500, whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                }}>
                  {selected.versions[diffIdx].template}
                </pre>
                {selected.versions[diffIdx].variables && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>Variables</div>
                    <pre style={{ fontSize: 12, background: "var(--bg-pill)", padding: 12, borderRadius: 8, fontFamily: "monospace" }}>
                      {JSON.stringify(selected.versions[diffIdx].variables, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>
                Select a version to view
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px", marginBottom: 32 }}>Prompts</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {prompts.map((p) => (
          <div
            key={p.id}
            className="glass"
            style={{ padding: 24, cursor: "pointer" }}
            onClick={() => openPrompt(p.name)}
          >
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 12 }}>
              v{p.version} &middot; {new Date(p.createdAt).toLocaleDateString()}
            </div>
            <pre style={{
              fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-pill)",
              padding: 12, borderRadius: 8, overflow: "hidden", maxHeight: 80, whiteSpace: "pre-wrap",
              fontFamily: "monospace",
            }}>
              {p.template.slice(0, 200)}{p.template.length > 200 ? "..." : ""}
            </pre>
          </div>
        ))}

        {prompts.length === 0 && (
          <div style={{ padding: 40, color: "var(--text-tertiary)", gridColumn: "1 / -1", textAlign: "center" }}>
            No prompts yet. Create one via POST /api/prompts.
          </div>
        )}
      </div>
    </div>
  );
}
