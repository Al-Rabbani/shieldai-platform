import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, Clock, FileText, Download, Mail, Plus, Edit, Trash2, Play, CheckCircle, XCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState } from "@/components/gds/GDSOSShared";

const FRAMEWORK_COLORS = {
  soc2: "#3b82f6",
  iso27001: "#10b981",
  gdpr: "#8b5cf6",
  hipaa: "#f59e0b",
  pci_dss: "#ef4444",
  custom: "#64748b"
};

export default function GDSComplianceSchedulingPage() {
  const qc = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [newSchedule, setNewSchedule] = useState({
    report_name: "",
    framework: "soc2",
    schedule_type: "monthly",
    day_of_month: 1,
    time_utc: "09:00",
    recipients: "",
    export_format: "pdf",
    include_evidence: true,
    include_remediation_plan: true
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["compliance-schedules"],
    queryFn: () => base44.functions.invoke("gdsRiskCorrelation", { action: "get_schedules" }).then(r => r.data?.schedules || []),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: async (scheduleData) => {
      const payload = {
        ...scheduleData,
        recipients: scheduleData.recipients.split(',').map(r => r.trim()).filter(Boolean)
      };
      return await base44.functions.invoke("gdsRiskCorrelation", { action: "create_schedule", ...payload });
    },
    onSuccess: () => {
      qc.invalidateQueries(["compliance-schedules"]);
      setShowCreateModal(false);
      setNewSchedule({
        report_name: "",
        framework: "soc2",
        schedule_type: "monthly",
        day_of_month: 1,
        time_utc: "09:00",
        recipients: "",
        export_format: "pdf",
        include_evidence: true,
        include_remediation_plan: true
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (schedule_id) => {
      return await base44.functions.invoke("gdsRiskCorrelation", { action: "delete_schedule", schedule_id });
    },
    onSuccess: () => {
      qc.invalidateQueries(["compliance-schedules"]);
      setSelectedSchedule(null);
    }
  });

  const generateMutation = useMutation({
    mutationFn: async (schedule_id) => {
      return await base44.functions.invoke("gdsRiskCorrelation", { action: "generate_report", schedule_id });
    },
    onSuccess: () => {
      qc.invalidateQueries(["compliance-schedules"]);
    }
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ schedule_id, enabled }) => {
      return await base44.functions.invoke("gdsRiskCorrelation", { action: "update_schedule", schedule_id, enabled });
    },
    onSuccess: () => {
      qc.invalidateQueries(["compliance-schedules"]);
    }
  });

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Compliance Report Scheduling</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Automate SOC 2, ISO 27001, and compliance status reports</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-4 h-4" />
          New Schedule
        </button>
      </div>

      {/* Schedules Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : schedules?.length === 0 ? (
        <EmptyState icon={Calendar} title="No schedules" description="Create your first automated compliance report schedule" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map(schedule => {
            const frameworkColor = FRAMEWORK_COLORS[schedule.framework] || MUTED;
            return (
              <Card key={schedule.id} className="p-5" glow>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" style={{ color: frameworkColor }} />
                    <div>
                      <p className="text-sm font-bold text-white">{schedule.report_name}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{schedule.framework.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${schedule.enabled ? 'animate-pulse' : ''}`} style={{ background: schedule.enabled ? LOW : MUTED }} />
                </div>

                <div className="space-y-3 text-xs mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" style={{ color: MUTED }} />
                    <span style={{ color: TEXT }}>
                      {schedule.schedule_type === 'monthly' && `Day ${schedule.day_of_month} at ${schedule.time_utc} UTC`}
                      {schedule.schedule_type === 'weekly' && `Every ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][schedule.day_of_week || 1]} at ${schedule.time_utc} UTC`}
                      {schedule.schedule_type === 'quarterly' && `Quarterly at ${schedule.time_utc} UTC`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" style={{ color: MUTED }} />
                    <span className="truncate" style={{ color: TEXT }}>{schedule.recipients?.length || 0} recipients</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5" style={{ color: MUTED }} />
                    <span style={{ color: TEXT }}>{schedule.export_format?.toUpperCase() || 'PDF'}</span>
                  </div>
                  {schedule.last_run && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} />
                      <span style={{ color: MUTED }}>Last run: {new Date(schedule.last_run).toLocaleDateString()}</span>
                    </div>
                  )}
                  {schedule.next_run && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" style={{ color: CYAN }} />
                      <span style={{ color: CYAN }}>Next: {new Date(schedule.next_run).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: BORDER }}>
                  <button
                    onClick={() => generateMutation.mutate(schedule.id)}
                    disabled={generateMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all hover:opacity-80 disabled:opacity-50"
                    style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                    <Play className="w-3.5 h-3.5" />
                    Run Now
                  </button>
                  <button
                    onClick={() => toggleScheduleMutation.mutate({ schedule_id: schedule.id, enabled: !schedule.enabled })}
                    className="px-3 py-2 rounded-lg text-[11px] font-bold transition-all"
                    style={{ background: schedule.enabled ? `${LOW}15` : "rgba(255,255,255,0.04)", border: `1px solid ${schedule.enabled ? LOW + "30" : BORDER}`, color: schedule.enabled ? LOW : MUTED }}>
                    {schedule.enabled ? "Active" : "Paused"}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(schedule.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 transition-all"
                    style={{ color: DANGER }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Create Report Schedule</h2>
                <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>Automate compliance status reporting</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Report Name</label>
                <input
                  value={newSchedule.report_name}
                  onChange={e => setNewSchedule({ ...newSchedule, report_name: e.target.value })}
                  placeholder="e.g., Monthly SOC 2 Status Report"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </div>

              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Framework</label>
                <select
                  value={newSchedule.framework}
                  onChange={e => setNewSchedule({ ...newSchedule, framework: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  <option value="soc2">SOC 2</option>
                  <option value="iso27001">ISO 27001</option>
                  <option value="gdpr">GDPR</option>
                  <option value="hipaa">HIPAA</option>
                  <option value="pci_dss">PCI DSS</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Frequency</label>
                  <select
                    value={newSchedule.schedule_type}
                    onChange={e => setNewSchedule({ ...newSchedule, schedule_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
                {newSchedule.schedule_type === 'monthly' && (
                  <div>
                    <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Day of Month</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={newSchedule.day_of_month}
                      onChange={e => setNewSchedule({ ...newSchedule, day_of_month: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                      style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Time (UTC)</label>
                <input
                  type="time"
                  value={newSchedule.time_utc}
                  onChange={e => setNewSchedule({ ...newSchedule, time_utc: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </div>

              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Recipients (comma-separated emails)</label>
                <input
                  value={newSchedule.recipients}
                  onChange={e => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
                  placeholder="compliance@company.com, security@company.com"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </div>

              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Export Format</label>
                <select
                  value={newSchedule.export_format}
                  onChange={e => setNewSchedule({ ...newSchedule, export_format: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  <option value="pdf">PDF</option>
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="html">HTML</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
                  <input
                    type="checkbox"
                    checked={newSchedule.include_evidence}
                    onChange={e => setNewSchedule({ ...newSchedule, include_evidence: e.target.checked })}
                    className="rounded"
                    style={{ accentColor: CYAN }}
                  />
                  Include Evidence Packs
                </label>
                <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
                  <input
                    type="checkbox"
                    checked={newSchedule.include_remediation_plan}
                    onChange={e => setNewSchedule({ ...newSchedule, include_remediation_plan: e.target.checked })}
                    className="rounded"
                    style={{ accentColor: CYAN }}
                  />
                  Include Remediation Plan
                </label>
              </div>

              <button
                onClick={() => createMutation.mutate(newSchedule)}
                disabled={createMutation.isPending || !newSchedule.report_name}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                {createMutation.isPending ? "Creating..." : "Create Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}