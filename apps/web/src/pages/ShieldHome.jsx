import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, User, Users, Shield, CheckCircle, AlertTriangle, Lock, Wifi, Smartphone, Laptop, Tv, Eye } from "lucide-react";

const GOLD = "#C9A84C";

const familyMembers = [
  { name: "John", role: "Dad", icon: "👨", status: "secure", statusText: "All 3 devices secure", lastScan: "2 hours ago", color: "green" },
  { name: "Sarah", role: "Mum", icon: "👩", status: "warning", statusText: "Password reuse on 3 accounts", lastScan: "1 hour ago", color: "amber" },
  { name: "Alex", role: "Teen, 16", icon: "👦", status: "secure", statusText: "Screen time: 4h 12m", lastScan: "30 min ago", color: "green" },
  { name: "Emma", role: "Child, 9", icon: "👧", status: "secure", statusText: "Screen time: 2h 3m", lastScan: "15 min ago", color: "green" },
];

const protectionModules = [
  {
    id: 1,
    icon: "🏠",
    title: "Smart Home & IoT",
    status: "warning",
    statusText: "3 devices need attention",
    description: "23 connected devices found on your network",
    devices: [
      { name: "Router", status: "secure" },
      { name: "iPhone x4", status: "secure" },
      { name: "MacBook x2", status: "secure" },
      { name: "Samsung Smart TV", status: "warning", reason: "Outdated firmware" },
      { name: "Ring Doorbell", status: "warning", reason: "Default password" },
      { name: "Amazon Echo", status: "warning", reason: "No encryption" },
      { name: "Nest Thermostat", status: "secure" },
      { name: "PlayStation 5", status: "secure" },
    ],
  },
  {
    id: 2,
    icon: "🔐",
    title: "Identity Protection",
    status: "warning",
    statusText: "Found in 2 breaches",
    description: "Sarah's email found in 2 data breaches (LinkedIn 2024, Adobe 2023)",
    darkWeb: "ACTIVE",
    lastScan: "1 hour ago",
    data: [
      { type: "Email", status: "secure" },
      { type: "Phone", status: "warning" },
      { type: "Address", status: "secure" },
      { type: "Password hash", status: "warning" },
    ],
  },
  {
    id: 3,
    icon: "📱",
    title: "Device Security",
    status: "secure",
    statusText: "8 of 9 devices secure",
    devices: [
      { name: "John's MacBook", os: "macOS 15.2", status: "secure" },
      { name: "Sarah's iPhone 16", os: "iOS 18.3", status: "secure" },
      { name: "Alex's Windows Laptop", os: "Windows 11", status: "warning", reason: "Defender disabled" },
      { name: "Emma's iPad", os: "iPadOS 18", status: "secure" },
      { name: "John's iPhone 16", os: "iOS 18.3", status: "secure" },
      { name: "Family iMac", os: "macOS 15.2", status: "secure" },
    ],
  },
  {
    id: 4,
    icon: "🔑",
    title: "Password & Account Security",
    status: "warning",
    statusText: "Issues found",
    metrics: [
      { label: "Reused passwords", value: 7 },
      { label: "Weak passwords", value: 3 },
      { label: "Without MFA", value: 4 },
      { label: "Compromised", value: 2 },
    ],
    issues: [
      { severity: "critical", text: "Netflix password reused on 4 accounts" },
      { severity: "critical", text: "Bank password is same as email" },
      { severity: "warning", text: "Facebook has no MFA enabled" },
      { severity: "warning", text: "Gmail has no MFA enabled" },
    ],
  },
  {
    id: 5,
    icon: "👶",
    title: "Family Safety",
    status: "secure",
    statusText: "Children protected",
    children: [
      { name: "Alex (16)", contentFilter: true, safeSearch: true, socialMedia: "monitored", limit: "6h", today: "4h 12m", ok: true },
      { name: "Emma (9)", contentFilter: true, safeSearch: true, appApproval: true, limit: "3h", today: "2h 3m", ok: true },
    ],
    alert: "Attempted blocked site: roblox-hack.com — blocked 2h ago",
  },
  {
    id: 6,
    icon: "📡",
    title: "Network Protection",
    status: "secure",
    statusText: "Network secure",
    router: "TP-Link AX6000 — Firmware: Up to date",
    dns: "ACTIVE — 47 malicious domains blocked today",
    guest: "Isolated from main network",
    vpn: false,
    parental: "Active for children's devices",
    alert: "A malicious site was blocked 4 hours ago",
  },
];

const recentActivity = [
  { time: "2h ago", severity: "critical", text: "Malicious website blocked for Emma's iPad (roblox-hack.com)" },
  { time: "3h ago", severity: "warning", text: "Alex's screen time limit approaching (4h 12m of 6h limit)" },
  { time: "5h ago", severity: "secure", text: "Identity scan complete — no new breaches detected" },
  { time: "6h ago", severity: "warning", text: "Samsung Smart TV firmware update available" },
  { time: "8h ago", severity: "secure", text: "Network scan complete — 23 devices, 3 issues flagged" },
  { time: "12h ago", severity: "critical", text: "Sarah's email found in new breach data — action required" },
  { time: "1d ago", severity: "secure", text: "VPN connected — browsing secured for 2 hours" },
  { time: "1d ago", severity: "warning", text: "Ring Doorbell still using default password — reminder" },
  { time: "2d ago", severity: "secure", text: "All family passwords checked — 7 reuses found" },
  { time: "2d ago", severity: "secure", text: "Weekly security report generated" },
];

