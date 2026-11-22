import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, TrendingUp } from "lucide-react";

export default function ExecutiveOverviewLink() {
  return (
    <Link
      to="/executive-overview"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 group"
      style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #8b5cf6" }}
    >
      <span className="p-1.5 rounded-lg bg-violet-500/15 text-violet-300">
        <TrendingUp size={14} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-white">Executive overview</span>
        <span className="block text-[10px] text-slate-500 truncate">
          Risk score, compliance readiness and trends for leadership reviews
        </span>
      </span>
      <ChevronRight size={14} className="ml-auto text-slate-500 group-hover:text-white transition" />
    </Link>
  );
}