import React, { useState } from "react";
import { X, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Link, Copy, BookOpen } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, CARD, SevBadge, StatusBadge, timeAgo } from "@/components/gds/GDSOSShared";

const BG = "#020817";

// Generate actionable remediation steps from finding data
function buildRemediationSteps(finding) {
  const steps = [];
  const sev = (finding.normalized_severity || finding.severity || "").toLowerCase();
  const scanner = (finding.source_scanners || finding.scanner || "").toLowerCase();

  if (finding.remediation) {
    // Split existing remediation text into steps if it contains numbered items or sentences
    const raw = finding.remediation;
    const numbered = raw.match(/\d+\.\s+[^\d]+/g);
    if (numbered && numbered.length > 1) {
      numbered.forEach(s => steps.push(s.replace(/^\d+\.\s+/, "").trim()));
    } else {
      // Split by '. ' or newline
      raw.split(/\.\s+|\n/).filter(s => s.trim().length > 10).forEach(s => steps.push(s.trim()));
    }
  }

  // If no steps yet, generate from metadata
  if (steps.length === 0) {
    if (finding.fixed_version && finding.package_name) {
      steps.push(`Upgrade \`${finding.package_name}\` to version \`${finding.fixed_version}\` or later.`);
      steps.push(`Run your package manager update command (e.g. \`npm update ${finding.package_name}\` or \`pip install --upgrade ${finding.package_name}\`).`);
      steps.push("Re-run the security scan to verify the vulnerability is resolved.");
    } else if (scanner.includes("secret")) {
      steps.push("Immediately rotate or revoke the exposed credential in your provider's dashboard.");
      steps.push(`Remove the secret from the file \`${finding.file_path || "the affected file"}\` and replace with an environment variable or secrets manager reference.`);
      steps.push("Audit your git history — use \`git filter-repo\` or BFG Repo Cleaner to purge the secret from all commits.");
      steps.push("Check provider logs for any unauthorized access using the compromised credential.");
    } else if (scanner.includes("sast") || scanner.includes("semgrep")) {
      steps.push(`Review the code at \`${finding.file_path || "the flagged file"}\`${finding.line_number ? ` line ${finding.line_number}` : ""}.`);
      steps.push(`Apply the fix pattern: ${finding.cwe_id ? `resolve CWE-${finding.cwe_id.replace(/\D/g, "")}` : "follow secure coding guidelines for this issue type"}.`);
      steps.push("Add a unit test that verifies the vulnerability is not exploitable.");
      steps.push("Submit the fix for code review before merging.");
    } else if (scanner.includes("iac")) {
      steps.push(`Update the IaC template at \`${finding.file_path || "the affected template"}\` to apply the recommended configuration.`);
      steps.push("Run \`terraform plan\` (or equivalent) to preview changes.");
      steps.push("Apply changes to staging before promoting to production.");
    } else {
      steps.push("Review the affected asset and understand the root cause of this finding.");
      if (sev === "critical" || sev === "high") {
        steps.push("Escalate to the responsible team and set a remediation deadline per your SLA.");
      }
      steps.push("Apply the vendor-recommended fix or workaround.");
      steps.push("Re-scan to confirm the finding is resolved.");
      steps.push("Document the fix in your change management system.");
    }
  }

  if (finding.cve_id) {
    steps.push(`Reference the NVD advisory for ${finding.cve_id}: https://nvd.nist.gov/vuln/detail/${finding.cve_id}`);
  }

  return steps.filter(Boolean);
}

