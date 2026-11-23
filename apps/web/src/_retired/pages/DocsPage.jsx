import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronRight, Shield, Copy, Check, ExternalLink } from "lucide-react";

const GOLD = "#C9A84C";

const NAV_TREE = [
  { section: "🚀 Getting Started", items: [
    { id: "quickstart", label: "Quick Start (5 minutes)" },
    { id: "connect-repo", label: "Connect your first repo" },
    { id: "first-scan", label: "Run your first scan" },
    { id: "understanding-results", label: "Understanding results" },
  ]},
  { section: "📦 SDK & Integrations", items: [
    { id: "zen-npm", label: "Zen Firewall (npm)" },
    { id: "zen-python", label: "Zen Firewall (Python)" },
    { id: "vscode", label: "VS Code Extension" },
    { id: "github-actions", label: "GitHub Actions" },
    { id: "gitlab-ci", label: "GitLab CI" },
    { id: "jenkins", label: "Jenkins" },
  ]},
  { section: "🔌 API Reference", items: [
    { id: "api-auth", label: "Authentication" },
    { id: "api-findings", label: "Findings API" },
    { id: "api-scans", label: "Scans API" },
    { id: "api-webhooks", label: "Webhooks" },
    { id: "api-limits", label: "Rate Limits" },
  ]},
  { section: "☁️ Cloud Connectors", items: [
    { id: "aws", label: "AWS Setup" },
    { id: "azure", label: "Azure Setup" },
    { id: "gcp", label: "GCP Setup" },
    { id: "oci", label: "OCI Setup" },
  ]},
  { section: "📋 Compliance", items: [
    { id: "soc2", label: "SOC2 Guide" },
    { id: "iso27001", label: "ISO27001 Guide" },
    { id: "nis2", label: "NIS2 Guide" },
    { id: "dora", label: "DORA Guide" },
  ]},
  { section: "🤖 AI Security", items: [
    { id: "aispm-setup", label: "AI-SPM Setup" },
    { id: "mcp-governance", label: "MCP Server Governance" },
    { id: "prompt-injection", label: "Prompt Injection Detection" },
  ]},
  { section: "❓ Help", items: [
    { id: "faq", label: "FAQ & Troubleshooting" },
  ]},
];

function CodeBlock({ code, lang = "bash" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-xl overflow-hidden" style={{ background: "#0d1220", border: "1px solid #1F2937" }}>
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "#1F2937" }}>
        <span className="text-[10px] font-mono text-slate-600">{lang}</span>
        <button onClick={copy} className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors">
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-sm font-mono text-slate-300 overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

