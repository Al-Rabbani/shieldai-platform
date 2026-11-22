import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Users, Plus, Shield, GitBranch, Cloud, AlertTriangle, ChevronRight, Mail, Key } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TEAMS = [
  { name: "Backend", members: 4, repos: ["api-core", "auth-service", "payments"], cloud: ["AWS prod"], findings: 67, owner: "sarah@corp.com" },
  { name: "Frontend", members: 3, repos: ["frontend-web", "marketing-site"], cloud: [], findings: 15, owner: "mike@corp.com" },
  { name: "DevOps", members: 2, repos: ["infra-terraform"], cloud: ["AWS staging", "GCP"], findings: 31, owner: "ops@corp.com" },
  { name: "ML Platform", members: 2, repos: ["ml-inference"], cloud: ["GCP ml-cluster"], findings: 22, owner: "ml@corp.com" },
];

const USERS = [
  { name: "Sarah Chen", email: "sarah@corp.com", role: "Admin", teams: ["Backend"], lastActive: "2min ago" },
  { name: "Mike Johnson", email: "mike@corp.com", role: "Editor", teams: ["Frontend"], lastActive: "1h ago" },
  { name: "Ops Team", email: "ops@corp.com", role: "Editor", teams: ["DevOps"], lastActive: "30min ago" },
  { name: "ML Team", email: "ml@corp.com", role: "Viewer", teams: ["ML Platform"], lastActive: "2h ago" },
];

export default function TeamsPage() {
  const [activeTab, setActiveTab] = useState("teams");

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "#030712" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Teams & Applications</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Assign security responsibilities to teams. Each team sees only their repos, clouds, and findings.
          </p>
        </div>
        <Button size="sm" className="h-9">
          <Plus className="w-4 h-4 mr-1.5" /> Create Team
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        {[
          { key: "teams", label: "Teams" },
          { key: "users", label: "Users" },
          { key: "sso", label: "SSO Configuration" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
              activeTab === tab.key ? "border-blue-500 text-blue-300" : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Teams Tab */}
      {activeTab === "teams" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full">
              <thead style={{ background: "#0a0f1e", borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
                <tr>
                  <th className="text-left py-3 px-4 text-[10px] font-mono text-slate-500 uppercase">Team Name</th>
                  <th className="text-left py-3 px-4 text-[10px] font-mono text-slate-500 uppercase">Members</th>
                  <th className="text-left py-3 px-4 text-[10px] font-mono text-slate-500 uppercase">Repos Assigned</th>
                  <th className="text-left py-3 px-4 text-[10px] font-mono text-slate-500 uppercase">Cloud Accounts</th>
                  <th className="text-left py-3 px-4 text-[10px] font-mono text-slate-500 uppercase">Findings</th>
                  <th className="text-left py-3 px-4 text-[10px] font-mono text-slate-500 uppercase">Owner</th>
                  <th className="text-left py-3 px-4 text-[10px] font-mono text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {TEAMS.map((team, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#070d1a" : "#0a0f1e", borderTop: "1px solid rgba(30,58,95,0.2)" }}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-white">{team.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">{team.members}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {team.repos.map((repo, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>
                            {repo}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {team.cloud.map((c, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(249,115,22,0.1)", color: "#f97316" }}>
                            {c}
                          </span>
                        ))}
                        {team.cloud.length === 0 && <span className="text-xs text-slate-600">—</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-mono font-bold ${team.findings > 50 ? "text-red-400" : team.findings > 20 ? "text-amber-400" : "text-emerald-400"}`}>
                        {team.findings}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">{team.owner}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button className="text-[10px] text-blue-400 hover:underline">Edit</button>
                        <button className="text-[10px] text-slate-400 hover:underline">View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Assignment Methods */}
          <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <h3 className="text-sm font-bold text-white mb-4">Assignment Methods</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { method: "Manual", desc: "Drag repos/clouds into teams", icon: Users },
                { method: "By Repository Path", desc: "Assign team to /src/payments/* path", icon: GitBranch },
                { method: "By GitLab Topics", desc: "Assign team to repos with topics", icon: Shield },
                { method: "By Code Owners", desc: "Import CODEOWNERS file", icon: Key },
              ].map((item, i) => (
                <div key={i} className="rounded-lg p-4" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.3)" }}>
                  <item.icon className="w-5 h-5 text-blue-400 mb-3" />
                  <h4 className="text-xs font-bold text-white mb-2">{item.method}</h4>
                  <p className="text-[11px] text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Current Users</h3>
            <Button size="sm" className="h-8 text-xs">
              <Mail className="w-3 h-3 mr-1.5" /> Invite User
            </Button>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full">
              <thead style={{ background: "#0a0f1e", borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
                <tr>
                  <th className="text-left py-3 px-4 text-[10px] font-mono text-slate-500 uppercase">Name</th>
                  <th className="text-left py-3 px-4 text-[10px] font-mono text-slate-500 uppercase">Email</th>
                  <th className="text-left py-3 px-4 text-[10px] font-mono text-slate-500 uppercase">Role</th>
                  <th className="text-left py-3 px-4 text-[10px] font-mono text-slate-500 uppercase">Teams</th>
                  <th className="text-left py-3 px-4 text-[10px] font-mono text-slate-500 uppercase">Last Active</th>
                  <th className="text-left py-3 px-4 text-[10px] font-mono text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {USERS.map((user, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#070d1a" : "#0a0f1e", borderTop: "1px solid rgba(30,58,95,0.2)" }}>
                    <td className="py-3 px-4 text-sm font-medium text-white">{user.name}</td>
                    <td className="py-3 px-4 text-xs text-slate-400">{user.email}</td>
                    <td className="py-3 px-4">
                      <Badge className="text-[10px]" style={{
                        background: user.role === "Admin" ? "rgba(239,68,68,0.15)" : user.role === "Editor" ? "rgba(59,130,246,0.15)" : "rgba(107,114,128,0.15)",
                        color: user.role === "Admin" ? "#ef4444" : user.role === "Editor" ? "#3b82f6" : "#6b7280",
                      }}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {user.teams.map((t, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">{user.lastActive}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button className="text-[10px] text-blue-400 hover:underline">Edit</button>
                        <button className="text-[10px] text-red-400 hover:underline">Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SSO Tab */}
      {activeTab === "sso" && (
        <div className="space-y-4">
          <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <h3 className="text-sm font-bold text-white mb-4">SSO Configuration</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.3)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#4285f4" }}>
                    <Key className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Google SSO</h4>
                    <p className="text-xs text-slate-500">Allow users to sign in with Google Workspace</p>
                  </div>
                </div>
                <button className="w-10 h-5 rounded-full bg-slate-700 transition-colors">
                  <div className="w-4 h-4 rounded-full bg-white translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.3)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#ef4444" }}>
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">SAML 2.0</h4>
                    <p className="text-xs text-slate-500">Enterprise SSO with Okta, OneLogin, etc.</p>
                  </div>
                </div>
                <button className="w-10 h-5 rounded-full bg-slate-700 transition-colors">
                  <div className="w-4 h-4 rounded-full bg-white translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="pt-4 flex items-center gap-3 flex-wrap" style={{ borderTop: "1px solid rgba(30,58,95,0.3)" }}>
        <span className="text-[10px] text-slate-600 font-mono">RELATED:</span>
        <Link to="/settings" className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white transition-all font-mono" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          ← Settings
        </Link>
        <Link to="/settings/organization" className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white transition-all font-mono" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          🏢 Organization
        </Link>
      </div>
    </div>
  );
}