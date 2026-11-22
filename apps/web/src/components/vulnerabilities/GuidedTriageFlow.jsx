import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const SEV_COLOR = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  low: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  info: "bg-muted text-muted-foreground border-border",
};

const STATUS_ACTIONS = [
  { status: "in_remediation", label: "Start Remediation", color: "border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400" },
  { status: "fixed", label: "Mark Fixed", color: "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500" },
  { status: "accepted_risk", label: "Accept Risk", color: "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500" },
  { status: "false_positive", label: "False Positive", color: "border-muted-foreground/40 bg-muted hover:bg-accent text-muted-foreground" },
];

export default function GuidedTriageFlow() {
  const [queue, setQueue] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.TriagedFinding.filter({ status: "open" }).catch(() => []),
      base44.entities.User.list().catch(() => []),
    ]).then(([findings, userList]) => {
      const sorted = [...findings].sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));
      setQueue(sorted);
      setUsers(userList);
      setLoading(false);
    });
  }, []);

  const current = queue[0];

  async function applyStatus(status) {
    if (!current || busy) return;
    setBusy(true);
    await base44.entities.TriagedFinding.update(current.id, { status });
    setQueue(q => q.slice(1));
    setBusy(false);
    toast.success(`Moved "${current.title}" → ${status.replace("_", " ")}`);
  }

  async function assignTo(email) {
    if (!current || busy || !email) return;
    setBusy(true);
    await base44.entities.TriagedFinding.update(current.id, { assigned_to: email });
    setQueue(q => q.map((f, i) => (i === 0 ? { ...f, assigned_to: email } : f)));
    setBusy(false);
    toast.success(`Assigned to ${email}`);
  }

  function skip() {
    setQueue(q => (q.length > 1 ? [...q.slice(1), q[0]] : q));
  }

  if (loading) return <div className="animate-pulse h-40 rounded-xl bg-muted mb-6" />;

  return (
    <div className="rounded-2xl border bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold">🧭 GUIDED TRIAGE</span>
        <span className="text-xs text-muted-foreground">{queue.length} in queue</span>
      </div>

      {!current ? (
        <p className="text-sm text-muted-foreground py-6 text-center">✅ Triage queue is clear — no open findings.</p>
      ) : (
        <div>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-base font-semibold">{current.title}</p>
              <p className="text-xs text-muted-foreground">{current.asset_name} {current.cve_id ? `· ${current.cve_id}` : ""} {current.cvss_score ? `· CVSS ${current.cvss_score}` : ""}</p>
            </div>
            <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${SEV_COLOR[current.severity] || SEV_COLOR.info}`}>{current.severity}</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {STATUS_ACTIONS.map(a => (
              <button key={a.status} disabled={busy} onClick={() => applyStatus(a.status)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition disabled:opacity-50 ${a.color}`}>
                {a.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              disabled={busy}
              value={current.assigned_to || ""}
              onChange={e => assignTo(e.target.value)}
              className="flex-1 text-xs border rounded-lg px-2 py-1.5 bg-background"
            >
              <option value="">Assign to team member...</option>
              {users.map(u => (
                <option key={u.id} value={u.email}>{u.full_name} ({u.email})</option>
              ))}
            </select>
            <button onClick={skip} disabled={busy} className="text-xs border rounded-lg px-3 py-1.5 hover:bg-accent transition disabled:opacity-50">
              Skip →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}