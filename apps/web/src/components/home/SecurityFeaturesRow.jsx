import React from "react";
import { Link } from "react-router-dom";
import MagneticCard from "@/components/home/MagneticCard";

export default function SecurityFeaturesRow({ stats }) {
  const tiles = [
    { icon: "⚔️", label: "Red Team", path: "/red-team", stat: stats.attackPaths === null ? "attack paths not recorded" : `${stats.attackPaths} critical attack paths` },
    { icon: "🛡️", label: "Blue Team", path: "/blue-team", stat: stats.runtimeThreats === null ? "runtime threats not recorded" : `${stats.runtimeThreats} active runtime threats` },
    { icon: "📡", label: "SOC", path: "/soc", stat: `${stats.openIncidents} open incidents` },
    { icon: "🔍", label: "Threat Intel", path: "/threat-intelligence", stat: stats.darkWebAlerts == null ? "dark web not recorded" : `${stats.darkWebAlerts} dark web alerts` },
    { icon: "📋", label: "Compliance", path: "/compliance", stat: stats.complianceAvg == null ? "not measured" : `${stats.complianceAvg}% avg score` },
    { icon: "📊", label: "Executive", path: "/mssp", stat: `Risk grade ${stats.riskGrade}` },
  ];

  return (
    <div className="grid grid-cols-6 gap-3">
      {tiles.map(t => (
        <Link key={t.label} to={t.path}>
          <MagneticCard strength={5} className="rounded-xl p-3 text-center hover:border-blue-500/50 h-full" as="div">
            <div style={{ background: "#111827", border: "1px solid #1F2937" }} className="rounded-xl p-3 h-full">
              <p className="text-2xl mb-1">{t.icon}</p>
              <p className="text-xs font-bold text-white">{t.label}</p>
              <p className="text-[10px] text-slate-500 mt-1">{t.stat}</p>
            </div>
          </MagneticCard>
        </Link>
      ))}
    </div>
  );
}