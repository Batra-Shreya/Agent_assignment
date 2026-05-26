import Link from "next/link";
import { Network, Bot, FileText } from "lucide-react";
import Sidebar from "../components/Sidebar";


export default function HomePage() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-2xl text-center px-8">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-full mb-6">
              <Network className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Workflow Orchestrator</h1>
            <p className="text-xl text-gray-600 mb-8">
              Build powerful multi-agent workflows visually. Connect agents, set up sequences, and execute complex tasks automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Link
              href="/workflows"
              className="p-8 bg-white rounded-xl shadow-md hover:shadow-lg transition-all group"
            >
              <div className="p-3 bg-indigo-100 rounded-lg inline-block mb-4 group-hover:bg-indigo-200 transition">
                <Network className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">Build Workflows</h3>
              <p className="text-sm text-gray-600">Create and design workflows using our visual builder with drag-and-drop agents.</p>
            </Link>

            <Link
              href="/history"
              className="p-8 bg-white rounded-xl shadow-md hover:shadow-lg transition-all group"
            >
              <div className="p-3 bg-green-100 rounded-lg inline-block mb-4 group-hover:bg-green-200 transition">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">View History</h3>
              <p className="text-sm text-gray-600">Track all workflow executions with timestamps, status, and detailed output logs.</p>
            </Link>

            <div className="p-8 bg-white rounded-xl shadow-md opacity-60">
              <div className="p-3 bg-blue-100 rounded-lg inline-block mb-4">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">Manage Agents</h3>
              <p className="text-sm text-gray-600">Create and manage AI agents (coming soon)</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Started</h2>
            <ol className="text-left space-y-4 text-gray-700">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold">1</span>
                <div>
                  <p className="font-medium">Create Agents</p>
                  <p className="text-sm text-gray-600">Define AI agents with specific roles and instructions</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold">2</span>
                <div>
                  <p className="font-medium">Build a Workflow</p>
                  <p className="text-sm text-gray-600">Drag agents onto the canvas and connect them in sequence</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold">3</span>
                <div>
                  <p className="font-medium">Execute & Monitor</p>
                  <p className="text-sm text-gray-600">Run your workflow and view execution results in history</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
