"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

const API = "http://localhost:8000/api";

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

export default function HistoryPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selected, setSelected] = useState<Execution | null>(null);

  useEffect(() => { fetchExecutions(); fetchWorkflows(); }, []);

  const fetchExecutions = async () => {
    try { const data = await fetch(`${API}/executions`).then(r => r.json()); setExecutions(data); if (data.length) setSelected(data[0]); }
    catch (e) { console.error(e); }
  };
  const fetchWorkflows = async () => {
    try { const data = await fetch(`${API}/workflows`).then(r => r.json()); setWorkflows(data); }
    catch (e) { console.error(e); }
  };

  const nameFor = (wid?: string) => workflows.find(w => w._id === wid)?.name || wid || "—";

  const monoStyle = { fontFamily: "var(--font-mono)" } as const;
  const panelStyle = { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden" } as const;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar active="history" />
      <div className="flex flex-col flex-1" style={{ marginLeft: 180 }}>
        <Topbar title="Chat History" sub="/history" />

        <main className="flex-1 overflow-hidden p-4 anim-in">
          <div style={{ ...panelStyle, height: "100%", display: "grid", gridTemplateColumns: "220px 1fr", overflow: "hidden" }}>

            {/* Conversation list */}
            <div style={{ borderRight: "1px solid var(--border)", overflowY: "auto" }}>
              <div style={{ padding: "10px 12px", fontSize: 10, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", borderBottom: "1px solid var(--bg4)" }}>
                Executions
              </div>
              {executions.length === 0 && (
                <div style={{ padding: "30px 12px", textAlign: "center", color: "var(--text3)", fontSize: 12 }}>No executions yet</div>
              )}
              {executions.map(ex => (
                <div key={ex._id} onClick={() => setSelected(ex)}
                  style={{
                    padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--bg4)",
                    borderLeft: `2px solid ${selected?._id === ex._id ? "var(--teal)" : "transparent"}`,
                    background: selected?._id === ex._id ? "var(--bg4)" : "transparent",
                    transition: "all .1s",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{nameFor(ex.workflow_id)}</span>
                    <span style={{ fontSize: 10, color: "var(--text3)", ...monoStyle }}>{ex.timestamp?.slice(11, 16) || "—"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 5 }}>
                    {(ex.user_prompt || ex.output || "—").slice(0, 40)}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 10, ...monoStyle, background: ex.trigger === "Telegram" ? "var(--blue-dim)" : "var(--bg4)", color: ex.trigger === "Telegram" ? "var(--blue-text)" : "var(--text3)" }}>
                      {ex.trigger || "API"}
                    </span>
                    <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 10, ...monoStyle, background: ex.status === "error" ? "var(--coral-dim)" : "var(--teal-dim)", color: ex.status === "error" ? "var(--coral-text)" : "var(--teal-text)" }}>
                      {ex.status || "success"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Message detail panel */}
            {!selected ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 13 }}>
                Select an execution to view output
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--teal-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{nameFor(selected.workflow_id)}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>via {selected.trigger || "API"} · {selected.timestamp || "—"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, ...monoStyle, background: "var(--purple-dim)", color: "var(--purple-text)" }}>
                      {selected.token_count ?? 0} tokens
                    </span>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, ...monoStyle, background: selected.status === "error" ? "var(--coral-dim)" : "var(--teal-dim)", color: selected.status === "error" ? "var(--coral-text)" : "var(--teal-text)" }}>
                      {selected.status || "success"}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* User prompt bubble */}
                  {selected.user_prompt && (
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--blue-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>👤</div>
                      <div style={{ maxWidth: 480, padding: "8px 12px", borderRadius: 10, borderBottomLeftRadius: 2, fontSize: 12, lineHeight: 1.6, background: "var(--bg4)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                        {selected.user_prompt}
                      </div>
                    </div>
                  )}
                  {/* Agent output bubble */}
                  {selected.output && (
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexDirection: "row-reverse" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--teal-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>🤖</div>
                      <div style={{ maxWidth: 480, padding: "8px 12px", borderRadius: 10, borderBottomRightRadius: 2, fontSize: 12, lineHeight: 1.6, background: "var(--teal-dim)", color: "var(--text)" }}>
                        <pre style={{ whiteSpace: "pre-wrap", ...monoStyle, fontSize: 11 }}>{selected.output}</pre>
                      </div>
                    </div>
                  )}
                  {!selected.user_prompt && !selected.output && (
                    <div style={{ textAlign: "center", color: "var(--text3)", fontSize: 12, padding: "30px 0" }}>No message content</div>
                  )}
                </div>

                {/* Reply bar (admin read-only notice) */}
                <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    disabled
                    placeholder="Read-only — replies sent via Telegram bot"
                    style={{ flex: 1, background: "var(--bg4)", border: "1px solid var(--border2)", borderRadius: "var(--r-md)", padding: "7px 10px", color: "var(--text3)", fontSize: 12, cursor: "not-allowed" }}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
