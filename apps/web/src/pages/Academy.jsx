import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Trophy, Flame, Star, Lock, Play, BookOpen, Award, Users } from "lucide-react";
import Breadcrumb from "@/components/shared/Breadcrumb";
import PageFooter from "@/components/shared/PageFooter";

const GOLD = "#C9A84C";

const PATHS = [
  { id: 1, icon: "🔰", name: "Security Fundamentals", level: "Beginner", hours: 8, modules: 12, desc: "Everything you need to understand cybersecurity from scratch", topics: ["OWASP Top 10", "CVSS Scoring", "Attack Surface", "Defense Basics"], cert: "ShieldAI Security Associate", progress: 100, enrolled: 8247, completed: true },
  { id: 2, icon: "💻", name: "Secure Developer", level: "Intermediate", hours: 12, modules: 18, desc: "Write secure code from day one", topics: ["Secure Coding", "Dependencies", "Secrets", "CI/CD"], cert: "ShieldAI Certified Secure Developer", progress: 34, enrolled: 6891, completed: false },
  { id: 3, icon: "☁️", name: "Cloud Security Pro", level: "Intermediate", hours: 15, modules: 22, desc: "Master AWS, Azure, and GCP security", topics: ["IAM", "CSPM", "Containers", "K8s"], cert: "ShieldAI Cloud Security Professional", progress: 0, enrolled: 5234, completed: false },
  { id: 4, icon: "🎯", name: "SOC Analyst", level: "Advanced", hours: 20, modules: 28, desc: "Become a threat hunter and incident responder", topics: ["Alert Triage", "Threat Hunting", "Incident Response", "MITRE ATT&CK"], cert: "ShieldAI Certified SOC Analyst", progress: 0, enrolled: 4127, completed: false },
  { id: 5, icon: "🔴", name: "Ethical Hacker", level: "Advanced", hours: 25, modules: 35, desc: "Learn to think like an attacker", topics: ["Recon", "Web Attacks", "Network Pentest", "Exploits"], cert: "ShieldAI Certified Ethical Hacker", progress: 0, enrolled: 3891, completed: false, popular: true },
  { id: 6, icon: "👔", name: "CISO Leadership", level: "Executive", hours: 10, modules: 14, desc: "Lead your security program with confidence", topics: ["Strategy", "Risk", "Board Reporting", "Teams"], cert: "ShieldAI Security Leadership Certificate", progress: 0, enrolled: 2347, completed: false },
];

const BADGES = [
  { id: 1, icon: "🛡️", name: "First Defender", desc: "Completed first scan", earned: true, date: "30 days ago" },
  { id: 2, icon: "🎓", name: "Graduate", desc: "Completed Security Fundamentals", earned: true, date: "14 days ago" },
  { id: 3, icon: "🔥", name: "On Fire", desc: "7-day learning streak", earned: true, date: "Today" },
  { id: 4, icon: "🕵️", name: "Threat Hunter", desc: "Complete SOC Analyst path", earned: false },
  { id: 5, icon: "🏆", name: "Security Champion", desc: "Score 90+ overall", earned: false },
  { id: 6, icon: "💀", name: "Zero Critical", desc: "Resolve all criticals", earned: false },
  { id: 7, icon: "☁️", name: "Cloud Master", desc: "Complete Cloud Pro path", earned: false },
  { id: 8, icon: "🔴", name: "Red Teamer", desc: "Complete Ethical Hacker", earned: false },
];

const LABS = [
  { id: 1, name: "Find the SQL Injection", level: "Beginner", xp: 150, desc: "Analyze this vulnerable Node.js app" },
  { id: 2, name: "The Compromised AWS Account", level: "Advanced", xp: 500, desc: "Stop the attacker in your AWS" },
  { id: 3, name: "Ransomware Response Drill", level: "Expert", xp: 750, desc: "Your hospital is under attack" },
];

