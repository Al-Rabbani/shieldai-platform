import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Smartphone, Server, Bot, CheckCircle, XCircle, AlertTriangle, Flame, Plus, Shield, Activity } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

const SCORE_GRADE_COLORS = {
  A: LOW,
  B: "#14b8a6",
  C: MEDIUM,
  D: HIGH,
  F: DANGER
};

export default function GDSZeroTrustDevicesPage() {
  const qc = useQueryClient();
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [deviceForm, setDeviceForm] = useState({
    device_name: '',
    device_type: 'laptop',
    os_name: 'Windows',
    os_version: '',
    user_id: '',
    hardware_id: '',
    is_managed: false,
    is_encrypted: false,
    antivirus_active: false,
    os_patched: false,
    screen_lock_enabled: false
  });

  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ["zero-trust-devices"],
    queryFn: () => base44.entities.DeviceTrustRecord.list('-created_date', 50).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ["zero-trust-services"],
    queryFn: () => base44.entities.ServiceTrustRecord.list('-created_date', 50).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ["zero-trust-agents"],
    queryFn: () => base44.entities.AgentTrustRecord.list('-created_date', 50).catch(() => []),
    refetchInterval: 30000,
  });

  const registerMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsZeroTrustPlatform", { action: "register_device", ...data }),
    onSuccess: () => {
      qc.invalidateQueries(["zero-trust-devices"]);
      setShowDeviceModal(false);
      alert("✅ Device registered successfully!");
    },
    onError: (err) => alert("Failed: " + err.message)
  });

  const handleSubmit = () => {
    registerMutation.mutate({
      ...deviceForm,
      trust_score: Math.floor(Math.random() * 40) + 60
    });
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Device & Service Trust Registry" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Device & Service Trust Registry</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Device posture scoring, service identity, agent trust</p>
          </div>
        </div>
        <button onClick={() => setShowDeviceModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-4 h-4" />
          Register Device
        </button>
      </div>

      {/* SECTION 1: Devices */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Smartphone className="w-5 h-5" style={{ color: CYAN }} />
          <h2 className="text-lg font-black text-white">Devices</h2>
        </div>
        {devicesLoading ? <Skeleton lines={4} /> : devices?.length === 0 ? (
          <EmptyState icon={Smartphone} title="No devices" description="Register devices to see posture scores" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device, i) => {
              const scoreColor = SCORE_GRADE_COLORS[device.trust_grade] || MUTED;
              return (
                <Card key={device.id} className="p-4" glow>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">{device.device_name}</h3>
                      <p className="text-[10px]" style={{ color: MUTED }}>{device.os_name} {device.os_version}</p>
                    </div>
                    <div className={`text-[10px] px-2 py-0.5 rounded capitalize ${device.status === 'trusted' ? 'text-green-400' : device.status === 'quarantined' ? 'text-red-400' : 'text-amber-400'}`} style={{ background: "rgba(255,255,255,0.04)" }}>
                      {device.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${scoreColor}15`, border: `2px solid ${scoreColor}` }}>
                      <span className="text-lg font-black" style={{ color: scoreColor }}>{device.trust_grade || 'C'}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Trust Score</div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${device.trust_score || 0}%`, background: scoreColor }} />
                      </div>
                      <div className="text-[10px] font-bold mt-1" style={{ color: scoreColor }}>{device.trust_score || 0}/100</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {device.is_managed && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>Managed</span>}
                    {device.is_encrypted && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: LOW, background: `${LOW}15`, border: `1px solid ${LOW}30` }}>Encrypted</span>}
                    {device.antivirus_active && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: "#14b8a6", background: `${LOW}15`, border: `1px solid ${LOW}30` }}>AV Active</span>}
                    {device.os_patched && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: MEDIUM, background: `${MEDIUM}15`, border: `1px solid ${MEDIUM}30` }}>Patched</span>}
                    {device.screen_lock_enabled && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>Lock</span>}
                  </div>
                  {(device.risk_flags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {device.risk_flags.slice(0, 3).map((flag, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>{flag}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-[9px]" style={{ color: MUTED }}>
                    User: {device.user_id || '—'} · Last seen: {device.last_seen ? new Date(device.last_seen).toLocaleDateString() : '—'}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Services */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Server className="w-5 h-5" style={{ color: CYAN }} />
          <h2 className="text-lg font-black text-white">Services</h2>
        </div>
        {servicesLoading ? <Skeleton lines={4} /> : services?.length === 0 ? (
          <EmptyState icon={Server} title="No services" description="Service trust records will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Service", "Type", "Endpoint", "Validation", "mTLS", "Certificate", "Trust Score", "Anomaly", "Failed Calls", "Status"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {services.map((service, i) => {
                  const scoreColor = service.trust_score >= 75 ? LOW : service.trust_score >= 50 ? MEDIUM : DANGER;
                  return (
                    <tr key={service.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-bold text-white">{service.service_name}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: TEXT, background: "rgba(255,255,255,0.04)" }}>{service.service_type}</span>
                      </td>
                      <td className="py-2 px-3 text-[10px] font-mono truncate max-w-[200px]" style={{ color: MUTED }}>{service.endpoint_url}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{service.validation_method}</span>
                      </td>
                      <td className="py-2 px-3">
                        {service.mtls_enabled ? <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: MUTED }} />}
                      </td>
                      <td className="py-2 px-3">
                        {service.certificate_valid ? <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: DANGER }} />}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${service.trust_score}%`, background: scoreColor }} />
                          </div>
                          <span className="text-[9px] font-bold" style={{ color: scoreColor }}>{service.trust_score}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {service.anomaly_detected ? <Flame className="w-3.5 h-3.5" style={{ color: DANGER }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: service.failed_calls_24h > 0 ? HIGH : MUTED }}>{service.failed_calls_24h || 0}</td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${service.status === 'trusted' ? 'text-green-400' : service.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}`} style={{ background: "rgba(255,255,255,0.04)" }}>
                          {service.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 3: Agent Trust */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Bot className="w-5 h-5" style={{ color: CYAN }} />
          <h2 className="text-lg font-black text-white">Agent Trust</h2>
        </div>
        {agentsLoading ? <Skeleton lines={4} /> : agents?.length === 0 ? (
          <EmptyState icon={Bot} title="No agents" description="Agent trust records will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Agent", "Type", "Trust Score", "Grade", "Runtime", "Capabilities", "Permissions", "Policy", "Failures", "Anomaly", "Executions", "Status"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((agent, i) => {
                  const scoreColor = SCORE_GRADE_COLORS[agent.trust_grade] || MUTED;
                  return (
                    <tr key={agent.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-bold text-white">{agent.agent_name}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: TEXT, background: "rgba(255,255,255,0.04)" }}>{agent.agent_type}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${agent.trust_score}%`, background: scoreColor }} />
                          </div>
                          <span className="text-[9px] font-bold" style={{ color: scoreColor }}>{agent.trust_score}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-black" style={{ color: scoreColor, background: `${scoreColor}15`, border: `1px solid ${scoreColor}30` }}>{agent.trust_grade}</span>
                      </td>
                      <td className="py-2 px-3">
                        {agent.runtime_healthy ? <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: DANGER }} />}
                      </td>
                      <td className="py-2 px-3">
                        {agent.capabilities_verified ? <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: MUTED }} />}
                      </td>
                      <td className="py-2 px-3">
                        {agent.permissions_valid ? <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: DANGER }} />}
                      </td>
                      <td className="py-2 px-3">
                        {agent.policy_compliant ? <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: DANGER }} />}
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: agent.consecutive_failures > 0 ? HIGH : MUTED }}>{agent.consecutive_failures || 0}</td>
                      <td className="py-2 px-3">
                        {agent.anomaly_detected ? <Flame className="w-3.5 h-3.5" style={{ color: DANGER }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{agent.execution_count_24h || 0}</td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${agent.status === 'trusted' ? 'text-green-400' : agent.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}`} style={{ background: "rgba(255,255,255,0.04)" }}>
                          {agent.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Device Modal */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Register Device</h2>
              <button onClick={() => setShowDeviceModal(false)} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Device Name</label>
                  <input value={deviceForm.device_name} onChange={e => setDeviceForm({...deviceForm, device_name: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Device Type</label>
                  <select value={deviceForm.device_type} onChange={e => setDeviceForm({...deviceForm, device_type: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                    <option value="laptop">Laptop</option>
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                    <option value="tablet">Tablet</option>
                    <option value="server">Server</option>
                    <option value="iot">IoT</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>OS Name</label>
                  <input value={deviceForm.os_name} onChange={e => setDeviceForm({...deviceForm, os_name: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>OS Version</label>
                  <input value={deviceForm.os_version} onChange={e => setDeviceForm({...deviceForm, os_version: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>User ID</label>
                  <input value={deviceForm.user_id} onChange={e => setDeviceForm({...deviceForm, user_id: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Hardware ID</label>
                  <input value={deviceForm.hardware_id} onChange={e => setDeviceForm({...deviceForm, hardware_id: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
                  <input type="checkbox" checked={deviceForm.is_managed} onChange={e => setDeviceForm({...deviceForm, is_managed: e.target.checked})} />
                  <span>Managed</span>
                </label>
                <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
                  <input type="checkbox" checked={deviceForm.is_encrypted} onChange={e => setDeviceForm({...deviceForm, is_encrypted: e.target.checked})} />
                  <span>Encrypted</span>
                </label>
                <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
                  <input type="checkbox" checked={deviceForm.antivirus_active} onChange={e => setDeviceForm({...deviceForm, antivirus_active: e.target.checked})} />
                  <span>AV Active</span>
                </label>
                <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
                  <input type="checkbox" checked={deviceForm.os_patched} onChange={e => setDeviceForm({...deviceForm, os_patched: e.target.checked})} />
                  <span>OS Patched</span>
                </label>
                <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
                  <input type="checkbox" checked={deviceForm.screen_lock_enabled} onChange={e => setDeviceForm({...deviceForm, screen_lock_enabled: e.target.checked})} />
                  <span>Screen Lock</span>
                </label>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={registerMutation.isPending || !deviceForm.device_name || !deviceForm.user_id}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              {registerMutation.isPending ? "Registering..." : "Register Device"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}