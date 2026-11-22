import React, { useState } from "react";
import { Shield, Plus, X, RefreshCw, BarChart3, FileText, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

const GOLD = "#C9A84C";

const INDUSTRY_COLORS = { FinTech: "#22c55e", Healthcare: "#3b82f6", SaaS: "#8b5cf6", Manufacturing: "#f97316", Government: "#ef4444" };
const SEV_COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6"];

const INITIAL_CLIENTS = [
  {
    id: 1, name: "FinVault Ltd", initials: "FV", industry: "FinTech", risk: 72, critical: 4, slaBreaches: 2, assets: 38, lastScan: "5 min ago",
    compliance: [{ f: "SOC2", ok: true }, { f: "ISO27001", warn: true }, { f: "PCI-DSS", ok: false }],
    findings: { critical: 4, high: 11, medium: 23, low: 41 }
  },
  {
    id: 2, name: "MedCore Systems", initials: "MC", industry: "Healthcare", risk: 58, critical: 2, slaBreaches: 0, assets: 24, lastScan: "12 min ago",
    compliance: [{ f: "SOC2", ok: true }, { f: "HIPAA", ok: true }, { f: "ISO27001", ok: false }],
    findings: { critical: 2, high: 7, medium: 18, low: 34 }
  },
  {
    id: 3, name: "CloudBase Inc", initials: "CB", industry: "SaaS", risk: 34, critical: 0, slaBreaches: 0, assets: 61, lastScan: "1h ago",
    compliance: [{ f: "SOC2", ok: true }, { f: "ISO27001", ok: true }, { f: "GDPR", ok: true }],
    findings: { critical: 0, high: 3, medium: 9, low: 22 }
  },
];

const ACTIVITY = [
  { client: "FinVault Ltd", action: "Scan completed", analyst: "M. Chen", time: "5m ago", color: "#22c55e" },
  { client: "FinVault Ltd", action: "Critical finding escalated: CVE-2024-1234", analyst: "AI Agent", time: "12m ago", color: "#ef4444" },
  { client: "MedCore Systems", action: "Report generated: Executive Summary", analyst: "S. Al-Rabbani", time: "1h ago", color: GOLD },
  { client: "CloudBase Inc", action: "SLA marked resolved", analyst: "M. Chen", time: "2h ago", color: "#22c55e" },
  { client: "FinVault Ltd", action: "ISO27001 compliance gap identified", analyst: "AI Agent", time: "3h ago", color: "#eab308" },
  { client: "MedCore Systems", action: "Cloud account AWS connected", analyst: "P. Patel", time: "1d ago", color: "#3b82f6" },
];

function CompliancePip({ f, ok, warn }) {
  const color = ok ? "#22c55e" : warn ? "#eab308" : "#ef4444";
  const icon = ok ? "✅" : warn ? "⚠️" : "❌";
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-md border font-semibold"
      style={{ color, background: color + "15", borderColor: color + "40" }}>{f} {icon}</span>
  );
}

