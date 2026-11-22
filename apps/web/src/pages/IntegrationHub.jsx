import React from "react";
import { Plug, Cloud, Shield, Brain, Scale, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PROVIDERS = [
  { name: "AWS", type: "Cloud", status: "Connected", accounts: 3, icon: Cloud },
  { name: "Azure", type: "Cloud", status: "Connected", accounts: 2, icon: Cloud },
  { name: "GCP", type: "Cloud", status: "Connected", accounts: 1, icon: Cloud },
  { name: "GitHub", type: "Code", status: "Connected", repos: 12, icon: Shield },
  { name: "GitLab", type: "Code", status: "Not Connected", repos: 0, icon: Shield },
  { name: "Slack", type: "Notifications", status: "Connected", icon: Plug },
  { name: "Jira", type: "Ticketing", status: "Connected", icon: FileText },
  { name: "CompAI", type: "Compliance", status: "Not Connected", icon: Scale, new: true },
  { name: "Vanta", type: "Compliance", status: "Not Connected", icon: Shield },
  { name: "Drata", type: "Compliance", status: "Not Connected", icon: Shield },
];

export default function IntegrationsHub() {
  return (
    <div className="min-h-screen bg-[#030712] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Integrations Hub</h1>
          <p className="text-slate-400 mt-2">
            Connect your cloud providers, code repositories, and compliance tools
          </p>
        </div>

        {/* Org-wide Discovery Banner */}
        <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/20">
                  <Cloud className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Organization-wide Discovery Active</p>
                  <p className="text-slate-400 text-sm mt-0.5">
                    AWS Organization ✓ | Azure Management Group ✓ | GCP Organization ✓
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    3 cloud organizations connected — 6 accounts/subscriptions/projects discovered automatically
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-mono">LIVE</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROVIDERS.map((provider) => (
            <Card
              key={provider.name}
              style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", border: "1px solid #1e3a5f" }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/10">
                    <provider.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  {provider.new && (
                    <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/30">NEW</Badge>
                  )}
                </div>
                <CardTitle className="text-white text-lg mt-3">{provider.name}</CardTitle>
                <CardDescription className="text-slate-400 text-sm">
                  {provider.type}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    {provider.status === "Connected" ? (
                      <p className="text-emerald-400 text-sm flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {provider.accounts || provider.repos} {provider.accounts ? "accounts" : "repos"}
                      </p>
                    ) : (
                      <p className="text-slate-500 text-sm">Not connected</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={provider.status === "Connected" ? "outline" : "default"}
                    style={provider.status !== "Connected" ? { background: "#3b82f6" } : {}}
                  >
                    {provider.status === "Connected" ? "Manage" : "Connect"}
                  </Button>
                </div>

                {/* CompAI Special Description */}
                {provider.name === "CompAI" && (
                  <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700">
                    Connect CompAI to sync ShieldAI security findings directly into your Governance, Risk, and Compliance workflows.
                  </p>
                )}

                {/* GCP Org-wide */}
                {provider.name === "GCP" && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-xs text-slate-400">
                      <strong className="text-slate-300">GCP Organization:</strong> Auto-discovers all projects including containers in Artifact Registry
                    </p>
                  </div>
                )}

                {/* Azure Management Groups */}
                {provider.name === "Azure" && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-xs text-slate-400">
                      <strong className="text-slate-300">Management Groups:</strong> Auto-discovers all subscriptions and resource groups
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}