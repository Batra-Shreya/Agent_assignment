"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface Execution {
  _id: string;
  workflow_id: string;
  user_prompt?: string;
  output?: string;
  token_count?: number;
  status?: string;
  timestamp?: string;
  trigger?: string;
}

interface Workflow {
  _id: string;
  name: string;
}

// Demo log lines shown when no real data exists yet
const DEMO_LOGS = [
  { time: "10:42:01", agent: "Researcher", color: "var(--teal-text)",   msg: "INIT Agent started · model=gpt-4o-mini" },
  { time: "10:42:03", agent: "Researcher", color: "var(--teal-text)",   msg: "Calling tavily_search → \"AI agent frameworks 2025\"" },
  { time: "10:42:05", agent: "Researcher", color: "var(--teal-text)",   msg: "Tool returned 8 results · 1,240 tokens consumed" },
  { time: "10:42:06", agent: "Researcher", color: "var(--teal-text)",   msg: "→ dispatching context to Writer" },
  { time: "10:42:07", agent: "Writer",     color: "var(--coral-text)",  msg: "RECV context from Researcher · 980 tokens" },
  { time: "10:42:09", agent: "Writer",     color: "var(--coral-text)",  msg: "Generating draft · prompt=1,820 tok · cost≈$0.003" },
  { time: "10:42:11", agent: "Writer",     color: "var(--coral-text)",  msg: "Draft complete · 720 tokens output" },
  { time: "10:42:12", agent: "Runtime",    color: "var(--amber-text)",  msg: "DONE Workflow completed · total=$0.04 · 4m 12s" },
];

