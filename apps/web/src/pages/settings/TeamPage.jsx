import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, UserPlus, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_STYLE = {
  super_admin: "text-purple-400 bg-purple-500/15 border-purple-500/30",
  org_admin: "text-blue-400 bg-blue-500/15 border-blue-500/30",
  admin: "text-blue-400 bg-blue-500/15 border-blue-500/30",
  security_engineer: "text-teal-400 bg-teal-500/15 border-teal-500/30",
  analyst: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  auditor: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30",
  read_only: "text-slate-400 bg-slate-500/15 border-slate-500/30",
  user: "text-slate-400 bg-slate-500/15 border-slate-500/30",
  demo: "text-orange-400 bg-orange-500/15 border-orange-500/30",
};
const TABS = ["all", "org_admin", "security_engineer", "analyst", "auditor"];
const TAB_LABELS = { all: "All", org_admin: "Admins", security_engineer: "Engineers", analyst: "Analysts", auditor: "Auditors" };
const ROLES = ["super_admin", "org_admin", "security_engineer", "analyst", "auditor", "read_only", "demo"];

function Avatar({ name }) {
  const initials = (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-orange-500", "bg-red-500", "bg-teal-500"];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  return <div className={`w-8 h-8 rounded-full ${colors[idx]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>{initials}</div>;
}

export default function TeamPage() {
  const [tab, setTab] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("analyst");

  const { data: users = [] } = useQuery({ queryKey: ["team-users"], queryFn: () => base44.entities.User.list("-created_date", 50) });

  const filtered = users.filter(u => tab === "all" ? true : u.role === tab);
  const mfaEnabled = users.filter(u => u.mfa_enabled).length;
  const mfaPct = users.length > 0 ? Math.round((mfaEnabled / users.length) * 100) : 0;

  const handleInvite = async () => {
    await base44.users.inviteUser(inviteEmail, inviteRole === "super_admin" || inviteRole === "org_admin" ? "admin" : "user");
    setInviteOpen(false);
    setInviteEmail("");
  };

  return (
    <div className="bg-[#0a0f1e] min-h-screen -m-6 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] flex items-center gap-2"><Users className="w-6 h-6 text-blue-400" /> Team Management</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Manage team members, roles, and access permissions</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 gap-2"><UserPlus className="w-4 h-4" /> Invite Member</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[["Total Members", users.length, "text-[#e2e8f0]"], ["MFA Enabled", `${mfaEnabled} (${mfaPct}%)`, mfaPct >= 80 ? "text-emerald-400" : "text-amber-400"], ["Active This Week", users.length, "text-blue-400"]].map(([l, v, c]) => (
          <div key={l} className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 text-center">
            <p className="text-[11px] text-[#64748b] uppercase tracking-wider">{l}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e293b] flex gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded text-[11px] font-semibold transition-colors ${tab === t ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-[#64748b] hover:text-[#94a3b8]"}`}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        {users.length === 0 ? (
          <div className="p-12 text-center text-[#64748b]">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No team members yet. Invite your first team member to get started.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-[#1e293b]">{["Member", "Role", "Department", "Last Login", "MFA", "Findings", "Reports"].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[#64748b]">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.full_name} />
                      <div>
                        <p className="font-medium text-[#e2e8f0]">{user.full_name || "—"}</p>
                        <p className="text-[10px] text-[#64748b]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${ROLE_STYLE[user.role] || ROLE_STYLE.user}`}>{user.role?.replace(/_/g, " ") || "user"}</span>
                  </td>
                  <td className="px-4 py-3 text-[#64748b]">{user.department || "—"}</td>
                  <td className="px-4 py-3 text-[#64748b]">{user.last_login ? new Date(user.last_login).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    {user.mfa_enabled ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldOff className="w-4 h-4 text-[#475569]" />}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#94a3b8]">{user.findings_assigned ?? 0}</td>
                  <td className="px-4 py-3 font-mono text-[#94a3b8]">{user.reports_generated ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-[#111827] border-[#1e293b] text-[#e2e8f0]">
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-xs text-[#94a3b8] uppercase tracking-wider mb-1.5 block">Email Address</label><Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="engineer@company.com" className="bg-[#0a0f1e] border-[#1e293b] text-[#e2e8f0]" /></div>
            <div><label className="text-xs text-[#94a3b8] uppercase tracking-wider mb-1.5 block">Role</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-[#0a0f1e] border-[#1e293b] text-[#e2e8f0]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#111827] border-[#1e293b]">{ROLES.map(r => <SelectItem key={r} value={r} className="text-[#e2e8f0] capitalize">{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={!inviteEmail} className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30">Send Invitation</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}