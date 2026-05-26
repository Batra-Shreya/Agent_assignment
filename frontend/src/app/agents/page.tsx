"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import Sidebar from "../../components/Sidebar";

const API = "http://localhost:8000/api";

interface Agent {
  _id: string;
  name: string;
  role: string;
  system_prompt: string;
  tools: string[];
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    system_prompt: "",
    tools: "",
  });

  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAgents();
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

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      system_prompt: "",
      tools: "",
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.role.trim() || !formData.system_prompt.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    const toolsArray = formData.tools
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      name: formData.name,
      role: formData.role,
      system_prompt: formData.system_prompt,
      tools: toolsArray,
    };

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API}/agents/${editingId}` : `${API}/agents`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveMessage(editingId ? "Agent updated!" : "Agent created!");
        fetchAgents();
        resetForm();
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

  const handleEdit = (agent: Agent) => {
    setFormData({
      name: agent.name,
      role: agent.role,
      system_prompt: agent.system_prompt,
      tools: agent.tools.join(", "),
    });
    setEditingId(agent._id);
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;

    try {
      const res = await fetch(`${API}/agents/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchAgents();
      } else {
        alert("Failed to delete agent");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete agent");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar active="agents" />

      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Agents</h1>
            <p className="text-gray-600">Create and configure AI agents for your workflows</p>
          </div>

          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium mb-6"
            >
              <Plus className="w-5 h-5" />
              Create New Agent
            </button>
          )}

          {isCreating && (
            <div className="bg-white p-8 rounded-lg shadow-md mb-8 border border-indigo-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {editingId ? "Edit Agent" : "Create New Agent"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Agent Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Alice"
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g., Researcher"
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">System Prompt *</label>
                <textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="Describe the agent's personality, expertise, and instructions..."
                  rows={5}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tools (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tools}
                  onChange={(e) => setFormData({ ...formData, tools: e.target.value })}
                  placeholder="e.g., web_search, file_reader, email_sender"
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple tools with commas</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition font-medium"
                >
                  {isSaving ? "Saving..." : editingId ? "Update Agent" : "Create Agent"}
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
              </div>

              {saveMessage && (
                <p
                  className={`mt-4 text-sm font-medium ${
                    saveMessage.includes("failed") ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {saveMessage}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div key={agent._id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-indigo-600 font-medium">{agent.role}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(agent)}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(agent._id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{agent.system_prompt}</p>

                {agent.tools && agent.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {agent.tools.map((tool, i) => (
                      <span
                        key={i}
                        className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {agents.length === 0 && !isCreating && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">No agents yet. Create your first agent to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