export default function MonitoringPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleLogs, setVisibleLogs] = useState(DEMO_LOGS.slice(0, 4));
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchExecutions(); fetchWorkflows(); }, []);

  // Auto-refresh executions
  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(fetchExecutions, 5000);
    return () => clearInterval(t);
  }, [isLive]);

  // Simulate streaming demo logs
  useEffect(() => {
    let i = 4;
    const t = setInterval(() => {
      if (i < DEMO_LOGS.length) { setVisibleLogs(l => [...l, DEMO_LOGS[i++]]); }
      else { clearInterval(t); }
    }, 1400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [visibleLogs]);

  const fetchExecutions = async () => {
    try { const data = await fetch(`${API}/executions`).then(r => r.json()); setExecutions(data); }
    catch (e) { console.error(e); }
  };
  const fetchWorkflows = async () => {
    try { const data = await fetch(`${API}/workflows`).then(r => r.json()); setWorkflows(data); }
    catch (e) { console.error(e); }
  };

  const nameFor = (wid?: string) => workflows.find(w => w._id === wid)?.name || wid || "—";

  const totalTokens = executions.reduce((s, e) => s + (e.token_count || 0), 0);
  const estimatedCost = (totalTokens / 1000 * 0.002).toFixed(4);
  const successCount = executions.filter(e => e.status !== "error").length;
  const successRate = executions.length ? Math.round(successCount / executions.length * 100) + "%" : "—";
  const selectedEx = executions.find(e => e._id === selectedId);

  const recentTen = executions.slice(-10);
  const maxTok = Math.max(...recentTen.map(e => e.token_count || 0), 1);

  const panelStyle = { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden" } as const;
  const labelStyle = { fontSize: 10, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".6px" };
  const monoStyle = { fontFamily: "var(--font-mono)" };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar active="monitoring" />
      <div className="flex flex-col flex-1" style={{ marginLeft: 180 }}>
        <Topbar title="Live Monitoring" sub="/monitoring" />
        <main className="flex-1 overflow-y-auto p-4 anim-in">

          {/* Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { v: executions.length.toString(), l: "Total Executions", c: "var(--teal)"   },
              { v: totalTokens.toLocaleString(), l: "Total Tokens",     c: "var(--purple)" },
              { v: `$${estimatedCost}`,           l: "Est. Cost",        c: "var(--amber)"  },
              { v: successRate,                   l: "Success Rate",     c: "var(--teal)"   },
            ].map(({ v, l, c }) => (
              <div key={l} style={{ background: "var(--bg4)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "14px 16px" }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: c, ...monoStyle, lineHeight: 1 }}>{v}</div>
                <div style={{ ...labelStyle, marginTop: 5 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Live agent log */}
          <div style={{ ...panelStyle, marginBottom: 12 }}>
            <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={labelStyle}>Live Agent Log</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="live-dot" />
                <span style={{ fontSize: 11, color: "var(--teal-text)", ...monoStyle }}>streaming</span>
                <button onClick={() => setVisibleLogs(DEMO_LOGS.slice(0, 4))}
                  style={{ fontSize: 10, padding: "4px 8px", borderRadius: "var(--r-sm)", background: "transparent", border: "1px solid var(--border2)", color: "var(--text2)", cursor: "pointer" }}>
                  Clear
                </button>
              </div>
            </div>
            <div style={{ padding: "10px 14px", maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
              {visibleLogs.map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "4px 0", borderBottom: "1px solid var(--bg4)", ...monoStyle, fontSize: 11, lineHeight: 1.8, animation: i === visibleLogs.length - 1 ? "slideIn .2s ease both" : "none" }}>
                  <span style={{ color: "var(--text3)", flexShrink: 0 }}>{l.time}</span>
                  <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 10, background: "var(--bg4)", color: l.color, flexShrink: 0 }}>{l.agent}</span>
                  <span style={{ color: "var(--text2)", flex: 1 }}>{l.msg}</span>
                </div>
              ))}
              {visibleLogs.length < DEMO_LOGS.length && (
                <div style={{ padding: "4px 0", color: "var(--text3)", fontSize: 11, ...monoStyle, animation: "pulse 1s infinite" }}>▌</div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 12 }}>
            {/* Token breakdown */}
            <div style={panelStyle}>
              <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)" }}>
                <span style={labelStyle}>Token Breakdown · session</span>
              </div>
              {recentTen.length === 0 ? (
                <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--text3)", fontSize: 12 }}>No token data yet</div>
              ) : (
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {recentTen.map(ex => {
                    const pct = ((ex.token_count || 0) / maxTok) * 100;
                    return (
                      <div key={ex._id}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                          <span style={{ color: "var(--text2)" }}>{nameFor(ex.workflow_id).slice(0, 20)}</span>
                          <span style={{ ...monoStyle, color: "var(--teal-text)" }}>{ex.token_count ?? 0}</span>
                        </div>
                        <div style={{ height: 4, background: "var(--bg4)", borderRadius: 2 }}>
                          <div style={{ height: 4, width: `${pct}%`, borderRadius: 2, background: "var(--teal)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Execution detail */}
            <div style={panelStyle}>
              <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={labelStyle}>Execution Log</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setIsLive(v => !v)}
                    style={{ padding: "3px 10px", borderRadius: "var(--r-sm)", fontSize: 11, border: "1px solid", cursor: "pointer", background: isLive ? "var(--teal-dim)" : "transparent", borderColor: isLive ? "var(--teal)" : "var(--border2)", color: isLive ? "var(--teal-text)" : "var(--text2)" }}>
                    {isLive ? "● LIVE" : "○ PAUSED"}
                  </button>
                  <button onClick={fetchExecutions} style={{ background: "transparent", border: "1px solid var(--border2)", borderRadius: "var(--r-sm)", padding: "3px 6px", cursor: "pointer", color: "var(--text3)", display: "flex" }}>
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {executions.length === 0 && (
                  <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--text3)", fontSize: 12 }}>No executions yet</div>
                )}
                {executions.map(ex => (
                  <div key={ex._id} onClick={() => setSelectedId(ex._id === selectedId ? null : ex._id)}
                    style={{ padding: "10px 16px", cursor: "pointer", borderLeft: "2px solid", borderBottom: "1px solid var(--bg4)", borderLeftColor: selectedId === ex._id ? "var(--teal)" : "transparent", background: selectedId === ex._id ? "var(--teal-dim)" : "transparent" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{nameFor(ex.workflow_id)}</div>
                        <div style={{ fontSize: 10, color: "var(--text3)", ...monoStyle, marginTop: 1 }}>{ex.timestamp || "—"}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                        <span style={{ padding: "1px 7px", borderRadius: 3, fontSize: 10, ...monoStyle, background: ex.status === "error" ? "var(--coral-dim)" : "var(--teal-dim)", color: ex.status === "error" ? "var(--coral-text)" : "var(--teal-text)" }}>
                          {ex.status || "success"}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--purple-text)", ...monoStyle }}>{ex.token_count ?? 0}t</span>
                      </div>
                    </div>
                    {selectedId === ex._id && ex.output && (
                      <pre style={{ marginTop: 8, fontSize: 11, color: "var(--teal-text)", ...monoStyle, whiteSpace: "pre-wrap", maxHeight: 80, overflowY: "auto" }}>{ex.output}</pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
