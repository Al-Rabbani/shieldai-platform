import React from "react";
import { Link } from "react-router-dom";
import { Swords, Map, Target, Zap, Search, Crosshair } from "lucide-react";
import MagneticCard from "@/components/home/MagneticCard";

const fmt = (value, unit) => (value === null || value === undefined ? "not recorded here" : `${value} ${unit}`);

export default function HermesCapabilityTiles({ activeScans, pathsMapped, exploitsPending, simsRun }) {
  const tiles = [
    { icon: Swords, title: "Continuous Pentesting", desc: "AI-powered hybrid pentesting", stat: fmt(activeScans, "pentest authorisation(s)"), cta: "Launch Pentest →", to: "/red-team/pentest" },
    { icon: Map, title: "Attack Path Discovery", desc: "Graph-based lateral movement analysis", stat: fmt(pathsMapped, "paths mapped"), cta: "View Paths →", to: "/red-team/attack-paths" },
    { icon: Target, title: "Exploit Validation", desc: "Safe CVE exploitation proof", stat: fmt(exploitsPending, "pending review"), cta: "View →", to: "/offensive/exploits" },
    { icon: Zap, title: "Adversary Simulation", desc: "LockBit · Scattered Spider · APT", stat: fmt(simsRun, "simulations"), cta: "Run New →", to: "/red-team/adversary-sim" },
    { icon: Crosshair, title: "Kill Chain Analyzer", desc: "MITRE ATT&CK 14-tactic coverage", stat: "coverage not measured", cta: "Improve →", to: "/red-team/kill-chain" },
    { icon: Search, title: "Recon & OSINT", desc: "External exposure & attack surface", stat: "ASM live", cta: "Run Recon →", to: "/offensive/osint" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {tiles.map((t, i) => (
        <MagneticCard key={i} as={Link} to={t.to} strength={4} className="rounded-xl p-4 transition hover:border-red-500/40 group block" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-start gap-3">
            <t.icon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{t.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{t.stat}</span>
                <span className="text-[11px] font-medium text-blue-400 group-hover:text-blue-300">{t.cta}</span>
              </div>
            </div>
          </div>
        </MagneticCard>
      ))}
    </div>
  );
}