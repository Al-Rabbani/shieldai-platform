import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Slack, Github, Mail, AlertTriangle, CheckCircle2, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CHANNELS = [
  { id: "slack", name: "Slack", icon: Slack, secret: "SLACK_WEBHOOK_URL", guide: "/integrations" },
  { id: "github", name: "GitHub Issues", icon: Github, secret: "GITHUB_TOKEN", guide: "/integrations" },
  { id: "email", name: "Email", icon: Mail, secret: "RESEND_API_KEY", guide: "/integrations" },
  { id: "pagerduty", name: "PagerDuty", icon: Bell, secret: "PAGERDUTY_ROUTING_KEY", guide: "/integrations", criticalOnly: true },
];

export default function NotificationsPage() {
  const [severityThreshold, setSeverityThreshold] = useState("high");
  const [isSending, setIsSending] = useState(false);

  const { data: secrets = [] } = useQuery({
    queryKey: ["integration-secrets"],
    queryFn: async () => {
      // In production, this would call a backend function to check which secrets are set
      return ["SLACK_WEBHOOK_URL", "GITHUB_TOKEN"]; // Mock for demo
    },
  });

  const sendTestAlert = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/functions/shieldNotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          channel: 'all',
          finding: {
            title: 'ShieldAI Test Alert',
            severity: 'high',
            pillar: 'test',
            resource: 'test-resource',
            description: 'This is a test alert from ShieldAI.',
            remediation: 'No action required — this is a test.',
            detected_at: new Date().toISOString()
          }
        })
      });
      
      if (!res.ok) throw new Error('Failed to send');
      toast.success("Test alerts sent to all configured channels!");
    } catch (error) {
      toast.error(`Failed to send test: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const isChannelConnected = (channelId) => {
    const channel = CHANNELS.find(c => c.id === channelId);
    return secrets.includes(channel?.secret);
  };

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Notification Settings</h1>
          <p className="text-slate-400 mt-2">Configure alert delivery channels and severity thresholds</p>
        </div>

        {/* Channel Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHANNELS.map((channel) => {
            const connected = isChannelConnected(channel.id);
            const Icon = channel.icon;
            return (
              <Card key={channel.id} style={{ background: "#0a0f1e", border: `1px solid ${connected ? "rgba(16,185,129,0.3)" : "rgba(30,58,95,0.4)"}` }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        connected ? "bg-emerald-500/10" : "bg-slate-800"
                      }`}>
                        <Icon className={`w-5 h-5 ${connected ? "text-emerald-400" : "text-slate-500"}`} />
                      </div>
                      <div>
                        <CardTitle className="text-white text-base">{channel.name}</CardTitle>
                        <CardDescription className="text-slate-400 text-sm mt-0.5">
                          {connected ? "Connected" : "Not configured"}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={connected ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}>
                      {connected ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</> : "Disconnected"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {channel.criticalOnly && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Critical alerts only
                      </span>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <a href={channel.guide} className="text-xs">
                        {connected ? "Configure" : "Setup Guide"}
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Severity Threshold */}
        <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              Severity Threshold
            </CardTitle>
            <CardDescription className="text-slate-400">
              Choose the minimum severity level to trigger notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={severityThreshold} onValueChange={setSeverityThreshold}>
              <SelectTrigger className="w-full max-w-xs bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="critical">Critical only</SelectItem>
                <SelectItem value="high">High and above</SelectItem>
                <SelectItem value="medium">Medium and above</SelectItem>
                <SelectItem value="low">All severities</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-4 flex gap-2">
              {["critical", "high", "medium", "low"].map((sev) => (
                <div
                  key={sev}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    severityThreshold === sev
                      ? sev === "critical" ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : sev === "high" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                      : sev === "medium" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                      : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                  }`}
                >
                  {sev.toUpperCase()}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test Alert */}
        <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-400" />
              Test Notifications
            </CardTitle>
            <CardDescription className="text-slate-400">
              Send a test alert to all configured channels to verify integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={sendTestAlert} disabled={isSending}
              className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold gap-2">
              {isSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Test Alert</>}
            </Button>
            <p className="text-xs text-slate-500 mt-3">
              This will send a test notification to all connected channels. Check your Slack, GitHub Issues, and Email.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}