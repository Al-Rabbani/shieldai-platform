import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { UserCheck, RotateCcw, X, AlertTriangle } from "lucide-react";

const TABS = ["all", "orphaned", "stale", "admin", "api_keys"];
const TAB_LABELS = { all: "All", orphaned: "Orphaned", stale: "Stale", admin: "Admin", api_keys: "API Keys" };
const PERM_COLOR = { admin: "#ef4444", write: "#f97316", read: "#10b981", custom: "#8b5cf6" };
const PERM_BG = { admin: "rgba(239,68,68,0.1)", write: "rgba(249,115,22,0.1)", read: "rgba(16,185,129,0.1)", custom: "rgba(139,92,246,0.1)" };
const PROV_COLOR = { aws: "#f97316", gcp: "#3b82f6", azure: "#8b5cf6", github: "#e2e8f0", internal: "#10b981" };
const PROV_LABEL = { aws: "AWS", gcp: "GCP", azure: "Azure", github: "GitHub", internal: "Internal" };
const TYPE_ICON = { iam_role: "🔑", api_key: "🗝️", service_account: "⚙️", user_account: "👤", group: "👥", ssh_key: "🔐" };

function RiskGauge({ score }) {
  const r = 13, c = 2 * Math.PI * r;
  const color = score >= 75 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#10b981";
  return (
    <svg width="32" height="32">
      <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(30,58,95,0.5)" strokeWidth="3" />
      <circle cx="16" cy="16" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${(score / 100) * c} ${c}`} strokeLinecap="round" transform="rotate(-90 16 16)" />
      <text x="16" y="19.5" textAnchor="middle" fontSize="8" fill={color} fontFamily="JetBrains Mono" fontWeight="bold">{score}</text>
    </svg>
  );
}

function ConfirmModal({ title, message, onConfirm, onClose, variant = "danger" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(3,7,18,0.8)", backdropFilter: "blur(8px)" }}>
      <div className="rounded-2xl p-6 w-full max-w-sm animate-slide-in-up" style={{ background: "#0f172a", border: "2px solid rgba(239,68,68,0.3)" }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button onClick={onClose} className="ml-auto text-slate-600 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-slate-400 mb-4">{message}</p>
        <p className="text-[10px] text-red-400/70 mb-4 font-mono">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors" style={{ background: "#1e293b", border: "1px solid rgba(30,58,95,0.5)" }}>Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-lg text-sm font-bold text-white transition-all btn-interactive"
            style={{ background: variant === "danger" ? "linear-gradient(135deg,#dc2626,#ef4444)" : "linear-gradient(135deg,#059669,#10b981)", boxShadow: variant === "danger" ? "0 0 16px rgba(239,68,68,0.3)" : "0 0 16px rgba(16,185,129,0.3)" }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccessReviewPage() {
  const [tab, setTab] = useState("all");
  const [confirm, setConfirm] = useState(null);
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ["access-reviews"],
    queryFn: () => base44.entities.AccessReview.list("-detected_at", 50),
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AccessReview.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["access-reviews"] }),
  });

  const filtered = items.filter(i => {
    if (tab === "orphaned") return i.is_orphaned;
    if (tab === "stale") return i.is_stale && !i.is_orphaned;
    if (tab === "admin") return i.permissions_level === "admin";
    if (tab === "api_keys") return i.resource_type === "api_key";
    return true;
  });

  const orphaned = items.filter(i => i.is_orphaned).length;
  const stale = items.filter(i => i.is_stale).length;
  const overPriv = items.filter(i => i.permissions_level === "admin").length;
  const underReview = items.filter(i => i.status === "under_review").length;

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#030712" }}>
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          variant={confirm.variant}
          onConfirm={() => { confirm.action(); setConfirm(null); }}
          onClose={() => setConfirm(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-5 h-5 text-sky-400" />
            <h1 className="text-xl font-black text-white font-mono">ACCESS GOVERNANCE</h1>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">Identity access review — orphaned, stale, and over-privileged accounts</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-sky-400 btn-interactive"
          style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.3)" }}>
          <RotateCcw className="w-4 h-4" /> Start Review Cycle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "ORPHANED", val: orphaned, color: "#ef4444", pulse: orphaned > 0 },
          { label: "STALE ACCESS", val: stale, color: "#eab308", pulse: false },
          { label: "OVER-PRIVILEGED", val: overPriv, color: "#8b5cf6", pulse: false },
          { label: "UNDER REVIEW", val: underReview, color: "#3b82f6", pulse: false },
        ].map(({ label, val, color, pulse }) => (
          <div key={label} className="rounded-xl p-4 text-center card-hover"
            style={{ background: `linear-gradient(145deg, ${color}0d, #0a0f1e)`, border: `1px solid ${color}25` }}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />}
              <p className="text-[9px] font-mono font-semibold tracking-widest text-slate-500">{label}</p>
            </div>
            <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background: tab === t ? "rgba(14,165,233,0.15)" : "transparent",
              color: tab === t ? "#38bdf8" : "#475569",
              border: tab === t ? "1px solid rgba(14,165,233,0.3)" : "1px solid transparent"
            }}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        <div className="divide-y" style={{ borderColor: "rgba(30,58,95,0.3)" }}>
          {filtered.map((item) => {
            const provColor = PROV_COLOR[item.provider] || "#475569";
            const permColor = PERM_COLOR[item.permissions_level] || "#475569";
            const isOrphaned = item.is_orphaned;
            const daysColor = (item.days_since_used || 0) > 90 ? "#ef4444" : (item.days_since_used || 0) > 30 ? "#eab308" : "#10b981";
            return (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-all group"
                style={{ background: isOrphaned ? "rgba(239,68,68,0.03)" : "transparent" }}>

                {/* Type icon + name */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-lg flex-shrink-0">{TYPE_ICON[item.resource_type] || "🔑"}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold text-white truncate">{item.resource_name}</p>
                    <div className="flex gap-1 mt-0.5">
                      {isOrphaned && <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)" }}>ORPHANED</span>}
                      {item.is_stale && <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ color: "#eab308", background: "rgba(234,179,8,0.12)" }}>STALE</span>}
                    </div>
                  </div>
                </div>

                {/* Provider */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full" style={{ background: provColor }} />
                  <span className="text-[10px] font-mono font-semibold uppercase" style={{ color: provColor }}>{PROV_LABEL[item.provider]}</span>
                </div>

                {/* Permission */}
                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase flex-shrink-0"
                  style={{ color: permColor, background: PERM_BG[item.permissions_level], border: `1px solid ${permColor}30` }}>
                  {item.permissions_level}
                </span>

                {/* Days inactive */}
                <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color: daysColor }}>
                  {item.days_since_used}d ago
                </span>

                {/* Risk gauge */}
                <RiskGauge score={item.risk_score || 0} />

                {/* Owner */}
                <span className="text-[10px] text-slate-500 flex-shrink-0 hidden lg:block">
                  {item.owner_email || <span style={{ color: "#ef4444" }} className="italic">No owner</span>}
                </span>

                {/* Actions (appear on hover) */}
                <div className="flex gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setConfirm({ title: "Approve Access", message: `Approve ${item.resource_name}?`, variant: "success", action: () => updateItem.mutate({ id: item.id, data: { status: "active", review_action: "approve" } }) })}
                    className="text-[10px] px-2.5 py-1.5 rounded-lg font-semibold btn-interactive"
                    style={{ color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
                    Approve
                  </button>
                  <button onClick={() => setConfirm({ title: "Revoke Access", message: `Revoke access for ${item.resource_name}?`, variant: "danger", action: () => updateItem.mutate({ id: item.id, data: { status: "revoked", review_action: "revoke" } }) })}
                    className="text-[10px] px-2.5 py-1.5 rounded-lg font-semibold btn-interactive"
                    style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    Revoke
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-600">
              <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No access records in this view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}