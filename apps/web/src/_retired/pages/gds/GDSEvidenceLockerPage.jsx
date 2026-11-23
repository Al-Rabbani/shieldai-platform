import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Archive, FileText, Shield, Download, Upload, Search, Calendar, CheckCircle, Clock, Trash2, Eye, Tag, TrendingUp } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Area } from "recharts";

export default function GDSEvidenceLockerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFramework, setFilterFramework] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const { data: evidence, isLoading, refetch } = useQuery({
    queryKey: ["audit-evidence"],
    queryFn: () => base44.entities.AuditEvidence.filter({ status: 'active' }, '-created_date', 100).catch(() => []),
    refetchInterval: 60000,
  });

  const { data: monthlyTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ["compliance-monthly-trends"],
    queryFn: () => base44.functions.invoke("gdsEvidenceLocker", { action: 'get_monthly_trends' }).then(r => r.data.result.trends),
    refetchInterval: 300000,
  });

  const downloadMutation = useMutation({
    mutationFn: async ({ evidenceId, fileUrl }) => {
      await base44.entities.AuditEvidence.update(evidenceId, { 
        download_count: (evidence?.find(e => e.id === evidenceId)?.download_count || 0) + 1,
        last_accessed: new Date().toISOString()
      });
      
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = 'audit_evidence.pdf';
      link.click();
    },
  });

  const handleDownload = (evidenceItem) => {
    downloadMutation.mutate({ evidenceId: evidenceItem.id, fileUrl: evidenceItem.file_url });
  };

  const verifyMutation = useMutation({
    mutationFn: (evidenceId) => base44.functions.invoke("gdsEvidenceLocker", { action: 'verify_evidence', evidence_id: evidenceId }),
  });

  const handleVerify = async (evidenceId) => {
    await verifyMutation.mutateAsync(evidenceId);
    refetch();
  };

  const archiveMutation = useMutation({
    mutationFn: (evidenceId) => base44.functions.invoke("gdsEvidenceLocker", { action: 'archive_evidence', evidence_id: evidenceId }),
  });

  const handleArchive = async (evidenceId) => {
    await archiveMutation.mutateAsync(evidenceId);
    refetch();
  };

  // Filter evidence
  const filteredEvidence = evidence?.filter(item => {
    const matchesSearch = item.document_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFramework = filterFramework === 'all' || item.framework === filterFramework;
    const matchesType = filterType === 'all' || item.document_type === filterType;
    return matchesSearch && matchesFramework && matchesType;
  });

  const stats = {
    total: evidence?.length || 0,
    verified: evidence?.filter(e => e.verification_status === 'verified').length || 0,
    pending: evidence?.filter(e => e.verification_status === 'pending').length || 0,
    soc2: evidence?.filter(e => e.framework === 'SOC 2').length || 0,
    iso27001: evidence?.filter(e => e.framework === 'ISO 27001').length || 0
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Evidence Locker" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Archive className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Evidence Locker</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Centralized storage and indexing for SOC 2 & ISO 27001 audit PDFs</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Documents</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Verified</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.verified}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Pending Review</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{stats.pending}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>SOC 2</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.soc2}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>ISO 27001</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.iso27001}</p>
        </Card>
      </div>

      {/* Monthly Trends Chart */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Month-over-Month Security Posture Trends</h3>
        </div>
        {trendsLoading ? (
          <Skeleton lines={4} />
        ) : monthlyTrends?.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No trend data" description="Historical data will appear here" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" stroke={MUTED} fontSize={10} />
              <YAxis yAxisId="left" stroke={CYAN} fontSize={10} label={{ value: 'Compliance %', angle: -90, position: 'insideLeft', fill: CYAN, fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" stroke={DANGER} fontSize={10} label={{ value: 'Findings', angle: 90, position: 'insideRight', fill: DANGER, fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
                formatter={(value, name) => [value, name.replace('_', ' ').toUpperCase()]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
              <Area yAxisId="left" type="monotone" dataKey="compliance_rate" name="Compliance Rate" stroke={CYAN} fill={`${CYAN}20`} />
              <Line yAxisId="right" type="monotone" dataKey="critical_findings" name="Critical Findings" stroke={DANGER} strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="high_findings" name="High Findings" stroke={HIGH} strokeWidth={2} dot={{ r: 3 }} />
              <Bar yAxisId="right" dataKey="total_findings" name="Total Findings" fill={MUTED} opacity={0.3} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents, tags..."
              className="w-full pl-10 pr-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
          <select value={filterFramework} onChange={(e) => setFilterFramework(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Frameworks</option>
            <option value="SOC 2">SOC 2</option>
            <option value="ISO 27001">ISO 27001</option>
            <option value="NIST">NIST</option>
            <option value="General">General</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Types</option>
            <option value="compliance_report">Compliance Reports</option>
            <option value="audit_log">Audit Logs</option>
            <option value="executive_report">Executive Reports</option>
            <option value="risk_assessment">Risk Assessments</option>
          </select>
        </div>
      </Card>

      {/* Evidence List */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Stored Evidence</h3>
        {isLoading ? (
          <Skeleton lines={8} />
        ) : filteredEvidence?.length === 0 ? (
          <EmptyState icon={Archive} title="No evidence found" description="Upload or generate audit documents to store them here" />
        ) : (
          <div className="space-y-3">
            {filteredEvidence?.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                    <FileText className="w-5 h-5" style={{ color: CYAN }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-white truncate">{item.document_name}</p>
                      {item.verification_status === 'verified' && (
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: LOW }} />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{item.framework}</span>
                      <span style={{ color: MUTED }}>{item.document_type?.replace('_', ' ')}</span>
                      <span style={{ color: MUTED }}>• {timeAgo(item.created_date)}</span>
                      {item.tags?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" style={{ color: MUTED }} />
                          <span style={{ color: MUTED }}>{item.tags.slice(0, 3).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(item)}
                    className="p-2 rounded-lg transition-all"
                    style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {item.verification_status === 'pending' && (
                    <button
                      onClick={() => handleVerify(item.id)}
                      className="p-2 rounded-lg transition-all"
                      style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}
                      title="Verify"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleArchive(item.id)}
                    className="p-2 rounded-lg transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: MUTED }}
                    title="Archive"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}