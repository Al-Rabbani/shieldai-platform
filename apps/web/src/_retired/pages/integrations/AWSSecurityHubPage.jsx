import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Cloud, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AWSSecurityHubPage() {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [region, setRegion] = useState("us-east-1");
  const [bidirectional, setBidirectional] = useState(true);

  const handleConnect = async () => {
    try {
      await base44.entities.Integration.create({
        name: "AWS Security Hub",
        type: "aws_security_hub",
        status: "connected",
        connected_at: new Date().toISOString(),
        settings: JSON.stringify({ region, bidirectional }),
      });
      setConnectionStatus("connected");
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">AWS Security Hub</h1>
        <p className="text-slate-400">Bi-directional sync with AWS Security Hub (ASFF format)</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">AWS Configuration</CardTitle>
              <CardDescription>Cross-account IAM role setup</CardDescription>
            </div>
            {connectionStatus === "connected" && (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="w-3 h-3 mr-1" /> Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectionStatus === "disconnected" ? (
            <>
              <div className="space-y-2">
                <Label className="text-slate-400">IAM Role ARN</Label>
                <Input placeholder="arn:aws:iam::123456789012:role/ShieldAI-Integration" className="bg-slate-800 border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="us-east-1">us-east-1</SelectItem>
                    <SelectItem value="us-west-2">us-west-2</SelectItem>
                    <SelectItem value="eu-west-1">eu-west-1</SelectItem>
                    <SelectItem value="ap-southeast-1">ap-southeast-1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleConnect}>Connect</Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium text-white">Bidirectional Sync</div>
                    <div className="text-xs text-slate-400">Ingest + Export findings</div>
                  </div>
                </div>
                <Select defaultValue="enabled">
                  <SelectTrigger className="w-32 bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="ingest-only">Ingest Only</SelectItem>
                    <SelectItem value="export-only">Export Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-sm font-semibold text-white mb-2">Ingest From Security Hub</div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>• GuardDuty findings</div>
                  <div>• Inspector vulnerabilities</div>
                  <div>• Macie data exposures</div>
                  <div>• Config rule violations</div>
                  <div>• IAM Access Analyzer</div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-sm font-semibold text-white mb-2">Export To Security Hub</div>
                <div className="text-xs text-slate-400">
                  ShieldAI findings exported in ASFF (Amazon Security Finding Format) with custom sources:
                  <div className="mt-2 font-mono text-green-400">
                    ShieldAI/SAST, ShieldAI/DAST, ShieldAI/Container
                  </div>
                </div>
              </div>

              <Button variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}