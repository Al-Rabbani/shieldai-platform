import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Task Managers", "CI/CD", "Compliance", "Messaging", "Git Systems", "Cloud Providers", "IDE Plugins"];

const INTEGRATIONS = {
  "Task Managers": [
    { id: "jira", name: "Jira", emoji: "🎯", color: "#0052CC", desc: "Auto-create tickets for critical findings. Two-way sync on status changes.", connected: false },
    { id: "linear", name: "Linear", emoji: "🔷", color: "#5E6AD2", desc: "Sync findings to Linear issues with severity labels.", connected: false },
    { id: "clickup", name: "ClickUp", emoji: "🟣", color: "#7B68EE", desc: "Route findings to ClickUp tasks by team.", connected: false },
    { id: "monday", name: "Monday.com", emoji: "📋", color: "#FF3D57", desc: "Send findings to Monday boards.", connected: false },
    { id: "asana", name: "Asana", emoji: "🌸", color: "#F06A6A", desc: "Create Asana tasks from ShieldAI findings.", connected: false },
  ],
  "CI/CD": [
    { id: "github_actions", name: "GitHub Actions", emoji: "⚙️", color: "#24292f", desc: "Block PRs when critical findings are introduced. Quality gate enforcement.", connected: true, stats: "14 repos · Gate active" },
    { id: "gitlab_ci", name: "GitLab CI", emoji: "🦊", color: "#FC6D26", desc: "Integrate ShieldAI scans into GitLab pipelines.", connected: false },
    { id: "azure_devops", name: "Azure DevOps", emoji: "🔵", color: "#0078D4", desc: "Add ShieldAI security gate to Azure Pipelines.", connected: false },
    { id: "circleci", name: "CircleCI", emoji: "⚫", color: "#343434", desc: "Run ShieldAI scans in CircleCI workflows.", connected: false },
    { id: "jenkins", name: "Jenkins", emoji: "🏗️", color: "#D33833", desc: "ShieldAI Jenkins plugin for pipeline integration.", connected: false },
  ],
  "Compliance": [
    { id: "vanta", name: "Vanta", emoji: "🔒", color: "#7C3AED", desc: "Auto-populate Vanta controls from ShieldAI scan results. SOC2 evidence in one click.", connected: false },
    { id: "drata", name: "Drata", emoji: "🛡️", color: "#6366F1", desc: "Sync compliance evidence directly to Drata for continuous compliance.", connected: false },
    { id: "tugboat", name: "Tugboat Logic", emoji: "⚓", color: "#1D4ED8", desc: "Export findings to Tugboat Logic.", connected: false },
    { id: "servicenow", name: "ServiceNow", emoji: "⚙️", color: "#8B5CF6", desc: "Auto-create tickets from security findings", connected: false },
  ],
  "Messaging": [
    { id: "slack", name: "Slack", emoji: "💬", color: "#4A154B", desc: "Get real-time alerts for critical findings, new threats, and SLA breaches in Slack channels.", connected: false },
    { id: "teams", name: "Microsoft Teams", emoji: "💼", color: "#6264A7", desc: "Route ShieldAI alerts to Teams channels.", connected: false },
    { id: "pagerduty", name: "PagerDuty", emoji: "🚨", color: "#06AC38", desc: "Page on-call engineers for critical zero-days automatically.", connected: false },
  ],
  "Git Systems": [
    { id: "github", name: "GitHub", emoji: "🐙", color: "#24292f", desc: "14 repos connected. AutoFix PRs enabled.", connected: true, stats: "14 repos" },
    { id: "gitlab", name: "GitLab", emoji: "🦊", color: "#FC6D26", desc: "3 repos connected.", connected: true, stats: "3 repos" },
    { id: "bitbucket", name: "Bitbucket", emoji: "🪣", color: "#0052CC", desc: "Connect Bitbucket repos for scanning.", connected: false },
    { id: "azure_repos", name: "Azure Repos", emoji: "🔵", color: "#0078D4", desc: "Connect Azure Repos for scanning.", connected: false },
  ],
  "Cloud Providers": [
    { id: "aws", name: "AWS", emoji: "☁️", color: "#FF9900", desc: "1 account connected. Last scanned 2h ago.", connected: true, stats: "1 account" },
    { id: "azure_cloud", name: "Azure", emoji: "🔵", color: "#0078D4", desc: "1 account connected.", connected: true, stats: "1 account" },
    { id: "gcp", name: "GCP", emoji: "🌈", color: "#4285F4", desc: "1 account connected.", connected: true, stats: "1 account" },
  ],
  "IDE Plugins": [
    { id: "vscode", name: "VS Code", emoji: "🟦", color: "#0078D4", desc: "Most popular — SAST, Secrets, SCA, AutoFix, Full Workspace Scan, IaC", connected: false, action: "Install from VS Code Marketplace" },
    { id: "jetbrains", name: "JetBrains", emoji: "⚫", color: "#000000", desc: "IntelliJ, GoLand, PyCharm, WebStorm, PhpStorm, Rider, RubyMine, RustRover, Android Studio", connected: false, action: "Install from JetBrains Marketplace" },
    { id: "cursor", name: "Cursor IDE", emoji: "🔵", color: "#3B82F6", desc: "AI-native support + MCP integration — ask ShieldAI from Cursor chat", connected: false, action: "Install Cursor Extension" },
    { id: "windsurf", name: "Windsurf IDE", emoji: "🌊", color: "#06B6D4", desc: "SAST, Secrets, SCA, AutoFix", connected: false, action: "Install Windsurf Extension" },
    { id: "visual_studio", name: "Visual Studio", emoji: "🟣", color: "#5C2D91", desc: ".NET, C#, VB.NET, SAST, SCA", connected: false, action: "Install from Visual Studio Marketplace" },
    { id: "eclipse", name: "Eclipse IDE", emoji: "🟠", color: "#FF6600", desc: "Java, IaC Scanning, SAST", connected: false, action: "Install Eclipse Plugin" },
    { id: "kiro", name: "Kiro IDE", emoji: "🔷", color: "#0D9488", desc: "SAST, Secrets, SCA", connected: false, action: "Install Kiro Extension", badge: "NEW" },
    { id: "antigravity", name: "Google Antigravity", emoji: "🌈", color: "#4285F4", desc: "SAST, Secrets, SCA, AutoFix", connected: false, action: "Install Antigravity Extension", badge: "NEW" },
  ],
};