const PAGES = {
  quickstart: {
    title: "Quick Start",
    breadcrumb: ["Getting Started", "Quick Start"],
    content: () => (
      <div className="space-y-8">
        <p className="text-slate-400 text-lg">Get protected in 5 minutes. Follow these steps to run your first security scan.</p>
        {[
          { n: "1", title: "Create your account", desc: "Sign up at shieldai.dev — no credit card required for the free tier.", code: null },
          { n: "2", title: "Connect GitHub", desc: "Authorize ShieldAI to access your repositories via OAuth.", code: "# Click 'Connect GitHub' in the dashboard\n# Authorize with the required scopes:\n# - repo (read)\n# - security_events (write)" },
          { n: "3", title: "Run your first scan", desc: "Trigger a scan on any connected repository.", code: "# Using the ShieldAI CLI:\nnpx shieldai scan --repo my-org/my-repo\n\n# Or via API:\ncurl -X POST https://api.shieldai.dev/v1/scans \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  -d '{\"repo\": \"my-org/my-repo\"}'" },
          { n: "4", title: "View results", desc: "Results appear in the dashboard within 2 minutes. Navigate to Code Security → Findings.", code: null },
        ].map(step => (
          <div key={step.n} className="flex gap-6">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black text-black" style={{ background: GOLD }}>{step.n}</div>
            <div className="flex-1">
              <h3 className="text-white font-bold mb-2">{step.title}</h3>
              <p className="text-slate-400 text-sm mb-3">{step.desc}</p>
              {step.code && <CodeBlock code={step.code} />}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: GOLD }}>
          Next: Connect your cloud account <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    ),
  },
  "zen-npm": {
    title: "Zen Firewall (npm)",
    breadcrumb: ["SDK & Integrations", "Zen Firewall (npm)"],
    content: () => (
      <div className="space-y-6">
        <p className="text-slate-400">Install the Zen Firewall SDK in your Node.js application for runtime attack protection.</p>
        <CodeBlock code="npm install @shieldai/zen" lang="bash" />
        <h3 className="text-white font-bold mt-6">Basic Setup</h3>
        <CodeBlock code={`import { ZenFirewall } from '@shieldai/zen';\n\n// Initialize at app startup — before any route handlers\nZenFirewall.init({\n  apiKey: process.env.SHIELDAI_KEY,\n  mode: 'blocking', // 'blocking' | 'monitoring' | 'dry_run'\n  app: 'my-api',\n});`} lang="javascript" />
        <h3 className="text-white font-bold mt-6">Express.js Middleware</h3>
        <CodeBlock code={`import express from 'express';\nimport { ZenFirewall } from '@shieldai/zen';\n\nconst app = express();\n\n// Add middleware — before your routes\napp.use(ZenFirewall.middleware());\n\napp.get('/api/users', (req, res) => {\n  // Protected automatically: SQLi, XSS, path traversal, etc.\n  res.json({ users: [] });\n});`} lang="javascript" />
        <div className="flex items-center gap-3 pt-4">
          <a href="https://github.com/shieldai/zen" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-semibold hover:underline" style={{ color: GOLD }}>
            <ExternalLink className="w-4 h-4" /> View on GitHub
          </a>
        </div>
      </div>
    ),
  },
  "api-auth": {
    title: "API Authentication",
    breadcrumb: ["API Reference", "Authentication"],
    content: () => (
      <div className="space-y-6">
        <p className="text-slate-400">All ShieldAI API requests require authentication using a Bearer token.</p>
        <div className="rounded-xl p-4 border" style={{ background: "#0d1220", borderColor: "#1F2937" }}>
          <p className="text-xs text-slate-500 mb-1">Base URL</p>
          <code className="text-sm font-mono" style={{ color: GOLD }}>https://api.shieldai.dev/v1</code>
        </div>
        <h3 className="text-white font-bold">Authentication Header</h3>
        <CodeBlock code="Authorization: Bearer YOUR_API_KEY" lang="bash" />
        <h3 className="text-white font-bold mt-6">Example Request</h3>
        <CodeBlock code={`curl https://api.shieldai.dev/v1/findings \\\n  -H 'Authorization: Bearer sk_live_xxxxx' \\\n  -H 'Content-Type: application/json'`} lang="bash" />
        <h3 className="text-white font-bold mt-6">Response Example</h3>
        <CodeBlock code={`{\n  "data": [\n    {\n      "id": "find_abc123",\n      "title": "SQL Injection in UserController",\n      "severity": "critical",\n      "status": "open",\n      "asset": "my-org/api-service",\n      "detected_at": "2026-06-16T10:30:00Z"\n    }\n  ],\n  "pagination": { "total": 42, "page": 1, "per_page": 20 }\n}`} lang="json" />
      </div>
    ),
  },
  "api-findings": {
    title: "Findings API",
    breadcrumb: ["API Reference", "Findings API"],
    content: () => (
      <div className="space-y-6">
        <p className="text-slate-400">Query and manage all security findings across your organization.</p>
        {[
          { method: "GET", color: "#22c55e", path: "/findings", desc: "List all findings", code: `curl https://api.shieldai.dev/v1/findings?severity=critical&status=open \\\n  -H 'Authorization: Bearer YOUR_API_KEY'` },
          { method: "GET", color: "#22c55e", path: "/findings/{id}", desc: "Get a specific finding", code: `curl https://api.shieldai.dev/v1/findings/find_abc123 \\\n  -H 'Authorization: Bearer YOUR_API_KEY'` },
          { method: "PATCH", color: "#f97316", path: "/findings/{id}", desc: "Update finding status", code: `curl -X PATCH https://api.shieldai.dev/v1/findings/find_abc123 \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  -d '{"status": "accepted_risk", "note": "Mitigated by WAF"}'` },
        ].map(ep => (
          <div key={ep.path + ep.method} className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2.5 py-1 rounded text-xs font-black" style={{ background: ep.color + "20", color: ep.color }}>{ep.method}</span>
              <code className="text-sm font-mono text-white">{ep.path}</code>
            </div>
            <p className="text-sm text-slate-400 mb-3">{ep.desc}</p>
            <CodeBlock code={ep.code} lang="bash" />
          </div>
        ))}
      </div>
    ),
  },
  "github-actions": {
    title: "GitHub Actions",
    breadcrumb: ["SDK & Integrations", "GitHub Actions"],
    content: () => (
      <div className="space-y-6">
        <p className="text-slate-400">Integrate ShieldAI security scanning into your GitHub Actions CI/CD pipeline.</p>
        <CodeBlock code={`# .github/workflows/shieldai.yml\nname: ShieldAI Security Scan\non: [push, pull_request]\njobs:\n  security:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: ShieldAI Scan\n        uses: shieldai/scan-action@v1\n        with:\n          api-key: \${{ secrets.SHIELDAI_API_KEY }}\n          fail-on: critical\n          report: true`} lang="yaml" />
        <p className="text-slate-400 text-sm">The action will fail the build if any <code className="text-red-400">critical</code> findings are detected. Set <code className="text-yellow-400">fail-on: high</code> to also block on high-severity issues.</p>
      </div>
    ),
  },
  faq: {
    title: "FAQ & Troubleshooting",
    breadcrumb: ["Help", "FAQ & Troubleshooting"],
    content: () => (
      <div className="space-y-6">
        {[
          { q: "Why isn't my scan starting?", a: "Ensure your GitHub/GitLab token has repo read permissions and the repository is selected in Settings → Repositories." },
          { q: "How long does a scan take?", a: "SAST/SCA typically takes 1-3 minutes. DAST and Pentest can take 5-60 minutes depending on scope." },
          { q: "Why do I see duplicate findings?", a: "Run AutoTriage (/autotriage) to deduplicate findings across scanners. Our AI identifies the same vulnerability detected by multiple tools." },
          { q: "How do I get my API key?", a: "Navigate to Settings → Access → API Keys. Generate a new key with the required scopes." },
          { q: "Is there a rate limit?", a: "Free: 100 API calls/min. Pro: 1,000/min. Enterprise: unlimited. Scan jobs are queued and not rate limited." },
        ].map(f => (
          <div key={f.q} className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <h3 className="text-white font-bold mb-2">{f.q}</h3>
            <p className="text-slate-400 text-sm">{f.a}</p>
          </div>
        ))}
      </div>
    ),
  },
};

// Fallback page for unimplemented doc IDs
function DefaultPage({ id }) {
  const allItems = NAV_TREE.flatMap(s => s.items);
  const item = allItems.find(i => i.id === id);
  return (
    <div className="text-center py-20">
      <div className="text-4xl mb-4">📄</div>
      <h2 className="text-xl font-bold text-white mb-2">{item?.label || "Documentation"}</h2>
      <p className="text-slate-400 text-sm">This documentation page is coming soon.</p>
    </div>
  );
}

export default function DocsPage() {
  const [activeId, setActiveId] = useState("quickstart");
  const [search, setSearch] = useState("");

  const filtered = search
    ? NAV_TREE.map(s => ({ ...s, items: s.items.filter(i => i.label.toLowerCase().includes(search.toLowerCase())) })).filter(s => s.items.length > 0)
    : NAV_TREE;

  const page = PAGES[activeId];
  const breadcrumb = page?.breadcrumb || ["Documentation"];

  return (
    <div className="min-h-screen flex font-body" style={{ background: "#0A0E1A", color: "#F9FAFB" }}>
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r flex flex-col sticky top-0 h-screen overflow-hidden" style={{ background: "#070B14", borderColor: "#1a2235" }}>
        <div className="p-4 border-b" style={{ borderColor: "#1a2235" }}>
          <Link to="/" className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
              <Shield className="w-3 h-3 text-black" />
            </div>
            <span className="text-sm font-black text-white">ShieldAI Docs</span>
          </Link>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search docs..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white outline-none" style={{ background: "#111827", border: "1px solid #1F2937" }} />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {filtered.map(section => (
            <div key={section.section}>
              <div className="text-[9px] font-bold uppercase tracking-widest px-2 mb-1.5 text-slate-600">{section.section}</div>
              {section.items.map(item => (
                <button key={item.id} onClick={() => setActiveId(item.id)}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={activeId === item.id ? { background: GOLD + "15", color: GOLD, borderLeft: `2px solid ${GOLD}` } : { color: "#6b7280" }}>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
            <Link to="/docs" className="hover:text-slate-400">Docs</Link>
            {breadcrumb.map((b, i) => (
              <React.Fragment key={b}>
                <ChevronRight className="w-3 h-3" />
                <span style={i === breadcrumb.length - 1 ? { color: GOLD } : {}}>{b}</span>
              </React.Fragment>
            ))}
          </div>

          <h1 className="text-3xl font-black text-white mb-8">{page?.title || "Documentation"}</h1>
          {page ? <page.content /> : <DefaultPage id={activeId} />}

          <div className="mt-12 pt-6 border-t flex items-center justify-between" style={{ borderColor: "#1F2937" }}>
            <a href="https://github.com/shieldai/docs" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-400 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Edit this page on GitHub
            </a>
            <span className="text-xs text-slate-600">Last updated: June 2026</span>
          </div>
        </div>
      </main>
    </div>
  );
}