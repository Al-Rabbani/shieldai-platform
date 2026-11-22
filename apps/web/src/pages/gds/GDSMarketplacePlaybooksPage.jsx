import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Lock } from "lucide-react";
import { ExecutiveBreadcrumb, BoardConfidentialBanner, ExecutiveBadge, EXECUTIVE_PAGE_BG, GOLD, CARD_BG, BORDER, MUTED } from "@/components/gds/ExecutiveShared";
import { Card } from "@/components/gds/GDSOSShared";

const PLAYBOOK_TYPES = ["ransomware", "apt", "data_breach", "insider_threat", "ddos", "phishing", "malware"];

export default function GDSMarketplacePlaybooksPage() {
  const { data: playbooks = [] } = useQuery({ queryKey: ["marketplace-playbooks"], queryFn: () => base44.entities.MarketplacePlaybook.list("-installs_count", 100).catch(() => []) });
  const { data: workflows = [] } = useQuery({ queryKey: ["marketplace-workflows"], queryFn: () => base44.entities.MarketplaceWorkflow.list("-installs_count", 100).catch(() => []) });
  const [tab, setTab] = useState("playbooks");

  const data = tab === "playbooks" ? playbooks : workflows;
  const stats = { total: playbooks.length + workflows.length, playbooks: playbooks.length, workflows: workflows.length, certified: data.filter(d => d.is_certified).length };

  return (
    <div style={EXECUTIVE_PAGE_BG}>
      <ExecutiveBreadcrumb items={[{ label: "Playbook & Workflow Library" }]} />
      <BoardConfidentialBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Playbook & Workflow Library</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>{stats.total} Total · {stats.playbooks} Playbooks · {stats.workflows} Workflows</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("playbooks")} className={`text-xs font-bold px-4 py-2 rounded-lg ${tab === "playbooks" ? "" : "opacity-60"}`} style={{ background: tab === "playbooks" ? `${GOLD}20` : `${GOLD}08`, color: tab === "playbooks" ? GOLD : MUTED, border: `1px solid ${tab === "playbooks" ? GOLD + '40' : GOLD + '20'}` }}>Playbooks</button>
        <button onClick={() => setTab("workflows")} className={`text-xs font-bold px-4 py-2 rounded-lg ${tab === "workflows" ? "" : "opacity-60"}`} style={{ background: tab === "workflows" ? `${GOLD}20` : `${GOLD}08`, color: tab === "workflows" ? GOLD : MUTED, border: `1px solid ${tab === "workflows" ? GOLD + '40' : GOLD + '20'}` }}>Workflows</button>
      </div>

      <Card className="p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Name</th>
              <th className="pb-3">Type</th>
              {tab === "playbooks" && <th className="pb-3">MITRE</th>}
              <th className="pb-3">Steps</th>
              <th className="pb-3">Duration</th>
              <th className="pb-3">Success Rate</th>
              {tab === "playbooks" && <th className="pb-3">Auto Exec</th>}
              {tab === "playbooks" && <th className="pb-3">Approval</th>}
              <th className="pb-3">Publisher</th>
              <th className="pb-3">Installs</th>
              <th className="pb-3">Rating</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {data.map(item => (
              <tr key={item.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-semibold text-white">{item.display_name}</td>
                <td className="py-3"><ExecutiveBadge color={tab === "playbooks" ? "#EF4444" : "#A855F7"}>{tab === "playbooks" ? item.playbook_type : item.workflow_type}</ExecutiveBadge></td>
                {tab === "playbooks" && <td className="py-3"><div className="flex gap-1">{(item.mitre_techniques || []).slice(0, 3).map((t, i) => (<span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${GOLD}15`, color: GOLD }}>{t}</span>))}</div></td>}
                <td className="py-3 text-white">{item.steps_count || 0}</td>
                <td className="py-3 text-white">{tab === "playbooks" ? `${item.avg_execution_minutes || 0}m` : `${item.avg_duration_minutes || 0}m`}</td>
                <td className="py-3"><ExecutiveBadge color={(item.success_rate_pct || 0) >= 90 ? "#10B981" : "#F59E0B"}>{item.success_rate_pct || 0}%</ExecutiveBadge></td>
                {tab === "playbooks" && <td className="py-3">{item.is_auto_executable ? <CheckCircle className="w-4 h-4 text-green-400" /> : "—"}</td>}
                {tab === "playbooks" && <td className="py-3">{item.requires_approval ? <Lock className="w-4 h-4 text-amber-400" /> : "—"}</td>}
                <td className="py-3" style={{ color: MUTED }}>{item.publisher_name || "Publisher"}</td>
                <td className="py-3 text-white">{item.installs_count >= 1000 ? `${(item.installs_count/1000).toFixed(1)}K` : item.installs_count}</td>
                <td className="py-3"><div className="flex items-center gap-1">⭐ {item.rating || 0}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}