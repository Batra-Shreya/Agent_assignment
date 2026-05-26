"use client";

import { Home, Network, Bot, FileText } from "lucide-react";

export default function Sidebar({ active }: { active?: string }) {
  const linkClass = (name: string) =>
    `flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${
      active === name ? "bg-indigo-50 text-indigo-600" : "hover:bg-gray-100 text-gray-600"
    }`;

  return (
    <div className="w-64 bg-white border-r p-6 flex flex-col gap-6 shrink-0 z-10 shadow-sm">
      <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
        <Network className="w-6 h-6" /> Orchestrator
      </h1>
      <nav className="flex flex-col gap-2">
        <a href="/" className={linkClass("home")}>
          <Home className="w-5 h-5" /> Home
        </a>
        <a href="/agents" className={linkClass("agents")}>
          <Bot className="w-5 h-5" /> Agents
        </a>
        <a href="/workflows" className={linkClass("workflows")}>
          <Network className="w-5 h-5" /> Workflows
        </a>
        <a href="/history" className={linkClass("history")}>
          <FileText className="w-5 h-5" /> History
        </a>
      </nav>
    </div>
  );
}
