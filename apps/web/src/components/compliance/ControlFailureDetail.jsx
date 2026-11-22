import React from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

export default function ControlFailureDetail({ title, controls, onClose }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center gap-2 mb-1.5">
        <p className="text-[11px] font-bold text-white flex-1">{title}</p>
        <button onClick={onClose} aria-label="Close detail" className="text-slate-500 hover:text-slate-300"><X size={12} /></button>
      </div>
      {controls.length === 0 ? (
        <p className="text-[11px] text-emerald-300">No failing controls in this family.</p>
      ) : (
        <div className="space-y-1">
          {controls.map((control) => (
            <div key={control.id} className="rounded-md px-2 py-1.5" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
              <p className="text-[11px] text-slate-200">
                <span className="font-mono text-blue-300 mr-1.5">{control.control_ref}</span>
                {control.title}
              </p>
              {control.missing_evidence && (
                <p className="text-[10px] text-amber-300/90 mt-0.5">Missing evidence: {control.missing_evidence}</p>
              )}
            </div>
          ))}
        </div>
      )}
      <Link to="/compliance/evidence-vault" className="inline-block text-[10px] text-blue-400 hover:text-blue-300 mt-2">
        Collect the evidence in the compliance vault →
      </Link>
    </div>
  );
}