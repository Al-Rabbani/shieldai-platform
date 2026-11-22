import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Star, Check, Shield, Zap, Rocket, DollarSign, Wrench } from "lucide-react";

const GOLD = "#C9A84C";

const CATEGORIES = ["All", "SIEM", "Ticketing", "Alerting", "Identity", "GRC/Compliance", "CI/CD", "Cloud", "EDR/XDR"];

const INTEGRATIONS = [
  { id: 1, name: "Microsoft Sentinel", category: "SIEM", initials: "MS", color: "#0078D4", rating: 4.9, installs: 3247, desc: "Ingest all findings, correlate with cloud logs", installed: false, certified: true },
  { id: 2, name: "Splunk Enterprise", category: "SIEM", initials: "SP", color: "#000000", rating: 4.8, installs: 2891, desc: "Forward findings to Splunk SIEM", installed: false, certified: true },
  { id: 3, name: "Elastic SIEM", category: "SIEM", initials: "ES", color: "#005571", rating: 4.7, installs: 1234, desc: "ElasticSearch integration for findings", installed: false, certified: false },
  { id: 4, name: "IBM QRadar", category: "SIEM", initials: "QR", color: "#183772", rating: 4.6, installs: 847, desc: "QRadar SIEM connector", installed: false, certified: true },
  { id: 5, name: "Jira Software", category: "Ticketing", initials: "JI", color: "#0052CC", rating: 4.9, installs: 5891, desc: "Auto-create Jira issues for findings", installed: true, certified: true },
  { id: 6, name: "Linear", category: "Ticketing", initials: "LI", color: "#5E6AD2", rating: 4.8, installs: 2134, desc: "Create Linear issues from findings", installed: false, certified: true },
  { id: 7, name: "ServiceNow", category: "Ticketing", initials: "SN", color: "#82B81C", rating: 4.7, installs: 1847, desc: "ITSM integration for security tickets", installed: false, certified: true },
  { id: 8, name: "GitHub Issues", category: "Ticketing", initials: "GH", color: "#24292E", rating: 4.6, installs: 3421, desc: "Create GitHub issues for code findings", installed: true, certified: true },
  { id: 9, name: "PagerDuty", category: "Alerting", initials: "PD", color: "#06EB76", rating: 4.9, installs: 2847, desc: "Escalate critical findings to on-call teams", installed: false, certified: true },
  { id: 10, name: "Opsgenie", category: "Alerting", initials: "OG", color: "#1F65E4", rating: 4.7, installs: 1234, desc: "Alert routing and escalation", installed: false, certified: false },
  { id: 11, name: "Slack", category: "Alerting", initials: "SL", color: "#4A154B", rating: 4.9, installs: 6234, desc: "Security notifications to Slack", installed: true, certified: true },
  { id: 12, name: "Microsoft Teams", category: "Alerting", initials: "MT", color: "#6264A7", rating: 4.7, installs: 2891, desc: "Teams notifications for findings", installed: false, certified: true },
  { id: 13, name: "Okta", category: "Identity", initials: "OK", color: "#007DC1", rating: 4.8, installs: 1847, desc: "SSO and identity threat correlation", installed: false, certified: true },
  { id: 14, name: "Azure Active Directory", category: "Identity", initials: "AD", color: "#0078D4", rating: 4.8, installs: 2234, desc: "Azure AD integration and SSO", installed: true, certified: true },
  { id: 15, name: "CyberArk", category: "Identity", initials: "CA", color: "#D6381C", rating: 4.7, installs: 891, desc: "Privileged access management integration", installed: false, certified: true },
  { id: 16, name: "Ping Identity", category: "Identity", initials: "PI", color: "#154C93", rating: 4.6, installs: 634, desc: "Identity federation and SSO", installed: false, certified: false },
  { id: 17, name: "Vanta", category: "GRC/Compliance", initials: "VA", color: "#00D0B6", rating: 4.9, installs: 2847, desc: "Auto-sync compliance evidence to Vanta", installed: false, certified: true },
  { id: 18, name: "Drata", category: "GRC/Compliance", initials: "DR", color: "#1955FF", rating: 4.8, installs: 2134, desc: "Push findings and evidence to Drata", installed: false, certified: true },
  { id: 19, name: "Secureframe", category: "GRC/Compliance", initials: "SF", color: "#1A56DB", rating: 4.7, installs: 1234, desc: "Compliance automation sync", installed: false, certified: false },
  { id: 20, name: "Tugboat Logic", category: "GRC/Compliance", initials: "TL", color: "#3D8BFF", rating: 4.6, installs: 847, desc: "GRC platform connector", installed: false, certified: false },
  { id: 21, name: "GitHub Actions", category: "CI/CD", initials: "GA", color: "#24292E", rating: 4.9, installs: 7891, desc: "Scan on every push and PR", installed: true, certified: true },
  { id: 22, name: "GitLab CI", category: "CI/CD", initials: "GL", color: "#FC6D26", rating: 4.8, installs: 3234, desc: "GitLab pipeline security gates", installed: false, certified: true },
  { id: 23, name: "Jenkins", category: "CI/CD", initials: "JE", color: "#D24939", rating: 4.7, installs: 1847, desc: "Jenkins pipeline integration", installed: false, certified: false },
  { id: 24, name: "CircleCI", category: "CI/CD", initials: "CI", color: "#343434", rating: 4.6, installs: 1234, desc: "CircleCI security scanning", installed: false, certified: false },
  { id: 25, name: "AWS Security Hub", category: "Cloud", initials: "AW", color: "#FF9900", rating: 4.8, installs: 2847, desc: "Sync findings to AWS Security Hub", installed: true, certified: true },
  { id: 26, name: "Azure Defender", category: "Cloud", initials: "AZ", color: "#0078D4", rating: 4.7, installs: 2134, desc: "Azure security integration", installed: false, certified: true },
  { id: 27, name: "Google Chronicle", category: "Cloud", initials: "GC", color: "#4285F4", rating: 4.7, installs: 1234, desc: "GCP security telemetry", installed: false, certified: false },
  { id: 28, name: "Terraform Cloud", category: "Cloud", initials: "TF", color: "#7B42BC", rating: 4.6, installs: 1891, desc: "IaC security in Terraform workflows", installed: false, certified: true },
  { id: 29, name: "CrowdStrike Falcon", category: "EDR/XDR", initials: "CS", color: "#E12D3F", rating: 4.9, installs: 1847, desc: "Bi-directional endpoint findings sync", installed: false, certified: true },
  { id: 30, name: "SentinelOne", category: "EDR/XDR", initials: "S1", color: "#00C7FC", rating: 4.8, installs: 1634, desc: "Endpoint detection correlation", installed: false, certified: true },
  { id: 31, name: "Microsoft Defender", category: "EDR/XDR", initials: "MD", color: "#0078D4", rating: 4.8, installs: 2891, desc: "Defender for Endpoint integration", installed: false, certified: true },
  { id: 32, name: "Carbon Black", category: "EDR/XDR", initials: "CB", color: "#FF6600", rating: 4.6, installs: 847, desc: "VMware Carbon Black connector", installed: false, certified: false },
];

