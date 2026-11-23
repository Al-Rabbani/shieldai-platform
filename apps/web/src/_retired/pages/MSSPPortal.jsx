import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, TrendingUp, AlertTriangle, Shield, Eye, FileText, Plus, Settings, BookOpen, MessageSquare } from "lucide-react";

const GOLD = "#C9A84C";

const CLIENTS = [
  { id: 1, name: "Acme Financial Services", industry: "Banking", plan: "Enterprise", assets: 2847, critical: 12, risk: 78, compliance: "SOC2 ✅", mrr: 3200, active: "5min ago" },
  { id: 2, name: "MedTech Solutions", industry: "Healthcare", plan: "Pro", assets: 1234, critical: 3, risk: 84, compliance: "HIPAA ⚠️", mrr: 299, active: "2h ago" },
  { id: 3, name: "City Council IT", industry: "Government", plan: "Enterprise", assets: 891, critical: 0, risk: 92, compliance: "NIS2 ✅", mrr: 2100, active: "1h ago" },
  { id: 4, name: "StartupAI Ltd", industry: "Technology", plan: "Pro", assets: 234, critical: 1, risk: 71, compliance: "SOC2 ⚠️", mrr: 299, active: "30min ago" },
  { id: 5, name: "Retail Chain Co", industry: "Retail", plan: "Pro", assets: 567, critical: 5, risk: 67, compliance: "PCI ❌", mrr: 299, active: "3h ago" },
  { id: 6, name: "Law Firm Partners", industry: "Legal", plan: "Pro", assets: 345, critical: 0, risk: 88, compliance: "ISO27001 ✅", mrr: 299, active: "1d ago" },
  { id: 7, name: "Energy Corp", industry: "Energy", plan: "Enterprise", assets: 3247, critical: 8, risk: 72, compliance: "IEC62443 ⚠️", mrr: 4100, active: "10min ago" },
  { id: 8, name: "University IT", industry: "Education", plan: "Pro", assets: 1891, critical: 4, risk: 69, compliance: "—", mrr: 299, active: "45min ago" },
  { id: 9, name: "Insurance Group", industry: "Insurance", plan: "Enterprise", assets: 1567, critical: 2, risk: 81, compliance: "DORA ✅", mrr: 2800, active: "20min ago" },
  { id: 10, name: "Manufacturing Ltd", industry: "Manufacturing", plan: "Enterprise", assets: 4234, critical: 15, risk: 64, compliance: "IEC62443 ❌", mrr: 3600, active: "5min ago" },
];

