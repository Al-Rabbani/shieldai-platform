import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Search, ExternalLink, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VirusTotalPage() {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [apiKey, setApiKey] = useState("");

  const handleConnect = async () => {
    try {
      await base44.entities.Integration.create({
        name: "VirusTotal",
        type: "virustotal",
        status: "connected",
        api_key: apiKey,
        connected_at: new Date().toISOString(),
      });
      setConnectionStatus("connected");
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">VirusTotal Integration</h1>
        <p className="text-slate-400">Auto-enrich IOCs with VirusTotal intelligence</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Shield className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <CardTitle className="text-white">Connect VirusTotal</CardTitle>
              <CardDescription>Free tier: 500 queries/day</CardDescription>
            </div>
            {connectionStatus === "connected" && (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20 ml-auto">
                <CheckCircle className="w-3 h-3 mr-1" /> Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectionStatus === "disconnected" ? (
            <>
              <div className="space-y-2">
                <Label className="text-slate-400">VirusTotal API Key</Label>
                <Input
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <Button onClick={handleConnect} disabled={!apiKey}>
                Connect
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-sm text-slate-400 mb-2">Auto-enrichment enabled for:</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-slate-600">IP Addresses</Badge>
                  <Badge variant="outline" className="border-slate-600">Domains</Badge>
                  <Badge variant="outline" className="border-slate-600">File Hashes</Badge>
                  <Badge variant="outline" className="border-slate-600">URLs</Badge>
                </div>
              </div>
              <div className="text-sm text-slate-400">
                <div className="mb-2">Enriched fields:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>Detection ratio (e.g., 47/72 engines)</li>
                  <li>First seen / Last seen timestamps</li>
                  <li>Malware family associations</li>
                  <li>Community score & tags</li>
                </ul>
              </div>
              <Button variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-white">Auto-enrichment</div>
              <div className="text-xs text-slate-400">Every IOC found in threat intel feeds is automatically submitted</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-white">File Detonation</div>
              <div className="text-xs text-slate-400">Upload suspicious files for VirusTotal analysis</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-white">Community Score</div>
              <div className="text-xs text-slate-400">VirusTotal community verdict alongside ShieldAI scoring</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <a href="https://www.virustotal.com" target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-4 h-4 mr-2" />
          VirusTotal Website
        </a>
      </Button>
    </div>
  );
}