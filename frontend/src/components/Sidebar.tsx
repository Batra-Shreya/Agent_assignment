"use client";

import Link from "next/link";
import { Home, Network, Bot, Activity, FileText, Settings } from "lucide-react";

const navItems = [
  { href: "/",           icon: Home,     key: "home",       label: "Dashboard"   },
  { href: "/agents",     icon: Bot,      key: "agents",     label: "Agents"      },
  { href: "/workflows",  icon: Network,  key: "workflows",  label: "Workflows"   },
  { href: "/monitoring", icon: Activity, key: "monitoring", label: "Monitoring"  },
  { href: "/history",    icon: FileText, key: "history",    label: "Chat History"},
];

export const SIDEBAR_W = 180;

export default function Sidebar({ active }: { active?: string }) {
  return (
    <nav
      className="fixed left-0 top-0 h-screen flex flex-col py-3 z-50"
      style={{ width: SIDEBAR_W, background: "var(--bg2)", borderRight: "1px solid var(--border)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 mb-5">
        <div
          className="flex items-center justify-center font-bold text-white shrink-0"
          style={{ width: 30, height: 30, background: "var(--teal)", borderRadius: "var(--r-md)", fontSize: 12, letterSpacing: "-1px" }}
        >
          AO
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>AgentOS</div>
          <div style={{ fontSize: 10, color: "var(--text3)" }}>Platform</div>
        </div>
      </div>

      {/* Nav label */}
      <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", padding: "0 16px", marginBottom: 6 }}>
        Navigation
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-0.5 px-2">
        {navItems.map(({ href, icon: Icon, key, label }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={href}
              className="flex items-center gap-3 transition-all"
              style={{
                padding: "7px 10px",
                borderRadius: "var(--r-md)",
                background: isActive ? "var(--teal-dim)" : "transparent",
                color: isActive ? "var(--teal-text)" : "var(--text2)",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                textDecoration: "none",
              }}
            >
              <Icon size={15} style={{ flexShrink: 0 }} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="mt-auto px-3">
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="live-dot" />
            <span style={{ fontSize: 11, color: "var(--text3)" }}>Online</span>
          </div>
          <button title="Settings" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex" }}>
            <Settings size={14} />
          </button>
        </div>
        <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3 }}>v1.0.0 · CrewAI</div>
      </div>
    </nav>
  );
}