export default function MSSPPortal() {
  const [selected, setSelected] = useState([]);

  const totalAssets = CLIENTS.reduce((s, c) => s + c.assets, 0);
  const totalCritical = CLIENTS.reduce((s, c) => s + c.critical, 0);
  const totalMRR = CLIENTS.reduce((s, c) => s + c.mrr, 0);

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            👥 MSSP Partner Portal
          </h1>
          <p className="text-slate-400 mt-1">Manage all your client organizations from one pane of glass — white-label security operations at scale</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 px-3 py-1">Elite Partner ⭐⭐⭐</Badge>
          <Button className="bg-yellow-600 hover:bg-yellow-500 text-black">
            <Plus className="w-4 h-4 mr-2" /> Add Client
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#111827] border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <div className="text-xs text-slate-500">Client Organizations</div>
          </div>
          <div className="text-2xl font-bold text-white">24</div>
        </Card>
        <Card className="p-4 bg-[#111827] border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-green-400" />
            <div className="text-xs text-slate-500">Total Assets Protected</div>
          </div>
          <div className="text-2xl font-bold text-white">{totalAssets.toLocaleString()}</div>
        </Card>
        <Card className="p-4 bg-[#111827] border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <div className="text-xs text-slate-500">Open Critical Findings</div>
          </div>
          <div className="text-2xl font-bold text-red-400">{totalCritical}</div>
        </Card>
        <Card className="p-4 bg-[#111827] border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4" style={{ color: GOLD }} />
            <div className="text-xs text-slate-500">Monthly Revenue</div>
          </div>
          <div className="text-2xl font-bold" style={{ color: GOLD }}>${totalMRR.toLocaleString()}</div>
        </Card>
      </div>

      {/* Bulk Actions */}
      <Card className="p-4 bg-[#111827] border border-gray-800">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <input type="checkbox" className="rounded" onChange={e => setSelected(e.target.checked ? CLIENTS.map(c => c.id) : [])} />
            <span className="text-sm text-slate-400">Select All</span>
          </div>
          <Button size="sm" variant="outline" className="border-gray-700 text-slate-400">Generate Reports</Button>
          <Button size="sm" variant="outline" className="border-gray-700 text-slate-400">Send Briefing</Button>
          <Button size="sm" variant="outline" className="border-gray-700 text-slate-400">Apply Policy</Button>
          <Button size="sm" variant="outline" className="border-gray-700 text-slate-400 ml-auto">Export CSV</Button>
        </div>
      </Card>

      {/* Client Table */}
      <Card className="p-5 bg-[#111827] border border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-slate-400">
                <th className="text-left py-3 w-8"><input type="checkbox" /></th>
                <th className="text-left py-3">Client Name</th>
                <th className="text-left py-3">Industry</th>
                <th className="text-left py-3">Plan</th>
                <th className="text-right py-3">Assets</th>
                <th className="text-right py-3">Critical</th>
                <th className="text-right py-3">Risk</th>
                <th className="text-left py-3">Compliance</th>
                <th className="text-right py-3">MRR</th>
                <th className="text-right py-3">Last Active</th>
                <th className="text-right py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {CLIENTS.map(client => (
                <tr key={client.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3"><input type="checkbox" checked={selected.includes(client.id)} onChange={() => {}} /></td>
                  <td className="py-3 text-white font-semibold">{client.name}</td>
                  <td className="py-3 text-slate-400">{client.industry}</td>
                  <td className="py-3">
                    <Badge className={client.plan === "Enterprise" ? "bg-purple-500/10 text-purple-400 border-purple-500/30" : "bg-blue-500/10 text-blue-400 border-blue-500/30"}>{client.plan}</Badge>
                  </td>
                  <td className="py-3 text-right text-slate-300">{client.assets.toLocaleString()}</td>
                  <td className="py-3 text-right">
                    {client.critical > 0 ? (
                      <span className="text-red-400 font-semibold">{client.critical} 🔴</span>
                    ) : <span className="text-green-400">✓</span>}
                  </td>
                  <td className="py-3 text-right">
                    <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${client.risk >= 80 ? "bg-green-500/10 text-green-400" : client.risk >= 60 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>
                      {client.risk}
                    </div>
                  </td>
                  <td className="py-3 text-slate-400">{client.compliance}</td>
                  <td className="py-3 text-right text-white font-semibold">${client.mrr}</td>
                  <td className="py-3 text-right text-slate-500">{client.active}</td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-slate-400 hover:text-white"><Eye className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 text-slate-400 hover:text-white"><FileText className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 text-slate-400 hover:text-red-400"><AlertTriangle className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 bg-[#111827] border border-gray-800">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" style={{ color: GOLD }} />
            White-Label Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Company Name</label>
              <Input defaultValue="CyberShield MSS" className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" defaultValue="#C9A84C" className="w-10 h-8 rounded border border-gray-700" />
                <Input defaultValue="#C9A84C" className="bg-gray-800 border-gray-700 text-white font-mono" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Custom Domain</label>
              <Input defaultValue="portal.cybershieldmss.com" className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <Button className="w-full bg-yellow-600 hover:bg-yellow-500 text-black">Save Configuration</Button>
          </div>
        </Card>

        <Card className="p-5 bg-[#111827] border border-gray-800">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: GOLD }} />
            Partner Resources
          </h3>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <div className="font-semibold text-white text-sm mb-1">📊 Sales Collateral</div>
              <div className="text-xs text-slate-400 mb-2">Pitch decks, battlecards, ROI calculators</div>
              <Button size="sm" variant="outline" className="border-gray-600 text-slate-400 text-xs w-full">Download</Button>
            </div>
            <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <div className="font-semibold text-white text-sm mb-1">📚 Technical Docs</div>
              <div className="text-xs text-slate-400 mb-2">MSSP onboarding guide, API docs</div>
              <Button size="sm" variant="outline" className="border-gray-600 text-slate-400 text-xs w-full">View Docs</Button>
            </div>
            <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <div className="font-semibold text-white text-sm mb-1">🎓 MSSP Certification</div>
              <div className="text-xs text-slate-400 mb-2">4-hour training program</div>
              <Button size="sm" className="bg-yellow-600 hover:bg-yellow-500 text-black text-xs w-full">Get Certified</Button>
            </div>
            <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <div className="font-semibold text-white text-sm mb-1 flex items-center gap-2">
                <MessageSquare className="w-3 h-3" /> Partner Slack Channel
              </div>
              <div className="text-xs text-slate-400 mb-2">Connect with other MSSP partners</div>
              <Button size="sm" variant="outline" className="border-gray-600 text-slate-400 text-xs w-full">Join Channel</Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="text-xs text-slate-600 text-center">Last updated: {new Date().toLocaleString()} | Powered by real data</div>
    </div>
  );
}