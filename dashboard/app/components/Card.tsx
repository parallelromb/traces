import { CSSProperties, ReactNode } from "react";

export function Card({
  label,
  value,
  sub,
  style,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="glass" style={{ padding: 24, ...style }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.02em",
          color: "var(--text-tertiary)",
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: "-1.5px",
          lineHeight: 1,
          marginBottom: 6,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{sub}</div>
      )}
    </div>
  );
}
