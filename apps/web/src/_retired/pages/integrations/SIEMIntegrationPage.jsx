import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Loader2, Database, Activity, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SIEMIntegrationPage() {
  const [activeTab, setActiveTab] = useState("splunk");
  const [connections, setConnections] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      const types = ["splunk", "datadog", "elastic"];
      const status = {};
      for (const type of types) {
        const integrations = await base44.entities.Integration.filter({ type });
        status[type] = integrations && integrations.length > 0 && integrations[0].status === "connected";
      }
      setConnections(status);
    } catch (error) {
      console.error("Failed to load SIEM integrations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (type) => {
    try {
      await base44.entities.Integration.create({
        type,
        name: type.charAt(0).toUpperCase() + type.slice(1),
        status: "connected",
        connected_at: new Date().toISOString(),
      });
      setConnections(prev => ({ ...prev, [type]: true }));
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  const handleDisconnect = async (type) => {
    try {
      const integrations = await base44.entities.Integration.filter({ type });
      if (integrations.length > 0) {
        await base44.entities.Integration.delete(integrations[0].id);
      }
      setConnections(prev => ({ ...prev, [type]: false }));
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">SIEM & Monitoring</h1>
        <p className="text-slate-400">Export findings to your security monitoring stack</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="splunk" className="data-[state=active]:bg-primary">Splunk</TabsTrigger>
          <TabsTrigger value="datadog" className="data-[state=active]:bg-primary">Datadog</TabsTrigger>
          <TabsTrigger value="elastic" className="data-[state=active]:bg-primary">Elastic</TabsTrigger>
          <TabsTrigger value="webhook" className="data-[state=active]:bg-primary">Generic Webhook</TabsTrigger>
        </TabsList>

        <TabsContent value="splunk" className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Activity className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-white">Splunk HEC Integration</CardTitle>
                  <CardDescription>HTTP Event Collector for real-time log export</CardDescription>
                </div>
                {connections.splunk && (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20 ml-auto">
                    <CheckCircle className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!connections.splunk ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-slate-400">HEC Token</Label>
                    <Input type="password" placeholder="Enter HEC token" className="bg-slate-800 border-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">HEC URL</Label>
                    <Input placeholder="https://your-instance.splunkcloud.com:8088" className="bg-slate-800 border-slate-700" />
                  </div>
                  <Button onClick={() => handleConnect("splunk")}>Connect</Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-2">Export Format</div>
                    <code className="text-xs text-green-400 font-mono block">
                      source=shieldai sourcetype=shieldai:finding
                    </code>
                  </div>
                  <div className="text-sm text-slate-400">
                    <div className="mb-2">Events exported:</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      <li>Finding created/updated</li>
                      <li>Scan completions</li>
                      <li>Threat blocks</li>
                      <li>Audit log entries</li>
                    </ul>
                  </div>
                  <Button variant="outline" onClick={() => handleDisconnect("splunk")} className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                    Disconnect
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="datadog" className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Database className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-white">Datadog Integration</CardTitle>
                  <CardDescription>Export findings as Datadog Events and Security Signals</CardDescription>
                </div>
                {connections.datadog && (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20 ml-auto">
                    <CheckCircle className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!connections.datadog ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-slate-400">API Key</Label>
                    <Input type="password" placeholder="Enter API key" className="bg-slate-800 border-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">App Key</Label>
                    <Input type="password" placeholder="Enter App key" className="bg-slate-800 border-slate-700" />
                  </div>
                  <Button onClick={() => handleConnect("datadog")}>Connect</Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-2">Custom Tags</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-slate-600">severity:critical</Badge>
                      <Badge variant="outline" className="border-slate-600">scanner:sast</Badge>
                      <Badge variant="outline" className="border-slate-600">status:open</Badge>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => handleDisconnect("datadog")} className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                    Disconnect
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="elastic" className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Search className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-white">Elasticsearch / OpenSearch</CardTitle>
                  <CardDescription>Export findings to Elasticsearch cluster</CardDescription>
                </div>
                {connections.elastic && (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20 ml-auto">
                    <CheckCircle className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!connections.elastic ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-slate-400">Elasticsearch URL</Label>
                    <Input placeholder="https://your-cluster.es.amazonaws.com" className="bg-slate-800 border-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">API Key</Label>
                    <Input type="password" placeholder="Enter API key" className="bg-slate-800 border-slate-700" />
                  </div>
                  <Button onClick={() => handleConnect("elastic")}>Connect</Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-2">Index Template</div>
                    <code className="text-xs text-green-400 font-mono block">
                      shieldai-findings-YYYY.MM.DD
                    </code>
                  </div>
                  <Button variant="outline" onClick={() => handleDisconnect("elastic")} className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                    Disconnect
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhook" className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">Generic Webhook</CardTitle>
              <CardDescription>Send findings to any HTTP endpoint</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-400">Webhook URL</Label>
                <Input placeholder="https://your-server.com/webhook" className="bg-slate-800 border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Custom Headers (JSON)</Label>
                <Input placeholder='{"Authorization": "Bearer token"}' className="bg-slate-800 border-slate-700" />
              </div>
              <Button>Save Webhook</Button>
              <div className="text-xs text-slate-400">
                Retry logic: 3 attempts with exponential backoff • Last 100 deliveries logged
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}