const FEATURED = [1, 5, 11];

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);

  const filtered = INTEGRATIONS.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || i.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🛒 ShieldAI Marketplace
          </h1>
          <p className="text-slate-400 mt-1">Extend ShieldAI with 100+ integrations — connect every tool in your security stack</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">127 Integrations</Badge>
          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30">50+ Certified Partners</Badge>
          <Badge className="bg-green-500/10 text-green-400 border-green-500/30">8,247 Installs This Month</Badge>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search integrations..."
            className="pl-10 bg-[#111827] border-gray-800 text-white placeholder:text-slate-600"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                category === cat
                  ? "bg-yellow-600 text-black"
                  : "bg-gray-800 text-slate-400 hover:bg-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Featured */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURED.map(id => {
          const i = INTEGRATIONS.find(x => x.id === id);
          return (
            <Card key={id} className="p-5 bg-[#111827] border-2" style={{ borderColor: GOLD }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ background: i.color }}>
                  {i.initials}
                </div>
                <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">FEATURED</Badge>
              </div>
              <div className="font-semibold text-white mb-1">{i.name}</div>
              <div className="text-xs text-slate-400 mb-3">{i.desc}</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {i.rating} · {i.installs.toLocaleString()} installs
                </div>
                {i.installed ? (
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/30">Installed ✓</Badge>
                ) : (
                  <Button size="sm" className="bg-yellow-600 hover:bg-yellow-500 text-black text-xs h-8">Install</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map(i => (
          <Card
            key={i.id}
            onClick={() => setSelected(i)}
            className="p-4 bg-[#111827] border-gray-800 hover:border-yellow-600/50 hover:shadow-yellow-900/20 transition-all cursor-pointer"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: i.color }}>
                {i.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm truncate">{i.name}</div>
                <div className="text-[10px] text-slate-500">{i.category}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 mb-2 text-xs text-slate-400">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {i.rating}
              <span className="text-slate-600 mx-1">·</span>
              {i.installs.toLocaleString()} installs
            </div>
            <div className="text-xs text-slate-400 mb-3 line-clamp-2">{i.desc}</div>
            <div className="flex items-center justify-between">
              {i.certified && <Badge className="bg-gray-700/50 text-slate-400 border-gray-600/30 text-[9px]">Certified</Badge>}
              {i.installed ? (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">Installed ✓</Badge>
              ) : (
                <Button size="sm" className="bg-yellow-600 hover:bg-yellow-500 text-black text-xs h-7">Install</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Build on ShieldAI */}
      <Card className="p-6 bg-gradient-to-r from-yellow-600/10 to-yellow-600/5 border-2" style={{ borderColor: GOLD }}>
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-white mb-2">Build on ShieldAI</h3>
          <p className="text-slate-400">Join 50+ security vendors who have published integrations on the ShieldAI Marketplace</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gray-800/50">
            <div className="text-2xl mb-2">🚀</div>
            <div className="text-sm font-semibold text-white mb-1">Reach 12,847+ security teams worldwide</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-800/50">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm font-semibold text-white mb-1">Monetize your integration — revenue share program</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-800/50">
            <div className="text-2xl mb-2">🛠️</div>
            <div className="text-sm font-semibold text-white mb-1">Full API access, webhooks, and developer SDK</div>
          </div>
        </div>
        <div className="flex gap-3 justify-center mt-6">
          <Button className="bg-yellow-600 hover:bg-yellow-500 text-black font-semibold">Apply to Partner Program</Button>
          <Button className="border border-gray-700 hover:border-gray-500 text-white" variant="outline">View Developer Docs</Button>
        </div>
      </Card>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-2xl rounded-2xl border overflow-hidden" style={{ background: "#111827", borderColor: "#374151" }}>
            <div className="p-6 border-b" style={{ borderColor: "#1F2937" }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: selected.color }}>
                    {selected.initials}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selected.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-gray-700/50 text-slate-400 border-gray-600/30 text-xs">{selected.category}</Badge>
                      {selected.certified && <Badge className="bg-gray-700/50 text-slate-400 border-gray-600/30 text-xs">✓ Certified</Badge>}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-slate-300">{selected.desc} This integration provides seamless bi-directional sync between ShieldAI and {selected.name}, enabling automated workflows and unified security operations.</p>
              <div>
                <div className="text-sm font-semibold text-white mb-2">Key Features</div>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li>• Real-time data synchronization</li>
                  <li>• Automated workflow triggers</li>
                  <li>• Custom field mapping</li>
                  <li>• Enterprise-grade security</li>
                </ul>
              </div>
              <div>
                <div className="text-sm font-semibold text-white mb-2">Setup Instructions</div>
                <ol className="text-sm text-slate-400 space-y-1">
                  <li>1. Click "Install Integration" and authorize ShieldAI</li>
                  <li>2. Configure your {selected.name} workspace and permissions</li>
                  <li>3. Select which findings to sync and customize field mappings</li>
                </ol>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: "#1F2937" }}>
                <Button className="bg-yellow-600 hover:bg-yellow-500 text-black font-semibold">
                  {selected.installed ? "✓ Installed" : "Install Integration"}
                </Button>
                <Button className="border border-gray-700 hover:border-gray-500 text-white" variant="outline">View Documentation</Button>
                <div className="ml-auto text-xs text-slate-500">
                  ⭐ {selected.rating} · {selected.installs.toLocaleString()} installs
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-600 text-center">Last updated: {new Date().toLocaleString()} | Powered by real data</div>
    </div>
  );
}