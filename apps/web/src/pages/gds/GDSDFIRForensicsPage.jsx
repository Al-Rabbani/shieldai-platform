import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Folder, FileText, Shield, Lock, Database, HardDrive, Users, Phone } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const EVIDENCE_TYPE_COLORS = {
  log_entry: "#3b82f6", memory_dump: "#a855f7", disk_image: "#10b981", pcap: "#f97316",
  screenshot: CYAN, email: "#eab308", document: MEDIUM, ioc_match: DANGER,
  malware_sample: DANGER, registry_key: "#a855f7", process_dump: "#f97316",
  network_flow: "#3b82f6", other: MUTED
};

export default function GDSDFIRForensicsPage() {
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const { data: evidence = [], isLoading: loadE } = useQuery({
    queryKey: ["dfir-evidence"],
    queryFn: () => base44.entities.IncidentEvidence.list("-collected_at", 200).catch(() => []),
  });

  const { data: teams = [], isLoading: loadT } = useQuery({
    queryKey: ["dfir-teams"],
    queryFn: () => base44.entities.ResponseTeam.list("-assembled_at", 50).catch(() => []),
  });

  const stats = {
    total: evidence.length,
    chainOfCustody: evidence.filter(e => e.chain_of_custody).length,
    memoryDumps: evidence.filter(e => e.evidence_type === "memory_dump").length,
    logFiles: evidence.filter(e => e.evidence_type === "log_entry").length,
    iocMatches: evidence.filter(e => e.evidence_type === "ioc_match").length
  };

  const evidenceTypes = [...new Set(evidence.map(e => e.evidence_type).filter(Boolean))];

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Incident Response", path: "/dfir" }, { label: "Digital Forensics" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Folder className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Digital Forensics Evidence Center</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Evidence collection and chain of custody</p>
          </div>
        </div>
      </div>

      {/* Evidence Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Evidence</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Chain of Custody</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.chainOfCustody}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Memory Dumps</p>
          <p className="text-2xl font-black font-mono" style={{ color: "#a855f7" }}>{stats.memoryDumps}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Log Files</p>
          <p className="text-2xl font-black font-mono" style={{ color: "#3b82f6" }}>{stats.logFiles}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>IOC Matches</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.iocMatches}</p>
        </Card>
      </div>

      {/* Evidence Table */}
      <Card className="overflow-hidden">
        {loadE ? <Skeleton lines={10} /> : evidence.length === 0 ? (
          <EmptyState icon={Folder} title="No evidence" description="Digital forensics evidence will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Title", "Type", "Source System", "Collected By", "Collected At", "Chain of Custody", "Sensitive", "Hash", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evidence.map((ev) => {
                  const typeColor = EVIDENCE_TYPE_COLORS[ev.evidence_type] || EVIDENCE_TYPE_COLORS.other;
                  return (
                    <tr key={ev.id} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5 cursor-pointer" onClick={() => setSelectedEvidence(ev)}>
                      <td className="py-3 px-4">
                        <p className="text-xs font-semibold text-white max-w-xs truncate">{ev.title}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${typeColor}15`, color: typeColor }}>{ev.evidence_type?.replace(/_/g, " ") || "UNKNOWN"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{ev.source_system || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{ev.collected_by_name || ev.collected_by || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: MUTED }}>{timeAgo(ev.collected_at)}</p>
                      </td>
                      <td className="py-3 px-4">
                        {ev.chain_of_custody ? (
                          <div className="flex items-center gap-1">
                            <Lock className="w-3 h-3" style={{ color: LOW }} />
                            <span className="text-[10px] font-bold" style={{ color: LOW }}>Verified</span>
                          </div>
                        ) : (
                          <span className="text-[10px]" style={{ color: MUTED }}>No</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {ev.is_sensitive ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${HIGH}15`, color: HIGH }}>SENSITIVE</span>
                        ) : (
                          <span className="text-[10px]" style={{ color: MUTED }}>Standard</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-mono truncate max-w-[100px]" style={{ color: TEXT }}>{ev.content_hash || ev.file_hash ? `${(ev.content_hash || ev.file_hash).slice(0, 12)}...` : "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>View →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Response Teams History */}
      {teams.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Response Team History</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => (
              <Card key={team.id} className="p-4" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-white">{team.team_name}</p>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: TEAM_STATUS_COLORS[team.status], background: `${TEAM_STATUS_COLORS[team.status]}15` }}>{team.status}</span>
                </div>
                <div className="space-y-1 text-[10px]" style={{ color: MUTED }}>
                  <p>Commander: <span style={{ color: TEXT }}>{team.commander_name || team.commander}</span></p>
                  <p>Members: <span style={{ color: TEXT }}>{team.member_count || team.members?.length || 0}</span></p>
                  <p>Assembled: <span style={{ color: TEXT }}>{timeAgo(team.assembled_at)}</span></p>
                  {team.bridge_call_link && (
                    <a href={team.bridge_call_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 mt-2 px-2 py-1 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>
                      <Phone className="w-3 h-3" />
                      Join Bridge
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Evidence Detail Modal */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#0a1628" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedEvidence.title}</h3>
                <p className="text-[10px]" style={{ color: MUTED }}>{selectedEvidence.evidence_type?.replace(/_/g, " ")}</p>
              </div>
              <button onClick={() => setSelectedEvidence(null)} className="text-slate-400 hover:text-white"><span className="text-2xl">×</span></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Source System</p>
                <p className="text-sm" style={{ color: TEXT }}>{selectedEvidence.source_system || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Collected By</p>
                <p className="text-sm" style={{ color: TEXT }}>{selectedEvidence.collected_by_name || selectedEvidence.collected_by || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Collected At</p>
                <p className="text-sm" style={{ color: TEXT }}>{timeAgo(selectedEvidence.collected_at)}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Chain of Custody</p>
                <p className={`text-sm font-bold ${selectedEvidence.chain_of_custody ? 'text-green-400' : 'text-red-400'}`}>{selectedEvidence.chain_of_custody ? 'Verified' : 'Not Verified'}</p>
              </div>
            </div>
            {selectedEvidence.content_hash && (
              <div className="mb-4">
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Content Hash</p>
                <p className="text-xs font-mono" style={{ color: TEXT }}>{selectedEvidence.content_hash}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setSelectedEvidence(null)} className="flex-1 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Close</button>
              {selectedEvidence.file_url && (
                <a href={selectedEvidence.file_url} target="_blank" rel="noreferrer" className="flex-1 px-4 py-2 rounded-xl text-sm font-bold text-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>Download</a>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

const TEAM_STATUS_COLORS = { active: LOW, standby: MEDIUM, disbanded: MUTED };