function IntegrationCard({ integration, onConnect }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3 transition-all hover:border-slate-600" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.5)" }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: integration.color + "18", border: `1px solid ${integration.color}30` }}>
            {integration.emoji}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{integration.name}</p>
            {integration.connected && integration.stats && (
              <p className="text-[10px] text-slate-500 font-mono">{integration.stats}</p>
            )}
          </div>
        </div>
        {integration.connected ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0" style={{ color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", boxShadow: "0 0 8px rgba(16,185,129,0.1)" }}>● CONNECTED</span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0" style={{ color: "#64748b", background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.2)" }}>NOT CONNECTED</span>
        )}
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{integration.desc}</p>
      <div className="flex gap-2 mt-auto">
        {integration.action ? (
          <a href="/integrations/ide" className="flex-1 text-center text-xs py-1.5 rounded font-semibold transition-all hover:brightness-110" style={{ color: "#fff", background: integration.color + "dd", border: `1px solid ${integration.color}` }}>
            {integration.action}
          </a>
        ) : integration.connected ? (
          <>
            <button onClick={() => onConnect(integration, "configure")} className="flex-1 text-xs py-1.5 rounded font-medium transition-all hover:brightness-110" style={{ color: "#94a3b8", background: "rgba(30,58,95,0.4)", border: "1px solid rgba(30,58,95,0.5)" }}>Configure</button>
            <button onClick={() => toast.success(`${integration.name} disconnected.`)} className="text-xs py-1.5 px-3 rounded font-medium transition-all" style={{ color: "#ef4444", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>Disconnect</button>
          </>
        ) : (
          <button onClick={() => onConnect(integration, "connect")} className="flex-1 text-xs py-1.5 rounded font-semibold transition-all hover:brightness-110" style={{ color: "#fff", background: integration.color + "dd", border: `1px solid ${integration.color}` }}>Connect</button>
        )}
      </div>
    </div>
  );
}

