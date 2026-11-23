import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Code2, Copy, Check, Play, RefreshCw, Package } from "lucide-react";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, CARD, PAGE_BG,
  SevBadge, Card, KpiCard, Skeleton
} from "@/components/gds/GDSOSShared";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
      style={{ background: copied ? `${LOW}20` : `${CYAN}15`, border: `1px solid ${copied ? LOW : CYAN}40`, color: copied ? LOW : CYAN }}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

const LANGS = ["js", "ts", "py", "go"];
const ECOSYSTEMS = ["npm", "pypi", "go", "maven", "cargo"];

const CATEGORY_COLORS = {
  injection: DANGER, secrets: DANGER, auth: HIGH, crypto: HIGH,
  xss: HIGH, sqli: DANGER, iac: MEDIUM, deps: MEDIUM, ai: "#8B5CF6",
  config: MEDIUM, network: MEDIUM, logging: LOW,
};

export default function GDSIDEPluginPage() {
  const [fileContent, setFileContent] = useState("");
  const [lang, setLang] = useState("js");
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);

  const [pkgForm, setPkgForm] = useState({ name: "", version: "", ecosystem: "npm" });
  const [pkgResult, setPkgResult] = useState(null);
  const [checkingPkg, setCheckingPkg] = useState(false);

  const [projectScore, setProjectScore] = useState(null);
  const [scoreFetching, setScoreFetching] = useState(false);

  const [rules, setRules] = useState(null);
  const [loadingRules, setLoadingRules] = useState(false);

  const callPlugin = async (payload) => {
    const res = await base44.functions.invoke("gdsIDEPlugin", payload);
    return res.data;
  };

  const scanFile = async () => {
    if (!fileContent.trim()) return;
    setScanning(true);
    try {
      const d = await callPlugin({ action: "scan_file", content: fileContent, filename: `test.${lang}` });
      setScanResult(d);
    } finally { setScanning(false); }
  };

  const checkPackage = async () => {
    if (!pkgForm.name) return;
    setCheckingPkg(true);
    try {
      const d = await callPlugin({ action: "check_package", ...pkgForm });
      setPkgResult(d);
    } finally { setCheckingPkg(false); }
  };

  const fetchScore = async () => {
    setScoreFetching(true);
    try {
      const d = await callPlugin({ action: "project_score" });
      setProjectScore(d);
    } finally { setScoreFetching(false); }
  };

  const fetchRules = async () => {
    setLoadingRules(true);
    try {
      const d = await callPlugin({ action: "get_rules" });
      setRules(d?.rules || d || []);
    } finally { setLoadingRules(false); }
  };

  const scoreColor = (s) => s >= 75 ? LOW : s >= 50 ? MEDIUM : DANGER;
  const grade = (s) => s >= 90 ? "A" : s >= 75 ? "B" : s >= 60 ? "C" : s >= 45 ? "D" : "F";

  const IDE_CARDS = [
    {
      name: "VS Code",
      icon: "⬛",
      color: "#007ACC",
      command: "ext install gds-os.security-scanner",
      note: "Run in VS Code Command Palette (Ctrl+P)",
    },
    {
      name: "IntelliJ / IDEA",
      icon: "🔴",
      color: "#FE2857",
      command: "Search for 'GDS OS' in JetBrains Marketplace",
      note: "File → Settings → Plugins → Marketplace",
      noClipboard: true,
    },
    {
      name: "Cursor",
      icon: "⚫",
      color: CYAN,
      command: "ext install gds-os.security-scanner",
      note: "Works via VS Code Extension API — same command",
    },
  ];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)" }}>
          <Code2 className="w-5 h-5" style={{ color: "#8B5CF6" }} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">IDE Security Plugin</h1>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>
            Real-time security scanning in VS Code, IntelliJ & Cursor — 15 rules, instant feedback
          </p>
        </div>
      </div>

      {/* Install Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {IDE_CARDS.map(card => (
          <Card key={card.name} glow className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{card.icon}</span>
              <h3 className="font-bold text-white">{card.name}</h3>
            </div>
            <code className="block text-[11px] font-mono px-3 py-2 rounded-lg mb-3 break-all"
              style={{ background: "rgba(0,0,0,0.4)", color: card.color, border: `1px solid ${BORDER}` }}>
              {card.command}
            </code>
            <div className="flex items-center justify-between">
              <p className="text-[10px]" style={{ color: MUTED }}>{card.note}</p>
              {!card.noClipboard && <CopyButton text={card.command} />}
            </div>
          </Card>
        ))}
      </div>

      {/* Project Score + Rules side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Score */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Project Security Score</h3>
            <button onClick={fetchScore} disabled={scoreFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              {scoreFetching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Calculate
            </button>
          </div>
          {projectScore ? (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-6xl font-black font-mono" style={{ color: scoreColor(projectScore.score ?? 0) }}>
                  {projectScore.score ?? "—"}
                </div>
                <div className="text-2xl font-black mt-1" style={{ color: scoreColor(projectScore.score ?? 0) }}>
                  {grade(projectScore.score ?? 0)}
                </div>
                <div className="text-[10px] mt-1 uppercase tracking-wider" style={{ color: MUTED }}>/ 100</div>
              </div>
              <div className="flex-1 space-y-2">
                {projectScore.breakdown && Object.entries(projectScore.breakdown).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-[10px] capitalize w-24 truncate" style={{ color: MUTED }}>{k.replace(/_/g, " ")}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${v}%`, background: scoreColor(v) }} />
                    </div>
                    <span className="text-[10px] font-mono w-6 text-right" style={{ color: scoreColor(v) }}>{v}</span>
                  </div>
                ))}
                {projectScore.message && <p className="text-[10px] mt-2" style={{ color: MUTED }}>{projectScore.message}</p>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-center py-6" style={{ color: MUTED }}>Click Calculate to get your project's security score</p>
          )}
        </Card>

        {/* Rules */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Coverage — 15 Rules</h3>
            <button onClick={fetchRules} disabled={loadingRules}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              {loadingRules ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Load Rules
            </button>
          </div>
          {loadingRules ? <Skeleton lines={4} /> : rules ? (
            <div className="overflow-y-auto max-h-64 space-y-1" style={{ scrollbarWidth: "none" }}>
              {(Array.isArray(rules) ? rules : []).map((r, i) => {
                const catColor = CATEGORY_COLORS[r.category?.toLowerCase()] || CYAN;
                return (
                  <div key={r.id || i} className="flex items-center gap-2 p-2 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}20` }}>
                    <span className="text-[9px] font-black font-mono w-16 flex-shrink-0" style={{ color: CYAN }}>{r.id}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ color: catColor, background: `${catColor}15` }}>{r.category}</span>
                    <SevBadge sev={r.severity} />
                    <span className="text-[10px] flex-1 truncate" style={{ color: MUTED }}>{r.message || r.name}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-center py-6" style={{ color: MUTED }}>Click Load Rules to see all 15 security rules</p>
          )}
        </Card>
      </div>

      {/* Test File Scan */}
      <Card className="p-5">
        <h3 className="font-bold text-white mb-4">Test File Scan</h3>
        <div className="flex gap-3 mb-3">
          {LANGS.map(l => (
            <button key={l} onClick={() => setLang(l)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: lang === l ? `${CYAN}15` : "transparent", border: `1px solid ${lang === l ? CYAN + "50" : BORDER}`, color: lang === l ? CYAN : MUTED }}>
              .{l}
            </button>
          ))}
        </div>
        <textarea
          value={fileContent}
          onChange={e => setFileContent(e.target.value)}
          rows={8}
          placeholder={`Paste your ${lang} code here to scan for vulnerabilities…`}
          className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none resize-none mb-3"
          style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: TEXT }}
        />
        <button onClick={scanFile} disabled={scanning || !fileContent.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)", color: "#8B5CF6" }}>
          {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {scanning ? "Scanning…" : "Scan File"}
        </button>

        {scanResult && (
          <div className="mt-4">
            {(!scanResult.diagnostics || scanResult.diagnostics.length === 0) ? (
              <div className="p-3 rounded-xl text-sm font-bold" style={{ background: `${LOW}12`, border: `1px solid ${LOW}30`, color: LOW }}>
                ✅ No issues found in this snippet
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <p className="text-xs font-bold mb-2" style={{ color: MUTED }}>{scanResult.diagnostics.length} diagnostic(s) found</p>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["Line", "Severity", "Message", "Quick Fix"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.diagnostics.map((d, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                        <td className="px-3 py-2 text-xs font-mono" style={{ color: MUTED }}>{d.line ?? "—"}</td>
                        <td className="px-3 py-2"><SevBadge sev={d.severity} /></td>
                        <td className="px-3 py-2 text-xs text-white max-w-xs">{d.message}</td>
                        <td className="px-3 py-2">
                          {d.quick_fix && (
                            <code className="text-[9px] font-mono px-1.5 py-0.5 rounded block max-w-[200px] truncate"
                              style={{ background: "rgba(0,0,0,0.4)", color: CYAN }}>{d.quick_fix}</code>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Check Package */}
      <Card className="p-5">
        <h3 className="font-bold text-white mb-4">Check Package for Vulnerabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: MUTED }}>Package Name</label>
            <input
              value={pkgForm.name}
              onChange={e => setPkgForm(p => ({ ...p, name: e.target.value }))}
              placeholder="lodash"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: MUTED }}>Version</label>
            <input
              value={pkgForm.version}
              onChange={e => setPkgForm(p => ({ ...p, version: e.target.value }))}
              placeholder="4.17.19"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: MUTED }}>Ecosystem</label>
            <select
              value={pkgForm.ecosystem}
              onChange={e => setPkgForm(p => ({ ...p, ecosystem: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}>
              {ECOSYSTEMS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
        <button onClick={checkPackage} disabled={checkingPkg || !pkgForm.name}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          {checkingPkg ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
          {checkingPkg ? "Checking…" : "Check Package"}
        </button>

        {pkgResult && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Vuln Count", pkgResult.vuln_count ?? 0, pkgResult.vuln_count > 0 ? DANGER : LOW],
                ["Latest Version", pkgResult.latest_version || "—", CYAN],
                ["Status", pkgResult.vuln_count > 0 ? "Vulnerable" : "Safe", pkgResult.vuln_count > 0 ? DANGER : LOW],
              ].map(([l, v, c]) => (
                <div key={l} className="p-3 rounded-xl text-center" style={{ background: `${c}08`, border: `1px solid ${c}20` }}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>{l}</p>
                  <p className="text-sm font-black font-mono mt-1" style={{ color: c }}>{v}</p>
                </div>
              ))}
            </div>
            {pkgResult.inline_message && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, color: TEXT }}>
                {pkgResult.inline_message}
              </p>
            )}
            {pkgResult.cves?.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>CVEs</p>
                {pkgResult.cves.map((cve, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg"
                    style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
                    <span className="text-[10px] font-mono font-bold" style={{ color: CYAN }}>{cve.id || cve}</span>
                    <SevBadge sev={cve.severity} />
                    <span className="text-[10px] flex-1" style={{ color: MUTED }}>{cve.description || cve.title || ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}