"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const API = "http://localhost:8000/api";

interface Agent     { _id: string; name: string; role: string; tools: string[]; channels: string[] }
interface Workflow  { _id: string; name: string; description: string; agents: string[] }
interface Execution { _id: string; workflow_id: string; user_prompt?: string; token_count?: number; status?: string; timestamp?: string }

const ROLE_ICONS: Record<string, string> = {
  researcher: "🔍", writer: "✍️", support: "🎧", analyst: "📊",
  marketing: "📣", engineer: "⚙️", compliance: "⚖️", orchestrator: "🕸️",
};
const roleIcon = (role: string) => ROLE_ICONS[role.toLowerCase()] ?? "🤖";

const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const mono = { fontFamily: "var(--font-mono)" } as const;
const label = { fontSize: 10, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".6px" };

export default function HomePage() {
  const [agents,     setAgents]     = useState<Agent[]>([]);
  const [workflows,  setWorkflows]  = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/agents`).then(r => r.json()).catch(() => []),
      fetch(`${API}/workflows`).then(r => r.json()).catch(() => []),
      fetch(`${API}/executions`).then(r => r.json()).catch(() => []),
    ]).then(([a, w, e]) => {
      setAgents(a);
      setWorkflows(w);
      setExecutions(e);
      setLoading(false);
    });
  }, []);

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const today        = new Date().toISOString().slice(0, 10);
  const tokensToday  = executions.filter(e => e.timestamp?.startsWith(today)).reduce((s, e) => s + (e.token_count || 0), 0);
  const costToday    = (tokensToday / 1000 * 0.002).toFixed(3);
  const successCount = executions.filter(e => e.status !== "error").length;
  const completion   = executions.length ? Math.round(successCount / executions.length * 100) : 100;
  const activeWfs    = workflows.filter(w => w.agents?.length > 0).length;

  // 7-day token bars
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const barLabels  = last7.map(d => new Date(d + "T12:00:00").toLocaleDateString("en", { weekday: "short" }));
  const barValues  = last7.map(day => executions.filter(e => e.timestamp?.slice(0, 10) === day).reduce((s, e) => s + (e.token_count || 0), 0));
  const maxBar     = Math.max(...barValues, 1);
  const todayIdx   = 6;

  // Top workflows by tokens
  const wfTokenMap: Record<string, number> = {};
  executions.forEach(e => { if (e.workflow_id) wfTokenMap[e.workflow_id] = (wfTokenMap[e.workflow_id] || 0) + (e.token_count || 0); });
  const topWf = Object.entries(wfTokenMap).sort(([, a], [, b]) => b - a).slice(0, 3)
    .map(([wid, tok]) => [workflows.find(w => w._id === wid)?.name || "Workflow", tok] as [string, number]);

  // Recent runs (last 5 executions)
  const nameFor = (wid: string) => workflows.find(w => w._id === wid)?.name || "—";
  const recentRuns = executions.slice(0, 5);

  // Agents panel — show first 4, status from recency
  const recentAgentIds = new Set(executions.slice(0, 10).map(e => {
    const wf = workflows.find(w => w._id === e.workflow_id);
    return wf?.agents ?? [];
  }).flat());
  const panelAgents = agents.slice(0, 4);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", background: "var(--bg)" }}>
        <Sidebar active="home" />
        <div style={{ flex: 1, marginLeft: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", ...mono }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar active="home" />
      <div className="flex flex-col flex-1" style={{ marginLeft: 180 }}>
        <Topbar title="Dashboard" sub="Overview" />

        <main className="flex-1 overflow-y-auto p-4 anim-in">

          {/* ── Metric cards ── */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { v: agents.length.toString(),   l: "Total Agents",    delta: `${agents.length} configured`,          c: "var(--text)"  },
              { v: activeWfs.toString(),        l: "Active Workflows", delta: `${workflows.length} total`,           c: "var(--text)"  },
              { v: fmtK(tokensToday),           l: "Tokens · today",  delta: `~$${costToday} spent`,                c: "var(--amber)" },
              { v: `${completion}%`,            l: "Task Completion",  delta: `${successCount}/${executions.length} successful`, c: "var(--teal)"  },
            ].map(({ v, l, delta, c }) => (
              <div key={l} style={{ background: "var(--bg4)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "14px 16px" }}>
                <div style={{ fontSize: 24, fontWeight: 600, color: c, ...mono, lineHeight: 1 }}>{v}</div>
                <div style={{ ...label, marginTop: 5 }}>{l}</div>
                <div style={{ fontSize: 11, color: "var(--teal)", marginTop: 6, ...mono }}>{delta}</div>
              </div>
            ))}
          </div>

          {/* ── Middle row ── */}
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "1fr 1fr" }}>

            {/* Active agents */}
            <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
              <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={label}>Active Agents</span>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, ...mono, background: "var(--teal-dim)", color: "var(--teal-text)" }}>
                  {agents.length} online
                </span>
              </div>
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {panelAgents.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--text3)" }}>No agents yet. <Link href="/agents" style={{ color: "var(--teal-text)" }}>Create one →</Link></p>
                )}
                {panelAgents.map((a, i) => {
                  const isRecent = recentAgentIds.has(a._id);
                  const dot = i === 0 ? "var(--teal)" : i === 1 && a.channels?.includes("Telegram") ? "var(--teal)" : i <= 1 ? "var(--amber)" : "var(--text3)";
                  const statusText = isRecent ? `Active · ${a.tools?.[0] || a.role}` : a.channels?.includes("Telegram") ? "Active · Telegram" : "Standby";
                  return (
                    <div key={a._id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                        {roleIcon(a.role)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{statusText}</div>
                      </div>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0, display: "inline-block" }} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Token chart */}
            <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
              <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)" }}>
                <span style={label}>Token Usage · 7d</span>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 64, marginBottom: 8 }}>
                  {barValues.map((val, i) => (
                    <div key={i} style={{ flex: 1, height: `${Math.max((val / maxBar) * 100, val > 0 ? 8 : 2)}%`, borderRadius: "2px 2px 0 0", background: i === todayIdx ? "var(--amber)" : "var(--teal)", opacity: i === todayIdx ? 1 : 0.6, transition: "height .3s" }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", ...mono, marginBottom: 12 }}>
                  {barLabels.map((d, i) => (
                    <span key={i} style={{ color: i === todayIdx ? "var(--amber)" : undefined }}>{d}</span>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {topWf.length === 0 && <span style={{ fontSize: 12, color: "var(--text3)" }}>No token data yet</span>}
                  {topWf.map(([name, tok]) => (
                    <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{name}</span>
                      <span style={{ ...mono, flexShrink: 0 }}>{fmtK(tok)} tok</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Recent runs ── */}
          <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
            <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={label}>Recent Workflow Runs</span>
              <Link href="/history" style={{ fontSize: 11, color: "var(--text2)", background: "transparent", border: "1px solid var(--border2)", borderRadius: "var(--r-md)", padding: "4px 10px" }}>
                View all →
              </Link>
            </div>
            <div style={{ padding: "0 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 160px 90px", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--bg4)", ...label }}>
                <span>Workflow</span><span>Prompt</span><span>Time</span><span>Status</span>
              </div>
              {recentRuns.length === 0 && (
                <div style={{ padding: "20px 0", fontSize: 12, color: "var(--text3)" }}>No runs yet. Execute a workflow to see results here.</div>
              )}
              {recentRuns.map((r, i) => {
                const isErr = r.status === "error";
                const wfColor = isErr ? "var(--coral)" : "var(--teal)";
                return (
                  <div key={r._id} style={{ display: "grid", gridTemplateColumns: "160px 1fr 160px 90px", gap: 8, padding: "9px 0", borderBottom: i < recentRuns.length - 1 ? "1px solid var(--bg4)" : "none", ...mono, fontSize: 11 }}>
                    <span style={{ color: wfColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameFor(r.workflow_id)}</span>
                    <span style={{ color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(r.user_prompt || "—").slice(0, 50)}</span>
                    <span style={{ color: "var(--text3)" }}>{r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, background: isErr ? "var(--coral-dim)" : "var(--teal-dim)", color: isErr ? "var(--coral-text)" : "var(--teal-text)", display: "inline-block" }}>
                      {r.status || "success"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
