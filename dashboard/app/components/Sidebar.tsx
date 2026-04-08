"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview", icon: "◉" },
  { href: "/traces", label: "Traces", icon: "⫘" },
  { href: "/models", label: "Models", icon: "◧" },
  { href: "/costs", label: "Costs", icon: "$" },
  { href: "/prompts", label: "Prompts", icon: "¶" },
  { href: "/live", label: "Live", icon: "●" },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside
      style={{
        width: 220,
        borderRight: "1px solid var(--border)",
        padding: "24px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        background: "rgba(255,255,255,0.5)",
        backdropFilter: "var(--blur)",
        WebkitBackdropFilter: "var(--blur)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            background: "var(--text-primary)",
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          T
        </div>
        <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.3px" }}>
          Traces
        </span>
      </div>

      {NAV.map((item) => {
        const active = path === item.href || (item.href !== "/" && path.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 14px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: active ? 500 : 400,
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              background: active ? "var(--bg-pill-active)" : "transparent",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 14, opacity: 0.7, width: 18, textAlign: "center" }}>
              {item.icon}
            </span>
            {item.label}
            {item.label === "Live" && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--positive)",
                  marginLeft: "auto",
                  animation: "pulse 2s infinite",
                }}
              />
            )}
          </Link>
        );
      })}

      <div style={{ marginTop: "auto", padding: "12px 14px" }}>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          traces-dev v0.1.0
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </aside>
  );
}