function ApiKeySection() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const key = "sk-shield-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
  const masked = "sk-shield-••••••••••••••••••••••";
  const curlExample = `curl -X GET https://api.shieldai.io/v1/findings \\
  -H "Authorization: Bearer sk-shield-••••••••••••••" \\
  -H "Content-Type: application/json"`;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(30,58,95,0.5)" }}>
      <div className="px-5 py-4" style={{ background: "#0f172a", borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
        <h3 className="text-sm font-bold text-white">Public API Access</h3>
        <p className="text-xs text-slate-500 mt-0.5">Integrate ShieldAI findings into your own tools and workflows</p>
      </div>
      <div className="p-5 space-y-4" style={{ background: "#090e1a" }}>
        <div className="flex items-center gap-3">
          <div className="flex-1 px-3 py-2 rounded-lg font-mono text-sm text-slate-400 select-all" style={{ background: "#020617", border: "1px solid rgba(30,58,95,0.4)" }}>
            {visible ? key : masked}
          </div>
          <button onClick={() => setVisible(v => !v)} className="text-xs px-3 py-2 rounded-lg transition-all" style={{ color: "#64748b", background: "#0f172a", border: "1px solid rgba(30,58,95,0.4)" }}>{visible ? "Hide" : "Show"}</button>
          <button onClick={() => { navigator.clipboard.writeText(key); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-xs px-3 py-2 rounded-lg transition-all flex items-center gap-1.5" style={{ color: copied ? "#10b981" : "#6b7280", background: "#0f172a", border: "1px solid rgba(30,58,95,0.4)" }}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={() => toast.success("API key regenerated.")} className="text-xs px-3 py-2 rounded-lg transition-all" style={{ color: "#f97316", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)" }}>Regenerate</button>
          <button className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all" style={{ color: "#3b82f6", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <ExternalLink className="w-3 h-3" /> API Docs
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="text-emerald-400 font-mono">✓</span> 10,000 requests/day limit
          <span className="mx-2 text-slate-700">·</span>
          <span className="text-emerald-400 font-mono">✓</span> REST + Webhooks
        </div>
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider font-mono mb-2">Example Request</p>
          <div className="rounded-lg p-4" style={{ background: "#020617", border: "1px solid rgba(30,58,95,0.3)" }}>
            <pre className="text-xs text-emerald-400 font-mono">{curlExample}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsHub() {
  const [activeTab, setActiveTab] = useState("Task Managers");
  const [modal, setModal] = useState(null);

  const handleConnect = (integration, mode) => {
    setModal({ integration, mode });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Integrations Hub</h1>
        <p className="text-sm text-slate-500 mt-1">Connect ShieldAI to your existing tools — task managers, compliance platforms, CI/CD, messaging.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Connected", value: Object.values(INTEGRATIONS).flat().filter(i => i.connected).length, color: "#10b981" },
          { label: "Available", value: Object.values(INTEGRATIONS).flat().length, color: "#3b82f6" },
          { label: "Categories", value: CATEGORIES.length, color: "#8b5cf6" },
          { label: "API Requests Today", value: "2,841", color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.4)" }}>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1">{s.label}</p>
            <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveTab(cat)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={activeTab === cat ? { background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" } : { color: "#475569", border: "1px solid rgba(30,58,95,0.3)", background: "transparent" }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(INTEGRATIONS[activeTab] || []).map(integration => (
          <IntegrationCard key={integration.id} integration={integration} onConnect={handleConnect} />
        ))}
      </div>

      {/* API Access */}
      <ApiKeySection />

      {/* Connect Modal */}
      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent className="bg-[#0f172a] border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-sm flex items-center gap-2">
              <span className="text-xl">{modal?.integration.emoji}</span>
              {modal?.mode === "configure" ? `Configure ${modal?.integration.name}` : `Connect ${modal?.integration.name}`}
            </DialogTitle>
          </DialogHeader>
          {modal && (
            <div className="space-y-4">
              {modal.integration.connected ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <p className="text-xs text-emerald-400 font-semibold">✓ Connected</p>
                    <p className="text-xs text-slate-500 mt-1">{modal.integration.stats}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block">Alert Channel</label>
                    <input className="w-full px-3 py-2 rounded-lg text-sm text-white font-mono" style={{ background: "#020617", border: "1px solid rgba(30,58,95,0.4)" }} defaultValue="#security-alerts" />
                  </div>
                  <button onClick={() => { toast.success("Settings saved."); setModal(null); }} className="w-full py-2.5 rounded-lg font-bold text-sm" style={{ background: "#3b82f6", color: "#fff" }}>Save Settings</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">{modal.integration.desc}</p>
                  <div className="p-3 rounded-lg" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
                    <p className="text-[10px] text-blue-400 font-mono mb-1">OAuth 2.0 Authorization</p>
                    <p className="text-xs text-slate-500">You'll be redirected to {modal.integration.name} to authorize ShieldAI. No passwords are stored.</p>
                  </div>
                  <button onClick={() => { toast.success(`${modal.integration.name} connected successfully!`); setModal(null); }} className="w-full py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110" style={{ background: modal.integration.color, color: "#fff" }}>
                    Authorize with {modal.integration.name}
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}