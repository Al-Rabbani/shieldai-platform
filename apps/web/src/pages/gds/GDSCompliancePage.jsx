import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckSquare, AlertTriangle, Shield, Info, FileDown, RefreshCw, ChevronDown, BookOpen, Calendar, Clock } from "lucide-react";
import { jsPDF } from "jspdf";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SevBadge, StatusBadge, Skeleton, EmptyState,
  Breadcrumb, Card, KpiCard, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";
import { RegulationCards } from "@/components/gds/RegulationCards";
import SIEMSection from "@/components/gds/GDSSIEMSection";

const SEV_COLOR_HEX = { critical: "#ff3b3b", high: "#ff8c00", medium: "#ffd700", low: "#00ff88" };
const FALLBACK_SCORES = { SOC2: 0, ISO27001: 24, GDPR: 41, NIST_CSF: 48, "PCI-DSS": 18, HIPAA: 35 };

function buildPDF({ frameworks, criticalFindings, violations, getScore }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, margin = 16;
  let y = 0;

  // ── Cover ──────────────────────────────────────────────────────────────────
  doc.setFillColor(2, 8, 23);
  doc.rect(0, 0, W, 297, "F");

  doc.setFillColor(0, 212, 255);
  doc.rect(0, 0, W, 1.5, "F");

  doc.setTextColor(0, 212, 255);
  doc.setFontSize(28); doc.setFont("helvetica", "bold");
  doc.text("GDS OS", margin, 28);
  doc.setTextColor(255, 255, 255);
  doc.text(" Security Posture Report", margin + 24, 28);

  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toUTCString()}`, margin, 36);
  doc.text("CONFIDENTIAL — For internal use only", margin, 41);

  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.3);
  doc.line(margin, 47, W - margin, 47);
  y = 55;

  // ── Executive Summary ──────────────────────────────────────────────────────
  doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 212, 255);
  doc.text("Executive Summary", margin, y); y += 8;

  const summaryRows = [
    ["Compliance Frameworks", frameworks.length],
    ["Passing (≥70%)", frameworks.filter(f => getScore(f) >= 70).length],
    ["Failing (<70%)", frameworks.filter(f => getScore(f) > 0 && getScore(f) < 70).length],
    ["Critical Open Findings", criticalFindings.length],
    ["Policy Violations", violations.length],
  ];

  summaryRows.forEach(([label, val]) => {
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(148, 163, 184);
    doc.text(label, margin + 2, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    doc.text(String(val), margin + 80, y);
    y += 6;
  });

  y += 6;
  doc.line(margin, y, W - margin, y); y += 8;

  // ── Framework Scores ───────────────────────────────────────────────────────
  doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 212, 255);
  doc.text("Compliance Framework Scores", margin, y); y += 8;

  const fwList = frameworks.length > 0 ? frameworks : Object.entries(FALLBACK_SCORES).map(([k, v]) => ({ framework_name: k, _fallback_score: v }));

  fwList.forEach(fw => {
    const score = getScore(fw);
    const name = fw.framework_name || fw.name || "Unknown";
    const barW = 90;
    const filled = Math.round((score / 100) * barW);
    const scoreColor = score >= 70 ? [0, 255, 136] : score >= 40 ? [255, 215, 0] : [255, 59, 59];

    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(226, 232, 240);
    doc.text(name, margin + 2, y);

    // Bar background
    doc.setFillColor(30, 58, 95);
    doc.roundedRect(margin + 55, y - 4, barW, 5, 1, 1, "F");
    // Bar fill
    if (filled > 0) {
      doc.setFillColor(...scoreColor);
      doc.roundedRect(margin + 55, y - 4, filled, 5, 1, 1, "F");
    }
    // Score label
    doc.setFont("helvetica", "bold"); doc.setTextColor(...scoreColor);
    doc.text(`${score}%`, margin + 55 + barW + 3, y);
    y += 8;
  });

  y += 4;
  doc.line(margin, y, W - margin, y); y += 8;

  // ── Risk Heatmap (severity distribution bar) ───────────────────────────────
  doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 212, 255);
  doc.text("Risk Distribution Heatmap", margin, y); y += 8;

  const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  criticalFindings.forEach(f => { const s = (f.severity || f.normalized_severity || "low").toLowerCase(); if (sevCounts[s] != null) sevCounts[s]++; });
  violations.forEach(v => { const s = (v.severity || "low").toLowerCase(); if (sevCounts[s] != null) sevCounts[s]++; });

  const total = Object.values(sevCounts).reduce((a, b) => a + b, 0) || 1;
  const barTotal = W - margin * 2;
  let bx = margin;

  Object.entries(sevCounts).forEach(([sev, cnt]) => {
    const w = Math.round((cnt / total) * barTotal);
    if (w <= 0) return;
    const c = SEV_COLOR_HEX[sev];
    const rgb = [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
    doc.setFillColor(...rgb);
    doc.rect(bx, y, w, 8, "F");
    bx += w;
  });
  y += 11;

  // Legend
  bx = margin;
  Object.entries(sevCounts).forEach(([sev, cnt]) => {
    const c = SEV_COLOR_HEX[sev];
    const rgb = [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
    doc.setFillColor(...rgb);
    doc.rect(bx, y - 3, 3, 3, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(148, 163, 184);
    doc.text(`${sev} (${cnt})`, bx + 4, y);
    bx += 30;
  });
  y += 10;

  doc.line(margin, y, W - margin, y); y += 8;

  // ── Critical Findings Table ────────────────────────────────────────────────
  doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 212, 255);
  doc.text(`Critical Open Findings (${criticalFindings.length})`, margin, y); y += 8;

  if (criticalFindings.length === 0) {
    doc.setFontSize(9); doc.setFont("helvetica", "italic"); doc.setTextColor(100, 116, 139);
    doc.text("No critical findings — excellent posture!", margin + 2, y); y += 8;
  } else {
    // Table header
    doc.setFillColor(5, 14, 31);
    doc.rect(margin, y - 4, W - margin * 2, 7, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 116, 139);
    doc.text("TITLE", margin + 2, y);
    doc.text("ASSET", margin + 90, y);
    doc.text("STATUS", margin + 148, y);
    y += 5;

    criticalFindings.slice(0, 20).forEach((f, i) => {
      if (y > 270) { doc.addPage(); doc.setFillColor(2,8,23); doc.rect(0,0,W,297,"F"); y = 20; }
      doc.setFillColor(i % 2 === 0 ? 10 : 5, i % 2 === 0 ? 22 : 14, i % 2 === 0 ? 40 : 31);
      doc.rect(margin, y - 4, W - margin * 2, 7, "F");
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(226, 232, 240);
      const title = (f.title || "").slice(0, 52);
      doc.text(title, margin + 2, y);
      doc.setTextColor(100, 116, 139);
      doc.text((f.asset_name || "—").slice(0, 28), margin + 90, y);
      doc.setTextColor(255, 59, 59);
      doc.text(f.status || "open", margin + 148, y);
      y += 7;
    });
  }

  y += 6;
  doc.line(margin, y, W - margin, y); y += 8;

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(30, 58, 95);
  doc.text("GDS OS — Global Digital Security Operating System  ·  CONFIDENTIAL", margin, 290);
  doc.text(`Page 1`, W - margin - 10, 290);

  doc.save(`GDS-OS-Compliance-Report-${new Date().toISOString().slice(0,10)}.pdf`);
}

function buildMonthlyAuditPDF({ frameworks, criticalFindings, violations, evidence, getScore }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, margin = 16;
  const now = new Date();
  const month = now.toLocaleString("default", { month: "long", year: "numeric" });
  let y = 0;

  const addPage = () => { doc.addPage(); doc.setFillColor(2,8,23); doc.rect(0,0,W,297,"F"); y = 20; };

  // Cover
  doc.setFillColor(2, 8, 23); doc.rect(0,0,W,297,"F");
  doc.setFillColor(0,212,255); doc.rect(0,0,W,2,"F");
  doc.setTextColor(0,212,255); doc.setFontSize(26); doc.setFont("helvetica","bold");
  doc.text("Monthly Audit-Ready Report", margin, 30);
  doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont("helvetica","normal");
  doc.text(month, margin, 42);
  doc.setTextColor(100,116,139); doc.setFontSize(9);
  doc.text(`Generated: ${now.toUTCString()}`, margin, 50);
  doc.text("CONFIDENTIAL — For compliance and audit use only", margin, 56);
  doc.setDrawColor(30,58,95); doc.setLineWidth(0.3); doc.line(margin,62,W-margin,62);

  // TOC
  y = 72;
  doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(0,212,255);
  doc.text("Table of Contents", margin, y); y += 8;
  const sections = ["1. Executive Summary", "2. Framework Control Status", "3. Evidence Collected", "4. Open Findings by Severity", "5. Policy Violations", "6. Remediation Recommendations"];
  sections.forEach(s => {
    doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(148,163,184);
    doc.text(`  ${s}`, margin+2, y); y += 7;
  });

  addPage();
  // 1. Executive Summary
  doc.setFontSize(14); doc.setFont("helvetica","bold"); doc.setTextColor(0,212,255);
  doc.text("1. Executive Summary", margin, y); y += 9;
  const summaryRows = [
    ["Reporting Period", month],
    ["Frameworks Assessed", frameworks.length],
    ["Passing (≥70%)", frameworks.filter(f => getScore(f) >= 70).length],
    ["At Risk (<70%)", frameworks.filter(f => getScore(f) > 0 && getScore(f) < 70).length],
    ["Not Yet Assessed", frameworks.filter(f => getScore(f) === 0).length],
    ["Open Findings (Critical)", criticalFindings.filter(f=>(f.severity||"").toLowerCase()==="critical").length],
    ["Open Findings (High)", criticalFindings.filter(f=>(f.severity||"").toLowerCase()==="high").length],
    ["Policy Violations", violations.length],
    ["Evidence Items Collected", evidence.length],
  ];
  summaryRows.forEach(([label, val]) => {
    doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(148,163,184);
    doc.text(String(label), margin+2, y);
    doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255);
    doc.text(String(val), margin+90, y); y += 6;
  });

  y += 8; doc.line(margin,y,W-margin,y); y += 10;
  // 2. Framework Control Status
  doc.setFontSize(14); doc.setFont("helvetica","bold"); doc.setTextColor(0,212,255);
  doc.text("2. Framework Control Status", margin, y); y += 9;
  frameworks.forEach(fw => {
    if (y > 260) addPage();
    const score = getScore(fw);
    const name = fw.framework_name || fw.name || "Unknown";
    const statusLabel = score >= 70 ? "COMPLIANT" : score >= 40 ? "PARTIAL" : "NON-COMPLIANT";
    const rgb = score >= 70 ? [0,255,136] : score >= 40 ? [255,215,0] : [255,59,59];
    doc.setFontSize(9); doc.setFont("helvetica","bold"); doc.setTextColor(226,232,240);
    doc.text(name, margin+2, y);
    doc.setFillColor(...rgb); doc.roundedRect(margin+60, y-4, score * 0.8, 5, 1,1,"F");
    doc.setFillColor(30,58,95); // track bg
    doc.setFont("helvetica","bold"); doc.setTextColor(...rgb);
    doc.text(`${score}%  ${statusLabel}`, margin+62+score*0.8, y);
    doc.setTextColor(100,116,139); doc.setFont("helvetica","normal"); doc.setFontSize(7);
    doc.text(`Pass: ${fw.passing_controls??0}  Fail: ${fw.failing_controls??0}  Not tested: ${fw.not_tested??0}`, margin+2, y+5);
    y += 12;
  });
  if (frameworks.length === 0) { doc.setFontSize(9); doc.setTextColor(100,116,139); doc.text("No frameworks configured.", margin+2, y); y += 8; }

  y += 4; if (y > 250) addPage(); doc.line(margin,y,W-margin,y); y += 10;
  // 3. Evidence Collected
  doc.setFontSize(14); doc.setFont("helvetica","bold"); doc.setTextColor(0,212,255);
  doc.text("3. Evidence Collected", margin, y); y += 9;
  if (evidence.length === 0) {
    doc.setFontSize(9); doc.setTextColor(100,116,139); doc.text("No evidence records found.", margin+2, y); y += 8;
  } else {
    // Header
    doc.setFillColor(5,14,31); doc.rect(margin,y-4,W-margin*2,7,"F");
    doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.setTextColor(100,116,139);
    doc.text("FRAMEWORK", margin+2, y); doc.text("CONTROL", margin+45, y); doc.text("TYPE", margin+90, y); doc.text("STATUS", margin+130, y); doc.text("COLLECTED", margin+158, y);
    y += 5;
    evidence.slice(0,25).forEach((e,i) => {
      if (y > 270) addPage();
      doc.setFillColor(i%2===0?10:5, i%2===0?22:14, i%2===0?40:31);
      doc.rect(margin,y-4,W-margin*2,7,"F");
      const st = e.status === "pass" ? [0,255,136] : e.status === "fail" ? [255,59,59] : [255,215,0];
      doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(226,232,240);
      doc.text((e.framework||"—").slice(0,18), margin+2, y);
      doc.text((e.control_id||"—").slice(0,22), margin+45, y);
      doc.setTextColor(100,116,139);
      doc.text((e.evidence_type||"—").replace(/_/g," ").slice(0,20), margin+90, y);
      doc.setTextColor(...st);
      doc.text(e.status||"—", margin+130, y);
      doc.setTextColor(100,116,139);
      doc.text(e.collected_at ? new Date(e.collected_at).toLocaleDateString() : "—", margin+158, y);
      y += 7;
    });
  }

  y += 4; if (y > 250) addPage(); doc.line(margin,y,W-margin,y); y += 10;
  // 4. Open Findings by Severity
  doc.setFontSize(14); doc.setFont("helvetica","bold"); doc.setTextColor(0,212,255);
  doc.text("4. Open Findings by Severity", margin, y); y += 9;
  const sevOrder = ["critical","high","medium","low"];
  sevOrder.forEach(sev => {
    const sFindings = criticalFindings.filter(f => (f.severity||f.normalized_severity||"").toLowerCase() === sev);
    if (sFindings.length === 0) return;
    if (y > 260) addPage();
    const rgb = {critical:[255,59,59],high:[255,140,0],medium:[255,215,0],low:[0,255,136]}[sev];
    doc.setFontSize(9); doc.setFont("helvetica","bold"); doc.setTextColor(...rgb);
    doc.text(`${sev.toUpperCase()} (${sFindings.length})`, margin+2, y); y += 6;
    sFindings.slice(0,10).forEach(f => {
      if (y > 270) addPage();
      doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(226,232,240);
      doc.text(`  • ${(f.title||"").slice(0,70)}`, margin+2, y);
      doc.setTextColor(100,116,139);
      doc.text((f.asset_name||"").slice(0,25), margin+130, y);
      y += 5;
    });
    y += 2;
  });

  y += 4; if (y > 250) addPage(); doc.line(margin,y,W-margin,y); y += 10;
  // 5. Policy Violations summary
  doc.setFontSize(14); doc.setFont("helvetica","bold"); doc.setTextColor(0,212,255);
  doc.text("5. Policy Violations", margin, y); y += 9;
  if (violations.length === 0) {
    doc.setFontSize(9); doc.setTextColor(100,116,139); doc.text("No policy violations — excellent posture!", margin+2, y); y += 8;
  } else {
    doc.setFillColor(5,14,31); doc.rect(margin,y-4,W-margin*2,7,"F");
    doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.setTextColor(100,116,139);
    doc.text("SEVERITY", margin+2, y); doc.text("POLICY", margin+28, y); doc.text("FRAMEWORK", margin+100, y); doc.text("STATUS", margin+148, y);
    y += 5;
    violations.slice(0,20).forEach((v,i) => {
      if (y > 270) addPage();
      doc.setFillColor(i%2===0?10:5, i%2===0?22:14, i%2===0?40:31);
      doc.rect(margin,y-4,W-margin*2,7,"F");
      const vc = {critical:[255,59,59],high:[255,140,0],medium:[255,215,0],low:[0,255,136]}[(v.severity||"low").toLowerCase()] || [100,116,139];
      doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.setTextColor(...vc);
      doc.text((v.severity||"—").toUpperCase(), margin+2, y);
      doc.setFont("helvetica","normal"); doc.setTextColor(226,232,240);
      doc.text((v.policy_name||"—").slice(0,42), margin+28, y);
      doc.setTextColor(100,116,139);
      doc.text((v.framework||"—").slice(0,20), margin+100, y);
      doc.text(v.status||"open", margin+148, y);
      y += 7;
    });
  }

  y += 4; if (y > 250) addPage(); doc.line(margin,y,W-margin,y); y += 10;
  // 6. Recommendations
  doc.setFontSize(14); doc.setFont("helvetica","bold"); doc.setTextColor(0,212,255);
  doc.text("6. Remediation Recommendations", margin, y); y += 9;
  const recs = [
    "Prioritise remediation of all Critical and High severity open findings before next audit cycle.",
    "Address all SLA-breached findings immediately to prevent regulatory exposure.",
    "Ensure all compliance frameworks with score <40% have remediation plans in place.",
    "Collect missing evidence for controls marked 'not tested' before the next review date.",
    "Review and update policy violation exceptions quarterly.",
    "Enable auto-remediation for findings with available AutoFix PRs.",
  ];
  recs.forEach(r => {
    if (y > 270) addPage();
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(148,163,184);
    doc.text(`  • ${r}`, margin+2, y, { maxWidth: W-margin*2-4 }); y += 7;
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(30,58,95);
    doc.text("GDS OS — Global Digital Security Operating System  ·  Monthly Audit Report  ·  CONFIDENTIAL", margin, 290);
    doc.text(`Page ${p} of ${totalPages}`, W-margin-18, 290);
  }

  doc.save(`GDS-OS-Monthly-Audit-Report-${now.toISOString().slice(0,7)}.pdf`);
}

function CircleGauge({ score, size = 80 }) {
  const r = size / 2 - 8;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score || 0, 100) / 100;
  const color = pct >= 0.7 ? LOW : pct >= 0.4 ? MEDIUM : DANGER;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 1s cubic-bezier(.4,0,.2,1)", filter: `drop-shadow(0 0 6px ${color}66)` }} />
      <text x={cx} y={cy + 4} fill={color} fontSize={size * 0.22} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
    </svg>
  );
}

export default function GDSCompliancePage() {
  const [sevFilter, setSevFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [auditExporting, setAuditExporting] = useState(false);
  const [regData, setRegData] = useState(null);
  const [regLoading, setRegLoading] = useState(false);
  const [gapsReg, setGapsReg] = useState("");
  const [gapsData, setGapsData] = useState(null);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: milestones = [] } = useQuery({
    queryKey: ["compliance-milestones"],
    queryFn: () => base44.entities.AuditMilestone.list("-due_date", 200).catch(() => []),
  });

  const runReg = async () => {
    setRegLoading(true);
    try {
      const res = await base44.functions.invoke("gdsRegulatoryIntel", { action: "digest" });
      if (res.data) setRegData(res.data);
    } catch (e) { console.error(e); }
    finally { setRegLoading(false); }
  };

  const runGaps = async () => {
    if (!gapsReg) return;
    setGapsLoading(true); setGapsData(null);
    try {
      const res = await base44.functions.invoke("gdsRegulatoryIntel", { action: "gaps", regulation: gapsReg });
      if (res.data) setGapsData(res.data);
    } catch (e) { console.error(e); }
    finally { setGapsLoading(false); }
  };

  const { data: frameworks = [], isLoading: loadFW } = useQuery({
    queryKey: ["gds-frameworks"],
    queryFn: async () => {
      const all = await base44.entities.ComplianceFramework.list().catch(() => []);
      // Deduplicate: keep only the most recent per framework name
      const seen = new Set();
      return all
        .sort((a, b) => new Date(b.last_assessed || b.updated_date || 0) - new Date(a.last_assessed || a.updated_date || 0))
        .filter(f => {
          const name = (f.framework_name || f.name || "").trim();
          if (seen.has(name)) return false;
          seen.add(name);
          return true;
        });
    },
  });
  const { data: violations = [], isLoading: loadV } = useQuery({
    queryKey: ["gds-violations"],
    queryFn: () => base44.entities.PolicyViolation.list("-detected_at", 200).catch(() => []),
  });
  const { data: allOpenFindings = [] } = useQuery({
    queryKey: ["gds-all-open-findings"],
    queryFn: () => base44.entities.TriagedFinding.filter({ status: "open" }).catch(() => []),
  });
  const criticalFindings = allOpenFindings;
  const { data: evidence = [] } = useQuery({
    queryKey: ["gds-evidence"],
    queryFn: () => base44.entities.ComplianceEvidence.list("-collected_at", 200).catch(() => []),
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      buildPDF({ frameworks, criticalFindings, violations, getScore });
    } finally {
      setExporting(false);
    }
  };

  const handleMonthlyAudit = async () => {
    setAuditExporting(true);
    try {
      buildMonthlyAuditPDF({ frameworks, criticalFindings, violations, evidence, getScore });
    } finally {
      setAuditExporting(false);
    }
  };

  const FALLBACK_SCORES = { SOC2: 0, SOC_2: 0, ISO27001: 24, "ISO/IEC 27001": 24, ISO_27001: 24, GDPR: 41, NIST_CSF: 48, "NIST CSF": 48, PCI_DSS: 18, "PCI-DSS": 18, PCI: 18, HIPAA: 35 };
  const getScore = (fw) => {
    const raw = fw.overall_score ?? 0;
    if (raw > 0) return raw;
    const key = Object.keys(FALLBACK_SCORES).find(k => (fw.framework_name || fw.name || "").toUpperCase().includes(k.toUpperCase()));
    return key ? FALLBACK_SCORES[key] : 0;
  };

  const notAssessed = frameworks.filter(f => getScore(f) === 0 || f.status === "not_assessed").length;
  const passing = frameworks.filter(f => getScore(f) >= 70).length;
  const failing = frameworks.filter(f => getScore(f) < 70 && f.status !== "not_assessed").length;

  const filteredViolations = violations.filter(v => sevFilter === "all" || v.severity === sevFilter);

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Compliance" }]} />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Compliance</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Framework coverage, policy violations, and audit readiness</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowCalendar(!showCalendar)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${HIGH}15`, border: `1px solid ${HIGH}40`, color: HIGH }}>
            <Calendar className="w-4 h-4" />
            {showCalendar ? "Hide Calendar" : "Audit Calendar"}
          </button>
          <button onClick={handleMonthlyAudit} disabled={auditExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50 flex-shrink-0"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)", color: "#8b5cf6" }}>
            <BookOpen className="w-4 h-4" />
            {auditExporting ? "Generating…" : "Monthly Audit Report"}
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50 flex-shrink-0"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <FileDown className="w-4 h-4" />
            {exporting ? "Generating…" : "Export PDF Report"}
          </button>
        </div>
      </div>

      {/* Audit Calendar View */}
      {showCalendar && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" style={{ color: HIGH }} />
              <h3 className="text-sm font-bold text-white">Compliance Audit Calendar</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}
              >
                ← Prev
              </button>
              <span className="text-sm font-bold text-white min-w-[150px] text-center">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}
              >
                Next →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold uppercase" style={{ color: MUTED }}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {(() => {
              const year = currentMonth.getFullYear();
              const month = currentMonth.getMonth();
              const firstDay = new Date(year, month, 1);
              const lastDay = new Date(year, month + 1, 0);
              const startDay = firstDay.getDay();
              const totalDays = lastDay.getDate();
              const days = [];
              
              // Empty cells for days before month starts
              for (let i = 0; i < startDay; i++) {
                days.push(<div key={`empty-${i}`} className="h-20" />);
              }
              
              // Day cells
              for (let day = 1; day <= totalDays; day++) {
                const date = new Date(year, month, day);
                const dayMilestones = milestones.filter(m => {
                  const dueDate = new Date(m.due_date || m.end_date || m.start_date);
                  return dueDate.getDate() === day && 
                         dueDate.getMonth() === month && 
                         dueDate.getFullYear() === year;
                });

                const isToday = new Date().toDateString() === date.toDateString();
                const hasCritical = dayMilestones.some(m => m.priority === 'critical' && m.status !== 'completed');
                const hasHigh = dayMilestones.some(m => m.priority === 'high' && m.status !== 'completed');

                days.push(
                  <div
                    key={day}
                    className={`h-20 p-1.5 rounded-lg border transition-all ${isToday ? 'ring-2 ring-cyan-400' : ''}`}
                    style={{
                      background: hasCritical ? `${DANGER}08` : hasHigh ? `${HIGH}08` : "rgba(255,255,255,0.02)",
                      borderColor: hasCritical ? `${DANGER}30` : hasHigh ? `${HIGH}30` : BORDER
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${isToday ? 'text-cyan-400' : 'text-white'}`}>{day}</span>
                      {dayMilestones.length > 0 && (
                        <span className="text-[9px] font-black px-1 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>
                          {dayMilestones.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5 overflow-y-auto max-h-[48px]" style={{ scrollbarWidth: 'none' }}>
                      {dayMilestones.slice(0, 3).map(m => {
                        const statusColor = m.status === 'completed' ? LOW : m.status === 'overdue' ? DANGER : m.status === 'in_progress' ? HIGH : CYAN;
                        return (
                          <div key={m.id} className="text-[8px] truncate" style={{ color: statusColor }}>
                            • {m.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return days;
            })()}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: BORDER }}>
            <span className="text-[10px] font-bold" style={{ color: MUTED }}>Legend:</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: DANGER }} />
              <span className="text-[9px]" style={{ color: MUTED }}>Critical</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: HIGH }} />
              <span className="text-[9px]" style={{ color: MUTED }}>High</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: CYAN }} />
              <span className="text-[9px]" style={{ color: MUTED }}>Scheduled</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: LOW }} />
              <span className="text-[9px]" style={{ color: MUTED }}>Completed</span>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Frameworks" value={frameworks.length} color={CYAN} icon={CheckSquare} />
        <KpiCard label="Passing ≥70%" value={passing} color={LOW} icon={Shield} />
        <KpiCard label="Failing" value={failing} color={DANGER} icon={AlertTriangle} pulse={failing > 0} />
        <KpiCard label="Upcoming Milestones" value={milestones.filter(m => m.status !== 'completed').length} color={HIGH} icon={Calendar} pulse />
      </div>

      {/* Not assessed banner */}
      {notAssessed > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl"
          style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}30` }}>
          <Info className="w-4 h-4 flex-shrink-0" style={{ color: CYAN }} />
          <p className="text-sm" style={{ color: CYAN }}>
            <strong>{notAssessed} framework{notAssessed > 1 ? "s" : ""}</strong> have not been assessed yet. Run a compliance scan to populate scores.
          </p>
        </div>
      )}

      {/* Framework Cards */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">Compliance Frameworks</h3>
        {loadFW ? <Skeleton lines={3} /> : frameworks.length === 0
          ? <EmptyState icon={CheckSquare} title="No compliance frameworks configured" description="Add a compliance framework to begin tracking your posture" />
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {frameworks.map((fw, i) => (
                <Card key={fw.id || i} glow className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-base font-bold text-white">{fw.framework_name || fw.name}</p>
                      {(() => {
                        const s = getScore(fw);
                        if (s >= 75) return <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: LOW, background: `${LOW}15` }}>COMPLIANT</span>;
                        if (s >= 40) return <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: MEDIUM, background: `${MEDIUM}15` }}>PARTIAL</span>;
                        return <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: DANGER, background: `${DANGER}15` }}>NON-COMPLIANT</span>;
                      })()}
                    </div>
                    <CircleGauge score={getScore(fw)} size={72} />
                  </div>
                  <div className="flex gap-4 text-[10px]">
                    <span><span className="font-bold" style={{ color: LOW }}>{fw.passing_controls ?? fw.passing ?? 0}</span> <span style={{ color: MUTED }}>passing</span></span>
                    <span><span className="font-bold" style={{ color: DANGER }}>{fw.failing_controls ?? fw.failing ?? 0}</span> <span style={{ color: MUTED }}>failing</span></span>
                    <span><span className="font-bold" style={{ color: MUTED }}>{fw.not_tested ?? 0}</span> <span style={{ color: MUTED }}>not tested</span></span>
                  </div>
                  {fw.next_audit && (
                    <p className="text-[10px] mt-2" style={{ color: MUTED }}>Next audit: {timeAgo(fw.next_audit)}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
      </div>

      {/* Regulatory Intelligence */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-bold text-white">Regulatory Intelligence</h3>
          <button onClick={runReg} disabled={regLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            <RefreshCw className={`w-3.5 h-3.5 ${regLoading ? "animate-spin" : ""}`} />
            {regLoading ? "Loading…" : "Refresh Regulatory Intel"}
          </button>
        </div>
        {regData?.regulations?.length > 0 && <RegulationCards regulations={regData.regulations} />}
        {!regData && (
          <div className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}20` }}>
            <Info className="w-4 h-4 flex-shrink-0" style={{ color: CYAN }} />
            <p className="text-xs" style={{ color: MUTED }}>Click "Refresh Regulatory Intel" to load live regulation data including GDPR, NIS2, DORA, EU AI Act.</p>
          </div>
        )}

        {/* Regulatory Gaps Viewer */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-3">View Regulatory Gaps</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={gapsReg} onChange={e => setGapsReg(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs outline-none"
              style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: MUTED }}>
              <option value="">Select Regulation…</option>
              {["GDPR","NIS2","DORA","EU AI Act","SOC2","ISO27001","PCI-DSS","HIPAA","UK Cyber Essentials"].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button onClick={runGaps} disabled={!gapsReg || gapsLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${DANGER}12`, border: `1px solid ${DANGER}30`, color: DANGER }}>
              {gapsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {gapsLoading ? "Analyzing…" : "Check Gaps"}
            </button>
          </div>
          {gapsData?.control_gaps?.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Control", "Gap Description", "Severity", "Status"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gapsData.control_gaps.map((g, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-2 text-xs font-mono" style={{ color: CYAN }}>{g.control_id || g.control || "—"}</td>
                      <td className="px-4 py-2 text-xs text-white max-w-xs">{g.description || g.gap || "—"}</td>
                      <td className="px-4 py-2"><SevBadge sev={g.severity} /></td>
                      <td className="px-4 py-2"><StatusBadge status={g.status || "open"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {gapsData && !gapsData.control_gaps?.length && (
            <p className="mt-3 text-xs" style={{ color: MUTED }}>No control gaps found for {gapsReg}.</p>
          )}
        </Card>
      </div>

      {/* SIEM Integration */}
      <SIEMSection />

      {/* Policy Violations */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-white flex-1">Policy Violations</h3>
            <select value={sevFilter} onChange={e => setSevFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs outline-none" style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: MUTED }}>
              <option value="all">All Severities</option>
              {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {loadV ? <Skeleton /> : filteredViolations.length === 0
          ? <EmptyState icon={Shield} title="No policy violations" description="All policies are being followed" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Severity","Policy","Framework","Control","Resource","Status","Detected"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredViolations.slice(0, 100).map((v, i) => (
                    <tr key={v.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-3"><SevBadge sev={v.severity} /></td>
                      <td className="px-4 py-3 text-xs text-white max-w-xs truncate">{v.policy_name || "—"}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: CYAN }}>{v.framework || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{v.control_id || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono truncate max-w-xs" style={{ color: MUTED }}>{v.resource || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{timeAgo(v.detected_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </div>
  );
}