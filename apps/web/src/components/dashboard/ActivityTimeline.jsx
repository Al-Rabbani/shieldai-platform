import React from "react";
import { CheckCircle, AlertTriangle, Shield, Zap, GitBranch, Download, Upload } from "lucide-react";

const ACTIVITIES = [
  { id: 1, type: "scan_complete", icon: CheckCircle, message: "Scan completed for frontend-app", time: "4 min ago", asset: "frontend-app", color: "#22c55e" },
  { id: 2, type: "finding_detected", icon: AlertTriangle, message: "Critical finding: SQL Injection in /api/users", time: "8 min ago", asset: "api-service", color: "#ef4444" },
  { id: 3, type: "autofix_pr", icon: GitBranch, message: "AutoFix PR created for CVE-2026-1234", time: "15 min ago", asset: "auth-service", color: "#f59e0b" },
  { id: 4, type: "threat_blocked", icon: Shield, message: "2,847 attacks blocked in last 24h", time: "22 min ago", asset: "zen-firewall", color: "#3b82f6" },
  { id: 5, type: "compliance_change", icon: CheckCircle, message: "SOC2 score improved from 89% to 91%", time: "1 hour ago", asset: "compliance", color: "#8b5cf6" },
  { id: 6, type: "new_repo", icon: GitBranch, message: "New repository connected: mobile-app-ios", time: "2 hours ago", asset: "mobile-app-ios", color: "#22c55e" },
  { id: 7, type: "scan_complete", icon: CheckCircle, message: "Scan completed for backend-api", time: "3 hours ago", asset: "backend-api", color: "#22c55e" },
  { id: 8, type: "finding_fixed", icon: CheckCircle, message: "CVE-2026-5678 marked as Fixed", time: "4 hours ago", asset: "payment-service", color: "#22c55e" },
  { id: 9, type: "threat_blocked", icon: Zap, message: "DDoS attack mitigated — 2.4M req/min", time: "5 hours ago", asset: "zen-firewall", color: "#ef4444" },
  { id: 10, type: "report_generated", icon: Download, message: "Weekly security report generated", time: "6 hours ago", asset: "report", color: "#3b82f6" },
];

export default function ActivityTimeline() {
  return (
    <div className="space-y-0">
      {ACTIVITIES.map((activity, i) => {
        const Icon = activity.icon;
        return (
          <div key={activity.id} className="flex items-start gap-4 relative">
            {/* Timeline line */}
            {i < ACTIVITIES.length - 1 && (
              <div className="absolute left-3.5 top-8 bottom-0 w-px bg-slate-800" />
            )}
            {/* Icon */}
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10" style={{ background: activity.color + "20" }}>
              <Icon className="w-3.5 h-3.5" style={{ color: activity.color }} />
            </div>
            {/* Content */}
            <div className="flex-1 pb-4">
              <p className="text-xs text-white">{activity.message}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-slate-500">{activity.time}</span>
                <span className="text-[10px] text-slate-600">•</span>
                <span className="text-[10px] text-slate-500">{activity.asset}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}