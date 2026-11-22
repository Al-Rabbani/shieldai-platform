import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { CreditCard, TrendingUp, Calendar, Zap, Brain, Target, Monitor, Cloud, Shield, Plus, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const FEATURE_COSTS = [
  { feature: "AI Code Audit", cost: "~120 credits/repo", icon: Brain },
  { feature: "AI Pentest", cost: "~85 credits/target", icon: Target },
  { feature: "Infinite Pentest", cost: "~45 credits/deploy", icon: Zap },
  { feature: "Container Scan", cost: "2 credits", icon: Monitor },
  { feature: "VM Scan", cost: "2 credits", icon: Cloud },
  { feature: "DAST Scan", cost: "5 credits", icon: Shield },
];

export default function Credits() {
  const [showCosts, setShowCosts] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState(500);

  // Mock usage data (would come from backend)
  const usageData = [
    { day: "Jun 1", credits: 145 },
    { day: "Jun 2", credits: 89 },
    { day: "Jun 3", credits: 234 },
    { day: "Jun 4", credits: 178 },
    { day: "Jun 5", credits: 312 },
    { day: "Jun 6", credits: 156 },
    { day: "Jun 7", credits: 201 },
    { day: "Jun 8", credits: 267 },
    { day: "Jun 9", credits: 189 },
  ];

  const usageBreakdown = [
    { feature: "AI Code Audit (api-core)", credits: 120, lastUsed: "2h ago", costPerRun: 120 },
    { feature: "AI Pentest (production API)", credits: 85, lastUsed: "1 day ago", costPerRun: 85 },
    { feature: "Infinite Pentest (on deploy)", credits: 45, lastUsed: "30min ago", costPerRun: 45 },
    { feature: "Container Scans", credits: 12, lastUsed: "6h ago", costPerRun: 2 },
    { feature: "VM Scans", credits: 8, lastUsed: "6h ago", costPerRun: 2 },
  ];

  const totalUsed = usageBreakdown.reduce((sum, item) => sum + item.credits, 0);
  const monthlyAllowance = 3000;
  const remaining = monthlyAllowance - totalUsed;
  const percentageUsed = Math.round((totalUsed / monthlyAllowance) * 100);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Wallet & Credits</h1>
        <p className="text-sm text-slate-500 mt-1">Track your ShieldAI credit usage across all features.</p>
      </div>

      {/* Credit Balance Card */}
      <div className="rounded-xl p-6" style={{ 
        background: "linear-gradient(145deg, #0f172a, #0a0f1e)",
        border: "1px solid rgba(59,130,246,0.3)",
      }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mb-2">Current Balance</p>
            <p className="text-4xl font-black font-mono" style={{ color: "#3b82f6" }}>{remaining.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">credits</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">Monthly Allowance</p>
            <p className="text-lg font-bold text-white">{monthlyAllowance.toLocaleString()} credits</p>
            <div className="flex items-center gap-2 mt-2 justify-end">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span className="text-xs text-slate-400">Resets July 1, 2026</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">{totalUsed.toLocaleString()} / {monthlyAllowance.toLocaleString()} used</span>
            <span className="text-xs font-mono font-bold" style={{ color: percentageUsed > 80 ? "#ef4444" : percentageUsed > 50 ? "#f59e0b" : "#10b981" }}>
              {percentageUsed}% remaining
            </span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${percentageUsed}%`,
                background: percentageUsed > 80 ? "#ef4444" : percentageUsed > 50 ? "#f59e0b" : "#10b981",
              }}
            />
          </div>
        </div>

        {/* Purchase Button */}
        <div className="mt-6 flex items-center gap-3">
          <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
            <DialogTrigger asChild>
              <Button className="h-9 text-sm bg-emerald-600 hover:bg-emerald-500">
                <Plus className="w-4 h-4 mr-2" /> Purchase Credits
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Purchase Credits</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Amount (min 500)</label>
                  <Input
                    type="number"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(Math.max(500, parseInt(e.target.value) || 500))}
                    className="h-10"
                    min={500}
                  />
                </div>
                <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Price Calculator</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-sm text-white font-semibold">
                    {purchaseAmount} credits = ${purchaseAmount * 0.1}
                    {purchaseAmount >= 5000 && " (20% off)"}
                    {purchaseAmount >= 1000 && purchaseAmount < 5000 && " (10% off)"}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">Payment Method:</p>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 rounded-lg text-xs font-medium bg-indigo-600 text-white border border-indigo-500">Credit Card</button>
                    <button className="flex-1 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">Invoice</button>
                  </div>
                </div>
                <Button
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-500"
                  onClick={() => {
                    toast.success(`Purchased ${purchaseAmount} credits for $${purchaseAmount * 0.1}`);
                    setShowPurchaseModal(false);
                  }}
                >
                  Confirm Purchase
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <p className="text-xs text-slate-500">Invoice payment available for enterprise plans</p>
        </div>
      </div>

      {/* Usage Chart + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Credits Used (Last 9 Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.3)" />
              <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#0f172a", 
                  border: "1px solid rgba(30,58,95,0.4)", 
                  borderRadius: 8,
                  color: "#f8fafc",
                  fontSize: 11,
                }} 
              />
              <Bar dataKey="credits" fill="#3b82f6" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown Table */}
        <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Usage Breakdown</h3>
          <div className="space-y-3">
            {usageBreakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "rgba(30,58,95,0.2)" }}>
                <div>
                  <p className="text-xs text-white font-medium">{item.feature}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Last used: {item.lastUsed} • {item.costPerRun} credits/run</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-400">{item.credits}</p>
                  <p className="text-[10px] text-slate-500">credits</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Credit Costs Reference */}
      <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        <button
          onClick={() => setShowCosts(!showCosts)}
          className="flex items-center justify-between w-full mb-4"
        >
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-white">Credit Costs Reference</h3>
          </div>
          <span className="text-xs text-blue-400">{showCosts ? "Hide" : "Show"}</span>
        </button>
        
        {showCosts && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURE_COSTS.map((item, i) => (
              <div key={i} className="rounded-lg p-3" style={{ background: "#161b22", border: "1px solid rgba(30,58,95,0.3)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-medium text-white">{item.feature}</span>
                </div>
                <p className="text-xs text-slate-500">{item.cost}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="rounded-xl p-4" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)" }}>
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-blue-400">Note:</span> Integration credits are currently exhausted for this workspace. 
          Functionality requiring credits will be unavailable until the reset on <span className="font-mono">2026-06-20</span> or until upgrading to a higher tier.
        </p>
      </div>
    </div>
  );
}