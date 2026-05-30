"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

const API = "http://localhost:8000/api";

interface Agent {
  _id: string;
  name: string;
  role: string;
  system_prompt: string;
  tools: string[];
}

const ACCENT: Record<string, { accent: string; bg: string; text: string }> = {
  Researcher: { accent: "var(--teal)",   bg: "var(--teal-dim)",   text: "var(--teal-text)"  },
  Writer:     { accent: "var(--coral)",  bg: "var(--coral-dim)",  text: "var(--coral-text)" },
  Support:    { accent: "var(--blue)",   bg: "var(--blue-dim)",   text: "var(--blue-text)"  },
  Analyst:    { accent: "var(--amber)",  bg: "var(--amber-dim)",  text: "var(--amber-text)" },
  Custom:     { accent: "var(--purple)", bg: "var(--purple-dim)", text: "var(--purple-text)"},
};
const accentFor = (role: string) =>
  ACCENT[Object.keys(ACCENT).find(k => role.toLowerCase().includes(k.toLowerCase())) ?? "Custom"] ?? ACCENT.Custom;

type FilterKey = "all" | "active" | "telegram";

const EMPTY = { name: "", role: "Researcher", system_prompt: "", tools: "", channel: "None", memory: true, webSearch: true, guardrails: false, scheduled: false };

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    try { const data = await fetch(`${API}/agents`).then(r => r.json()); setAgents(data); }
    catch (e) { console.error(e); }
  };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const resetForm = () => { setForm(EMPTY); setIsCreating(false); setEditingId(null); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.role.trim() || !form.system_prompt.trim()) { alert("Fill all required fields"); return; }
    setIsSaving(true); setSaveMessage("");
    const toolsArray = form.tools.split(",").map(t => t.trim()).filter(Boolean);
    const payload = { name: form.name, role: form.role, system_prompt: form.system_prompt, tools: toolsArray };
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API}/agents/${editingId}` : `${API}/agents`;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setSaveMessage(editingId ? "Updated!" : "Created!"); fetchAgents(); resetForm(); }
      else { setSaveMessage("Save failed."); }
    } catch { setSaveMessage("Save failed."); }
    setIsSaving(false); setTimeout(() => setSaveMessage(""), 3000);
  };

  const handleEdit = (a: Agent) => {
    setForm({ name: a.name, role: a.role, system_prompt: a.system_prompt, tools: a.tools.join(", "), channel: "None", memory: true, webSearch: true, guardrails: false, scheduled: false });
    setEditingId(a._id); setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this agent?")) return;
    try { const res = await fetch(`${API}/agents/${id}`, { method: "DELETE" }); if (res.ok) fetchAgents(); }
    catch (e) { console.error(e); }
  };

  const inputStyle = { background: "var(--bg4)", border: "1px solid var(--border2)", borderRadius: "var(--r-md)", padding: "7px 10px", color: "var(--text)", width: "100%" } as const;
  const labelStyle = { fontSize: 10, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 5, display: "block" };

  const FILTERS: [FilterKey, string][] = [["all", "All"], ["active", "Active"], ["telegram", "Telegram"]];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar active="agents" />
      <div className="flex flex-col flex-1" style={{ marginLeft: 180 }}>
        <Topbar title="Agents Hub" sub="/agents" />
        <main className="flex-1 overflow-y-auto p-4 anim-in">

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {FILTERS.map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)}
                  style={{
                    padding: "5px 12px", borderRadius: "var(--r-md)", fontSize: 12, fontWeight: 500,
                    cursor: "pointer", background: "transparent", border: "1px solid",
                    borderColor: filter === k ? "var(--teal)" : "var(--border2)",
                    color: filter === k ? "var(--teal-text)" : "var(--text2)",
                  }}
                >
                  {label} {k === "all" ? `(${agents.length})` : ""}
                </button>
              ))}
            </div>
            <button onClick={() => setIsCreating(s => !s)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: "var(--r-md)", background: "var(--teal)", color: "#fff", border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
            >
              <Plus size={14} /> New Agent
            </button>
          </div>

          {/* Create / Edit form */}
          {isCreating && (
            <div className="anim-in mb-4" style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={labelStyle}>{editingId ? "Edit Agent" : "New Agent"}</span>
                <button onClick={resetForm} style={{ fontSize: 11, padding: "4px 10px", borderRadius: "var(--r-md)", background: "transparent", border: "1px solid var(--border2)", color: "var(--text2)", cursor: "pointer" }}>
                  ✕ Cancel
                </button>
              </div>

              <div style={{ padding: 16 }}>
                {/* Name + Role */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>Name</label>
                    <input style={inputStyle} placeholder="e.g. Market Researcher" value={form.name} onChange={e => set("name", e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Role</label>
                    <select style={inputStyle} value={form.role} onChange={e => set("role", e.target.value)}>
                      {["Researcher","Writer","Support","Analyst","Custom"].map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  {/* System prompt */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>System Prompt</label>
                    <textarea style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.6, minHeight: 80 }}
                      placeholder="You are a research agent. Your goal is to..."
                      value={form.system_prompt} onChange={e => set("system_prompt", e.target.value)}
                    />
                  </div>
                  {/* Model */}
                  <div>
                    <label style={labelStyle}>Model</label>
                    <select style={inputStyle}>
                      {["gpt-4o-mini","gpt-4o","llama-3","claude-sonnet-4-6"].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  {/* Channel */}
                  <div>
                    <label style={labelStyle}>Messaging Channel</label>
                    <select style={inputStyle} value={form.channel} onChange={e => set("channel", e.target.value)}>
                      {["None","Telegram","Slack","WhatsApp"].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  {/* Tools */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Tools <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text3)" }}>(comma-separated)</span></label>
                    <input style={inputStyle} placeholder="e.g. web_search, file_reader" value={form.tools} onChange={e => set("tools", e.target.value)} />
                  </div>
                </div>

                {/* Capability toggles */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginBottom: 14 }}>
                  <div style={labelStyle as React.CSSProperties}>Capabilities</div>
                  {([
                    ["memory",    form.memory,    "Memory — persist conversation context"],
                    ["webSearch", form.webSearch, "Web Search (Tavily)"],
                    ["guardrails",form.guardrails,"Guardrails — content policy"],
                    ["scheduled", form.scheduled, "Scheduled runs"],
                  ] as [string, boolean, string][]).map(([k, val, label]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--bg4)" }}>
                      <span style={{ fontSize: 12, color: "var(--text2)" }}>{label}</span>
                      {/* Toggle */}
                      <div onClick={() => set(k, !val)} style={{ width: 32, height: 18, borderRadius: 9, cursor: "pointer", position: "relative", background: val ? "var(--teal)" : "var(--border2)", transition: "background .2s", flexShrink: 0 }}>
                        <div style={{ position: "absolute", width: 14, height: 14, background: "#fff", borderRadius: "50%", top: 2, left: val ? 16 : 2, transition: "left .2s" }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                  {saveMessage && <span style={{ fontSize: 12, color: saveMessage.includes("failed") ? "var(--coral-text)" : "var(--teal-text)" }}>{saveMessage}</span>}
                  <button onClick={handleSave} disabled={isSaving}
                    style={{ padding: "6px 16px", borderRadius: "var(--r-md)", background: "var(--teal)", color: "#fff", border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", opacity: isSaving ? 0.5 : 1 }}
                  >
                    {isSaving ? "Saving…" : editingId ? "Update →" : "Deploy agent →"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Agent cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {agents.map(agent => {
              const col = accentFor(agent.role);
              return (
                <div key={agent._id} style={{ background: "var(--bg4)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "14px", position: "relative", overflow: "hidden", cursor: "pointer" }}>
                  {/* Accent strip */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: col.accent }} />
                  {/* Avatar */}
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: col.bg, color: col.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginBottom: 10 }}>
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{agent.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", margin: "3px 0 10px" }}>{agent.role}</div>
                    </div>
                    <div style={{ display: "flex", gap: 2 }}>
                      <button onClick={() => handleEdit(agent)} title="Edit"
                        style={{ width: 28, height: 28, borderRadius: "var(--r-sm)", background: "transparent", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(agent._id)} title="Delete"
                        style={{ width: 28, height: 28, borderRadius: "var(--r-sm)", background: "transparent", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {agent.system_prompt}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {agent.tools.map(t => (
                      <span key={t} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontFamily: "var(--font-mono)", background: col.bg, color: col.text }}>{t}</span>
                    ))}
                  </div>
                </div>
              );
            })}
            {/* Add card */}
            <div onClick={() => setIsCreating(true)}
              style={{ background: "transparent", border: "1px dashed var(--border2)", borderRadius: "var(--r-lg)", padding: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", color: "var(--text3)", fontSize: 12, minHeight: 120 }}>
              <Plus size={14} /> Create agent
            </div>
          </div>

          {agents.length === 0 && !isCreating && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)" }}>No agents yet. Create your first agent to get started.</div>
          )}
        </main>
      </div>
    </div>
  );
}
