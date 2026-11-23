import React, { useState } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { usePlatform } from "@/context/PlatformContext";
import MissionModal from "./MissionModal";
import GlobalSidebar from "./GlobalSidebar";
import PageTransition from "@/components/layout/PageTransition";
import DataAvailabilityBanner from "./DataAvailabilityBanner";

function gradeColor(grade) {
  if (grade === "A") return "text-emerald-600 border-emerald-500/30 bg-emerald-500/10";
  if (grade === "B") return "text-teal-600 border-teal-500/30 bg-teal-500/10";
  if (grade === "C") return "text-amber-600 border-amber-500/30 bg-amber-500/10";
  return "text-destructive border-destructive/30 bg-destructive/10";
}

export default function PlatformShell() {
  const { intel } = usePlatform();
  const location = useLocation();
  const [missionOpen, setMissionOpen] = useState(false);

  const risk = intel?.risk ?? {};
  const def = intel?.defensive ?? {};
  const grade = risk.grade ?? "?";

  return (
    <div className="flex min-h-screen bg-background">
      <GlobalSidebar />

      {/* Main */}
      <div className="ml-[220px] flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 border-b bg-card px-6 flex items-center justify-between sticky top-0 z-30 gap-4">
          <div className="flex items-center gap-3">
            <p className="font-bold text-sm">⚡ GDSA RADAR</p>
            <span className="text-[11px] text-muted-foreground hidden md:block">THE AGENTIC AI SECURITY OPERATING SYSTEM</span>
          </div>

          {/* Live stat chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {intel ? <>
              <span className={`text-[11px] rounded-full border px-2.5 py-0.5 font-medium ${gradeColor(grade)}`}>{risk.score ?? "—"}/100 {grade}</span>
              <span className="text-[11px] rounded-full border px-2.5 py-0.5 text-muted-foreground">☁️ {def.cloud_open ?? 0} ({def.cloud_critical ?? 0} 🔴)</span>
              <span className="text-[11px] rounded-full border px-2.5 py-0.5 text-muted-foreground">🔎 {def.vuln_total ?? 0} ({def.vuln_critical ?? 0} 🔴)</span>
              {(def.exploited_in_wild ?? 0) > 0 && (
                <span className="text-[11px] rounded-full border border-destructive/30 bg-destructive/10 text-destructive px-2.5 py-0.5 font-medium">🔴 {def.exploited_in_wild} exploited</span>
              )}
              <span className="text-[11px] rounded-full border px-2.5 py-0.5 text-muted-foreground">📋 {def.compliance_avg ?? 0}%</span>
            </> : <span className="text-[11px] text-muted-foreground animate-pulse">Loading intel...</span>}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] flex items-center gap-1 text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </span>
            <button onClick={() => setMissionOpen(true)}
              className="btn-shimmer bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition">
              ⚡ Launch Mission
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
        <DataAvailabilityBanner key={location.pathname} pathname={location.pathname} />
        <main className="flex-1 overflow-auto">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>
        </div>
      </div>

      {missionOpen && <MissionModal onClose={() => setMissionOpen(false)} />}
    </div>
  );
}