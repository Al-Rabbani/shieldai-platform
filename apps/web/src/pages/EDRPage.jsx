import React, { useState, useEffect } from "react";
import { Shield, Plus, RefreshCw, AlertTriangle, Search, Filter, Download, Trash2, Eye, Terminal, FileText, Network, Settings, X, Check, Copy, ExternalLink, Link as LinkIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

const OS_ICONS = {
  windows: "🪟",
  linux: "🐧",
  macos: "🍎",
};

const OS_COLORS = {
  windows: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  linux: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  macos: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const SEVERITY_COLORS = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  info: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const SIGMA_RULES = [
  { name: "Suspicious PowerShell Execution", os: "Windows", severity: "high", category: "execution" },
  { name: "Process Injection via CreateRemoteThread", os: "Windows", severity: "critical", category: "defense_evasion" },
  { name: "eBPF Rootkit Indicators", os: "Linux", severity: "critical", category: "persistence" },
  { name: "Credential Dumping via /proc", os: "Linux", severity: "critical", category: "credential_access" },
  { name: "Reverse Shell Connection", os: "All", severity: "critical", category: "command_and_control" },
  { name: "Lateral Movement via SMB", os: "Windows", severity: "high", category: "lateral_movement" },
  { name: "Cryptominer Network Activity", os: "All", severity: "high", category: "impact" },
  { name: "Container Escape via nsenter", os: "Linux", severity: "critical", category: "privilege_escalation" },
];

export default function EDRPage() {
  const [activeTab, setActiveTab] = useState("devices");
  const [installPlatform, setInstallPlatform] = useState("linux");
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installScript, setInstallScript] = useState(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const queryClient = useQueryClient();

  // Fetch devices
  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useQuery({
    queryKey: ["edr-devices"],
    queryFn: async () => {
      try {
        return await base44.entities.DeviceAgent.list("-last_heartbeat", 100);
      } catch {
        return [];
      }
    },
    refetchInterval: 10000,
  });

  // Fetch threats
  const { data: threats = [], isLoading: threatsLoading, refetch: refetchThreats } = useQuery({
    queryKey: ["edr-threats"],
    queryFn: async () => {
      try {
        const all = await base44.entities.RuntimeThreat.list("-detected_at", 200);
        return all.filter(t => t.app_id?.startsWith("dev_"));
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
  });

  // Fetch API keys
  const { data: apiKeys = [] } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      try {
        return await base44.entities.ApiKey.list("-created_date", 10);
      } catch {
        return [];
      }
    },
  });

  // Fetch findings for correlation
  const { data: findings = [] } = useQuery({
    queryKey: ["triaged-findings"],
    queryFn: async () => {
      try {
        return await base44.entities.TriagedFinding.filter({ status: "open" }, "-created_at", 100);
      } catch {
        return [];
      }
    },
  });

  const getStatus = (device) => {
    if (!device.last_heartbeat) return "offline";
    const lastSeen = new Date(device.last_heartbeat);
    const now = new Date();
    const diffMins = (now - lastSeen) / 60000;
    if (diffMins < 5) return "active";
    if (diffMins < 60) return "stale";
    return "offline";
  };

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

  const stats = {
    total: devices.length,
    active: devices.filter(d => getStatus(d) === "active").length,
    threatsToday: threats.filter(t => {
      const today = new Date().toDateString();
      return new Date(t.detected_at).toDateString() === today;
    }).length,
    stale: devices.filter(d => getStatus(d) === "stale").length,
  };

  const generateKeyMutation = useMutation({
    mutationFn: async () => {
      const key = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      const keyHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
      const hashArray = Array.from(new Uint8Array(keyHash));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      return await base44.entities.ApiKey.create({
        name: "EDR Agent Key",
        key_prefix: key.substring(0, 12),
        key_hash: hashHex,
        permissions: "read_write",
        description: "API key for EDR agent enrollment",
      });
    },
    onSuccess: () => {
      toast.success("API key generated");
      queryClient.invalidateQueries(["api-keys"]);
    },
  });

  const getInstallScriptMutation = useMutation({
    mutationFn: async (platform) => {
      // Simulate backend call - in production this calls shieldEDRAgent
      const script = `#!/bin/bash
# ShieldAI EDR Agent Installer for ${platform.toUpperCase()}
# Generated: ${new Date().toISOString()}

set -e

API_KEY="YOUR_API_KEY"
DEVICE_TOKEN="$(openssl rand -hex 16)"

echo "🛡️  Installing ShieldAI EDR Agent..."

# Install dependencies
if [ "${platform}" = "linux" ]; then
    # eBPF requirements
    apt-get install -y linux-tools-generic || yum install -y perf
    mount -t bpf bpf /sys/fs/bpf 2>/dev/null || true
elif [ "${platform}" = "macos" ]; then
    # ESF requirements
    echo "Note: You must approve the System Extension in System Settings → Security"
fi

# Download agent binary
curl -fsSL "https://cdn.shieldai.dev/agents/edr-v1.2.0-${platform}-amd64" -o /usr/local/bin/shieldai-edr
chmod +x /usr/local/bin/shieldai-edr

# Create systemd service (Linux) or LaunchDaemon (macOS)
if [ "${platform}" = "linux" ]; then
    cat > /etc/systemd/system/shieldai-edr.service << 'EOF'
[Unit]
Description=ShieldAI EDR Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/shieldai-edr --api-key YOUR_API_KEY --device-token DEVICE_TOKEN
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable shieldai-edr
    systemctl start shieldai-edr
elif [ "${platform}" = "macos" ]; then
    cat > /Library/LaunchDaemons/dev.shieldai.edr.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>dev.shieldai.edr</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/shieldai-edr</string>
        <string>--api-key</string>
        <string>YOUR_API_KEY</string>
        <string>--device-token</string>
        <string>DEVICE_TOKEN</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF
    launchctl load -w /Library/LaunchDaemons/dev.shieldai.edr.plist
fi

echo "✅ ShieldAI EDR Agent installed successfully!"
echo "Device token: DEVICE_TOKEN"
echo "Agent will appear in your fleet within 60 seconds"
`;
      return script;
    },
    onSuccess: (script) => {
      setInstallScript(script);
      setShowScriptModal(true);
    },
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const filteredDevices = devices.filter(d => {
    const matchesSearch = d.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         d.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         d.team?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === "all" || getStatus(d) === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  const filteredThreats = threats.filter(t => {
    const matchesSearch = t.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.rule_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === "all" || t.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Shield className="w-7 h-7 text-emerald-500" />
                Endpoint Detection & Response
              </h1>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                Powered by eBPF + ETW + ESF
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                Sigma + YARA + IOC
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                Apache 2.0 Engine
              </Badge>
            </div>
            <p className="text-slate-400 text-sm">Real-time OS-level threat detection across all your devices</p>
          </div>
          <Button
            onClick={() => setShowInstallModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Device
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Total Devices</div>
              <div className="text-3xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-slate-500 mt-1">Enrolled in fleet</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Active Devices</div>
              <div className="text-3xl font-bold text-emerald-400">{stats.active}</div>
              <div className="text-xs text-emerald-500/70 mt-1">Reporting now</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Threats Today</div>
              <div className="text-3xl font-bold text-red-400">{stats.threatsToday}</div>
              <div className="text-xs text-red-500/70 mt-1">Detected by EDR</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Stale Agents</div>
              <div className={`text-3xl font-bold ${stats.stale > 0 ? "text-amber-400" : "text-slate-400"}`}>
                {stats.stale}
              </div>
              <div className="text-xs text-amber-500/70 mt-1">Need investigation</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="devices" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              Device Fleet
            </TabsTrigger>
            <TabsTrigger value="threats" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
              Live Threat Feed
            </TabsTrigger>
            <TabsTrigger value="install" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              Install Agent
            </TabsTrigger>
            <TabsTrigger value="rules" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              Detection Rules
            </TabsTrigger>
            <TabsTrigger value="policy" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
              Policy
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Device Fleet */}
          <TabsContent value="devices" className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm">Enrolled Devices</CardTitle>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search devices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64 bg-slate-800 border-slate-700 text-white text-sm"
                    />
                    <select
                      value={filterSeverity}
                      onChange={(e) => setFilterSeverity(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="stale">Stale</option>
                      <option value="offline">Offline</option>
                    </select>
                    <Button variant="ghost" size="icon" onClick={() => refetchDevices()}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {devicesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 animate-pulse">
                        <div className="h-4 w-32 bg-slate-700 rounded mb-2" />
                        <div className="h-3 w-48 bg-slate-700 rounded" />
                      </div>
                    ))}
                  </div>
                ) : filteredDevices.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <div className="text-white font-medium mb-2">No devices enrolled</div>
                    <div className="text-slate-400 text-sm mb-4">Install the EDR agent on your endpoints to start monitoring</div>
                    <Button onClick={() => setShowInstallModal(true)} className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
                      Install Agent
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredDevices.map((device) => {
                      const status = getStatus(device);
                      return (
                        <div
                          key={device.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700 hover:border-slate-600 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${
                              status === "active" ? "bg-emerald-500 animate-pulse" :
                              status === "stale" ? "bg-amber-500" : "bg-red-500"
                            }`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{device.device_name}</span>
                                <Badge className={`${OS_COLORS[device.os]} text-xs`}>
                                  {OS_ICONS[device.os]} {device.os}
                                </Badge>
                                <Badge className={`${
                                  status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                                  status === "stale" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                                  "bg-red-500/20 text-red-400 border-red-500/30"
                                } text-xs`}>
                                  {status}
                                </Badge>
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                {device.username} {device.team && `• ${device.team}`} • Last seen: {getTimeAgo(device.last_heartbeat)} • v{device.agent_version}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-slate-700 text-slate-300 text-xs">
                              Risk: {device.risk_score || 0}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.location.href = `/edr/${device.id}`}
                              className="text-emerald-400 hover:text-emerald-300"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Live Threat Feed */}
          <TabsContent value="threats" className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Live Threat Feed
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                      Real-time
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => refetchThreats()}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {threatsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 animate-pulse">
                        <div className="h-4 w-48 bg-slate-700 rounded mb-2" />
                        <div className="h-3 w-64 bg-slate-700 rounded" />
                      </div>
                    ))}
                  </div>
                ) : filteredThreats.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <div className="text-white font-medium mb-2">No threats detected</div>
                    <div className="text-slate-400 text-sm">Your endpoints are clean — no EDR alerts in the last 24 hours</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredThreats.map((threat) => (
                      <div
                        key={threat.id}
                        className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 hover:border-red-500/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
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
                                <span className="text-xs text-slate-400">{threat.device_name}</span>
                              </div>
                              <div className="text-xs text-slate-400">
                                {threat.threat_type} • {getTimeAgo(threat.detected_at)}
                              </div>
                              {threat.process_name && (
                                <div className="text-xs text-slate-500 mt-1 font-mono">
                                  Process: {threat.process_name}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            Investigate
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Install Agent */}
          <TabsContent value="install" className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Install EDR Agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1 */}
                <div className="space-y-3">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">1</span>
                    Get your API key
                  </h3>
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    {apiKeys.length > 0 ? (
                      <div className="flex items-center justify-between">
                        <code className="text-emerald-400 font-mono text-sm">{apiKeys[0].key_prefix}••••••••</code>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(apiKeys[0].key_prefix)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => generateKeyMutation.mutate()}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Generate API Key
                      </Button>
                    )}
                  </div>
                </div>

                {/* Step 2 */}
                <div className="space-y-3">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">2</span>
                    Choose your platform
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Linux */}
                    <div
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        installPlatform === "linux"
                          ? "bg-emerald-500/10 border-emerald-500/50"
                          : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
                      }`}
                      onClick={() => setInstallPlatform("linux")}
                    >
                      <div className="text-2xl mb-2">🐧</div>
                      <div className="text-white font-medium mb-1">Linux</div>
                      <div className="text-xs text-slate-400 mb-3">eBPF (kernel 5.8+)</div>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs mb-2">
                        Kernel 5.8+ | BTF | Root
                      </Badge>
                      <div className="text-xs text-slate-500">Process • Network • File • DNS</div>
                    </div>

                    {/* Windows */}
                    <div
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        installPlatform === "windows"
                          ? "bg-emerald-500/10 border-emerald-500/50"
                          : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
                      }`}
                      onClick={() => setInstallPlatform("windows")}
                    >
                      <div className="text-2xl mb-2">🪟</div>
                      <div className="text-white font-medium mb-1">Windows</div>
                      <div className="text-xs text-slate-400 mb-3">ETW</div>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs mb-2">
                        Win 10/11 | Admin PS
                      </Badge>
                      <div className="text-xs text-slate-500">Process • Network • Registry • PowerShell</div>
                    </div>

                    {/* macOS */}
                    <div
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        installPlatform === "macos"
                          ? "bg-emerald-500/10 border-emerald-500/50"
                          : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
                      }`}
                      onClick={() => setInstallPlatform("macos")}
                    >
                      <div className="text-2xl mb-2">🍎</div>
                      <div className="text-white font-medium mb-1">macOS</div>
                      <div className="text-xs text-slate-400 mb-3">ESF + BPF</div>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs mb-2">
                        macOS 11+ | Root
                      </Badge>
                      <div className="text-xs text-yellow-500/70 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Experimental
                      </div>
                    </div>
                  </div>

                  {/* Install command */}
                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-xs text-slate-400 mb-2">Install command:</div>
                    <code className="text-emerald-400 font-mono text-sm block mb-3">
                      {installPlatform === "windows"
                        ? "irm https://cdn.shieldai.dev/agents/edr-windows | iex"
                        : `curl -fsSL https://cdn.shieldai.dev/agents/edr-${installPlatform} | sudo bash`}
                    </code>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(
                          installPlatform === "windows"
                            ? "irm https://cdn.shieldai.dev/agents/edr-windows | iex"
                            : `curl -fsSL https://cdn.shieldai.dev/agents/edr-${installPlatform} | sudo bash`
                        )}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => getInstallScriptMutation.mutate(installPlatform)}
                        className="border-slate-700 text-emerald-400 hover:bg-slate-800"
                      >
                        <Terminal className="w-4 h-4 mr-2" />
                        Generate Full Script
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="space-y-3">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">3</span>
                    Verify enrollment
                  </h3>
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <p className="text-slate-400 text-sm mb-3">
                      After running the install command, the agent will appear in the Device Fleet tab within 60 seconds.
                    </p>
                    <Button onClick={() => { refetchDevices(); setActiveTab("devices"); }}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Device List
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Detection Rules */}
          <TabsContent value="rules" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Sigma Rules */}
              <Card className="border-slate-800 bg-slate-900/50">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    Sigma Rules (Behavioral)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {SIGMA_RULES.map((rule, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium">{rule.name}</span>
                        <Badge className={`${
                          rule.severity === "critical" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                          "bg-orange-500/20 text-orange-400 border-orange-500/30"
                        } text-xs`}>
                          {rule.severity}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400">{rule.os} • {rule.category.replace("_", " ")}</div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Browse Rustinel Rule Packs
                  </Button>
                </CardContent>
              </Card>

              {/* YARA + IOC */}
              <Card className="border-slate-800 bg-slate-900/50">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Network className="w-4 h-4 text-blue-500" />
                    YARA + IOC Lists
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                    <div className="text-white font-medium mb-1">YARA Signatures</div>
                    <div className="text-slate-400 text-sm mb-3">File-based malware detection</div>
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                      Upload YARA Rule
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                    <div className="text-white font-medium mb-1">IOC Lists</div>
                    <div className="text-slate-400 text-sm mb-3">Hashes • IPs • Domains • Paths</div>
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                      Import IOCs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 5: Policy */}
          <TabsContent value="policy" className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-500" />
                  EDR Policy Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                  <div className="text-white font-medium mb-3">Response Mode</div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="radio" name="response" defaultChecked className="accent-emerald-500" />
                      Alert Only
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="radio" name="response" className="accent-emerald-500" />
                      Block
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="radio" name="response" className="accent-emerald-500" />
                      Dry Run
                    </label>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-white font-medium">Auto-kill Malicious Processes</div>
                      <div className="text-xs text-slate-400">Automatically terminate processes matching critical rules</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-white font-medium">Auto-isolate Compromised Device</div>
                      <div className="text-xs text-slate-400">Disconnect device from network on critical threat detection</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                        Enterprise Feature
                      </Badge>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" disabled />
                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-600 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    <Check className="w-4 h-4 mr-2" />
                    Save Policy
                  </Button>
                  <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Push to All Devices
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Install Modal */}
        {showInstallModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Install EDR Agent</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowInstallModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6">
                <Tabs defaultValue="linux" className="space-y-4">
                  <TabsList className="bg-slate-800/50 border border-slate-700">
                    <TabsTrigger value="linux" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                      🐧 Linux
                    </TabsTrigger>
                    <TabsTrigger value="windows" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                      🪟 Windows
                    </TabsTrigger>
                    <TabsTrigger value="macos" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                      🍎 macOS
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="linux">
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                        <code className="text-emerald-400 font-mono text-sm block">
                          curl -fsSL https://cdn.shieldai.dev/agents/edr-linux | sudo bash
                        </code>
                      </div>
                      <div className="text-sm text-slate-400">
                        <strong className="text-white">Requirements:</strong> Kernel 5.8+, BTF enabled, root access
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="windows">
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                        <code className="text-emerald-400 font-mono text-sm block">
                          irm https://cdn.shieldai.dev/agents/edr-windows | iex
                        </code>
                      </div>
                      <div className="text-sm text-slate-400">
                        <strong className="text-white">Requirements:</strong> Windows 10/11 or Server 2016+, Admin PowerShell
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="macos">
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                        <code className="text-emerald-400 font-mono text-sm block">
                          curl -fsSL https://cdn.shieldai.dev/agents/edr-macos | sudo bash
                        </code>
                      </div>
                      <div className="text-sm text-slate-400">
                        <strong className="text-white">Requirements:</strong> macOS 11+, root access, System Extension approval required
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Experimental
                      </Badge>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}

        {/* Script Modal */}
        {showScriptModal && installScript && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-5xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">EDR Installer Script</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(installScript)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setShowScriptModal(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-slate-950">
                <pre className="text-emerald-400 font-mono text-xs whitespace-pre-wrap">
                  {installScript}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}