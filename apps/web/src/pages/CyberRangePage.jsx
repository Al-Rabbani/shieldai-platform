import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Target, Trophy, Users, Clock, Zap, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";

const GOLD = "#C9A84C";

const SIMULATIONS = [
  { id: 1, name: "Ransomware Full Kill Chain", category: "critical", description: "Simulates complete ransomware attack: initial access → privilege escalation → lateral movement → encryption", duration: "45 min", complexity: "Expert", mitre: ["T1566", "T1078", "T1021", "T1486"], lastRun: null, score: null },
  { id: 2, name: "Nation-State APT Campaign", category: "critical", description: "Advanced persistent threat simulation using Lazarus Group and APT29 TTPs", duration: "60 min", complexity: "Expert", mitre: ["T1190", "T1133", "T1098"], lastRun: "14d ago", score: 42 },
  { id: 3, name: "Supply Chain Attack", category: "critical", description: "Malicious package injection propagating through dependency tree to production", duration: "20 min", complexity: "Advanced", mitre: ["T1195", "T1554"], lastRun: "7d ago", score: 67 },
  { id: 4, name: "OWASP Top 10 Battery", category: "high", description: "Comprehensive web application security testing across all OWASP Top 10 vulnerabilities", duration: "30 min", complexity: "Intermediate", mitre: ["T1190", "T1059"], lastRun: "3d ago", score: 78 },
  { id: 5, name: "Container Escape + K8s", category: "high", description: "Simulate container breakout and Kubernetes cluster compromise", duration: "25 min", complexity: "Advanced", mitre: ["T1611", "T1565"], lastRun: null, score: null },
  { id: 6, name: "IAM Privilege Escalation", category: "high", description: "Cloud IAM privilege escalation chain simulation", duration: "15 min", complexity: "Intermediate", mitre: ["T1078", "T1098"], lastRun: "5d ago", score: 85 },
  { id: 7, name: "Phishing Response Drill", category: "training", description: "Team response exercise for phishing campaign detection and containment", duration: "20 min", complexity: "Beginner", mitre: ["T1566"], lastRun: "2d ago", score: 91 },
  { id: 8, name: "Vulnerability Patch Race", category: "training", description: "Race against time to patch critical vulnerability before simulated exploit", duration: "30 min", complexity: "Intermediate", mitre: ["T1190"], lastRun: null, score: null },
  { id: 9, name: "SOC Alert Triage Challenge", category: "training", description: "Analyst certification: triage and respond to realistic alert scenarios", duration: "45 min", complexity: "Intermediate", mitre: ["T1071"], lastRun: "1d ago", score: 88 },
];

const TRAINING_CHALLENGES = [
  { id: 1, name: "Find the Hidden Backdoor", type: "CTF", difficulty: "Intermediate", points: 250, description: "Analyze this Node.js app and find the malicious backdoor" },
  { id: 2, name: "Hospital Ransomware IR", type: "IR Drill", difficulty: "Advanced", points: 500, description: "60-minute incident response exercise: contain and recover" },
  { id: 3, name: "AWS Cloud Hunt", type: "Blue Team", difficulty: "Expert", points: 750, description: "An attacker is in your AWS account — find and evict them" },
  { id: 4, name: "SOC Tier 1 Certification", type: "Cert Track", difficulty: "Intermediate", points: 1000, description: "8-module certification track for SOC analysts" },
  { id: 5, name: "Secure Code Review", type: "DevSec", difficulty: "Beginner", points: 150, description: "Identify security vulnerabilities in this codebase" },
  { id: 6, name: "Defend the API", type: "Blue Team", difficulty: "Advanced", points: 600, description: "Protect the API under active automated attack" },
];

const LEADERBOARD = [
  { rank: 1, name: "Sarah Chen", points: 4250, badge: "🏆 Elite Hunter" },
  { rank: 2, name: "Marcus Johnson", points: 3890, badge: "🥈 Senior Analyst" },
  { rank: 3, name: "Priya Patel", points: 3420, badge: "🥈 Senior Analyst" },
  { rank: 4, name: "Alex Rivera", points: 2980, badge: "🥉 Analyst" },
  { rank: 5, name: "Jordan Kim", points: 2650, badge: "🥉 Analyst" },
];