const LEADERBOARD = [
  { rank: 1, name: "Sarah K.", xp: 12847, level: "Gold" },
  { rank: 2, name: "James M.", xp: 9234, level: "Gold" },
  { rank: 3, name: "Priya R.", xp: 8891, level: "Silver" },
  { rank: 4, name: "Alex T.", xp: 7234, level: "Silver" },
  { rank: 5, name: "Maria G.", xp: 6891, level: "Silver" },
  { rank: 6, name: "David L.", xp: 6234, level: "Bronze" },
  { rank: 7, name: "Emma W.", xp: 5891, level: "Bronze" },
  { rank: 8, name: "Chris P.", xp: 5234, level: "Bronze" },
  { rank: 9, name: "Lisa M.", xp: 4891, level: "Bronze" },
  { rank: 10, name: "Tom H.", xp: 4234, level: "Bronze" },
];

const radarData = [
  { subject: "Code Security", A: 85, fullMark: 100 },
  { subject: "Cloud", A: 72, fullMark: 100 },
  { subject: "Threat Intel", A: 65, fullMark: 100 },
  { subject: "Runtime", A: 78, fullMark: 100 },
  { subject: "AI Security", A: 58, fullMark: 100 },
  { subject: "Governance", A: 82, fullMark: 100 },
];

