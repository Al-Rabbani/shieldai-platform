import React from "react";

export default function ContainerScanCard({ scan }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-sm font-bold text-white truncate">{scan.image_name}</p>
      <p className="text-xs text-slate-500">{scan.image_tag}</p>

      <div className="flex items-center gap-3 mt-3">
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Risk Score</p>
          <p className="text-lg font-bold" style={{ color: scan.risk_score >= 70 ? "#ef4444" : scan.risk_score >= 40 ? "#f97316" : "#22c55e" }}>{scan.risk_score ?? 0}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Critical</p>
          <p className="text-lg font-bold text-red-400">{scan.critical_count || 0}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">High</p>
          <p className="text-lg font-bold text-orange-400">{scan.high_count || 0}</p>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-3">OS Base: <span className="text-slate-300">{scan.os_base || "—"}</span></p>
      <p className="text-xs text-slate-500">Size: <span className="text-slate-300">{scan.size_mb ? `${scan.size_mb} MB` : "—"}</span></p>
      <p className="text-[10px] text-slate-600 mt-2">Last scanned: {scan.scanned_at ? new Date(scan.scanned_at).toLocaleString() : "—"}</p>
    </div>
  );
}