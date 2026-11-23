import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, RefreshCw, Clock, CheckCircle2, AlertTriangle, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

const GOLD = "#C9A84C";

function Section({ title, count, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
      <button className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{title}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: color + "20", color }}>
            {count}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="border-t px-4 pb-4 pt-3 space-y-2" style={{ borderColor: "#1F2937" }}>{children}</div>}
    </div>
  );
}

function DataRow({ cols }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b text-xs last:border-0" style={{ borderColor: "#1F2937" }}>
      {cols.map((col, i) => (
        <span key={i} className={i === 0 ? "flex-1 text-slate-200 truncate" : "text-slate-400 flex-shrink-0"}>{col}</span>
      ))}
    </div>
  );
}

function downloadReport(content, filename) {
  const blob = new Blob([content], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildHTMLReport({ findings, controls, auditLogs, period }) {
  const critCount = findings.filter(f => f.severity === "critical").length;
  const highCount = findings.filter(f => f.severity === "high").length;
  const passingControls = controls.filter(c => c.status === "passing").length;
  const totalControls = controls.length;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Weekly Security Evidence Report — ${period}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; color: #1a1a1a; }
    h1 { color: #111; border-bottom: 3px solid #C9A84C; padding-bottom: 12px; }
    h2 { color: #333; font-size: 1rem; margin-top: 28px; }
    .kpi { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin: 20px 0; }
    .kpi-card { padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center; }
    .kpi-val { font-size: 2rem; font-weight: 900; }
    .critical { color: #ef4444; } .high { color: #f97316; } .green { color: #22c55e; } .blue { color: #6366f1; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th { background: #f9fafb; text-align: left; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; font-size: 0.7rem; text-transform: uppercase; color: #6b7280; }
    td { padding: 7px 12px; border-bottom: 1px solid #f3f4f6; }
    .badge { padding: 2px 8px; border-radius: 999px; font-size: 0.65rem; font-weight: 700; }
    footer { margin-top: 40px; color: #9ca3af; font-size: 0.75rem; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>🛡️ Weekly Security Evidence Report</h1>
  <p style="color:#6b7280">Period: ${period} &nbsp;·&nbsp; Generated: ${new Date().toLocaleString()}</p>

  <div class="kpi">
    <div class="kpi-card"><div class="kpi-val critical">${critCount}</div><div>Critical Findings</div></div>
    <div class="kpi-card"><div class="kpi-val high">${highCount}</div><div>High Findings</div></div>
    <div class="kpi-card"><div class="kpi-val green">${passingControls}</div><div>Controls Passing</div></div>
    <div class="kpi-card"><div class="kpi-val blue">${totalControls}</div><div>Controls Reviewed</div></div>
  </div>

  <h2>Security Findings (${findings.length})</h2>
  <table>
    <thead><tr><th>Title</th><th>Severity</th><th>Asset</th><th>Status</th><th>Detected</th></tr></thead>
    <tbody>${findings.slice(0, 50).map(f => `
      <tr><td>${f.title || "—"}</td><td>${f.severity || "—"}</td><td>${f.asset_name || "—"}</td><td>${f.status || "—"}</td><td>${f.detected_at ? new Date(f.detected_at).toLocaleDateString() : "—"}</td></tr>`).join("")}
    </tbody>
  </table>

  <h2>Compliance Controls (${controls.length})</h2>
  <table>
    <thead><tr><th>Control ID</th><th>Title</th><th>Framework</th><th>Status</th></tr></thead>
    <tbody>${controls.slice(0, 50).map(c => `
      <tr><td>${c.control_id || "—"}</td><td>${c.title || "—"}</td><td>${c.framework || "—"}</td><td>${c.status || "—"}</td></tr>`).join("")}
    </tbody>
  </table>

  <h2>Audit Log (${auditLogs.length} entries)</h2>
  <table>
    <thead><tr><th>Action</th><th>User</th><th>Resource</th><th>Time</th></tr></thead>
    <tbody>${auditLogs.slice(0, 50).map(l => `
      <tr><td>${l.action || l.event_type || "—"}</td><td>${l.user_email || l.actor || "—"}</td><td>${l.resource || "—"}</td><td>${l.created_date ? new Date(l.created_date).toLocaleString() : "—"}</td></tr>`).join("")}
    </tbody>
  </table>

  <footer>ShieldAI Weekly Evidence Report · Confidential · Generated automatically by ShieldAI platform</footer>
</body>
</html>`;
}

export default function WeeklyEvidenceReportPage() {
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const period = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;

  const { data: findings = [] } = useQuery({
    queryKey: ["wer-findings"],
    queryFn: () => base44.entities.TriagedFinding.list("-detected_at", 200).catch(() => []),
    initialData: [],
  });
  const { data: controls = [] } = useQuery({
    queryKey: ["wer-controls"],
    queryFn: () => base44.entities.ComplianceControl.list("-last_tested", 200).catch(() => []),
    initialData: [],
  });
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["wer-audit"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 100).catch(() => []),
    initialData: [],
  });

  const critCount = findings.filter(f => f.severity === "critical").length;
  const highCount = findings.filter(f => f.severity === "high").length;
  const fixedThisWeek = findings.filter(f => f.status === "fixed" && f.fixed_at && new Date(f.fixed_at) >= weekStart).length;
  const passingControls = controls.filter(c => c.status === "passing").length;

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 800)); // simulate brief build
    const html = buildHTMLReport({ findings, controls, auditLogs, period });
    const filename = `ShieldAI-Weekly-Report-${format(weekStart, "yyyy-MM-dd")}.html`;
    downloadReport(html, filename);
    setLastGenerated(new Date());
    setGenerating(false);
  };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu 0.35s ease both}`}</style>

      <div className="fu flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <FileText className="w-3.5 h-3.5" /><span>Governance</span><span>/</span>
            <span style={{ color: GOLD }}>Weekly Evidence Report</span>
          </div>
          <h1 className="text-2xl font-black text-white">Weekly Evidence Report</h1>
          <p className="text-slate-400 text-sm mt-0.5">Compliance controls + security findings + audit logs · {period}</p>
        </div>
        <div className="flex items-center gap-3">
          {lastGenerated && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Last downloaded {format(lastGenerated, "HH:mm")}
            </div>
          )}
          <Button size="sm" className="font-bold text-xs" style={{ background: GOLD, color: "#000" }}
            onClick={handleGenerate} disabled={generating}>
            {generating
              ? <><RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Compiling…</>
              : <><Download className="w-3.5 h-3.5 mr-1" /> Download HTML Report</>}
          </Button>
        </div>
      </div>

      {/* Note about automation */}
      <div className="fu rounded-xl p-4 border flex items-start gap-3" style={{ background: "#111827", borderColor: "#374151", animationDelay: "40ms" }}>
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400">
          <span className="text-amber-400 font-semibold">Automated weekly scheduling is paused</span> — your workspace integration credits are exhausted (reset 20 Jun 2026). Reports can be generated manually below and downloaded instantly. Google Drive upload will be available once credits reset.
        </p>
      </div>

      {/* KPI summary */}
      <div className="fu grid grid-cols-2 md:grid-cols-4 gap-3" style={{ animationDelay: "60ms" }}>
        {[
          { label: "Critical Findings", value: critCount, color: "#ef4444" },
          { label: "High Findings", value: highCount, color: "#f97316" },
          { label: "Fixed This Week", value: fixedThisWeek, color: "#22c55e" },
          { label: "Controls Passing", value: passingControls, color: "#6366f1" },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: k.color + "33" }}>
            <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Evidence sections */}
      <div className="fu space-y-3" style={{ animationDelay: "80ms" }}>
        <Section title="Security Findings" count={findings.length} color="#ef4444" defaultOpen>
          {findings.length === 0
            ? <p className="text-xs text-slate-500">No findings in this period.</p>
            : findings.slice(0, 20).map(f => (
                <DataRow key={f.id} cols={[
                  f.title,
                  <span key="sev" className={`font-bold ${f.severity === "critical" ? "text-red-400" : f.severity === "high" ? "text-orange-400" : "text-yellow-400"}`}>{f.severity}</span>,
                  f.asset_name || "—",
                  f.status,
                ]} />
              ))}
        </Section>

        <Section title="Compliance Controls" count={controls.length} color="#8b5cf6">
          {controls.length === 0
            ? <p className="text-xs text-slate-500">No compliance controls recorded yet.</p>
            : controls.slice(0, 20).map(c => (
                <DataRow key={c.id} cols={[
                  c.title,
                  <span key="fw" className="text-indigo-400 font-mono text-[10px]">{c.framework}</span>,
                  c.control_id,
                  <span key="st" className={c.status === "passing" ? "text-emerald-400" : c.status === "failing" ? "text-red-400" : "text-yellow-400"}>{c.status}</span>,
                ]} />
              ))}
        </Section>

        <Section title="Audit Log" count={auditLogs.length} color="#06b6d4">
          {auditLogs.length === 0
            ? <p className="text-xs text-slate-500">No audit log entries this week.</p>
            : auditLogs.slice(0, 20).map(l => (
                <DataRow key={l.id} cols={[
                  l.action || l.event_type || "event",
                  l.user_email || l.actor || "—",
                  l.resource || "—",
                  l.created_date ? format(new Date(l.created_date), "MMM d HH:mm") : "—",
                ]} />
              ))}
        </Section>
      </div>
    </div>
  );
}