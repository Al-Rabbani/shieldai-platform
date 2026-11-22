import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FolderOpen, Plus, Download, Eye, AlertTriangle, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, formatDistanceToNow } from "date-fns";

const FW_COLORS = { SOC2:"#3b82f6",ISO27001:"#10b981",GDPR:"#6366f1",NIST_CSF:"#06b6d4",CIS:"#f97316",PCI_DSS:"#ef4444",HIPAA:"#8b5cf6" };
const TYPE_COLORS = { scan_report:"#3b82f6",policy_doc:"#8b5cf6",audit_log:"#10b981",screenshot:"#f97316",config_export:"#06b6d4",attestation:"#6366f1",test_result:"#ec4899" };
const STATUS_COLORS = { valid:"#16a34a",pending_review:"#d97706",expired:"#dc2626" };
const PAGE_SIZE = 20;

function daysUntil(d) { if(!d) return null; return differenceInDays(new Date(d), new Date()); }

export default function GovEvidencePage() {
  const [fwFilter, setFwFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [autoFilter, setAutoFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title:"",framework:"",control_id:"",evidence_type:"scan_report",source:"",collected_by:"",notes:"" });
  const qc = useQueryClient();

  const { data: evidence = [] } = useQuery({ queryKey:["gov-evidence"], queryFn:()=>base44.entities.EvidencePack.list("-collected_at",500), initialData:[] });

  const filtered = useMemo(() => evidence.filter(e => {
    if (fwFilter && e.framework!==fwFilter) return false;
    if (typeFilter && e.evidence_type!==typeFilter) return false;
    if (statusFilter && e.status!==statusFilter) return false;
    if (autoFilter && !e.auto_generated) return false;
    return true;
  }), [evidence, fwFilter, typeFilter, statusFilter, autoFilter]);

  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length/PAGE_SIZE);

  const stats = {
    total: evidence.length,
    valid: evidence.filter(e=>e.status==="valid").length,
    pending: evidence.filter(e=>e.status==="pending_review").length,
    expired: evidence.filter(e=>e.status==="expired").length,
    auto: evidence.filter(e=>e.auto_generated).length,
  };

  const allFw = [...new Set(evidence.map(e=>e.framework).filter(Boolean))];
  const allTypes = [...new Set(evidence.map(e=>e.evidence_type).filter(Boolean))];

  const submit = async () => {
    if(!form.title||!form.framework){toast.error("Title and framework required");return;}
    setLoading(true);
    await base44.entities.EvidencePack.create({ ...form, status:"pending_review", collected_at:new Date().toISOString(), auto_generated:false });
    toast.success("Evidence added");
    qc.invalidateQueries({queryKey:["gov-evidence"]});
    setShowModal(false);
    setForm({title:"",framework:"",control_id:"",evidence_type:"scan_report",source:"",collected_by:"",notes:""});
    setLoading(false);
  };

  const selCls = "px-3 py-2 rounded-lg text-xs text-slate-300 outline-none appearance-none";
  const selStyle = { background:"#161b22",border:"1px solid #30363d" };
  const inputCls = "w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 outline-none focus:ring-1 focus:ring-indigo-500/50";
  const inputStyle = { background:"#0d1117",border:"1px solid #30363d" };

  return (
    <div className="space-y-6">
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(3,7,18,0.85)",backdropFilter:"blur(8px)" }}>
          <div className="rounded-2xl w-full max-w-md" style={{ background:"#161b22",border:"1px solid rgba(99,102,241,0.3)" }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom:"1px solid #30363d" }}>
              <h2 className="text-sm font-bold text-white flex items-center gap-2"><FolderOpen className="w-4 h-4 text-indigo-400" />Add Evidence</h2>
              <button onClick={()=>setShowModal(false)} className="text-slate-600 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              {[["Title *","title","Evidence title"],["Control ID","control_id","SOC2-CC6.1"],["Source","source","ShieldAI Scanner"],["Collected By","collected_by","security@company.com"]].map(([l,k,p])=>(
                <div key={k}>
                  <label className="block text-[10px] text-slate-400 mb-1 font-mono uppercase">{l}</label>
                  <input value={form[k]} onChange={e=>setForm(s=>({...s,[k]:e.target.value}))} placeholder={p} className={inputCls} style={inputStyle} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {[["Framework *","framework",["SOC2","ISO27001","GDPR","NIST_CSF","CIS","PCI_DSS","HIPAA"]],["Evidence Type","evidence_type",["scan_report","policy_doc","audit_log","screenshot","config_export","attestation","test_result"]]].map(([l,k,opts])=>(
                  <div key={k}>
                    <label className="block text-[10px] text-slate-400 mb-1 font-mono uppercase">{l}</label>
                    <select value={form[k]} onChange={e=>setForm(s=>({...s,[k]:e.target.value}))} className={`${inputCls} appearance-none`} style={inputStyle}>
                      {opts.map(o=><option key={o} value={o}>{o.replace(/_/g," ")}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-mono uppercase">Notes</label>
                <textarea value={form.notes} onChange={e=>setForm(s=>({...s,notes:e.target.value}))} rows={2} className={`${inputCls} resize-none text-xs`} style={inputStyle} />
              </div>
              <button onClick={submit} disabled={loading} className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background:"linear-gradient(135deg,#312e81,#6366f1)" }}>
                {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Adding…</>:"Add Evidence"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-indigo-400" />
          <h1 className="text-xl font-bold text-white">Evidence Vault</h1>
        </div>
        <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background:"linear-gradient(135deg,#312e81,#6366f1)" }}>
          <Plus className="w-4 h-4" /> Add Evidence
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[["Total",stats.total,"#94a3b8"],["Valid",stats.valid,"#16a34a"],["Pending Review",stats.pending,"#d97706"],["Expired",stats.expired,"#dc2626"],["Auto-Generated",stats.auto,"#6366f1"]].map(([l,v,c])=>(
          <div key={l} className="rounded-xl p-4 text-center" style={{ background:"#161b22",border:"1px solid #30363d" }}>
            <p className="text-2xl font-black font-mono" style={{ color:c }}>{v}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">{l}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap p-4 rounded-xl" style={{ background:"#161b22",border:"1px solid #30363d" }}>
        <select value={fwFilter} onChange={e=>{setFwFilter(e.target.value);setPage(1);}} className={selCls} style={selStyle}>
          <option value="">All Frameworks</option>
          {allFw.map(f=><option key={f} value={f}>{f}</option>)}
        </select>
        <select value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setPage(1);}} className={selCls} style={selStyle}>
          <option value="">All Types</option>
          {allTypes.map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}} className={selCls} style={selStyle}>
          <option value="">All Statuses</option>
          {["valid","pending_review","expired"].map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
        </select>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={autoFilter} onChange={e=>setAutoFilter(e.target.checked)} className="rounded" />
          <span className="text-xs text-slate-400 font-mono">Auto-Generated only</span>
        </label>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border:"1px solid #30363d" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background:"#161b22",borderBottom:"1px solid #30363d" }}>
              {["Framework","Control","Title","Type","Source","Status","Collected","Expires","Auto","Actions"].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((e,i)=>{
              const fwColor = FW_COLORS[e.framework]||"#6366f1";
              const typeColor = TYPE_COLORS[e.evidence_type]||"#6366f1";
              const statusColor = STATUS_COLORS[e.status]||"#6366f1";
              const days = daysUntil(e.expires_at);
              const isExpired = e.status==="expired";
              const expiringSoon = days!==null && days>=0 && days<=30 && !isExpired;
              const rowBg = isExpired?"rgba(220,38,38,0.06)":expiringSoon?"rgba(217,119,6,0.04)":i%2===0?"#0d1117":"#161b22";
              return (
                <tr key={e.id} className="hover:bg-white/[0.02] transition-colors" style={{ background:rowBg,borderBottom:"1px solid rgba(48,54,61,0.5)" }}>
                  <td className="px-4 py-3">{e.framework&&<span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono" style={{ color:fwColor,background:`${fwColor}15` }}>{e.framework}</span>}</td>
                  <td className="px-4 py-3"><span className="text-[10px] font-mono text-slate-400">{e.control_id||"—"}</span></td>
                  <td className="px-4 py-3 max-w-[160px]"><p className="text-xs text-white truncate">{e.title}</p></td>
                  <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono capitalize" style={{ color:typeColor,background:`${typeColor}15` }}>{e.evidence_type?.replace(/_/g," ")}</span></td>
                  <td className="px-4 py-3"><span className="text-[10px] text-slate-500">{e.source||"—"}</span></td>
                  <td className="px-4 py-3"><span className="text-[10px] font-bold capitalize font-mono" style={{ color:statusColor }}>{e.status?.replace("_"," ")}</span></td>
                  <td className="px-4 py-3"><span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">{e.collected_at?new Date(e.collected_at).toLocaleDateString():"—"}</span></td>
                  <td className="px-4 py-3">
                    {isExpired?<span className="text-[10px] font-bold text-red-400 font-mono">EXPIRED</span>:
                     days!==null?<span className="text-[10px] font-mono" style={{ color:expiringSoon?"#d97706":"#10b981" }}>{expiringSoon&&<AlertTriangle className="w-3 h-3 inline mr-0.5"/>}{days}d</span>:
                     <span className="text-slate-600 text-[10px]">—</span>}
                  </td>
                  <td className="px-4 py-3">{e.auto_generated&&<span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color:"#6366f1",background:"rgba(99,102,241,0.15)" }}>AUTO</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded text-slate-500 hover:text-white transition-colors" style={{ background:"#1e293b",border:"1px solid #30363d" }}><Eye className="w-3 h-3" /></button>
                      <button className="p-1.5 rounded text-slate-500 hover:text-white transition-colors" style={{ background:"#1e293b",border:"1px solid #30363d" }}><Download className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length===0&&(
          <div className="py-14 text-center" style={{ background:"#0d1117" }}>
            <FolderOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No evidence records found</p>
            <button onClick={()=>setShowModal(true)} className="mt-3 text-xs text-indigo-400 hover:underline">Add first evidence item</button>
          </div>
        )}
      </div>
      {totalPages>1&&(
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 font-mono">Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}</p>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white disabled:opacity-30" style={{ background:"#161b22",border:"1px solid #30363d" }}>← Prev</button>
            <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white disabled:opacity-30" style={{ background:"#161b22",border:"1px solid #30363d" }}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}