"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { Plus, Save, Bot, Trash2, ChevronDown } from "lucide-react";
import Sidebar from "../../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ── Node with optional run-status badge ───────────────────────────────────────
interface NodeData { label: string; role: string; agentId?: string; runStatus?: "running" | "done" | "error" }

function AgentNode({ data }: { data: NodeData }) {
  const s = data.runStatus;
  const borderColor = s === "done" ? "#1D9E75" : s === "running" ? "#EF9F27" : s === "error" ? "#D85A30" : "#1D9E75";
  const statusLabel = s === "done" ? "✓ done" : s === "running" ? "⟳ running" : s === "error" ? "✗ error" : null;
  const statusColor = s === "done" ? "#4DD6A8" : s === "running" ? "#FAC775" : "#F0997B";
  return (
    <div style={{ background: "#1E232A", border: `2px solid ${borderColor}60`, borderRadius: 12, padding: "10px 14px", minWidth: 180, position: "relative" }}>
      <Handle type="target" position={Position.Left} style={{ background: borderColor, width: 10, height: 10, border: "none" }} />
      {statusLabel && (
        <div style={{ position: "absolute", top: 6, right: 8, fontSize: 10, fontFamily: "var(--font-mono)", color: statusColor, animation: s === "running" ? "pulse 1s infinite" : "none" }}>
          {statusLabel}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, paddingRight: statusLabel ? 60 : 0 }}>
        <div style={{ background: "#0D3D30", color: "#4DD6A8", borderRadius: 6, padding: "4px 5px", flexShrink: 0 }}>
          <Bot size={14} />
        </div>
        <span style={{ fontWeight: 600, fontSize: 13, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.label}</span>
      </div>
      <p style={{ fontSize: 11, color: "#8A95A3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.role}</p>
      <Handle type="source" position={Position.Right} style={{ background: borderColor, width: 10, height: 10, border: "none" }} />
    </div>
  );
}

const nodeTypes = { agentNode: AgentNode };

interface Agent  { _id: string; name: string; role: string; system_prompt: string; tools: string[] }
interface Workflow { _id?: string; name: string; description: string; agents: string[]; nodes?: Node[]; edges?: Edge[]; conditions?: { nodes?: Node[]; edges?: Edge[] } }
interface LogEntry { time: string; agent: string; msg: string }
interface RunState { status: "running" | "done" | "error"; runId: string; result: string; tokenCount: number; duration: string; logs: LogEntry[]; nodeCount: number }

export default function WorkflowsPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [agents,         setAgents]         = useState<Agent[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<Workflow[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [workflowName,  setWorkflowName]  = useState("New Workflow");
  const [workflowDesc,  setWorkflowDesc]  = useState("");
  const [isSaving,      setIsSaving]      = useState(false);
  const [saveMessage,   setSaveMessage]   = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLoad,      setShowLoad]      = useState(false);
  const [userPrompt,    setUserPrompt]    = useState("");
  const [activeTab,     setActiveTab]     = useState<"canvas" | "list">("canvas");
  const [runState,      setRunState]      = useState<RunState | null>(null);

  const logEndRef   = useRef<HTMLDivElement>(null);
  const runStartRef = useRef<number>(0);
  const customNodeTypes = useMemo(() => nodeTypes, []);

  useEffect(() => { fetchAgents(); fetchWorkflows(); }, []);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [runState?.logs]);

  const fetchAgents    = async () => { try { setAgents(await fetch(`${API}/agents`).then(r => r.json())); } catch {} };
  const fetchWorkflows = async () => { try { setSavedWorkflows(await fetch(`${API}/workflows`).then(r => r.json())); } catch {} };

  const onConnect = useCallback((c: Connection) =>
    setEdges(eds => addEdge({ ...c, animated: true, style: { stroke: "#1D9E75", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#1D9E75" } }, eds)),
    [setEdges]);

  const addAgentNode = (agent: Agent) => {
    setNodes(nds => [...nds, {
      id: `agent-${agent._id}-${Date.now()}`, type: "agentNode",
      position: { x: 100 + nds.length * 250, y: 150 + (nds.length % 2) * 120 },
      data: { label: agent.name, role: agent.role, agentId: agent._id },
    }]);
  };

  const handleSave = async () => {
    if (!workflowName.trim()) return;
    setIsSaving(true); setSaveMessage("");
    const agentIds = nodes.map(n => n.data.agentId).filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
    const payload = { name: workflowName, description: workflowDesc, agents: agentIds, conditions: { nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })), edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target })) } };
    try {
      const method = activeWorkflowId ? "PUT" : "POST";
      const url    = activeWorkflowId ? `${API}/workflows/${activeWorkflowId}` : `${API}/workflows`;
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { const saved = await res.json(); setActiveWorkflowId(saved._id || activeWorkflowId); setSaveMessage("Saved!"); fetchWorkflows(); }
      else setSaveMessage("Save failed.");
    } catch { setSaveMessage("Save failed."); }
    setIsSaving(false); setTimeout(() => setSaveMessage(""), 3000);
  };

  // ── Execute — auto-save canvas first, then run ───────────────────────────
  const handleExecute = async () => {
    if (nodes.length === 0)    { alert("Add at least one agent to the canvas before running."); return; }
    if (!userPrompt.trim())    { alert("Enter a prompt first."); return; }

    // Always sync the current canvas to the DB so the backend runs exactly
    // what's on screen (not stale agent IDs from a previous save).
    const agentIds = nodes.map(n => n.data.agentId).filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
    const payload  = { name: workflowName, description: workflowDesc, agents: agentIds, conditions: { nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })), edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target })) } };
    let workflowId = activeWorkflowId;
    try {
      const method = workflowId ? "PUT" : "POST";
      const url    = workflowId ? `${API}/workflows/${workflowId}` : `${API}/workflows`;
      const saveRes = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (saveRes.ok) {
        const saved = await saveRes.json();
        workflowId = saved.id || saved._id || workflowId;
        setActiveWorkflowId(workflowId);
        fetchWorkflows();
      }
    } catch { /* non-fatal — proceed if we already have an ID */ }

    if (!workflowId) { alert("Could not save workflow. Check the backend is running."); return; }

    runStartRef.current = Date.now();
    setActiveTab("canvas");
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, runStatus: "running" as const } })));
    setRunState({ status: "running", runId: "", result: "", tokenCount: 0, duration: "0", logs: [], nodeCount: nodes.length });
    try {
      const res = await fetch(`${API}/workflows/execute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflow_id: workflowId, user_prompt: userPrompt }) });
      if (!res.ok) { const e = await res.json(); finishRun("error", e.detail || "Failed to start", 0); return; }
      const { run_id } = await res.json();
      setRunState(r => r ? { ...r, runId: run_id } : null);

      // SSE log stream
      const es = new EventSource(`${API}/runs/${run_id}/logs`);
      es.onmessage = (e) => {
        try {
          const log: LogEntry = JSON.parse(e.data);
          setRunState(r => r ? { ...r, logs: [...r.logs, log] } : null);
        } catch {}
      };

      // Poll for completion
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const poll   = await fetch(`${API}/runs/${run_id}`);
        const status = await poll.json();
        const dur    = ((Date.now() - runStartRef.current) / 1000).toFixed(1);
        setRunState(r => r ? { ...r, duration: dur } : null);
        if (status.status === "done")  { es.close(); finishRun("done",  status.result || "Done.", status.token_count || 0); break; }
        if (status.status === "error") { es.close(); finishRun("error", status.result || "Error", 0); break; }
      }
    } catch { finishRun("error", "Execution failed.", 0); }
  };

  const finishRun = (status: "done" | "error", result: string, tokenCount: number) => {
    const dur = ((Date.now() - runStartRef.current) / 1000).toFixed(1);
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, runStatus: status === "done" ? "done" as const : "error" as const } })));
    setRunState(r => r ? { ...r, status, result, tokenCount, duration: dur } : null);
  };

  const resetRun = () => {
    setRunState(null);
    setNodes(nds => nds.map(n => { const { runStatus, ...rest } = n.data; return { ...n, data: rest }; }));
  };

  const clearCanvas = () => { setNodes([]); setEdges([]); setWorkflowName("New Workflow"); setWorkflowDesc(""); setActiveWorkflowId(null); setUserPrompt(""); setRunState(null); };

  const handleDeleteWorkflow = async (wf: Workflow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${wf.name}"? This cannot be undone.`)) return;
    try {
      await fetch(`${API}/workflows/${wf._id}`, { method: "DELETE" });
      setSavedWorkflows(ws => ws.filter(w => w._id !== wf._id));
      if (activeWorkflowId === wf._id) { clearCanvas(); }
    } catch { alert("Failed to delete workflow."); }
  };

  const loadWorkflow = (wf: Workflow) => {
    setWorkflowName(wf.name); setWorkflowDesc(wf.description || ""); setActiveWorkflowId(wf._id || null); setShowLoad(false); setRunState(null);
    const sNodes = wf.conditions?.nodes || wf.nodes || [];
    const sEdges = wf.conditions?.edges || wf.edges || [];
    if (sNodes.length > 0) {
      setNodes(sNodes.map((n: Node) => ({ ...n, type: n.type || "agentNode" })));
      setEdges((sEdges || []).map((e: Edge) => ({ ...e, animated: true, style: { stroke: "#1D9E75", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#1D9E75" } })));
    } else {
      const wn: Node[] = (wf.agents || []).map((aid: string, i: number) => { const a = agents.find(x => x._id === aid); return { id: `agent-${aid}-${i}`, type: "agentNode", position: { x: 100 + i * 250, y: 200 }, data: { label: a?.name || aid, role: a?.role || "Agent", agentId: aid } }; });
      setNodes(wn);
      setEdges(wn.slice(0, -1).map((n, i) => ({ id: `e-${i}`, source: n.id, target: wn[i + 1].id, animated: true, style: { stroke: "#1D9E75", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#1D9E75" } })));
    }
  };

  const templates = [
    { name: "Research & Report", description: "Researcher gathers info, writer produces a report.", build: () => {
      const r = agents.find(a => a.role?.toLowerCase().includes("research")); const w = agents.find(a => a.role?.toLowerCase().includes("writ") || a.role?.toLowerCase().includes("report"));
      if (!r || !w) { alert('Needs "Research" and "Writ"/"Report" role agents.'); return; }
      const n1: Node = { id: `${r._id}-t1`, type: "agentNode", position: { x: 120, y: 200 }, data: { label: r.name, role: r.role, agentId: r._id } };
      const n2: Node = { id: `${w._id}-t2`, type: "agentNode", position: { x: 450, y: 200 }, data: { label: w.name, role: w.role, agentId: w._id } };
      setNodes([n1, n2]); setEdges([{ id: "te1", source: n1.id, target: n2.id, animated: true, style: { stroke: "#1D9E75", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#1D9E75" } }]);
      setWorkflowName("Research & Report"); setWorkflowDesc("Researcher gathers data → Writer produces a polished report."); setActiveWorkflowId(null); setShowTemplates(false);
    }},
    { name: "Support Triage", description: "Classifier routes the message, support agent responds.", build: () => {
      if (agents.length < 2) { alert("Needs at least 2 agents."); return; }
      const n1: Node = { id: `${agents[0]._id}-t1`, type: "agentNode", position: { x: 120, y: 200 }, data: { label: agents[0].name + " (Classifier)", role: "Triage", agentId: agents[0]._id } };
      const n2: Node = { id: `${agents[1]._id}-t2`, type: "agentNode", position: { x: 450, y: 200 }, data: { label: agents[1].name + " (Responder)", role: "Support", agentId: agents[1]._id } };
      setNodes([n1, n2]); setEdges([{ id: "te1", source: n1.id, target: n2.id, animated: true, style: { stroke: "#1D9E75", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#1D9E75" } }]);
      setWorkflowName("Support Triage"); setWorkflowDesc("Classifier triages the request → Support agent handles it."); setActiveWorkflowId(null); setShowTemplates(false);
    }},
  ];

  // ── Shared style helpers ──────────────────────────────────────────────────
  const inp  = { background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: "var(--r-md)", padding: "7px 10px", color: "var(--text)", width: "100%" } as const;
  const lbl  = { fontSize: 10, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 5, display: "block" };
  const mono = { fontFamily: "var(--font-mono)" } as const;

  const isRunning = runState?.status === "running";
  const isDone    = runState?.status === "done";
  const isError   = runState?.status === "error";
  const cost      = runState ? `$${(runState.tokenCount / 1000 * 0.002).toFixed(4)}` : "$0";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <Sidebar active="workflows" />

      {/* ── Left controls panel — hidden during execution ── */}
      {!runState && (
        <div style={{ position: "fixed", left: 180, top: 0, width: 256, height: "100vh", background: "var(--bg2)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10, padding: 14, overflowY: "auto", zIndex: 40 }}>
          <div style={{ paddingTop: 6 }}>
            <p style={{ fontSize: 9, fontWeight: 600, color: "var(--teal-text)", textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 2 }}>Orchestrator</p>
            <p style={{ color: "white", fontWeight: 700, fontSize: 13 }}>Workflow Builder</p>
          </div>

          {/* Node type pills */}
          <div>
            <span style={lbl}>Node Types</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {([["🤖","Agent","var(--teal-dim)"],["⬡","Condition","var(--amber-dim)"],["↺","Loop","var(--coral-dim)"],["⚡","Trigger","var(--blue-dim)"],["📤","Output","var(--teal-dim)"]] as [string,string,string][]).map(([icon,label,bg]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 8px", borderRadius: "var(--r-sm)", border: `1px solid ${bg}`, fontSize: 12, color: "var(--text2)" }}><span>{icon}</span><span>{label}</span></div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          <div><label style={lbl}>Workflow Name</label><input value={workflowName} onChange={e => setWorkflowName(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Description</label><textarea value={workflowDesc} onChange={e => setWorkflowDesc(e.target.value)} rows={2} style={{ ...inp, resize: "none" }} /></div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          <div>
            <span style={lbl}>Add Agent to Canvas</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 140, overflowY: "auto" }}>
              {agents.map(a => (
                <button key={a._id} onClick={() => addAgentNode(a)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: "var(--r-md)", border: "none", background: "transparent", cursor: "pointer", color: "var(--text2)", fontSize: 12, textAlign: "left" }}>
                  <Plus size={12} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                </button>
              ))}
              {!agents.length && <p style={{ fontSize: 11, color: "var(--text3)", padding: "4px 8px" }}>No agents yet.</p>}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          {/* Templates */}
          <div style={{ position: "relative" }}>
            <button onClick={() => { setShowTemplates(!showTemplates); setShowLoad(false); }} style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
              <span>Templates</span><ChevronDown size={14} style={{ color: "var(--text3)" }} />
            </button>
            {showTemplates && (
              <div style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: 4, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "0 8px 24px #00000080", zIndex: 50, overflow: "hidden" }}>
                {templates.map((t, i) => (
                  <button key={i} onClick={t.build} style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", borderBottom: i < templates.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{t.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Load Workflow */}
          <div style={{ position: "relative" }}>
            <button onClick={() => { setShowLoad(!showLoad); setShowTemplates(false); }} style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
              <span>Load Workflow</span><ChevronDown size={14} style={{ color: "var(--text3)" }} />
            </button>
            {showLoad && (
              <div style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: 4, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "0 8px 24px #00000080", zIndex: 50, maxHeight: 200, overflowY: "auto" }}>
                {!savedWorkflows.length && <p style={{ padding: "10px 14px", fontSize: 11, color: "var(--text3)" }}>No saved workflows.</p>}
                {savedWorkflows.map(wf => (
                  <button key={wf._id} onClick={() => { loadWorkflow(wf); setActiveTab("canvas"); }} style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{wf.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wf.description || "—"}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          {/* Prompt */}
          <div>
            <label style={lbl}>Enter Prompt</label>
            <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)} rows={3} placeholder="Describe what you want the workflow to do…" style={{ ...inp, resize: "none", ...mono, fontSize: 11, lineHeight: 1.6 }} />
          </div>

          {/* Save / Clear */}
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            <button onClick={handleSave} disabled={isSaving || !nodes.length} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: "var(--r-md)", border: "none", background: "var(--teal)", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", opacity: (isSaving || !nodes.length) ? 0.4 : 1 }}>
              <Save size={13} />{isSaving ? "Saving…" : "Save Workflow"}
            </button>
            <button onClick={clearCanvas} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "6px", borderRadius: "var(--r-md)", border: "none", background: "transparent", color: "var(--text3)", fontSize: 12, cursor: "pointer" }}>
              <Trash2 size={13} />Clear Canvas
            </button>
            {saveMessage && <p style={{ textAlign: "center", fontSize: 11, color: saveMessage.includes("failed") ? "var(--coral-text)" : "var(--teal-text)" }}>{saveMessage}</p>}
          </div>
        </div>
      )}

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: runState ? 180 : 436 }}>

        {/* ── Header bar ── */}
        {!runState ? (
          /* Normal: tab bar + Run + New Workflow */
          <div style={{ height: 44, background: "var(--bg2)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {(["canvas", "list"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "5px 12px", borderRadius: "var(--r-md)", fontSize: 11, fontWeight: 500, cursor: "pointer", border: "1px solid", background: "transparent", borderColor: activeTab === tab ? "var(--teal)" : "var(--border2)", color: activeTab === tab ? "var(--teal-text)" : "var(--text2)" }}>
                  {tab === "canvas" ? "Canvas" : "All Workflows"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleExecute} disabled={nodes.length === 0 || !userPrompt.trim()} style={{ padding: "5px 12px", borderRadius: "var(--r-md)", fontSize: 11, fontWeight: 500, cursor: "pointer", border: "1px solid var(--border2)", color: "var(--text2)", background: "transparent", opacity: (nodes.length === 0 || !userPrompt.trim()) ? 0.4 : 1 }}>
                ▷ Run
              </button>
              <button onClick={() => { clearCanvas(); setActiveTab("canvas"); }} style={{ padding: "5px 12px", borderRadius: "var(--r-md)", fontSize: 11, fontWeight: 500, cursor: "pointer", border: "none", background: "var(--teal)", color: "#fff" }}>
                + New Workflow
              </button>
            </div>
          </div>
        ) : (
          /* Execution: status bar with badge + duration + Reset + Done */
          <div style={{ height: 44, background: "var(--bg2)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ padding: "3px 10px", borderRadius: 4, fontSize: 11, ...mono, fontWeight: 500, background: isDone ? "var(--teal-dim)" : isError ? "var(--coral-dim)" : "var(--amber-dim)", color: isDone ? "var(--teal-text)" : isError ? "var(--coral-text)" : "var(--amber-text)", animation: isRunning ? "pulse 1.5s infinite" : "none" }}>
                {isDone ? "✓ complete" : isError ? "✗ error" : "⟳ running"}
              </span>
              <span style={{ fontSize: 12, color: "var(--text3)", ...mono }}>{runState.duration}s</span>
              {workflowName && <span style={{ fontSize: 12, color: "var(--text2)" }}>· {workflowName}</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={resetRun} style={{ padding: "5px 12px", borderRadius: "var(--r-md)", fontSize: 11, cursor: "pointer", border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)" }}>Reset</button>
              <button onClick={resetRun} style={{ padding: "5px 12px", borderRadius: "var(--r-md)", fontSize: 11, cursor: "pointer", border: "none", background: isDone ? "var(--teal)" : "var(--border2)", color: isDone ? "#fff" : "var(--text3)" }}>Done</button>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        {!runState ? (
          /* Normal body: list view OR canvas */
          <>
            {activeTab === "list" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                {!savedWorkflows.length && <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)", fontSize: 13 }}>No saved workflows yet.</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {savedWorkflows.map(wf => (
                    <div key={wf._id} onClick={() => { loadWorkflow(wf); setActiveTab("canvas"); }} style={{ background: "var(--bg4)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 14, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: wf.agents?.length ? "var(--teal-dim)" : "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{wf.agents?.length ? "⚡" : "⏸"}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{wf.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{wf.agents?.length ?? 0} agents{wf.description ? ` · ${wf.description.slice(0, 60)}` : ""}</div>
                      </div>
                      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, ...mono, background: wf.agents?.length ? "var(--teal-dim)" : "var(--amber-dim)", color: wf.agents?.length ? "var(--teal-text)" : "var(--amber-text)", flexShrink: 0 }}>{wf.agents?.length ? "active" : "empty"}</span>
                      <button onClick={e => { e.stopPropagation(); loadWorkflow(wf); setActiveTab("canvas"); }} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", flexShrink: 0 }}>Load →</button>
                      <button onClick={e => handleDeleteWorkflow(wf, e)} style={{ padding: "5px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer", border: "1px solid var(--coral-dim)", background: "transparent", color: "var(--coral-text)", flexShrink: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === "canvas" && (
              <div style={{ flex: 1 }}>
                <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={customNodeTypes} fitView style={{ background: "#0A0C0F" }} deleteKeyCode={["Backspace","Delete"]}>
                  <Background color="#1E232A" gap={24} size={1} />
                  <Controls position="bottom-right" />
                  <MiniMap nodeColor="#1D9E75" maskColor="rgba(13,61,48,0.7)" position="bottom-left" />
                  <Panel position="top-right">
                    <div style={{ background: "rgba(17,20,24,0.9)", backdropFilter: "blur(8px)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "6px 14px", fontSize: 12, color: "var(--text3)" }}>
                      Drag nodes · Connect handles · Delete with Backspace
                    </div>
                  </Panel>
                </ReactFlow>
              </div>
            )}
          </>
        ) : (
          /* ── Execution result body ── */
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 260px", overflow: "hidden" }}>

            {/* Canvas + log strip */}
            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* ReactFlow with status nodes */}
              <div style={{ flex: 1 }}>
                <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={customNodeTypes} fitView style={{ background: "#0A0C0F" }} deleteKeyCode={["Backspace","Delete"]}>
                  <Background color="#1E232A" gap={24} size={1} />
                  <Controls position="bottom-right" />
                  <MiniMap nodeColor="#1D9E75" maskColor="rgba(13,61,48,0.7)" position="bottom-left" />
                </ReactFlow>
              </div>

              {/* Agent log strip */}
              <div style={{ height: 180, borderTop: "1px solid var(--border)", background: "var(--bg2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px" }}>Agent Log</span>
                  {isRunning && <><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", display: "inline-block", animation: "pulse 1.5s infinite" }} /><span style={{ fontSize: 10, color: "var(--teal-text)", ...mono }}>live</span></>}
                  {!isRunning && <span style={{ fontSize: 10, color: "var(--text3)", ...mono }}>{isDone ? "complete" : "error"}</span>}
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "6px 14px" }}>
                  {!runState.logs.length && <p style={{ fontSize: 11, color: "var(--text3)", padding: "8px 0", ...mono }}>Waiting for agent activity…</p>}
                  {runState.logs.map((log, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "3px 0", borderBottom: "1px solid var(--bg4)", ...mono, fontSize: 11, lineHeight: 1.7, animation: i === runState.logs.length - 1 ? "slideIn .2s ease both" : "none" }}>
                      <span style={{ color: "var(--text3)", flexShrink: 0 }}>{log.time}</span>
                      <span style={{ padding: "0 5px", borderRadius: 3, fontSize: 10, background: "var(--bg4)", color: log.agent === "Runtime" ? "var(--amber-text)" : "var(--teal-text)", flexShrink: 0 }}>{log.agent}</span>
                      <span style={{ color: "var(--text2)", flex: 1 }}>{log.msg}</span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>

              {/* Bottom metric strip */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
                {[
                  ["TOKENS USED",  runState.tokenCount.toLocaleString(), "var(--teal-text)"  ],
                  ["EST. COST",    cost,                                   "var(--amber-text)" ],
                  ["AGENT MSGS",  runState.logs.length.toString(),          "var(--text)"       ],
                  ["DURATION",    `${runState.duration}s`,                  "var(--teal-text)"  ],
                ].map(([label, val, col]) => (
                  <div key={label} style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: col, ...mono, lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Run summary panel ── */}
            <div style={{ borderLeft: "1px solid var(--border)", background: "var(--bg3)", overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Run Summary */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 10 }}>Run Summary</div>
                {[
                  ["Nodes",    `${runState.nodeCount} / ${runState.nodeCount}`],
                  ["Tokens",   runState.tokenCount.toLocaleString()           ],
                  ["Cost",     cost                                            ],
                  ["Messages", runState.logs.length.toString()                ],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>{k}</span>
                    <span style={{ fontSize: 12, ...mono, color: k === "Tokens" || k === "Cost" ? "var(--amber-text)" : "var(--text)" }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Active Node */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 8 }}>Active Node</div>
                <div style={{ fontSize: 12, color: isRunning ? "var(--amber-text)" : "var(--text3)", ...mono }}>
                  {isRunning ? (runState.logs.at(-1)?.agent || "initializing…") : "none"}
                </div>
              </div>

              {/* Result */}
              {(isDone || isError) && runState.result && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 8 }}>Result</div>
                  <div style={{ background: "var(--bg4)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 10, maxHeight: 280, overflowY: "auto" }}>
                    <pre style={{ fontSize: 11, color: isDone ? "var(--teal-text)" : "var(--coral-text)", ...mono, whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0 }}>
                      {runState.result}
                    </pre>
                  </div>
                </div>
              )}

              {/* Running placeholder */}
              {isRunning && (
                <div style={{ background: "var(--bg4)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "var(--amber-text)", ...mono, animation: "pulse 1.5s infinite" }}>Agents working…</div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 6 }}>Result will appear here</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
