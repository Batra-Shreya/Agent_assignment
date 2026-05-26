import Link from "next/link";
import { Network, Bot, FileText } from "lucide-react";
import Sidebar from "../components/Sidebar";

export default function HomePage() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar />

      <main className="flex-1 h-screen overflow-y-auto px-6 py-6 sm:px-8">
        <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-8">
          <div className="flex flex-col gap-6 rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm shadow-slate-900/5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">Dashboard / Overview</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Welcome back, Operator</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Monitor your workflows, access key actions, and keep everything moving smoothly from one modern control center.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-slate-900/10 transition hover:bg-slate-800">
                + Create New Workflow
              </button>
              <button className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Notifications
              </button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <section className="space-y-6 rounded-[32px] border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-900/5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-600">Quick actions</p>
                  <h2 className="text-2xl font-semibold text-slate-900">Ready to launch your next workflow?</h2>
                </div>
                <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Active workflows: <span className="font-semibold text-slate-900">8</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Link
                  href="/workflows"
                  className="group rounded-3xl border border-slate-200/80 bg-white p-5 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Network className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">Build Workflows</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Jump straight into the workflow builder and compose your next automation sequence.
                  </p>
                </Link>

                <Link
                  href="/history"
                  className="group rounded-3xl border border-slate-200/80 bg-white p-5 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">View History</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Review past workflow runs, outputs, and execution details in one place.
                  </p>
                </Link>

                <div className="group rounded-3xl border border-slate-200/80 bg-white p-5 opacity-90 transition hover:-translate-y-1 hover:shadow-md">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <Bot className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">Manage Agents</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Configure and manage agents, assign roles, and keep your team aligned.
                  </p>
                </div>
              </div>
            </section>

            <aside className="space-y-6 rounded-[32px] border border-slate-200/70 bg-slate-900/95 p-6 text-white shadow-sm shadow-slate-900/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Overview</p>
                  <h3 className="mt-2 text-xl font-semibold">Workflow health</h3>
                </div>
                <div className="rounded-3xl bg-slate-800 px-4 py-2 text-sm text-slate-300">Live</div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl bg-slate-950/80 p-4">
                  <p className="text-sm text-slate-400">Completion rate</p>
                  <p className="mt-2 text-3xl font-semibold text-white">92%</p>
                </div>
                <div className="rounded-3xl bg-slate-950/80 p-4">
                  <p className="text-sm text-slate-400">Average response</p>
                  <p className="mt-2 text-3xl font-semibold text-white">1.4s</p>
                </div>
                <div className="rounded-3xl bg-slate-950/80 p-4">
                  <p className="text-sm text-slate-400">Active agents</p>
                  <p className="mt-2 text-3xl font-semibold text-white">18</p>
                </div>
              </div>
            </aside>
          </div>

          <section className="rounded-[32px] border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-900/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">Getting Started</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">Your onboarding timeline</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-slate-500">
                Follow the premium step wizard to launch your first workflow with confidence.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200/80 bg-slate-50 p-5 transition hover:border-indigo-300">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">1</div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Create Agents</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Define agent roles, instructions, and capabilities to power your automation.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-slate-50 p-5 transition hover:border-indigo-300">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">2</div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Build a Workflow</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Connect agents visually, set triggers, and map the sequence with ease.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-slate-50 p-5 transition hover:border-indigo-300">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">3</div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Execute & Monitor</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Launch the workflow and track execution results across every stage.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