export default function ShieldHome() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Home className="w-6 h-6" style={{ color: GOLD }} />
            ShieldAI Home
          </h1>
          <p className="text-slate-400 mt-1">Complete digital protection for your family — devices, accounts, identity, and smart home</p>
        </div>
        <div className="px-6 py-3 rounded-xl bg-green-500/10 border border-green-500/30">
          <div className="text-sm text-slate-400">Home Security Score</div>
          <div className="text-2xl font-bold text-green-400">74/100</div>
          <div className="text-xs text-green-400">Your home is well protected</div>
        </div>
      </div>

      {/* Family Members */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {familyMembers.map((member, idx) => (
          <Card key={idx} className="p-4 bg-[#111827] border border-gray-800 hover:border-yellow-600/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{member.icon}</span>
              <div>
                <div className="font-semibold text-white">{member.name}</div>
                <div className="text-xs text-slate-500">{member.role}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${member.color === "green" ? "bg-green-400" : "bg-amber-400"}`} />
              <span className="text-xs text-slate-300">{member.statusText}</span>
            </div>
            <div className="text-xs text-slate-500">Last scan: {member.lastScan}</div>
          </Card>
        ))}
        <Button className="h-full border-2 border-yellow-600 bg-transparent text-yellow-400 hover:bg-yellow-600/10" variant="outline">
          + Add Family Member
        </Button>
      </div>

      {/* Protection Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {protectionModules.map((module) => (
          <Card key={module.id} className="p-5 bg-[#111827] border border-gray-800 hover:border-yellow-600/50 hover:shadow-yellow-900/20 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{module.icon}</span>
                <h3 className="font-semibold text-white">{module.title}</h3>
              </div>
              <Badge className={module.status === "secure" ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}>
                {module.statusText}
              </Badge>
            </div>
            <p className="text-sm text-slate-400 mb-4">{module.description}</p>
            
            {module.devices && (
              <div className="space-y-2 mb-4">
                {module.devices.slice(0, 5).map((device, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{device.name}</span>
                    <div className="flex items-center gap-1">
                      {device.status === "secure" ? (
                        <CheckCircle className="w-3 h-3 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                      )}
                      {device.reason && <span className="text-slate-500">{device.reason}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {module.data && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {module.data.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {item.status === "secure" ? (
                      <CheckCircle className="w-3 h-3 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                    )}
                    <span className="text-slate-300">{item.type}</span>
                  </div>
                ))}
              </div>
            )}

            {module.metrics && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {module.metrics.map((metric, idx) => (
                  <div key={idx} className="px-2 py-1.5 rounded-lg bg-gray-800 text-center">
                    <div className="text-lg font-bold text-white">{metric.value}</div>
                    <div className="text-[10px] text-slate-500">{metric.label}</div>
                  </div>
                ))}
              </div>
            )}

            {module.issues && (
              <div className="space-y-2 mb-4">
                {module.issues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    {issue.severity === "critical" ? (
                      <div className="w-2 h-2 rounded-full bg-red-400 mt-1" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-amber-400 mt-1" />
                    )}
                    <span className="text-slate-300">{issue.text}</span>
                  </div>
                ))}
              </div>
            )}

            {module.children && (
              <div className="space-y-3 mb-4">
                {module.children.map((child, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-gray-800">
                    <div className="text-xs font-semibold text-white mb-1">{child.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      {child.contentFilter && <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-[8px]">Content Filter</Badge>}
                      {child.safeSearch && <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-[8px]">Safe Search</Badge>}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Limit: {child.limit} | Today: {child.today}</div>
                  </div>
                ))}
              </div>
            )}

            {module.alert && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {module.alert}
              </div>
            )}

            <Button className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-semibold">
              {module.id === 1 ? "Scan Home Network" : module.id === 2 ? "Change Password Now" : module.id === 3 ? "Scan All Devices" : module.id === 4 ? "Fix All Issues" : module.id === 5 ? "Manage Controls" : "Enable ShieldAI VPN"}
            </Button>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="p-5 bg-[#111827] border border-gray-800">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5" style={{ color: GOLD }} />
          Recent Family Security Events
        </h3>
        <div className="space-y-2">
          {recentActivity.map((event, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-800/50 transition-all">
              <span className="text-xs text-slate-500 w-16">{event.time}</span>
              <div className={`w-2 h-2 rounded-full ${event.severity === "critical" ? "bg-red-400" : event.severity === "warning" ? "bg-amber-400" : "bg-green-400"}`} />
              <span className="text-slate-300 flex-1">{event.text}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="text-xs text-slate-600 text-center">Last updated: {new Date().toLocaleString()} | Powered by real data</div>
    </div>
  );
}