export default function CyberRangePage() {
  const [activeTab, setActiveTab] = useState("twin");
  const [selectedSim, setSelectedSim] = useState(null);

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}`}</style>

      {/* Header */}
      <div className="fu flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Link to="/executive-dashboard" className="hover:text-white">Overview</Link><span>/</span>
            <span style={{ color: GOLD }}>Cyber Range</span>
          </div>
          <h1 className="text-2xl font-black text-white">Cyber Range & Digital Twin</h1>
          <p className="text-slate-400 text-sm mt-0.5">Simulate attacks against your exact infrastructure — safely, before attackers do it for real</p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Simulations Run", value: "23", icon: Target },
            { label: "Vulns Found", value: "47", icon: AlertTriangle },
            { label: "Training Sessions", value: "8", icon: Users },
            { label: "Defense Score", value: "61", icon: Shield },
          ].map((stat, i) => (
            <div key={i} className="rounded-lg px-3 py-2 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
              <div className="text-lg font-black text-white">{stat.value}</div>
              <div className="text-[9px] text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="fu flex items-center gap-2 border-b" style={{ borderColor: "#1F2937", animationDelay: "100ms" }}>
        {[
          { id: "twin", label: "My Digital Twin" },
          { id: "sims", label: "Attack Simulations" },
          { id: "training", label: "Security Training" },
          { id: "validation", label: "Defense Validation" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${activeTab === tab.id ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
            style={{ borderColor: activeTab === tab.id ? GOLD : "transparent" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Digital Twin */}
      {activeTab === "twin" && (
        <div className="fu space-y-6" style={{ animationDelay: "150ms" }}>
          <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Infrastructure Topology</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400">✅ Twin synchronized — Last sync: 14m ago</span>
                <button className="px-3 py-1.5 rounded-lg text-xs font-bold border" style={{ borderColor: "#374151", color: "#9CA3AF" }}>Sync Now</button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Row 1: Internet */}
              <div className="lg:col-span-5 flex justify-center mb-2">
                <div className="px-4 py-2 rounded-lg border-2 flex items-center gap-2" style={{ background: "#1F2937", borderColor: "#ef4444" }}>
                  <span className="text-xl">🌐</span>
                  <span className="text-sm font-bold text-white">Internet</span>
                </div>
              </div>
              {/* Row 2: Edge */}
              <div className="lg:col-span-5 grid grid-cols-3 gap-4">
                {["API Gateway", "Web App", "CDN"].map((node, i) => (
                  <div key={i} className="px-4 py-3 rounded-lg border flex items-center justify-between" style={{ background: "#111827", borderColor: "#374151" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-bold text-white">{node}</span>
                    </div>
                    <span className="text-[9px] text-slate-500">0 findings</span>
                  </div>
                ))}
              </div>
              {/* Row 3: Services */}
              <div className="lg:col-span-5 grid grid-cols-3 gap-4">
                {["Auth Service", "Payment Service", "Data Service"].map((node, i) => (
                  <div key={i} className="px-4 py-3 rounded-lg border flex items-center justify-between" style={{ background: "#111827", borderColor: i === 1 ? "#f97316" : "#374151" }}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${i === 1 ? "bg-orange-500" : "bg-emerald-500"}`} />
                      <span className="text-sm font-bold text-white">{node}</span>
                    </div>
                    <span className={`text-[9px] ${i === 1 ? "text-orange-400" : "text-slate-500"}`}>{i === 1 ? "2 findings" : "0 findings"}</span>
                  </div>
                ))}
              </div>
              {/* Row 4: Data */}
              <div className="lg:col-span-5 grid grid-cols-3 gap-4">
                {["PostgreSQL DB", "Redis Cache", "S3 Storage"].map((node, i) => (
                  <div key={i} className="px-4 py-3 rounded-lg border flex items-center justify-between" style={{ background: "#111827", borderColor: "#374151" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-bold text-white">{node}</span>
                    </div>
                    <span className="text-[9px] text-slate-500">0 findings</span>
                  </div>
                ))}
              </div>
              {/* Row 5: Cloud */}
              <div className="lg:col-span-5 flex justify-center mt-2">
                <div className="px-6 py-3 rounded-lg border flex items-center gap-2" style={{ background: "#111827", borderColor: "#3b82f6" }}>
                  <span className="text-xl">☁️</span>
                  <span className="text-sm font-bold text-white">AWS Account (prod)</span>
                  <span className="text-[9px] text-slate-500">• 3 misconfigs</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-xs text-slate-400">Twin Coverage:</div>
                <div className="w-48 h-2 rounded-full bg-[#1F2937] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: "78%", background: GOLD }} />
                </div>
                <span className="text-xs font-bold" style={{ color: GOLD }}>78%</span>
              </div>
              <div className="text-xs text-slate-500">34 nodes mapped • 12 services • 8 data stores</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Simulations */}
      {activeTab === "sims" && (
        <div className="fu space-y-6" style={{ animationDelay: "150ms" }}>
          {["critical", "high", "training"].map(category => (
            <div key={category}>
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                {category === "critical" ? "🔴" : category === "high" ? "🟠" : "🟡"} {category.toUpperCase()} SIMULATIONS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SIMULATIONS.filter(s => s.category === category).map((sim, i) => (
                  <div key={sim.id} className="rounded-xl p-4 border transition-all hover:scale-[1.02]" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: `${150 + i * 50}ms` }}>
                    <h4 className="text-sm font-bold text-white mb-2">{sim.name}</h4>
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{sim.description}</p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: "#1F2937", color: "#9CA3AF" }}>{sim.duration}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded ${sim.complexity === "Expert" ? "text-red-400 bg-red-900/20" : sim.complexity === "Advanced" ? "text-orange-400 bg-orange-900/20" : "text-blue-400 bg-blue-900/20"}`}>{sim.complexity}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {sim.mitre.map(m => (
                        <span key={m} className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: "#1F2937", color: "#6B7280" }}>{m}</span>
                      ))}
                    </div>
                    {sim.lastRun && (
                      <div className="mb-3 text-xs text-slate-500">Last run: {sim.lastRun} • Score: <span className={`font-bold ${sim.score >= 80 ? "text-emerald-400" : sim.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>{sim.score}/100</span></div>
                    )}
                    <button className="w-full px-4 py-2 rounded-lg text-xs font-bold text-black" style={{ background: category === "critical" ? "#ef4444" : category === "high" ? "#f97316" : GOLD }}>
                      {sim.lastRun ? "Run Again" : "Run Simulation"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Training */}
      {activeTab === "training" && (
        <div className="fu grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ animationDelay: "150ms" }}>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {TRAINING_CHALLENGES.map((challenge, i) => (
              <div key={challenge.id} className="rounded-xl p-4 border transition-all hover:scale-[1.02]" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: `${150 + i * 50}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded ${challenge.difficulty === "Expert" ? "text-red-400 bg-red-900/20" : challenge.difficulty === "Advanced" ? "text-orange-400 bg-orange-900/20" : "text-blue-400 bg-blue-900/20"}`}>{challenge.difficulty}</span>
                  <span className="text-xs font-bold" style={{ color: GOLD }}>{challenge.points} pts</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">{challenge.name}</h4>
                <p className="text-xs text-slate-400 mb-3">{challenge.description}</p>
                <button className="w-full px-4 py-2 rounded-lg text-xs font-bold border" style={{ borderColor: "#374151", color: "#9CA3AF" }}>Start Challenge</button>
              </div>
            ))}
          </div>
          <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Trophy className="w-4 h-4" style={{ color: GOLD }} /> Leaderboard</h3>
            <div className="space-y-3">
              {LEADERBOARD.map((user, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: i < 3 ? GOLD + "15" : "#1F2937" }}>
                  <span className="text-lg font-black" style={{ color: i === 0 ? GOLD : i === 1 ? "#9CA3AF" : "#b45309" }}>#{user.rank}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{user.name}</div>
                    <div className="text-[9px] text-slate-500">{user.badge}</div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: GOLD }}>{user.points.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Validation */}
      {activeTab === "validation" && (
        <div className="fu max-w-3xl mx-auto space-y-6" style={{ animationDelay: "150ms" }}>
          <div className="rounded-xl border p-6" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <h3 className="text-sm font-bold text-white mb-4">Defense Validation Test</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block">Select a Finding to Validate</label>
                <select className="w-full px-4 py-2.5 rounded-lg text-sm bg-[#1F2937] border border-gray-700 text-white">
                  <option>SQL Injection in /api/users (CRITICAL)</option>
                  <option>XSS in search parameter (HIGH)</option>
                  <option>Hardcoded credentials in config (HIGH)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block">Describe Proposed Fix</label>
                <textarea className="w-full px-4 py-3 rounded-lg text-sm bg-[#1F2937] border border-gray-700 text-white" rows={4} placeholder="Describe the remediation you've implemented..." />
              </div>
              <button className="w-full px-6 py-3 rounded-lg text-sm font-bold text-black" style={{ background: GOLD }}>
                Run Validation Test
              </button>
            </div>
          </div>
          <div className="rounded-xl border p-6" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <h3 className="text-sm font-bold text-white mb-4">Recent Validations</h3>
            <div className="space-y-3">
              {[
                { finding: "XSS in comment form", result: "PASS", date: "2h ago" },
                { finding: "IDOR in user profile", result: "FAIL", date: "1d ago" },
                { finding: "SQL injection in search", result: "PASS", date: "3d ago" },
              ].map((v, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#1F2937" }}>
                  <div>
                    <div className="text-sm font-bold text-white">{v.finding}</div>
                    <div className="text-xs text-slate-500">{v.date}</div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded ${v.result === "PASS" ? "text-emerald-400 bg-emerald-900/20" : "text-red-400 bg-red-900/20"}`}>{v.result}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}