export default function Academy() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      <Breadcrumb items={[{ label: "Academy", path: "/academy" }]} />
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🎓 ShieldAI Academy
          </h1>
          <p className="text-slate-400 mt-1">Master cybersecurity — from developer to CISO. Earn certifications that matter.</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">24,847 Learners</Badge>
          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30">340+ Hours</Badge>
          <Badge className="bg-green-500/10 text-green-400 border-green-500/30">12,847 Certifications</Badge>
        </div>
      </div>

      {/* My Learning Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 bg-[#111827] border border-gray-800 lg:col-span-1">
          <h3 className="font-semibold text-white mb-4">Welcome back!</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-600/20 to-yellow-600/5 border border-yellow-600/30">
              <div className="text-sm font-semibold text-white mb-2">Cloud Security Professional</div>
              <Progress value={34} className="h-2 mb-2" />
              <div className="text-xs text-slate-400 mb-3">34% complete</div>
              <Button className="w-full bg-yellow-600 hover:bg-yellow-500 text-black text-xs">Continue Learning</Button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50">
              <Flame className="w-5 h-5 text-orange-400" />
              <div>
                <div className="text-sm font-semibold text-white">7-day streak</div>
                <div className="text-xs text-slate-400">Keep it up!</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
              <div>
                <div className="text-xs text-slate-400">Points this week</div>
                <div className="text-lg font-bold text-white">840 XP</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Next milestone</div>
                <div className="text-xs text-yellow-400">500 XP until Silver</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-[#111827] border border-gray-800 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Progress Overview</h3>
            <div className="flex gap-4 text-xs">
              <div><span className="text-slate-400">Courses:</span> <span className="text-white font-bold">2</span></div>
              <div><span className="text-slate-400">Completed:</span> <span className="text-white font-bold">1</span></div>
              <div><span className="text-slate-400">Total XP:</span> <span className="text-white font-bold">3,840</span></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius={80} data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                  <Radar name="Skills" dataKey="A" stroke={GOLD} fill={GOLD} fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-gray-800/50">
                <div className="text-xs text-slate-400">Current Rank</div>
                <div className="text-lg font-bold text-white">Security Apprentice</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-800/50">
                <div className="text-xs text-slate-400">Certificates Earned</div>
                <div className="text-lg font-bold text-green-400">1 ✓</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Learning Paths */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Learning Paths</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PATHS.map(path => (
            <Card key={path.id} className={`p-5 bg-[#111827] border border-gray-800 hover:border-yellow-600/50 transition-all ${path.completed ? "border-green-500/30 bg-green-500/5" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{path.icon}</span>
                  <div>
                    <div className="font-semibold text-white">{path.name}</div>
                    <div className="text-xs text-slate-500">{path.level} · {path.hours}h · {path.modules} modules</div>
                  </div>
                </div>
                {path.popular && <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 text-xs">Most Popular</Badge>}
              </div>
              <p className="text-xs text-slate-400 mb-3">{path.desc}</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {path.topics.map((t, i) => (
                  <Badge key={i} className="bg-gray-800 text-slate-400 border-gray-700 text-[9px]">{t}</Badge>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-gray-800/50 mb-4">
                <div className="text-xs text-slate-500 mb-1">Certificate</div>
                <div className="text-xs font-semibold text-white">{path.cert}</div>
              </div>
              {path.completed ? (
                <div className="flex items-center justify-between">
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/30">✓ Completed</Badge>
                  <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white text-xs h-8">View Certificate</Button>
                </div>
              ) : path.progress > 0 ? (
                <>
                  <Progress value={path.progress} className="h-2 mb-3" />
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="text-slate-400">{path.progress}% complete</span>
                    <span className="text-slate-500">{path.enrolled.toLocaleString()} enrolled</span>
                  </div>
                  <Button className="w-full bg-yellow-600 hover:bg-yellow-500 text-black text-sm">Continue</Button>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{path.enrolled.toLocaleString()} enrolled</span>
                  <Button className="bg-yellow-600 hover:bg-yellow-500 text-black text-sm">Enroll Free</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Achievements & Labs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 bg-[#111827] border border-gray-800">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" style={{ color: GOLD }} />
            Your Achievements
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {BADGES.map(badge => (
              <div key={badge.id} className={`p-3 rounded-lg text-center ${badge.earned ? "bg-yellow-600/10 border border-yellow-600/30" : "bg-gray-800/50 grayscale opacity-50"}`}>
                <div className="text-2xl mb-1">{badge.icon}</div>
                <div className="text-[10px] font-semibold text-white">{badge.name}</div>
                <div className="text-[9px] text-slate-500">{badge.earned ? badge.date : "🔒 Locked"}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 bg-[#111827] border border-gray-800">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-red-400" />
            Hands-On Labs
          </h3>
          <div className="space-y-3">
            {LABS.map(lab => (
              <div key={lab.id} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-white text-sm">{lab.name}</div>
                  <Badge className={lab.level === "Beginner" ? "bg-green-500/10 text-green-400" : lab.level === "Advanced" ? "bg-orange-500/10 text-orange-400" : "bg-red-500/10 text-red-400"}>
                    {lab.xp} XP
                  </Badge>
                </div>
                <div className="text-xs text-slate-400 mb-3">{lab.desc}</div>
                <Button size="sm" className="bg-yellow-600 hover:bg-yellow-500 text-black text-xs w-full">Start Lab</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="p-5 bg-[#111827] border border-gray-800">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          This Month's Top Learners
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {LEADERBOARD.map((u, i) => (
            <div key={u.rank} className={`p-3 rounded-lg border ${i === 0 ? "bg-yellow-600/10 border-yellow-600/30" : i < 3 ? "bg-gray-800/50 border-gray-700" : "bg-gray-900/50 border-gray-800"}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-600 text-black" : i === 1 ? "bg-gray-400 text-black" : i === 2 ? "bg-amber-600 text-black" : "bg-gray-700 text-white"}`}>
                  {u.rank}
                </div>
                <div className="font-semibold text-white text-sm truncate">{u.name}</div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{u.xp.toLocaleString()} XP</span>
                <Badge className={u.level === "Gold" ? "bg-yellow-600/20 text-yellow-400" : u.level === "Silver" ? "bg-gray-600/20 text-gray-400" : "bg-amber-600/20 text-amber-400"}>{u.level}</Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg border-2" style={{ borderColor: GOLD, background: GOLD + "10" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: GOLD }}>47</div>
              <span className="text-sm font-semibold text-white">Your rank</span>
            </div>
            <span className="text-sm" style={{ color: GOLD }}>5,234 XP</span>
          </div>
        </div>
      </Card>

      <PageFooter />
    </div>
  );
}