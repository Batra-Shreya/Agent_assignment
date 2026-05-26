"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";

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
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchExecutions();
    fetchWorkflows();
  }, []);

  const fetchExecutions = async () => {
    try {
      const res = await fetch(`${API}/executions`);
      const data = await res.json();
      setExecutions(data);
    } catch (e) {
      console.error("Failed to fetch executions", e);
    }
  };

  const fetchWorkflows = async () => {
    try {
      const res = await fetch(`${API}/workflows`);
      const data = await res.json();
      setWorkflows(data);
    } catch (e) {
      console.error("Failed to fetch workflows", e);
    }
  };

  const nameFor = (workflow_id?: string) => {
    return workflows.find((w) => w._id === workflow_id)?.name || workflow_id || "—";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar active="history" />
      <div className="flex-1 p-6">
        <h2 className="text-lg font-semibold mb-4">Execution History</h2>
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-left">Workflow</th>
                <th className="px-4 py-3 text-left">Trigger</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Output</th>
                <th className="px-4 py-3 text-left">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((ex) => (
                <React.Fragment key={ex._id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpanded(expanded === ex._id ? null : ex._id)}
                  >
                    <td className="px-4 py-3">{ex.timestamp || "—"}</td>
                    <td className="px-4 py-3">{nameFor(ex.workflow_id)}</td>
                    <td className="px-4 py-3">{ex.trigger || "API"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          ex.status === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        }`}
                      >
                        {ex.status || "success"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{(ex.output || "").slice(0, 80)}{(ex.output||"").length>80?"…":""}</td>
                    <td className="px-4 py-3">{ex.token_count ?? 0}</td>
                  </tr>
                  {expanded === ex._id && (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 bg-gray-50 text-xs font-mono whitespace-pre-wrap">
                        {ex.output}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
