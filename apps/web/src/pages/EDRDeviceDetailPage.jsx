import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Shield, AlertTriangle, Clock, Network, FileText, Activity, Terminal, Trash2, RefreshCw, Download, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

const SEVERITY_COLORS = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  info: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function EDRDeviceDetailPage() {
  const { device_id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("alerts");
  const [expandedAlert, setExpandedAlert] = useState(null);

  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: ["edr-device", device_id],
    queryFn: async () => {
      try {
        const all = await base44.entities.DeviceAgent.list();
        return all.find(d => d.id === device_id) || null;
      } catch {
        return null;
      }
    },
  });

  const { data: threats = [] } = useQuery({
    queryKey: ["edr-device-threats", device_id],
    queryFn: async () => {
      try {
        const all = await base44.entities.RuntimeThreat.list("-detected_at", 100);
        return all.filter(t => t.device_id === device_id || t.device_name === device?.device_name);
      } catch {
        return [];
      }
    },
    enabled: !!device,
  });

  const getTimeAgo = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatus = () => {
    if (!device?.last_heartbeat) return "offline";
    const lastSeen = new Date(device.last_heartbeat);
    const now = new Date();
    const diffMins = (now - lastSeen) / 60000;
    if (diffMins < 5) return "active";
    if (diffMins < 60) return "stale";
    return "offline";
  };

  const stats = {
    total: threats.length,
    critical: threats.filter(t => t.severity === "critical").length,
    high: threats.filter(t => t.severity === "high").length,
    medium: threats.filter(t => t.severity === "medium").length,
  };

  if (deviceLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-slate-800 rounded" />
          <div className="h-32 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <div className="text-white font-medium mb-2">Device not found</div>
          <div className="text-slate-400 text-sm mb-4">This device does not exist or has been removed</div>
          <Button onClick={() => navigate("/edr")}>← Back to EDR</Button>
        </div>
      </div>
    );
  }

  const status = getStatus();

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/edr")}>
                ← Back
              </Button>
              <h1 className="text-2xl font-bold text-white">{device.device_name}</h1>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                {device.os}
              </Badge>
              <Badge className={`${
                status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                status === "stale" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                "bg-red-500/20 text-red-400 border-red-500/30"
              }`}>
                {status}
              </Badge>
            </div>
            <p className="text-slate-400 text-sm">
              Last seen: {getTimeAgo(device.last_heartbeat)} • {device.username} {device.team && `• ${device.team}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reinstall Agent
            </Button>
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Device
            </Button>
          </div>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Total Alerts</div>
              <div className="text-3xl font-bold text-white">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Critical</div>
              <div className="text-3xl font-bold text-red-400">{stats.critical}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Agent Version</div>
              <div className="text-3xl font-bold text-emerald-400">{device.agent_version || "1.2.0"}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Risk Score</div>
              <div className="text-3xl font-bold text-amber-400">{device.risk_score || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="alerts" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
              Alert History
            </TabsTrigger>
            <TabsTrigger value="processes" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              Process Timeline
            </TabsTrigger>
            <TabsTrigger value="network" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              Network Activity
            </TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
              File Events
            </TabsTrigger>
            <TabsTrigger value="info" className="data-[state=active]:bg-slate-500/20 data-[state=active]:text-slate-400">
              Device Info
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Alert History */}
          <TabsContent value="alerts" className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm">Alert History</CardTitle>
                  <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {threats.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <div className="text-white font-medium mb-1">No alerts</div>
                    <div className="text-slate-400 text-sm">This device has no security alerts</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {threats.map((threat) => (
                      <div
                        key={threat.id}
                        className="p-4 rounded-lg bg-slate-800/30 border border-slate-700"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              threat.severity === "critical" ? "bg-red-500" :
                              threat.severity === "high" ? "bg-orange-500" :
                              "bg-yellow-500"
                            }`} />
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-medium">{threat.rule_name}</span>
                                <Badge className={`${SEVERITY_COLORS[threat.severity]} text-xs`}>
                                  {threat.severity}
                                </Badge>
                              </div>
                              <div className="text-xs text-slate-400">
                                {getTimeAgo(threat.detected_at)} • {threat.threat_type}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedAlert(expandedAlert === threat.id ? null : threat.id)}
                          >
                            {expandedAlert === threat.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                        {expandedAlert === threat.id && (
                          <div className="mt-4 p-4 rounded-lg bg-slate-950 border border-slate-800">
                            <pre className="text-emerald-400 font-mono text-xs overflow-auto max-h-64">
                              {JSON.stringify(threat, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Process Timeline */}
          <TabsContent value="processes">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white text-sm">Process Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Terminal className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <div className="text-white font-medium mb-1">Process timeline coming soon</div>
                  <div className="text-slate-400 text-sm">Chronological process tree visualization will be available in the next release</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Network Activity */}
          <TabsContent value="network">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white text-sm">Network Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Network className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <div className="text-white font-medium mb-1">Network activity coming soon</div>
                  <div className="text-slate-400 text-sm">Real-time network connection monitoring will be available soon</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: File Events */}
          <TabsContent value="files">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white text-sm">File Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <div className="text-white font-medium mb-1">File events coming soon</div>
                  <div className="text-slate-400 text-sm">Critical file operation monitoring will be available soon</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Device Info */}
          <TabsContent value="info" className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white text-sm">Device Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Device ID</div>
                    <div className="text-white font-mono text-sm">{device.id}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Hostname</div>
                    <div className="text-white font-mono text-sm">{device.device_name}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">OS</div>
                    <div className="text-white">{device.os}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Username</div>
                    <div className="text-white">{device.username}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Team</div>
                    <div className="text-white">{device.team || "—"}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Agent Version</div>
                    <div className="text-white">{device.agent_version || "1.2.0"}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Registered At</div>
                    <div className="text-white">{new Date(device.registered_at).toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Last Heartbeat</div>
                    <div className="text-white">{getTimeAgo(device.last_heartbeat)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}