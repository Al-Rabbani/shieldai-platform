import React from "react";
import { Switch } from "@/components/ui/switch";

export function TextField({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="text-[10px] text-slate-500 uppercase">{label}</label>
      <input value={value} onChange={e => onChange?.(e.target.value)} disabled={disabled}
        className="w-full mt-1 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-60"
        style={{ background: "#0a0f1e", border: "1px solid #1F2937" }} />
    </div>
  );
}

export function ToggleField({ label, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-slate-300">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs text-white font-medium">{value}</span>
    </div>
  );
}