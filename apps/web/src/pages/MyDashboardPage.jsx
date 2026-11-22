import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Code2, LayoutDashboard, ShieldCheck } from "lucide-react";
import AdminDashboardView from "@/components/dashboard/roles/AdminDashboardView";
import EngineerDashboardView from "@/components/dashboard/roles/EngineerDashboardView";
import DeveloperDashboardView from "@/components/dashboard/roles/DeveloperDashboardView";
import ExecutiveOverviewLink from "@/components/commandcenter/ExecutiveOverviewLink";

const ROLE_KEY = "gds.dashboard.role";

const ROLE_TABS = [
  { key: "admin", label: "Admin", icon: ShieldCheck, blurb: "Org-wide posture, exposure and compliance" },
  { key: "engineer", label: "Security Engineer", icon: LayoutDashboard, blurb: "Your queue, remediation and SLA" },
  { key: "developer", label: "Developer", icon: Code2, blurb: "Code findings, ready fixes and packages" },
];

export default function MyDashboardPage() {
  const [role, setRole] = useState(() => localStorage.getItem(ROLE_KEY) || "");
  const [user, setUser] = useState(null);
  const [scores, setScores] = useState([]);
  const [findings, setFindings] = useState([]);
  const [assets, setAssets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [me, scoreRows, findingRows, assetRows, agentRows, incidentRows] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.GlobalRiskScore.list("-calculated_at", 30).catch(() => []),
        base44.entities.TriagedFinding.filter({ status: { $in: ["open", "in_remediation"] } }, "-cvss_score", 300).catch(() => []),
        base44.entities.Asset.list("-risk_score", 200).catch(() => []),
        base44.entities.Agent.list("-executions_total", 100).catch(() => []),
        base44.entities.Incident.list("-created_date", 8).catch(() => []),
      ]);
      if (!active) return;
      setUser(me);
      setScores(scoreRows || []);
      setFindings(findingRows || []);
      setAssets(assetRows || []);
      setAgents((agentRows || []).filter((agent) => agent.status !== "archived"));
      setIncidents(incidentRows || []);
      setRole((current) => current || me?.dashboard_role || (me?.role === "admin" ? "admin" : "engineer"));
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  function choose(next) {
    setRole(next);
    localStorage.setItem(ROLE_KEY, next);
    base44.auth.updateMe({ dashboard_role: next }).catch(() => {});
  }

  const active = ROLE_TABS.find((tab) => tab.key === role) || ROLE_TABS[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">DASH-001 | ROLE VIEWS</span>
          <h1 className="text-xl font-bold text-white mt-1">My dashboard</h1>
          <p className="text-xs text-slate-500">{active.blurb} — only what your role needs.</p>
        </div>
        {user?.full_name && <p className="text-[11px] text-slate-500">Signed in as <span className="text-slate-300 font-semibold">{user.full_name}</span></p>}
      </div>

      <ExecutiveOverviewLink />

      <div className="flex flex-wrap items-center gap-1.5">
        {ROLE_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => choose(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${
              role === key
                ? "bg-blue-500/20 text-blue-200 border-blue-500/50"
                : "bg-[#111827] text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-16 rounded-xl animate-shimmer" style={{ background: "#111827" }} />
          ))}
        </div>
      ) : role === "admin" ? (
        <AdminDashboardView scores={scores} findings={findings} assets={assets} incidents={incidents} />
      ) : role === "developer" ? (
        <DeveloperDashboardView findings={findings} />
      ) : (
        <EngineerDashboardView findings={findings} user={user} agents={agents} />
      )}
    </div>
  );
}