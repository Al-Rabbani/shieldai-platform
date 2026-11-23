import React, { useState } from "react";
import { Globe, FileText, Check, AlertTriangle, Calendar, Bell, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const REGULATIONS = [
  { name: "NIS2", region: "EU", status: "ENFORCED", score: 78, deadline: "Oct 17, 2026", changes: 2, action: "View gaps" },
  { name: "DORA", region: "EU Financial", status: "ENFORCED", score: 64, deadline: "Jan 17, 2027", changes: 3, action: "Critical" },
  { name: "CRA (Cyber Resilience Act)", region: "EU Products", status: "COMING", score: 0, deadline: "Dec 2027", changes: 1, action: "Prepare" },
  { name: "AI Act", region: "EU", status: "PHASED", score: 45, deadline: "Aug 2026", changes: 2, action: "Urgent" },
  { name: "HIPAA", region: "US Healthcare", status: "ENFORCED", score: 91, deadline: "Ongoing", changes: 0, action: "Compliant" },
  { name: "CCPA/CPRA", region: "US California", status: "ENFORCED", score: 85, deadline: "Ongoing", changes: 1, action: "Review" },
  { name: "NYDFS", region: "US Financial", status: "ENFORCED", score: 82, deadline: "Ongoing", changes: 0, action: "Compliant" },
  { name: "Cyber Essentials", region: "UK", status: "ENFORCED", score: 88, deadline: "Ongoing", changes: 0, action: "Compliant" },
];

export default function RegulatoryIntelPage() {
  const [selectedRegulation, setSelectedRegulation] = useState(null);

  const { data: complianceFrameworks = [] } = useQuery({
    queryKey: ["compliance-frameworks"],
    queryFn: async () => {
      try {
        return await base44.entities.ComplianceFramework.list("-updated_date", 20);
      } catch {
        return [];
      }
    },
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "ENFORCED": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "PHASED": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "COMING": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-slate-700 text-slate-300";
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Globe className="w-8 h-8 text-[#C9A84C]" />
            Regulatory Intelligence
          </h1>
          <p className="text-slate-400 mt-1">
            Automatically track changing regulations and map requirements to your compliance gaps
          </p>
        </div>
        <Button className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
          <Bell className="w-4 h-4 mr-2" />
          Enable Auto-Alerts
        </Button>
      </div>

      {/* Active Regulations Table */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Active Regulations Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-slate-400 text-sm font-medium p-3">Regulation</th>
                  <th className="text-left text-slate-400 text-sm font-medium p-3">Region</th>
                  <th className="text-left text-slate-400 text-sm font-medium p-3">Status</th>
                  <th className="text-left text-slate-400 text-sm font-medium p-3">Your Score</th>
                  <th className="text-left text-slate-400 text-sm font-medium p-3">Next Deadline</th>
                  <th className="text-left text-slate-400 text-sm font-medium p-3">Changes</th>
                  <th className="text-left text-slate-400 text-sm font-medium p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {REGULATIONS.map((reg, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-800 hover:bg-slate-800/30 cursor-pointer"
                    onClick={() => setSelectedRegulation(reg)}
                  >
                    <td className="p-3">
                      <div className="text-white font-medium">{reg.name}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-slate-400 text-sm">{reg.region}</div>
                    </td>
                    <td className="p-3">
                      <Badge className={getStatusColor(reg.status)}>{reg.status}</Badge>
                    </td>
                    <td className="p-3">
                      <div className={`font-bold ${getScoreColor(reg.score)}`}>{reg.score}%</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Calendar className="w-4 h-4" />
                        {reg.deadline}
                      </div>
                    </td>
                    <td className="p-3">
                      {reg.changes > 0 ? (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          {reg.changes} new
                        </Badge>
                      ) : (
                        <span className="text-slate-500 text-sm">No changes</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        className={
                          reg.action === "Critical" || reg.action === "Urgent" ? "bg-red-500 hover:bg-red-600 text-white" :
                          reg.action === "Prepare" ? "bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black" :
                          "bg-slate-700 hover:bg-slate-600 text-white"
                        }
                      >
                        {reg.action}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Alert Feature */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#C9A84C]" />
            Automatic Regulatory Change Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400 text-sm">
            When new regulatory guidance is published, ShieldAI automatically:
          </p>
          <div className="grid grid-cols-4 gap-4">
            {[
              { step: "1", title: "Updates requirements", desc: "Database refreshed with new rules" },
              { step: "2", title: "Re-assesses compliance", desc: "Score recalculated instantly" },
              { step: "3", title: "Creates notification", desc: "Alert sent to compliance team" },
              { step: "4", title: "Logs to audit trail", desc: "Immutable record created" },
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 text-center">
                <div className="w-8 h-8 rounded-full bg-[#C9A84C] text-black font-bold flex items-center justify-center mx-auto mb-2">
                  {item.step}
                </div>
                <div className="text-white font-medium text-sm mb-1">{item.title}</div>
                <div className="text-slate-400 text-xs">{item.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regulation Detail Modal */}
      {selectedRegulation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">{selectedRegulation.name}</h2>
              <Button variant="ghost" onClick={() => setSelectedRegulation(null)}>
                <AlertTriangle className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                  <div className="text-slate-400 text-xs mb-1">Region</div>
                  <div className="text-white font-medium">{selectedRegulation.region}</div>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                  <div className="text-slate-400 text-xs mb-1">Status</div>
                  <Badge className={getStatusColor(selectedRegulation.status)}>{selectedRegulation.status}</Badge>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                  <div className="text-slate-400 text-xs mb-1">Compliance Score</div>
                  <div className={`text-2xl font-bold ${getScoreColor(selectedRegulation.score)}`}>
                    {selectedRegulation.score}%
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-white font-medium mb-3">What it requires</h3>
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 text-slate-300 text-sm">
                  Plain English summary of {selectedRegulation.name} requirements would appear here...
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    What ShieldAI Covers
                  </h3>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li>• Automated control assessments</li>
                    <li>• Continuous monitoring</li>
                    <li>• Evidence collection</li>
                    <li>• Gap analysis reporting</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Remaining Gaps
                  </h3>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li>• Manual policy documentation</li>
                    <li>• Third-party audits</li>
                    <li>• Employee training records</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-4">
                <Button className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Evidence Package
                </Button>
                <Button variant="outline" className="border-slate-700 text-slate-300 flex-1">
                  View Full Requirements
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}