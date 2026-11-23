import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Search, CheckCircle, XCircle, Clock } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

export default function GDSConnectorExecutionsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: executions, isLoading } = useQuery({
    queryKey: ["connector-executions"],
    queryFn: () => base44.entities.ConnectorExecution.filter({}, '-created_date', 100).catch(() => []),
    refetchInterval: 30000,
  });

  const filteredExecutions = executions?.filter(e =>
    e.connector_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.action?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: executions?.length || 0,
    success: executions?.filter(e => e.status === 'success').length || 0,
    failed: executions?.filter(e => e.status === 'failed').length || 0,
    avgResponseTime: executions?.filter(e => e.response_time_ms).length > 0 
      ? Math.round(executions?.filter(e => e.response_time_ms).reduce((sum, e) => sum + e.response_time_ms, 0) / executions?.filter(e => e.response_time_ms).length) 
      : 0
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Execution Log" }]} />

      <div className="flex items-start gap-3 mb-6">
        <Activity className="w-6 h-6" style={{ color: CYAN }} />
        <div>
          <h1 className="text-2xl font-black text-white">Connector Execution Log</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Monitor connector action history and performance</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Executions</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Successful</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.success}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Failed</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.failed}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Response</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.avgResponseTime}ms</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by connector name or action..."
            className="w-full pl-10 pr-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Recent Executions</h3>
        {isLoading ? (
          <Skeleton lines={8} />
        ) : filteredExecutions?.length === 0 ? (
          <EmptyState icon={Activity} title="No executions found" description="Connector executions will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Connector", "Action", "Status", "Response Time", "Executed By", "Timestamp"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredExecutions?.map(exec => (
                  <tr key={exec.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3">
                      <p className="text-sm font-bold text-white">{exec.connector_name}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{exec.connector_id}</p>
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{exec.action}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        {exec.status === 'success' ? (
                          <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} />
                        ) : exec.status === 'failed' ? (
                          <XCircle className="w-3.5 h-3.5" style={{ color: DANGER }} />
                        ) : (
                          <Clock className="w-3.5 h-3.5" style={{ color: CYAN }} />
                        )}
                        <span className={`text-[10px] capitalize ${exec.status === 'success' ? 'text-green-400' : exec.status === 'failed' ? 'text-red-400' : 'text-cyan-400'}`}>{exec.status}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{exec.response_time_ms ? `${exec.response_time_ms}ms` : '—'}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: MUTED }}>{exec.executed_by || 'system'}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(exec.created_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}