export default function Topbar({ title, sub }: { title: string; sub: string }) {
  return (
    <header
      className="flex items-center gap-3 shrink-0"
      style={{
        height: 44, background: "var(--bg2)", borderBottom: "1px solid var(--border)",
        padding: "0 16px",
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{title}</span>
      <span style={{ fontSize: 12, color: "var(--text3)" }}>{sub}</span>

      <div className="ml-auto flex items-center gap-2">
        {/* Runtime badge */}
        <span
          className="flex items-center gap-1.5"
          style={{
            padding: "2px 8px", borderRadius: 4, fontSize: 11,
            fontFamily: "var(--font-mono)", fontWeight: 500,
            background: "var(--teal-dim)", color: "var(--teal-text)",
          }}
        >
          <span className="live-dot" />
          Runtime: Active
        </span>
        {/* Version */}
        <span
          style={{
            padding: "2px 8px", borderRadius: 4, fontSize: 10,
            fontFamily: "var(--font-mono)",
            background: "var(--amber-dim)", color: "var(--amber-text)",
          }}
        >
          v0.4.2
        </span>
        {/* Avatar */}
        <div
          className="flex items-center justify-center font-semibold"
          style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "var(--teal-dim)", color: "var(--teal-text)", fontSize: 11,
          }}
        >
          A
        </div>
      </div>
    </header>
  );
}
