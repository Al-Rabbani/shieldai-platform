import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import StatusBadge from "@/components/shared/StatusBadge";
import { Download, CheckCircle2, XCircle, AlertTriangle, ClipboardCheck, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const frameworkIcons = {
  "SOC 2": "🔒",
  "ISO 27001": "📋",
  "NIST AI RMF": "🤖",
  "CIS Benchmarks": "🛡️",
  "GDPR": "🇪🇺",
};

const failingControlsData = {
  "SOC 2": [
    { control: "CC6.1 – Logical Access Controls", status: "failing", detail: "3 IAM roles with excessive permissions" },
    { control: "CC7.2 – System Monitoring", status: "failing", detail: "Missing log aggregation for 2 services" },
    { control: "CC8.1 – Change Management", status: "passing", detail: "All changes tracked in Git" },
  ],
  "ISO 27001": [
    { control: "A.9.2 – User Access Management", status: "failing", detail: "MFA not enforced for 5 users" },
    { control: "A.12.4 – Logging & Monitoring", status: "passing", detail: "Centralized logging configured" },
  ],
  "NIST AI RMF": [
    { control: "MAP 1.1 – AI Risk Identification", status: "failing", detail: "No risk assessment for 2 models" },
    { control: "GOVERN 1.2 – AI Governance", status: "failing", detail: "Missing model cards for production models" },
  ],
  "CIS Benchmarks": [
    { control: "1.1 – Root Account Usage", status: "passing", detail: "Root account disabled" },
    { control: "2.1 – CloudTrail Enabled", status: "failing", detail: "CloudTrail disabled in us-west-2" },
  ],
  "GDPR": [
    { control: "Art. 30 – Records of Processing", status: "failing", detail: "2 processing activities undocumented" },
    { control: "Art. 32 – Security of Processing", status: "passing", detail: "Encryption at rest enabled" },
  ],
};

export default function Compliance() {
  const { data: frameworks = [] } = useQuery({
    queryKey: ["compliance"],
    queryFn: () => base44.entities.ComplianceFramework.list("-created_date", 20),
    initialData: [],
  });

  // Use entity data or fallback to static
  const displayFrameworks = frameworks.length > 0 ? frameworks : [
    { id: "1", name: "SOC 2", percentage: 87, total_controls: 64, failing_controls: 8, status: "partial", last_assessed: "2026-06-04T10:00:00Z" },
    { id: "2", name: "ISO 27001", percentage: 92, total_controls: 114, failing_controls: 9, status: "partial", last_assessed: "2026-06-03T14:30:00Z" },
    { id: "3", name: "NIST AI RMF", percentage: 71, total_controls: 42, failing_controls: 12, status: "non_compliant", last_assessed: "2026-06-02T08:00:00Z" },
    { id: "4", name: "CIS Benchmarks", percentage: 94, total_controls: 200, failing_controls: 12, status: "partial", last_assessed: "2026-06-04T16:00:00Z" },
    { id: "5", name: "GDPR", percentage: 82, total_controls: 30, failing_controls: 5, status: "partial", last_assessed: "2026-06-01T12:00:00Z" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Compliance</h1>
          <p className="text-sm text-muted-foreground mt-1">Framework compliance status & evidence export</p>
        </div>
        <Button variant="outline" className="border-border gap-2">
          <Download className="w-4 h-4" /> Export All Evidence
        </Button>
      </div>

      {/* Framework cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayFrameworks.map((fw) => {
          const progressColor = fw.percentage >= 90 ? "bg-emerald-500" : fw.percentage >= 75 ? "bg-yellow-500" : "bg-red-500";
          return (
            <Card key={fw.id} className="p-5 bg-card border-border hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{frameworkIcons[fw.name] || "📄"}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{fw.name}</h3>
                    <StatusBadge status={fw.status} className="mt-1" />
                  </div>
                </div>
                <span className="text-2xl font-bold font-mono text-foreground">{fw.percentage}%</span>
              </div>
              <div className="mt-4">
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${progressColor} transition-all duration-500`} style={{ width: `${fw.percentage}%` }} />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{fw.failing_controls} failing / {fw.total_controls} controls</span>
                <span>{fw.last_assessed ? format(new Date(fw.last_assessed), "MMM d") : "—"}</span>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3 border-border text-xs gap-1">
                <ExternalLink className="w-3 h-3" /> View Details
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Failing controls detail */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Control Details</h3>
        <div className="space-y-6">
          {Object.entries(failingControlsData).map(([fw, controls]) => (
            <div key={fw}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{frameworkIcons[fw]}</span>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">{fw}</h4>
              </div>
              <div className="space-y-1.5">
                {controls.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
                    {c.status === "passing" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{c.control}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{c.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}