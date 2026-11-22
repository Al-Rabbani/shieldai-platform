import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, KeyRound, ShieldCheck, Cloud } from "lucide-react";
import MagneticCard from "@/components/home/MagneticCard";

export default function BlueTeamCapabilityTiles() {
  const tiles = [
    { icon: ShieldAlert, title: "Incident Command", desc: "Real-time IR chat & containment tracking", to: "/incidents" },
    { icon: KeyRound, title: "Zero Trust", desc: "Access policies & trust scoring", to: "/blue-team/zero-trust" },
    { icon: ShieldCheck, title: "Vulnerability Remediation", desc: "Patch plans & SLA tracking", to: "/vulnerabilities" },
    { icon: Cloud, title: "Cloud Defense", desc: "Cloud posture & CIEM monitoring", to: "/cloud" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {tiles.map((t, i) => (
        <MagneticCard key={i} as={Link} to={t.to} strength={4} className="rounded-xl p-4 transition hover:border-blue-500/40 group block" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-start gap-3">
            <t.icon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-white">{t.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
            </div>
          </div>
        </MagneticCard>
      ))}
    </div>
  );
}