function RemediationGuide({ finding }) {
  const [open, setOpen] = useState(false);
  const steps = buildRemediationSteps(finding);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${CYAN}30`, background: `${CYAN}05` }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" style={{ color: CYAN }} />
          <span className="text-sm font-bold" style={{ color: CYAN }}>Remediation Guide</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${CYAN}20`, color: CYAN }}>
            {steps.length} steps
          </span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4" style={{ color: MUTED }} />
          : <ChevronDown className="w-4 h-4" style={{ color: MUTED }} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5"
                style={{ background: `${CYAN}20`, color: CYAN, border: `1px solid ${CYAN}40` }}>
                {i + 1}
              </div>
              <p className="text-xs leading-relaxed flex-1" style={{ color: TEXT }}>
                {step.split(/(`[^`]+`)/g).map((part, j) =>
                  part.startsWith("`") && part.endsWith("`")
                    ? <code key={j} className="px-1.5 py-0.5 rounded text-[11px] font-mono" style={{ background: "rgba(0,212,255,0.12)", color: CYAN }}>{part.slice(1, -1)}</code>
                    : part
                )}
              </p>
            </div>
          ))}
          {finding.cve_id && (
            <a
              href={`https://nvd.nist.gov/vuln/detail/${finding.cve_id}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold mt-2 hover:opacity-80"
              style={{ color: CYAN }}>
              <Link className="w-3 h-3" /> View NVD Advisory →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function FindingDetailDrawer({ finding, onClose }) {
  if (!finding) return null;

  const sev = finding.normalized_severity || finding.severity;
  const sevColor = sev === "critical" ? DANGER : sev === "high" ? HIGH : sev === "medium" ? MEDIUM : LOW;

  const copyToClipboard = (text) => navigator.clipboard?.writeText(text);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        style={{ backdropFilter: "blur(4px)" }}
      />
      <div
        className="relative z-10 w-full max-w-lg h-full overflow-y-auto flex flex-col"
        style={{ background: "#070f1e", borderLeft: `1px solid ${BORDER}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between p-5 gap-3"
          style={{ background: "#070f1e", borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <SevBadge sev={sev} />
              <StatusBadge status={finding.status} />
            </div>
            <h2 className="text-sm font-bold text-white leading-snug">{finding.title || "Finding Detail"}</h2>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" style={{ color: MUTED }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 space-y-5">

          {/* Key metadata */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Scanner", value: finding.source_scanners || finding.scanner },
              { label: "CVE", value: finding.cve_id },
              { label: "Package", value: finding.package_name },
              { label: "Fixed In", value: finding.fixed_version },
              { label: "File", value: finding.file_path },
              { label: "Line", value: finding.line_number },
              { label: "Asset", value: finding.asset_name },
              { label: "Detected", value: timeAgo(finding.detected_at || finding.created_date) },
            ].filter(r => r.value).map(row => (
              <div key={row.label} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                <p className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: MUTED }}>{row.label}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-mono text-white truncate flex-1">{row.value}</p>
                  <button onClick={() => copyToClipboard(String(row.value))} className="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity">
                    <Copy className="w-3 h-3" style={{ color: MUTED }} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          {finding.description && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: MUTED }}>Description</p>
              <p className="text-xs leading-relaxed" style={{ color: TEXT }}>{finding.description}</p>
            </div>
          )}

          {/* Remediation Guide — collapsible */}
          <RemediationGuide finding={finding} />

          {/* CVSS / extra */}
          {(finding.cvss_score || finding.epss_score || finding.cwe_id) && (
            <div className="grid grid-cols-3 gap-3">
              {finding.cvss_score != null && (
                <div className="p-3 rounded-xl text-center" style={{ background: `${sevColor}08`, border: `1px solid ${sevColor}25` }}>
                  <p className="text-[9px] uppercase tracking-widest" style={{ color: MUTED }}>CVSS</p>
                  <p className="text-xl font-black font-mono mt-1" style={{ color: sevColor }}>{finding.cvss_score}</p>
                </div>
              )}
              {finding.epss_score != null && (
                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[9px] uppercase tracking-widest" style={{ color: MUTED }}>EPSS</p>
                  <p className="text-xl font-black font-mono mt-1 text-white">{(finding.epss_score * 100).toFixed(1)}%</p>
                </div>
              )}
              {finding.cwe_id && (
                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[9px] uppercase tracking-widest" style={{ color: MUTED }}>CWE</p>
                  <p className="text-sm font-black font-mono mt-1" style={{ color: CYAN }}>{finding.cwe_id}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}