import React from "react";
import { Brain, Shield, AlertTriangle, Database, Server } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const GOLD = "#C9A84C";

export default function AIProtectionPage() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            <Brain className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">AI Application Protection</h1>
            <p className="text-slate-400 text-sm">Visibility and protection for your entire AI stack — models, agents, pipelines, MCP servers, training data</p>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-4 mt-6">
          {[
            { label: "AI Models Discovered", value: "12", icon: Brain },
            { label: "AI Agents Monitored", value: "8", icon: Server },
            { label: "MCP Servers Secured", value: "5", icon: Database },
            { label: "Prompt Injections Blocked", value: "23", icon: Shield },
            { label: "Shadow AI Detected", value: "3", icon: AlertTriangle },
          ].map((kpi, i) => (
            <Card key={i} className="bg-[#111827] border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">{kpi.label}</span>
                  <kpi.icon className="w-4 h-4" style={{ color: GOLD }} />
                </div>
                <div className="text-2xl font-black text-white">{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div className="text-center py-20">
        <Brain className="w-24 h-24 text-slate-700 mx-auto mb-6" />
        <h2 className="text-xl font-bold text-white mb-2">AI Protection Dashboard</h2>
        <p className="text-slate-400 max-w-2xl">Monitor AI models, agents, MCP servers, and detect prompt injections and PII leaks in real-time. Coming soon with full entity integration.</p>
      </div>
    </div>
  );
}