export default function MSSPPage() {
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [showAdd, setShowAdd] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", industry: "SaaS", contact: "", plan: "Professional" });
  const [currentClient, setCurrentClient] = useState(null);

  const totalFindings = clients.reduce((s, c) => ({
    critical: s.critical + c.findings.critical,
    high: s.high + c.findings.high,
    medium: s.medium + c.findings.medium,
    low: s.low + c.findings.low,
  }), { critical: 0, high: 0, medium: 0, low: 0 });

  const pieData = [
    { name: "Critical", value: totalFindings.critical },
    { name: "High", value: totalFindings.high },
    { name: "Medium", value: totalFindings.medium },
    { name: "Low", value: totalFindings.low },
  ];

  const handleAdd = () => {
    if (!newOrg.name) return toast.error("Enter org name");
    const initials = newOrg.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    setClients(prev => [...prev, {
      id: Date.now(), name: newOrg.name, initials, industry: newOrg.industry,
      risk: Math.floor(Math.random() * 40 + 20), critical: 0, slaBreaches: 0, assets: 0, lastScan: "Never",
      compliance: [{ f: "SOC2", ok: false }], findings: { critical: 0, high: 0, medium: 0, low: 0 }
    }]);
    setShowAdd(false);
    setNewOrg({ name: "", industry: "SaaS", contact: "", plan: "Professional" });
    toast.success(`${newOrg.name} added to MSSP console`);
  };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}`}</style>

      {currentClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-md rounded-2xl border p-6" style={{ background: "#111827", borderColor: "#374151" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-white">Switching to {currentClient.name}</h3>
              <button onClick={() => setCurrentClient(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-400 mb-4">You'll be viewing the security console in the context of <strong className="text-white">{currentClient.name}</strong>. All data shown will be scoped to this client.</p>
            <button onClick={() => { toast.success(`Switched to ${currentClient.name}`); setCurrentClient(null); }}
              className="w-full py-2.5 rounded-xl font-bold text-black"
              style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Enter Client Console</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="fu">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Shield className="w-3.5 h-3.5" /><span>Platform</span><span>/</span>
          <span style={{ color: GOLD }}>MSSP Control Plane</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white">MSSP Control Plane</h1>
              <span className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: "rgba(201,168,76,0.15)", color: GOLD, border: `1px solid ${GOLD}33` }}>MULTI-TENANT</span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">Managing {clients.length} client organizations · {clients.reduce((s, c) => s + c.assets, 0)} total assets</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-black"
            style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="fu grid grid-cols-2 md:grid-cols-4 gap-4" style={{ animationDelay: "60ms" }}>
        {[
          { label: "Managed Clients", value: clients.length, color: GOLD },
          { label: "Critical Findings", value: totalFindings.critical, color: "#ef4444" },
          { label: "SLA Breaches", value: clients.reduce((s, c) => s + c.slaBreaches, 0), color: "#f97316" },
          { label: "Total Assets", value: clients.reduce((s, c) => s + c.assets, 0), color: "#3b82f6" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: s.color + "33" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{s.label}</div>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Client Cards */}
      <div className="fu grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5" style={{ animationDelay: "80ms" }}>
        {clients.map((client, i) => {
          const ic = INDUSTRY_COLORS[client.industry] || GOLD;
          const riskColor = client.risk >= 70 ? "#ef4444" : client.risk >= 50 ? "#eab308" : "#22c55e";
          return (
            <div key={client.id}
              className="rounded-2xl border p-5 transition-all hover:scale-[1.01]"
              style={{ background: "#111827", borderColor: "#1F2937", animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black text-black flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${ic},${ic}99)` }}>{client.initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-black text-white">{client.name}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: ic + "20", color: ic, border: `1px solid ${ic}33` }}>{client.industry}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-black" style={{ color: riskColor }}>{client.risk}</div>
                  <div className="text-[10px] text-slate-500">RISK</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="p-2 rounded-lg" style={{ background: "#1F2937" }}>
                  <div className="text-sm font-black text-red-400">{client.critical}</div>
                  <div className="text-[10px] text-slate-500">Critical</div>
                </div>
                <div className="p-2 rounded-lg" style={{ background: "#1F2937" }}>
                  <div className={`text-sm font-black ${client.slaBreaches > 0 ? "text-red-400" : "text-emerald-400"}`}>{client.slaBreaches}</div>
                  <div className="text-[10px] text-slate-500">SLA Breach</div>
                </div>
                <div className="p-2 rounded-lg" style={{ background: "#1F2937" }}>
                  <div className="text-sm font-black text-white">{client.assets}</div>
                  <div className="text-[10px] text-slate-500">Assets</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {client.compliance.map(c => <CompliancePip key={c.f} {...c} />)}
              </div>

              <div className="text-[10px] text-slate-600 mb-3">Last scan: {client.lastScan}</div>

              <div className="flex gap-2">
                <button onClick={() => setCurrentClient(client)}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-black"
                  style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Enter Console</button>
                <button onClick={() => toast.success(`Report generated for ${client.name}`)}
                  className="py-2 px-3 rounded-xl text-sm font-bold border"
                  style={{ color: "#9CA3AF", borderColor: "#374151", background: "#1F2937" }}>
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cross-Client Analytics */}
      <div className="fu grid grid-cols-1 xl:grid-cols-3 gap-6" style={{ animationDelay: "120ms" }}>
        <div className="xl:col-span-2 rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
          <h3 className="text-sm font-bold text-white mb-4">Client Risk Comparison</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={clients.map(c => ({ name: c.name.split(" ")[0], risk: c.risk }))} layout="vertical">
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#6B7280", fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: "#9CA3AF", fontSize: 11 }} width={80} />
              <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: 8, color: "#F9FAFB", fontSize: 12 }} />
              <Bar dataKey="risk" radius={4}>
                {clients.map((c, i) => <Cell key={i} fill={c.risk >= 70 ? "#ef4444" : c.risk >= 50 ? "#eab308" : "#22c55e"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
          <h3 className="text-sm font-bold text-white mb-4">Finding Distribution</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={SEV_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {pieData.map((d, i) => <div key={d.name} className="flex items-center gap-1 text-[10px] text-slate-400"><div className="w-2 h-2 rounded-full" style={{ background: SEV_COLORS[i] }} />{d.name}: {d.value}</div>)}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="fu rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "160ms" }}>
        <div className="p-4 border-b" style={{ borderColor: "#1F2937" }}>
          <h3 className="text-sm font-bold text-white">MSSP Activity Log</h3>
        </div>
        <div className="divide-y" style={{ divideColor: "#1F2937" }}>
          {ACTIVITY.map((a, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
              <span className="text-xs font-bold w-28 flex-shrink-0" style={{ color: GOLD }}>{a.client}</span>
              <span className="text-xs text-slate-300 flex-1">{a.action}</span>
              <span className="text-[10px] text-slate-500">{a.analyst}</span>
              <span className="text-[10px] text-slate-600">{a.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Client Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-md rounded-2xl border p-6 space-y-4" style={{ background: "#111827", borderColor: "#374151" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Add Client Organization</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <input value={newOrg.name} onChange={e => setNewOrg(p => ({ ...p, name: e.target.value }))} placeholder="Organization name"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 border outline-none"
              style={{ background: "#1F2937", borderColor: "#374151" }} />
            <select value={newOrg.industry} onChange={e => setNewOrg(p => ({ ...p, industry: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white border outline-none"
              style={{ background: "#1F2937", borderColor: "#374151" }}>
              {["FinTech", "Healthcare", "SaaS", "Manufacturing", "Government"].map(i => <option key={i}>{i}</option>)}
            </select>
            <input value={newOrg.contact} onChange={e => setNewOrg(p => ({ ...p, contact: e.target.value }))} placeholder="Primary contact email"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 border outline-none"
              style={{ background: "#1F2937", borderColor: "#374151" }} />
            <select value={newOrg.plan} onChange={e => setNewOrg(p => ({ ...p, plan: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white border outline-none"
              style={{ background: "#1F2937", borderColor: "#374151" }}>
              {["Starter", "Professional", "Enterprise", "Sovereign"].map(p => <option key={p}>{p}</option>)}
            </select>
            <button onClick={handleAdd} className="w-full py-2.5 rounded-xl font-bold text-black"
              style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Add Client</button>
          </div>
        </div>
      )}
    </div>
  );
}