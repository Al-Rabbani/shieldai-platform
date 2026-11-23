import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Activity, Clock, AlertTriangle, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MOCK_DATA = {
  "7d": [
    { date: "Mon", critical: 12, high: 28, medium: 45, low: 67 },
    { date: "Tue", critical: 10, high: 25, medium: 42, low: 65 },
    { date: "Wed", critical: 8, high: 22, medium: 40, low: 62 },
    { date: "Thu", critical: 6, high: 20, medium: 38, low: 60 },
    { date: "Fri", critical: 5, high: 18, medium: 35, low: 58 },
    { date: "Sat", critical: 4, high: 16, medium: 33, low: 55 },
    { date: "Sun", critical: 3, high: 15, medium: 32, low: 54 },
  ],
  "30d": Array.from({ length: 30 }, (_, i) => ({
    date: `Day ${i + 1}`,
    critical: Math.max(0, 15 - i * 0.4),
    high: Math.max(0, 35 - i * 0.6),
    medium: Math.max(0, 50 - i * 0.5),
    low: Math.max(0, 70 - i * 0.3),
  })),
};

const MTTR_DATA = {
  "7d": [
    { date: "Mon", critical: 2.5, high: 5.2, medium: 12.5, low: 28 },
    { date: "Tue", critical: 2.3, high: 5.0, medium: 12.0, low: 27 },
    { date: "Wed", critical: 2.1, high: 4.8, medium: 11.5, low: 26 },
    { date: "Thu", critical: 1.9, high: 4.5, medium: 11.0, low: 25 },
    { date: "Fri", critical: 1.8, high: 4.3, medium: 10.5, low: 24 },
    { date: "Sat", critical: 1.7, high: 4.2, medium: 10.2, low: 23 },
    { date: "Sun", critical: 1.6, high: 4.0, medium: 10.0, low: 22 },
  ],
};

const SLA_DATA = {
  "7d": [
    { date: "Mon", rate: 85 },
    { date: "Tue", rate: 87 },
    { date: "Wed", rate: 89 },
    { date: "Thu", rate: 91 },
    { date: "Fri", rate: 93 },
    { date: "Sat", rate: 94 },
    { date: "Sun", rate: 95 },
  ],
};

const OUT_OF_SLA_DATA = {
  "7d": [
    { date: "Mon", critical: 5, high: 12, medium: 25, low: 40 },
    { date: "Tue", critical: 4, high: 11, medium: 23, low: 38 },
    { date: "Wed", critical: 3, high: 10, medium: 21, low: 35 },
    { date: "Thu", critical: 3, high: 9, medium: 19, low: 33 },
    { date: "Fri", critical: 2, high: 8, medium: 17, low: 30 },
    { date: "Sat", critical: 2, high: 7, medium: 16, low: 28 },
    { date: "Sun", critical: 1, high: 6, medium: 15, low: 26 },
  ],
};

export default function ReportsTrendsPage() {
  const [timeRange, setTimeRange] = useState("7d");

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-400" />
              Trends Over Time
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Track security posture improvements and remediation velocity
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          {["7d", "30d", "90d", "1yr"].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? "bg-blue-500" : ""}
            >
              {range}
            </Button>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Open Findings Over Time */}
          <Card style={{ background: "#0f172a", border: "1px solid #1e3a5f" }}>
            <CardHeader>
              <CardTitle className="text-slate-300 text-sm flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-400" />
                Open Findings Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={MOCK_DATA[timeRange] || MOCK_DATA["7d"]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#0a0f1e", border: "1px solid #1e3a5f", borderRadius: "8px" }}
                    labelStyle={{ color: "#f8fafc" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="high" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="medium" stroke="#eab308" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="low" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Mean Time to Remediation */}
          <Card style={{ background: "#0f172a", border: "1px solid #1e3a5f" }}>
            <CardHeader>
              <CardTitle className="text-slate-300 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Mean Time to Remediation (Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={MTTR_DATA[timeRange] || MTTR_DATA["7d"]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#0a0f1e", border: "1px solid #1e3a5f", borderRadius: "8px" }}
                    labelStyle={{ color: "#f8fafc" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="high" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="medium" stroke="#eab308" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="low" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* SLA Compliance Rate */}
          <Card style={{ background: "#0f172a", border: "1px solid #1e3a5f" }}>
            <CardHeader>
              <CardTitle className="text-slate-300 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                SLA Compliance Rate (%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={SLA_DATA[timeRange] || SLA_DATA["7d"]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: "#0a0f1e", border: "1px solid #1e3a5f", borderRadius: "8px" }}
                    labelStyle={{ color: "#f8fafc" }}
                  />
                  <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Out-of-SLA Findings */}
          <Card style={{ background: "#0f172a", border: "1px solid #1e3a5f" }}>
            <CardHeader>
              <CardTitle className="text-slate-300 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Out-of-SLA Findings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={OUT_OF_SLA_DATA[timeRange] || OUT_OF_SLA_DATA["7d"]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#0a0f1e", border: "1px solid #1e3a5f", borderRadius: "8px" }}
                    labelStyle={{ color: "#f8fafc" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="high" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="medium" stroke="#eab308" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="low" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Export Button */}
        <div className="flex justify-end">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export as PNG
          </Button>
        </div>
      </div>
    </div>
  );
}