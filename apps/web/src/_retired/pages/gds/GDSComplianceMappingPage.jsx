import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Link, Shield, CheckCircle, AlertTriangle, FileText, 
  TrendingUp, Calendar, User, Search, Filter, BarChart3
} from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, SevBadge, timeAgo
} from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";

export default function GDSComplianceMappingPage() {
  const qc = useQueryClient();
  const [frameworkFilter, setFrameworkFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [showBulkMapModal, setShowBulkMapModal] = useState(false);

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ["vuln-compliance-mappings"],
    queryFn: () => base44.entities.VulnerabilityComplianceMapping.list("-mapped_date", 500).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["open-findings-for-mapping"],
    queryFn: () => base44.entities.Finding.filter({ status: { $in: ['open', 'confirmed'] } }).catch(() => []),
  });

  const bulkMapMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('gdsMapVulnerabilitiesToCompliance', { autoMapAll: true });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["vuln-compliance-mappings"]);
      setShowBulkMapModal(false);
    },
  });

  const confirmMappingMutation = useMutation({
    mutationFn: async ({ id, notes }) => {
      return await base44.entities.VulnerabilityComplianceMapping.update(id, {
        is_mapped: true,
        last_reviewed: new Date().toISOString(),
        reviewed_by: 'manual',
        notes: notes || 'Manually reviewed and confirmed',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(["vuln-compliance-mappings"]);
      setSelectedMapping(null);
    },
  });

  const filteredMappings = mappings.filter(m => {
    const matchFramework = frameworkFilter === "all" || m.framework === frameworkFilter;
    const matchConfidence = confidenceFilter === "all" || m.mapping_confidence === confidenceFilter;
    const matchSearch = !searchTerm || 
      m.finding_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.control_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.control_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFramework && matchConfidence && matchSearch;
  });

  const stats = {
    total: mappings.length,
    soc2: mappings.filter(m => m.framework === 'soc2' || m.framework === 'both').length,
    iso27001: mappings.filter(m => m.framework === 'iso27001' || m.framework === 'both').length,
    confirmed: mappings.filter(m => m.is_mapped).length,
    pending: mappings.filter(m => !m.is_mapped).length,
    highConfidence: mappings.filter(m => m.mapping_confidence === 'high').length,
  };

  const unmappedFindings = findings.filter(f => 
    !mappings.some(m => m.finding_id === f.id)
  );

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Compliance Mapping" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40` }}>
            <Link className="w-6 h-6" style={{ color: CYAN }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Vulnerability to Compliance Mapping</h1>
            <p className="text-sm mt-1" style={{ color: MUTED }}>Automatically map security findings to SOC 2 and ISO 27001 controls</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={async () => {
              try {
                const response = await base44.functions.invoke('gdsExportComplianceReport', {});
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `GDS_Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf`;
                link.click();
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Export failed:', error);
              }
            }}
            className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
            style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}
          >
            <Download className="w-4 h-4" />
            Export PDF Report
          </Button>
          <Button
            onClick={() => setShowBulkMapModal(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
          >
            <Shield className="w-4 h-4" />
            Auto-Map All Findings
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Mappings</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: CYAN }}>SOC 2</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.soc2}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: HIGH }}>ISO 27001</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{stats.iso27001}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: LOW }}>Confirmed</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.confirmed}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MEDIUM }}>Pending Review</p>
          <p className="text-2xl font-black font-mono" style={{ color: MEDIUM }}>{stats.pending}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: CYAN }}>High Confidence</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.highConfidence}</p>
        </Card>
      </div>

      {/* Unmapped Findings Alert */}
      {unmappedFindings.length > 0 && (
        <Card className="p-4 border-l-4" style={{ background: `${HIGH}08`, borderLeftColor: HIGH, border: `1px solid ${HIGH}30` }}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: HIGH }} />
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: HIGH }}>
                {unmappedFindings.length} {unmappedFindings.length === 1 ? 'finding' : 'findings'} not yet mapped
              </p>
              <p className="text-[10px]" style={{ color: MUTED }}>
                Click "Auto-Map All Findings" to create compliance mappings
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search findings or controls..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>
        <select
          value={frameworkFilter}
          onChange={e => setFrameworkFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
        >
          <option value="all">All Frameworks</option>
          <option value="soc2">SOC 2</option>
          <option value="iso27001">ISO 27001</option>
          <option value="both">Both</option>
        </select>
        <select
          value={confidenceFilter}
          onChange={e => setConfidenceFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
        >
          <option value="all">All Confidence</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Mappings Table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Compliance Mappings</h3>
          <BarChart3 className="w-4 h-4" style={{ color: MUTED }} />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
            ))}
          </div>
        ) : filteredMappings.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: MUTED }} />
            <p className="text-sm font-bold" style={{ color: MUTED }}>No mappings found</p>
            <p className="text-[10px]" style={{ color: MUTED }}>Auto-map findings to create compliance mappings</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Finding", "Severity", "Framework", "Control", "Category", "Confidence", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMappings.map(mapping => (
                  <tr key={mapping.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <p className="text-sm font-semibold text-white max-w-xs truncate">{mapping.finding_title}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{timeAgo(mapping.mapped_date)}</p>
                    </td>
                    <td className="py-3 px-3">
                      <SevBadge sev={mapping.finding_severity} />
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        mapping.framework === 'soc2' ? 'bg-blue-400/15 text-blue-400' :
                        mapping.framework === 'iso27001' ? 'bg-orange-400/15 text-orange-400' :
                        'bg-purple-400/15 text-purple-400'
                      }`}>
                        {mapping.framework === 'soc2' ? 'SOC 2' : mapping.framework === 'iso27001' ? 'ISO 27001' : 'Both'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div>
                        <p className="text-xs font-mono" style={{ color: CYAN }}>{mapping.control_id}</p>
                        <p className="text-[10px] truncate max-w-[150px]" style={{ color: TEXT }}>{mapping.control_name}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px]" style={{ color: MUTED }}>{mapping.control_category}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        mapping.mapping_confidence === 'high' ? 'bg-green-400/15 text-green-400' :
                        mapping.mapping_confidence === 'medium' ? 'bg-yellow-400/15 text-yellow-400' :
                        'bg-red-400/15 text-red-400'
                      }`}>
                        {mapping.mapping_confidence}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {mapping.is_mapped ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: LOW }}>
                          <CheckCircle className="w-3 h-3" />
                          Confirmed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: MEDIUM }}>
                          <AlertTriangle className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => setSelectedMapping(mapping)}
                        className="px-3 py-1 rounded-lg text-[10px] font-bold transition-all"
                        style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Review Mapping Modal */}
      {selectedMapping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-2xl p-6" style={{ background: "#0a1628" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Review Compliance Mapping</h3>
              <button onClick={() => setSelectedMapping(null)} className="text-slate-400 hover:text-white">
                <span className="text-xl">×</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Finding</p>
                  <p className="text-sm font-semibold text-white">{selectedMapping.finding_title}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Severity</p>
                  <SevBadge sev={selectedMapping.finding_severity} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Framework</p>
                  <span className="text-sm font-bold" style={{ color: CYAN }}>
                    {selectedMapping.framework === 'soc2' ? 'SOC 2' : selectedMapping.framework === 'iso27001' ? 'ISO 27001' : 'Both'}
                  </span>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Control</p>
                  <p className="text-sm font-mono" style={{ color: CYAN }}>{selectedMapping.control_id}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Control Name</p>
                  <p className="text-sm text-white">{selectedMapping.control_name}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Category</p>
                  <p className="text-sm" style={{ color: TEXT }}>{selectedMapping.control_category}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Mapping Rationale</p>
                <p className="text-sm" style={{ color: TEXT }}>{selectedMapping.mapping_rationale}</p>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Compliance Impact</p>
                <p className="text-sm" style={{ color: TEXT }}>{selectedMapping.remediation_impact}</p>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: selectedMapping.is_mapped ? `${LOW}08` : `${MEDIUM}08` }}>
                {selectedMapping.is_mapped ? (
                  <CheckCircle className="w-5 h-5" style={{ color: LOW }} />
                ) : (
                  <AlertTriangle className="w-5 h-5" style={{ color: MEDIUM }} />
                )}
                <div>
                  <p className="text-xs font-bold" style={{ color: selectedMapping.is_mapped ? LOW : MEDIUM }}>
                    {selectedMapping.is_mapped ? 'Mapping Confirmed' : 'Pending Review'}
                  </p>
                  <p className="text-[10px]" style={{ color: MUTED }}>
                    Mapped {timeAgo(selectedMapping.mapped_date)} by {selectedMapping.mapped_by}
                  </p>
                </div>
              </div>

              {!selectedMapping.is_mapped && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setSelectedMapping(null)}
                    className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => confirmMappingMutation.mutate({ id: selectedMapping.id })}
                    disabled={confirmMappingMutation.isPending}
                    className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                    style={{
                      background: `${CYAN}15`,
                      border: `1px solid ${CYAN}40`,
                      color: CYAN,
                      opacity: confirmMappingMutation.isPending ? 0.7 : 1
                    }}
                  >
                    {confirmMappingMutation.isPending ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Confirm Mapping
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Bulk Map Modal */}
      {showBulkMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-lg p-6" style={{ background: "#0a1628" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Auto-Map All Findings</h3>
              <button onClick={() => setShowBulkMapModal(false)} className="text-slate-400 hover:text-white">
                <span className="text-xl">×</span>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm" style={{ color: TEXT }}>
                This will automatically map all {unmappedFindings.length} open findings to relevant SOC 2 and ISO 27001 controls.
              </p>
              
              <div className="p-3 rounded-xl" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}30` }}>
                <p className="text-xs font-bold mb-2" style={{ color: CYAN }}>Mapping Process:</p>
                <ul className="text-[10px] space-y-1" style={{ color: MUTED }}>
                  <li>• Analyze finding titles for vulnerability patterns</li>
                  <li>• Match to SOC 2 Trust Services Criteria</li>
                  <li>• Match to ISO 27001 Annex A controls</li>
                  <li>• Assign confidence scores based on pattern strength</li>
                  <li>• Generate compliance impact rationale</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowBulkMapModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => bulkMapMutation.mutate()}
                  disabled={bulkMapMutation.isPending || unmappedFindings.length === 0}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: (unmappedFindings.length > 0 && !bulkMapMutation.isPending) ? `${CYAN}15` : "rgba(255,255,255,0.1)",
                    border: `1px solid ${CYAN}40`,
                    color: (unmappedFindings.length > 0 && !bulkMapMutation.isPending) ? CYAN : MUTED,
                    opacity: (unmappedFindings.length > 0 && !bulkMapMutation.isPending) ? 1 : 0.5
                  }}
                >
                  {bulkMapMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: CYAN }} />
                      Mapping...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Create Mappings
                    </>
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}