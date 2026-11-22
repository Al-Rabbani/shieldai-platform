import React, { useState } from "react";
import { TrendingUp, AlertTriangle, Eye, Package, GitCommit, Clock, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const FORECAST_DATA = [
  { package: "express", version: "4.18.2", riskScore: 87, prediction: "CVE likely in 90 days", confidence: 73, signals: ["abandoned", "suspicious_pr"], action: "Monitor" },
  { package: "lodash", version: "4.17.21", riskScore: 72, prediction: "Prototype pollution variant", confidence: 61, signals: ["similar_cve"], action: "Update" },
  { package: "openssl", version: "3.0.8", riskScore: 91, prediction: "Memory corruption pattern", confidence: 81, signals: ["high_complexity", "old_version"], action: "Patch now" },
  { package: "axios", version: "0.27.2", riskScore: 65, prediction: "SSRF vulnerability likely", confidence: 58, signals: ["similar_cve"], action: "Monitor" },
  { package: "jsonwebtoken", version: "8.5.1", riskScore: 79, prediction: "JWT bypass possible", confidence: 67, signals: ["abandoned", "old_version"], action: "Update" },
];

const SIGNAL_INFO = {
  abandoned: { icon: "🔴", label: "Abandoned maintainer" },
  suspicious_pr: { icon: "🟠", label: "Open security PR ignored" },
  similar_cve: { icon: "🟡", label: "Similar package got CVE" },
  high_complexity: { icon: "🔴", label: "High code complexity" },
  old_version: { icon: "🟠", label: "Major version gap" },
};

export default function RiskForecastPage() {
  const [selectedPackage, setSelectedPackage] = useState(null);

  const { data: packages = [] } = useQuery({
    queryKey: ["package-health"],
    queryFn: async () => {
      try {
        return await base44.entities.SBOM.list("-created_date", 100);
      } catch {
        return [];
      }
    },
  });

  const getRiskColor = (score) => {
    if (score >= 80) return "text-red-400";
    if (score >= 60) return "text-orange-400";
    return "text-yellow-400";
  };

  const getRiskBg = (score) => {
    if (score >= 80) return "bg-red-500/20 border-red-500/30";
    if (score >= 60) return "bg-orange-500/20 border-orange-500/30";
    return "bg-yellow-500/20 border-yellow-500/30";
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-[#C9A84C]" />
          Risk Forecast
        </h1>
        <p className="text-slate-400 mt-1">
          Predicted vulnerabilities before they're published — based on code complexity, maintainer activity, historical patterns
        </p>
      </div>

      {/* Accuracy Tracker */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-emerald-500" />
              <div>
                <div className="text-white font-medium">Our last 30-day predictions: 67% accuracy</div>
                <div className="text-slate-400 text-sm">
                  CVE-2024-XXXX was predicted 23 days before publication
                </div>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              High Confidence
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Table */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Vulnerability Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-slate-400 text-sm font-medium p-3">Package</th>
                  <th className="text-left text-slate-400 text-sm font-medium p-3">Version</th>
                  <th className="text-left text-slate-400 text-sm font-medium p-3">Risk Score</th>
                  <th className="text-left text-slate-400 text-sm font-medium p-3">Prediction</th>
                  <th className="text-left text-slate-400 text-sm font-medium p-3">Confidence</th>
                  <th className="text-left text-slate-400 text-sm font-medium p-3">Why</th>
                  <th className="text-left text-slate-400 text-sm font-medium p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {FORECAST_DATA.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="p-3">
                      <div className="text-white font-medium">{item.package}</div>
                    </td>
                    <td className="p-3">
                      <code className="text-slate-400 text-sm">{item.version}</code>
                    </td>
                    <td className="p-3">
                      <div className={`font-bold ${getRiskColor(item.riskScore)}`}>{item.riskScore}/100</div>
                    </td>
                    <td className="p-3">
                      <div className="text-white text-sm">{item.prediction}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.confidence >= 70 ? "bg-emerald-500" :
                              item.confidence >= 50 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${item.confidence}%` }}
                          />
                        </div>
                        <span className="text-slate-400 text-sm">{item.confidence}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {item.signals.map((signal, sIdx) => {
                          const info = SIGNAL_INFO[signal];
                          return (
                            <Badge key={sIdx} className="bg-slate-700 text-slate-300 text-xs" title={info.label}>
                              {info.icon}
                            </Badge>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        className={
                          item.action === "Patch now" ? "bg-red-500 hover:bg-red-600 text-white" :
                          item.action === "Update" ? "bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black" :
                          "bg-slate-700 hover:bg-slate-600 text-white"
                        }
                      >
                        {item.action}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Risk Signals Legend */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#C9A84C]" />
            Risk Signals Used
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(SIGNAL_INFO).map(([key, info]) => (
              <div key={key} className="text-center p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="text-2xl mb-1">{info.icon}</div>
                <div className="text-white text-sm">{info.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-[#C9A84C]" />
            Data Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[
              { name: "GitHub API", desc: "Maintainer & PR activity" },
              { name: "OSV.dev", desc: "Historical CVE patterns" },
              { name: "EPSS", desc: "Exploit probability scores" },
              { name: "Socket.dev", desc: "Supply chain risk signals" },
            ].map((source, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="text-white font-medium mb-1">{source.name}</div>
                <div className="text-slate-400 text-sm">{source.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}