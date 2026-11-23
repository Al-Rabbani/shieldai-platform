import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, CheckCircle, AlertTriangle, TrendingUp, FileText, Clock, ArrowRight, BarChart3 } from "lucide-react";
import Breadcrumb from "@/components/shared/Breadcrumb";
import PageFooter from "@/components/shared/PageFooter";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const GOLD = "#C9A84C";

const FRAMEWORKS = [
  {
    id: "nist",
    name: "NIST CSF 2.0",
    version: "2.0",
    healthScore: 78,
    totalControls: 156,
    passingControls: 122,
    failingControls: 34,
    lastAssessed: "2 hours ago",
    trend: "up",
    trendValue: "+12%",
    color: "#3B82F6",
    categories: [
      { name: "Identify", score: 85, controls: 42, passing: 36 },
      { name: "Protect", score: 72, controls: 38, passing: 27 },
      { name: "Detect", score: 81, controls: 28, passing: 23 },
      { name: "Respond", score: 76, controls: 24, passing: 18 },
      { name: "Recover", score: 79, controls: 24, passing: 18 },
    ],
  },
  {
    id: "soc2",
    name: "SOC 2 Type II",
    version: "2017",
    healthScore: 84,
    totalControls: 98,
    passingControls: 82,
    failingControls: 16,
    lastAssessed: "4 hours ago",
    trend: "up",
    trendValue: "+8%",
    color: "#10B981",
    categories: [
      { name: "Security", score: 91, controls: 45, passing: 41 },
      { name: "Availability", score: 78, controls: 18, passing: 14 },
      { name: "Confidentiality", score: 82, controls: 20, passing: 16 },
      { name: "Privacy", score: 85, controls: 15, passing: 13 },
    ],
  },
  {
    id: "iso27001",
    name: "ISO 27001:2022",
    version: "2022",
    healthScore: 72,
    totalControls: 114,
    passingControls: 82,
    failingControls: 32,
    lastAssessed: "1 day ago",
    trend: "stable",
    trendValue: "+2%",
    color: "#F59E0B",
    categories: [
      { name: "Organizational", score: 75, controls: 37, passing: 28 },
      { name: "People", score: 68, controls: 18, passing: 12 },
      { name: "Physical", score: 71, controls: 14, passing: 10 },
      { name: "Technological", score: 74, controls: 45, passing: 33 },
    ],
  },
];

const RECENT_ASSESSMENTS = [
  { id: 1, framework: "NIST CSF 2.0", control: "PR.AC-1", name: "Identity Management", status: "passing", date: "2 hours ago", owner: "Security Team" },
  { id: 2, framework: "SOC 2", control: "CC6.1", name: "Logical Access Controls", status: "failing", date: "3 hours ago", owner: "Engineering" },
  { id: 3, framework: "ISO 27001", control: "A.9.2.1", name: "User Registration", status: "passing", date: "5 hours ago", owner: "IT Ops" },
  { id: 4, framework: "NIST CSF 2.0", control: "DE.CM-4", name: "Malware Detection", status: "passing", date: "6 hours ago", owner: "Security Team" },
  { id: 5, framework: "SOC 2", control: "CC7.2", name: "System Monitoring", status: "failing", date: "1 day ago", owner: "DevOps" },
  { id: 6, framework: "ISO 27001", control: "A.12.6.1", name: "Technical Vulnerability Mgmt", status: "passing", date: "1 day ago", owner: "Security Team" },
  { id: 7, framework: "NIST CSF 2.0", control: "RS.RP-1", name: "Response Planning", status: "passing", date: "2 days ago", owner: "Incident Response" },
  { id: 8, framework: "SOC 2", control: "CC3.1", name: "Risk Assessment", status: "passing", date: "2 days ago", owner: "Compliance" },
];

const GAP_ANALYSIS = [
  { category: "Access Control", nist: 72, soc2: 91, iso: 68, priority: "high" },
  { category: "Incident Response", nist: 76, soc2: 85, iso: 71, priority: "medium" },
  { category: "Risk Management", nist: 85, soc2: 78, iso: 75, priority: "low" },
  { category: "Data Protection", nist: 81, soc2: 82, iso: 74, priority: "medium" },
  { category: "Business Continuity", nist: 79, soc2: 78, iso: 69, priority: "high" },
];

