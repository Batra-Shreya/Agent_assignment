"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { Network, Plus, Save, Bot, Trash2, FileText, ChevronDown } from "lucide-react";
import Sidebar from "../components/Sidebar";

const API = "http://localhost:8000/api";

// ---------- Custom Agent Node ----------
function AgentNode({ data }: { data: { label: string; role: string } }) {
  return (
    <div className="bg-white border-2 border-indigo-300 rounded-xl px-4 py-3 shadow-md min-w-[180px]">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md">
          <Bot className="w-4 h-4" />
        </div>
        <span className="font-semibold text-sm text-gray-800 truncate">{data.label}</span>
      </div>
      <p className="text-xs text-gray-500 truncate">{data.role}</p>
    </div>
  );
}

const nodeTypes = { agentNode: AgentNode };

// ---------- Types ----------
interface Agent {
  _id: string;
  name: string;
  role: string;
  system_prompt: string;
  tools: string[];
}

interface Workflow {
  _id?: string;
  name: string;
  description: string;
  agents: string[];
  nodes?: Node[];
  edges?: Edge[];
  conditions?: any;
}

export default function WorkflowsPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<Workflow[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);

  const [workflowName, setWorkflowName] = useState("New Workflow");
  const [workflowDesc, setWorkflowDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showLoadDropdown, setShowLoadDropdown] = useState(false);

  const customNodeTypes = useMemo(() => nodeTypes, []);

  useEffect(() => {
    fetchAgents();
    fetchWorkflows();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API}/agents`);
      const data = await res.json();
      setAgents(data);
    } catch (err) {
      console.error("Failed to fetch agents", err);
    }
  };

  const fetchWorkflows = async () => {
    try {
      const res = await fetch(`${API}/workflows`);
      const data = await res.json();
      setSavedWorkflows(data);
    } catch (err) {
      console.error("Failed to fetch workflows", err);
    }
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "#6366f1", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const addAgentNode = (agent: Agent) => {
    const existingCount = nodes.length;
    const newNode: Node = {
      id: `agent-${agent._id}-${Date.now()}`,
      type: "agentNode",
      position: { x: 100 + existingCount * 250, y: 150 + (existingCount % 2) * 120 },
      data: {
        label: agent.name,
        role: agent.role,
        agentId: agent._id,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleSave = async () => {
    if (!workflowName.trim()) return;

    setIsSaving(true);
    setSaveMessage("");

    const agentIds = nodes
      .map((n) => n.data.agentId)
      .filter(Boolean)
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

    const payload = {
      name: workflowName,
      description: workflowDesc,
      agents: agentIds,
      conditions: {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
      },
    };

    try {
      const method = activeWorkflowId ? "PUT" : "POST";
      const url = activeWorkflowId ? `${API}/workflows/${activeWorkflowId}` : `${API}/workflows`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved = await res.json();
        setActiveWorkflowId(saved._id || activeWorkflowId);
        setSaveMessage("Workflow saved!");
        fetchWorkflows();
      } else {
        setSaveMessage("Save failed.");
      }
    } catch (err) {
      console.error(err);
      setSaveMessage("Save failed.");
    }

    setIsSaving(false);
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const loadWorkflow = (wf: Workflow) => {
    setWorkflowName(wf.name);
    setWorkflowDesc(wf.description || "");
    setActiveWorkflowId(wf._id || null);
    setShowLoadDropdown(false);

    const savedNodes = wf.conditions?.nodes || wf.nodes || [];
    const savedEdges = wf.conditions?.edges || wf.edges || [];

    if (savedNodes && savedNodes.length > 0) {
      setNodes(
        savedNodes.map((n: any) => ({
          ...n,
          type: n.type || "agentNode",
        }))
      );
      setEdges(
        (savedEdges || []).map((e: any) => ({
          ...e,
          animated: true,
          style: { stroke: "#6366f1", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
        }))
      );
    } else {
      const wfNodes: Node[] = (wf.agents || []).map((agentId: string, i: number) => {
        const agent = agents.find((a) => a._id === agentId);
        return {
          id: `agent-${agentId}-${i}`,
          type: "agentNode",
          position: { x: 100 + i * 250, y: 200 },
          data: {
            label: agent?.name || agentId,
            role: agent?.role || "Agent",
            agentId,
          },
        };
      });

      const wfEdges: Edge[] = wfNodes.slice(0, -1).map((n, i) => ({
        id: `e-${i}`,
        source: n.id,
        target: wfNodes[i + 1].id,
        animated: true,
        style: { stroke: "#6366f1", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
      }));

      setNodes(wfNodes);
      setEdges(wfEdges);
    }
  };

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setWorkflowName("New Workflow");
    setWorkflowDesc("");
    setActiveWorkflowId(null);
  };

  const templates = [
    {
      name: "Research & Report",
      description: "A researcher gathers info, then a writer produces a report.",
      build: () => {
        const researcher = agents.find((a) => a.role?.toLowerCase().includes("research"));
        const writer = agents.find(
          (a) => a.role?.toLowerCase().includes("writ") || a.role?.toLowerCase().includes("report")
        );
        if (!researcher || !writer) {
          alert('This template needs at least two agents with roles containing "Research" and "Writ" or "Report". Create those agents first.');
          return;
        }
        const n1: Node = {
          id: `agent-${researcher._id}-t1`,
          type: "agentNode",
          position: { x: 120, y: 200 },
          data: { label: researcher.name, role: researcher.role, agentId: researcher._id },
        };
        const n2: Node = {
          id: `agent-${writer._id}-t2`,
          type: "agentNode",
          position: { x: 450, y: 200 },
          data: { label: writer.name, role: writer.role, agentId: writer._id },
        };
        setNodes([n1, n2]);
        setEdges([
          {
            id: "template-e1",
            source: n1.id,
            target: n2.id,
            animated: true,
            style: { stroke: "#6366f1", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
          },
        ]);
        setWorkflowName("Research & Report");
        setWorkflowDesc("Researcher gathers data → Writer produces a polished report.");
        setActiveWorkflowId(null);
        setShowTemplateDropdown(false);
      },
    },
    {
      name: "Support Triage",
      description: "A classifier routes the message, then a support agent responds.",
      build: () => {
        if (agents.length < 2) {
          alert("This template needs at least 2 agents. Create more agents first.");
          return;
        }
        const a1 = agents[0];
        const a2 = agents[1];
        const n1: Node = {
          id: `agent-${a1._id}-t1`,
          type: "agentNode",
          position: { x: 120, y: 200 },
          data: { label: a1.name + " (Classifier)", role: "Triage", agentId: a1._id },
        };
        const n2: Node = {
          id: `agent-${a2._id}-t2`,
          type: "agentNode",
          position: { x: 450, y: 200 },
          data: { label: a2.name + " (Responder)", role: "Support", agentId: a2._id },
        };
        setNodes([n1, n2]);
        setEdges([
          {
            id: "template-e1",
            source: n1.id,
            target: n2.id,
            animated: true,
            style: { stroke: "#6366f1", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
          },
        ]);
        setWorkflowName("Support Triage");
        setWorkflowDesc("Classifier triages the request → Support agent handles it.");
        setActiveWorkflowId(null);
        setShowTemplateDropdown(false);
      },
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white border-r p-6 flex flex-col gap-6 shrink-0">
        <Sidebar active="workflows" />

        <hr className="border-gray-200" />

        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Workflow Name</label>
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
          <textarea
            value={workflowDesc}
            onChange={(e) => setWorkflowDesc(e.target.value)}
            rows={2}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
        </div>

        <hr className="border-gray-200" />

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
            Add Agent to Canvas
          </label>
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
            {agents.map((agent) => (
              <button
                key={agent._id}
                onClick={() => addAgentNode(agent)}
                className="flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">{agent.name}</span>
              </button>
            ))}
            {agents.length === 0 && (
              <p className="text-xs text-gray-400 px-3 py-2">No agents yet. Create some on the Agents page.</p>
            )}
          </div>
        </div>

        <hr className="border-gray-200" />

        <div className="relative">
          <button
            onClick={() => {
              setShowTemplateDropdown(!showTemplateDropdown);
              setShowLoadDropdown(false);
            }}
            className="w-full flex items-center justify-between text-sm px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700">Templates</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {showTemplateDropdown && (
            <div className="absolute left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50">
              {templates.map((t, i) => (
                <button
                  key={i}
                  onClick={t.build}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <p className="text-sm font-medium text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowLoadDropdown(!showLoadDropdown);
              setShowTemplateDropdown(false);
            }}
            className="w-full flex items-center justify-between text-sm px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700">Load Workflow</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {showLoadDropdown && (
            <div className="absolute left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {savedWorkflows.length === 0 && (
                <p className="px-4 py-3 text-xs text-gray-400">No saved workflows.</p>
              )}
              {savedWorkflows.map((wf: any) => (
                <button
                  key={wf._id}
                  onClick={() => loadWorkflow(wf)}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <p className="text-sm font-medium text-gray-800">{wf.name}</p>
                  <p className="text-xs text-gray-500 truncate">{wf.description || "—"}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving || nodes.length === 0}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium text-sm"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Workflow"}
          </button>
          <button
            onClick={clearCanvas}
            className="flex items-center justify-center gap-2 text-gray-500 px-4 py-2 rounded-lg hover:bg-red-50 hover:text-red-500 transition text-sm"
          >
            <Trash2 className="w-4 h-4" /> Clear Canvas
          </button>
          {saveMessage && (
            <p className={`text-xs text-center font-medium ${saveMessage.includes("failed") ? "text-red-500" : "text-green-600"}`}>
              {saveMessage}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={customNodeTypes}
          fitView
          className="bg-gray-50"
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Background color="#e0e7ff" gap={20} size={1} />
          <Controls position="bottom-right" />
          <MiniMap nodeColor="#6366f1" maskColor="rgba(99, 102, 241, 0.08)" position="bottom-left" />
          <Panel position="top-right">
            <div className="bg-white/90 backdrop-blur border rounded-lg px-4 py-2 text-sm text-gray-500">
              Drag nodes · Connect handles · Delete with Backspace
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