const COLORS = {
  passing: "#10B981",
  failing: "#EF4444",
  partial: "#F59E0B",
  nist: "#3B82F6",
  soc2: "#10B981",
  iso: "#F59E0B",
};

function HealthScoreGauge({ score, color, size = "large" }) {
  const data = [
    { name: "Passing", value: score },
    { name: "Remaining", value: 100 - score },
  ];

  return (
    <div className="relative">
      <ResponsiveContainer width={size === "large" ? 180 : 120} height={size === "large" ? 180 : 120}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size === "large" ? 50 : 35}
            outerRadius={size === "large" ? 70 : 50}
            fill="#1F2937"
            paddingAngle={5}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            <Cell fill={color} />
            <Cell fill="#1F2937" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className={`font-bold ${size === "large" ? "text-3xl" : "text-2xl"}`} style={{ color }}>
            {score}%
          </div>
          <div className="text-xs text-gray-400">Health Score</div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    passing: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30", label: "Passing" },
    failing: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", label: "Failing" },
    partial: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30", label: "Partial" },
  };
  const c = config[status] || config.partial;
  return (
    <Badge className={`${c.bg} ${c.text} ${c.border} border`}>
      {c.label}
    </Badge>
  );
}

export default function ComplianceDashboard() {
  const [selectedFramework, setSelectedFramework] = useState("all");

  const overallHealth = Math.round(
    FRAMEWORKS.reduce((acc, f) => acc + f.healthScore, 0) / FRAMEWORKS.length
  );

  const totalControls = FRAMEWORKS.reduce((acc, f) => acc + f.totalControls, 0);
  const passingControls = FRAMEWORKS.reduce((acc, f) => acc + f.passingControls, 0);

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      <Breadcrumb items={[{ label: "Compliance", path: "/compliance" }]} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6" style={{ color: GOLD }} />
            Compliance Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Track compliance across NIST, SOC 2, and ISO 27001 in real-time</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-yellow-600 hover:bg-yellow-500 text-black">
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
            <Clock className="w-4 h-4 mr-2" />
            Schedule Assessment
          </Button>
        </div>
      </div>

      {/* Overall Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-5 bg-[#111827] border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-400">Overall Health</div>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{overallHealth}%</div>
          <div className="text-xs text-gray-400">Average across all frameworks</div>
        </Card>

        <Card className="p-5 bg-[#111827] border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-400">Total Controls</div>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{totalControls}</div>
          <div className="text-xs text-gray-400">{passingControls} passing, {totalControls - passingControls} failing</div>
        </Card>

        <Card className="p-5 bg-[#111827] border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-400">Frameworks Tracked</div>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{FRAMEWORKS.length}</div>
          <div className="text-xs text-gray-400">NIST, SOC 2, ISO 27001</div>
        </Card>

        <Card className="p-5 bg-[#111827] border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-400">Audit Readiness</div>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">High</div>
          <div className="text-xs text-gray-400">Ready for SOC 2 audit</div>
        </Card>
      </div>

      {/* Framework Health Cards */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Framework Health Scores</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {FRAMEWORKS.map((framework) => (
            <Card
              key={framework.id}
              className="p-5 bg-[#111827] border border-gray-800 hover:border-yellow-600/50 transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedFramework(framework.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: framework.color }}></div>
                    <h4 className="font-semibold text-white">{framework.name}</h4>
                  </div>
                  <div className="text-xs text-gray-400">v{framework.version} • Last assessed {framework.lastAssessed}</div>
                </div>
                <Badge className={`${framework.trend === "up" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"} border border-gray-700`}>
                  {framework.trend === "up" ? "↑" : "→"} {framework.trendValue}
                </Badge>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <HealthScoreGauge score={framework.healthScore} color={framework.color} size="small" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Passing Controls</span>
                    <span className="text-white font-semibold">{framework.passingControls}/{framework.totalControls}</span>
                  </div>
                  <Progress value={(framework.passingControls / framework.totalControls) * 100} className="h-2" />
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-gray-400">{framework.passingControls} Passing</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-gray-400">{framework.failingControls} Failing</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {framework.categories.slice(0, 3).map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={cat.score} className="h-1.5 w-20" />
                      <span className="text-white font-semibold w-8 text-right">{cat.score}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs h-8">
                View Details
                <ArrowRight className="w-3 h-3 ml-2" />
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-gray-800/50 border border-gray-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-black">Overview</TabsTrigger>
          <TabsTrigger value="assessments" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-black">Recent Assessments</TabsTrigger>
          <TabsTrigger value="gaps" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-black">Gap Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Chart */}
            <Card className="p-5 bg-[#111827] border border-gray-800">
              <h4 className="font-semibold text-white mb-4">Category Health by Framework</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={GAP_ANALYSIS}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="category" tick={{ fill: "#9CA3AF", fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151", borderRadius: "8px" }}
                      labelStyle={{ color: "#F9FAFB" }}
                    />
                    <Legend />
                    <Bar dataKey="nist" fill={COLORS.nist} name="NIST" />
                    <Bar dataKey="soc2" fill={COLORS.soc2} name="SOC 2" />
                    <Bar dataKey="iso" fill={COLORS.iso} name="ISO 27001" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Priority Gaps */}
            <Card className="p-5 bg-[#111827] border border-gray-800">
              <h4 className="font-semibold text-white mb-4">Priority remediation gaps</h4>
              <div className="space-y-3">
                {GAP_ANALYSIS.filter(g => g.priority === "high").map((gap, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-white text-sm">{gap.category}</div>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">High Priority</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-gray-400">NIST</div>
                        <div className="text-white font-semibold">{gap.nist}%</div>
                      </div>
                      <div>
                        <div className="text-gray-400">SOC 2</div>
                        <div className="text-white font-semibold">{gap.soc2}%</div>
                      </div>
                      <div>
                        <div className="text-gray-400">ISO</div>
                        <div className="text-white font-semibold">{gap.iso}%</div>
                      </div>
                    </div>
                  </div>
                ))}
                {GAP_ANALYSIS.filter(g => g.priority === "medium").map((gap, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-white text-sm">{gap.category}</div>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Medium</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-gray-400">NIST</div>
                        <div className="text-white font-semibold">{gap.nist}%</div>
                      </div>
                      <div>
                        <div className="text-gray-400">SOC 2</div>
                        <div className="text-white font-semibold">{gap.soc2}%</div>
                      </div>
                      <div>
                        <div className="text-gray-400">ISO</div>
                        <div className="text-white font-semibold">{gap.iso}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4">
          <Card className="p-5 bg-[#111827] border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-white">Recent Control Assessments</h4>
              <div className="text-xs text-gray-500">Last updated 2 hours ago</div>
            </div>
            <div className="space-y-3">
              {RECENT_ASSESSMENTS.map((assessment) => (
                <div key={assessment.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${assessment.status === "passing" ? "bg-green-500" : "bg-red-500"}`}></div>
                    <div>
                      <div className="text-sm font-semibold text-white">{assessment.name}</div>
                      <div className="text-xs text-gray-400">{assessment.framework} • {assessment.control} • {assessment.owner}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={assessment.status} />
                    <div className="text-xs text-gray-500">{assessment.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4">
          <Card className="p-5 bg-[#111827] border border-gray-800">
            <h4 className="font-semibold text-white mb-4">Cross-Framework Gap Analysis</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Category</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">NIST</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">SOC 2</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">ISO 27001</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {GAP_ANALYSIS.map((gap, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="py-3 px-4 text-white font-medium">{gap.category}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">{gap.nist}%</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/30">{gap.soc2}%</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">{gap.iso}%</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={gap.priority === "high" ? "bg-red-500/20 text-red-400" : gap.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}>
                          {gap.priority}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <PageFooter />
    </div>
  );
}