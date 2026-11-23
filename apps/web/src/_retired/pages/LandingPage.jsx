import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Check, X, AlertTriangle, ChevronRight, Code, Cloud, Sword, ShieldCheck, Brain, ClipboardCheck, Star } from "lucide-react";

const GOLD = "#C9A84C";

const PILLARS = [
  { icon: Code, title: "Code Security", color: "#3b82f6", features: "SAST · SCA · Secrets · IaC · Reachability · Breaking Changes" },
  { icon: Cloud, title: "Cloud Security", color: "#f97316", features: "CSPM · CIEM · DSPM · Attack Paths · Security Graph" },
  { icon: Sword, title: "Attack Surface", color: "#ef4444", features: "DAST · API Fuzzing · Pentest · Reachability Analysis" },
  { icon: ShieldCheck, title: "Runtime Protection", color: "#22c55e", features: "Zen Firewall · Bot Defense · Supply Chain · Device Protection" },
  { icon: Brain, title: "AI Security", color: "#8b5cf6", features: "AI-SPM · MCP Governance · Prompt Injection · LLM Monitoring" },
  { icon: ClipboardCheck, title: "Governance", color: GOLD, features: "Compliance · Risk Quantification · Regulatory Intel · Evidence" },
];

const COMPARE = [
  { feature: "Code Security", shield: true, wiz: true, aikido: true, socradar: false, snyk: true, prisma: false },
  { feature: "Cloud Security", shield: true, wiz: true, aikido: false, socradar: false, snyk: false, prisma: true },
  { feature: "Threat Intelligence", shield: true, wiz: false, aikido: false, socradar: true, snyk: false, prisma: false },
  { feature: "Runtime Protection", shield: true, wiz: "partial", aikido: false, socradar: false, snyk: false, prisma: "partial" },
  { feature: "AI/LLM Security", shield: true, wiz: "partial", aikido: false, socradar: false, snyk: false, prisma: false },
  { feature: "MSSP Multi-Tenant", shield: true, wiz: true, aikido: false, socradar: true, snyk: false, prisma: true },
  { feature: "Regulatory Intel (NIS2/DORA/CRA)", shield: true, wiz: false, aikido: false, socradar: "partial", snyk: false, prisma: false },
  { feature: "Financial Risk Quantification", shield: true, wiz: false, aikido: false, socradar: false, snyk: false, prisma: false },
  { feature: "Threat Hunting", shield: true, wiz: false, aikido: false, socradar: true, snyk: false, prisma: false },
  { feature: "Security Graph", shield: true, wiz: true, aikido: false, socradar: false, snyk: false, prisma: "partial" },
  { feature: "Pentest-on-Deploy", shield: true, wiz: false, aikido: "partial", socradar: false, snyk: false, prisma: false },
  { feature: "Hardened Images", shield: true, wiz: "partial", aikido: false, socradar: false, snyk: false, prisma: "partial" },
  { feature: "Breaking Changes Analysis", shield: true, wiz: false, aikido: "partial", socradar: false, snyk: "partial", prisma: false },
  { feature: "Compliance Evidence Auto-Collection", shield: true, wiz: "partial", aikido: "partial", socradar: false, snyk: false, prisma: "partial" },
  { feature: "Pricing", shield: "From $299/mo", wiz: "$5,000+/mo", aikido: "$500+/mo", socradar: "$1,000+/mo", snyk: "$600+/mo", prisma: "$50,000+/mo" },
];

function Cell({ val, isShield }) {
  if (val === true) return <span style={{ color: isShield ? GOLD : "#22c55e" }} className="text-lg">✅</span>;
  if (val === false) return <span className="text-slate-600 text-lg">❌</span>;
  if (val === "partial") return <span className="text-yellow-500 text-lg">⚠️</span>;
  return <span className={`text-xs font-bold ${isShield ? "" : "text-slate-400"}`} style={isShield ? { color: GOLD } : {}}>{val}</span>;
}

export default function LandingPage() {
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen font-body" style={{ background: "#0A0E1A", color: "#F9FAFB" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes particle { 0%{opacity:0;transform:scale(0)} 50%{opacity:1} 100%{opacity:0;transform:scale(1.5)} }
        .fu { animation: fadeUp 0.6s ease both; }
        .float { animation: float 4s ease-in-out infinite; }
        .particle { animation: particle 3s ease-in-out infinite; }
      `}</style>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 border-b" style={{ background: "rgba(10,14,26,0.9)", backdropFilter: "blur(12px)", borderColor: "#1a2235" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            <Shield className="w-4 h-4 text-black" />
          </div>
          <span className="font-black text-white text-lg">ShieldAI</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <a href="#pillars" className="hover:text-white transition-colors">Features</a>
          <a href="#compare" className="hover:text-white transition-colors">Compare</a>
          <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link to="/docs" className="hover:text-white transition-colors">Docs</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Sign In</Link>
          <Link to="/register" className="px-4 py-2 rounded-lg text-sm font-bold text-black transition-all hover:scale-105" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Particle background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="absolute rounded-full particle"
              style={{
                width: Math.random() * 3 + 1 + "px", height: Math.random() * 3 + 1 + "px",
                left: Math.random() * 100 + "%", top: Math.random() * 100 + "%",
                background: GOLD, animationDelay: Math.random() * 4 + "s",
                animationDuration: Math.random() * 4 + 3 + "s",
              }} />
          ))}
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(201,168,76,0.05) 0%, transparent 70%)" }} />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <div className="fu inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6 text-xs font-semibold" style={{ borderColor: GOLD + "40", color: GOLD, background: GOLD + "10" }}>
            <Star className="w-3 h-3" /> Trusted by 40+ countries · 50,000+ vulnerabilities detected
          </div>
          <h1 className="fu text-5xl md:text-7xl font-black text-white leading-tight mb-6" style={{ animationDelay: "100ms" }}>
            The World's Most<br />
            <span style={{ background: `linear-gradient(135deg,${GOLD},#f0c56a,${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Complete Security Platform
            </span>
          </h1>
          <p className="fu text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto" style={{ animationDelay: "200ms" }}>
            Code · Cloud · Threat Intel · Runtime · AI Security — unified in one sovereign platform. No more tool sprawl.
          </p>
          <div className="fu flex flex-col sm:flex-row items-center justify-center gap-4 mb-8" style={{ animationDelay: "300ms" }}>
            <Link to="/register" className="px-8 py-4 rounded-xl text-base font-bold text-black transition-all hover:scale-105 hover:shadow-lg" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)`, boxShadow: `0 0 30px ${GOLD}40` }}>
              Start Free — No Credit Card
            </Link>
            <Link to="/onboarding" className="px-8 py-4 rounded-xl text-base font-bold text-white border transition-all hover:scale-105" style={{ borderColor: GOLD + "60", background: "rgba(201,168,76,0.05)" }}>
              Book a Demo
            </Link>
          </div>
          <div className="fu flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500" style={{ animationDelay: "400ms" }}>
            {["40+ countries", "50,000+ vulnerabilities detected", "99.9% uptime SLA"].map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />{t}
              </div>
            ))}
          </div>

          {/* Abstract security graph visual */}
          <div className="fu mt-16 float" style={{ animationDelay: "500ms" }}>
            <div className="relative mx-auto rounded-2xl border overflow-hidden" style={{ maxWidth: 700, background: "#111827", borderColor: "#1F2937" }}>
              <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: "#1F2937" }}>
                <div className="w-3 h-3 rounded-full bg-red-500" /><div className="w-3 h-3 rounded-full bg-yellow-500" /><div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-slate-500 ml-2">ShieldAI — Security Graph</span>
              </div>
              <div className="p-6 grid grid-cols-4 gap-3">
                {[
                  { label: "Critical", val: "3", color: "#ef4444" }, { label: "High", val: "12", color: "#f97316" },
                  { label: "Protected", val: "99.9%", color: "#22c55e" }, { label: "Assets", val: "247", color: GOLD },
                ].map(m => (
                  <div key={m.label} className="rounded-xl p-3 text-center" style={{ background: "#0d1220", border: `1px solid ${m.color}22` }}>
                    <div className="text-2xl font-black" style={{ color: m.color }}>{m.val}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{m.label}</div>
                  </div>
                ))}
                {/* Graph nodes */}
                <div className="col-span-4 relative h-32 rounded-xl overflow-hidden" style={{ background: "#0d1220" }}>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 700 128">
                    <line x1="80" y1="64" x2="200" y2="40" stroke="#3b82f640" strokeWidth="1" />
                    <line x1="200" y1="40" x2="350" y2="64" stroke="#ef444440" strokeWidth="2" />
                    <line x1="350" y1="64" x2="500" y2="30" stroke="#3b82f640" strokeWidth="1" />
                    <line x1="350" y1="64" x2="500" y2="90" stroke="#f9731640" strokeWidth="1.5" />
                    <line x1="500" y1="30" x2="620" y2="50" stroke="#22c55e40" strokeWidth="1" />
                    {[
                      [80, 64, "#3b82f6", "Repo"], [200, 40, "#22c55e", "CI/CD"],
                      [350, 64, "#ef4444", "API"], [500, 30, "#8b5cf6", "Cloud"],
                      [500, 90, "#f97316", "DB"], [620, 50, "#22c55e", "WAF"],
                    ].map(([cx, cy, color, label], i) => (
                      <g key={i}>
                        <circle cx={cx} cy={cy} r="10" fill={color + "20"} stroke={color} strokeWidth="1.5" />
                        <text x={cx} y={cy + 22} textAnchor="middle" fill="#6b7280" fontSize="9">{label}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-4">Security teams are drowning in tools</h2>
          <p className="text-slate-400 mb-12">The average enterprise juggles dozens of disconnected security tools — and pays the price.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: "🔧", stat: "47 tools", desc: "Average enterprise uses 47 security tools — none talk to each other" },
              { icon: "⏰", stat: "60% wasted", desc: "Security teams spend 60% of time correlating alerts, not fixing them" },
              { icon: "💸", stat: "$2.4M+/yr", desc: "Tool sprawl costs $2.4M+ per year in wasted spend and inefficiency" },
            ].map(p => (
              <div key={p.stat} className="rounded-2xl p-6 border transition-all hover:scale-105 hover:border-opacity-60" style={{ background: "#111827", borderColor: "#1F2937" }}>
                <div className="text-4xl mb-3">{p.icon}</div>
                <div className="text-2xl font-black mb-2" style={{ color: "#ef4444" }}>{p.stat}</div>
                <p className="text-slate-400 text-sm">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-3xl font-black" style={{ color: GOLD }}>ShieldAI replaces all of them.</div>
        </div>
      </section>

      {/* Pillars */}
      <section id="pillars" className="py-24 px-6" style={{ background: "#070b14" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">One platform. Six security pillars. Complete protection.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PILLARS.map((p, i) => (
              <div key={p.title} className="rounded-2xl p-6 border transition-all hover:scale-[1.03] cursor-pointer"
                style={{ background: "#111827", borderColor: p.color + "33", animationDelay: i * 100 + "ms" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: p.color + "20" }}>
                  <p.icon className="w-5 h-5" style={{ color: p.color }} />
                </div>
                <h3 className="font-bold text-white mb-2">{p.title}</h3>
                <p className="text-xs text-slate-500">{p.features}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white mb-4">ShieldAI vs the rest</h2>
            <p className="text-slate-400">See why security teams choose ShieldAI over point solutions</p>
          </div>
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#1F2937" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#0d1220" }}>
                    <th className="px-4 py-4 text-left text-slate-400 font-semibold">Feature</th>
                    {["ShieldAI", "Wiz", "Aikido", "SOCRadar", "Snyk", "Prisma Cloud"].map((h, i) => (
                      <th key={h} className="px-4 py-4 text-center font-bold" style={{ color: i === 0 ? GOLD : "#9CA3AF" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row, i) => (
                    <tr key={row.feature} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: "#1F2937", background: i % 2 === 0 ? "#111827" : "#0d1220" }}>
                      <td className="px-4 py-3 text-slate-300 font-medium text-xs">{row.feature}</td>
                      {["shield", "wiz", "aikido", "socradar", "snyk", "prisma"].map((k, j) => (
                        <td key={k} className="px-4 py-3 text-center">
                          <Cell val={row[k]} isShield={j === 0} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-24 px-6" style={{ background: "#070b14" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Built different. Built sovereign.</h2>
          </div>
          {[
            { icon: "🕸️", title: "Security Graph", desc: "See your entire attack surface in one unified view — from code to cloud to runtime. Trace attack paths before adversaries do.", stat: "3 critical paths", statLabel: "discovered on avg per org" },
            { icon: "🤖", title: "AI-Powered AutoTriage", desc: "85% noise reduction — ShieldAI's AI correlates, deduplicates, and prioritizes findings so your team focuses on what actually matters.", stat: "85%", statLabel: "noise reduction" },
            { icon: "🌍", title: "Sovereign by Design", desc: "Built for global teams — NIS2, DORA, GDPR, HIPAA compliant out of the box. Your data never leaves your chosen region.", stat: "7 frameworks", statLabel: "supported out of box" },
          ].map((d, i) => (
            <div key={d.title} className={`flex items-center gap-12 mb-16 ${i % 2 === 1 ? "flex-row-reverse" : ""}`}>
              <div className="flex-1">
                <div className="text-4xl mb-4">{d.icon}</div>
                <h3 className="text-2xl font-black text-white mb-3">{d.title}</h3>
                <p className="text-slate-400 mb-4">{d.desc}</p>
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl" style={{ background: GOLD + "15", border: `1px solid ${GOLD}30` }}>
                  <span className="text-2xl font-black" style={{ color: GOLD }}>{d.stat}</span>
                  <span className="text-xs text-slate-400">{d.statLabel}</span>
                </div>
              </div>
              <div className="flex-1 rounded-2xl p-6 border" style={{ background: "#111827", borderColor: "#1F2937" }}>
                <div className="h-32 flex items-center justify-center text-6xl">{d.icon}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-16">Get protected in minutes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: "01", icon: "🔗", title: "Connect", desc: "Link your repos, cloud accounts, and apps in minutes via OAuth" },
              { n: "02", icon: "🔍", title: "Discover", desc: "ShieldAI maps your entire attack surface and all vulnerabilities automatically" },
              { n: "03", icon: "🛡️", title: "Protect", desc: "AI triage, auto-fix PRs, and continuous monitoring keep you secure 24/7" },
            ].map((s, i) => (
              <div key={s.n} className="relative">
                <div className="rounded-2xl p-8 border transition-all hover:scale-105" style={{ background: "#111827", borderColor: "#1F2937" }}>
                  <div className="text-4xl mb-4">{s.icon}</div>
                  <div className="text-xs font-black mb-2" style={{ color: GOLD }}>{s.n}</div>
                  <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-slate-400 text-sm">{s.desc}</p>
                </div>
                {i < 2 && <div className="hidden md:block absolute top-1/2 -right-4 text-slate-600 text-2xl z-10">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 px-6" style={{ background: "#070b14" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-slate-400 mb-12">No hidden fees. No per-scanner pricing. One platform, one price.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { plan: "Free", price: "$0", period: "/forever", color: "#6b7280", cta: "Start Free", features: ["10 repositories", "2 cloud accounts", "Basic SAST + SCA", "10 AI AutoFixes/month"] },
              { plan: "Pro", price: "$299", period: "/month", color: GOLD, cta: "Start Pro Free", popular: true, features: ["200 repositories", "10 cloud accounts", "Full SAST/SCA/Secrets", "CSPM + CIEM + DSPM", "Security Graph", "Pentest (5/month)"] },
              { plan: "Enterprise", price: "Custom", period: "", color: "#8b5cf6", cta: "Talk to Sales", features: ["Unlimited everything", "MSSP multi-tenant", "Regulatory Intelligence", "Financial Risk Quant.", "Dedicated support"] },
            ].map(p => (
              <div key={p.plan} className="rounded-2xl p-6 border transition-all hover:scale-105 relative" style={{ background: "#111827", borderColor: p.popular ? GOLD + "60" : "#1F2937" }}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black text-black" style={{ background: GOLD }}>MOST POPULAR</div>}
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{p.plan}</div>
                <div className="text-3xl font-black mb-0.5" style={{ color: p.color }}>{p.price}</div>
                <div className="text-xs text-slate-500 mb-4">{p.period}</div>
                <ul className="space-y-2 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                      <Check className="w-3 h-3 flex-shrink-0" style={{ color: p.color }} />{f}
                    </li>
                  ))}
                </ul>
                <Link to="/pricing" className="block w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all hover:scale-105"
                  style={{ background: p.popular ? `linear-gradient(135deg,${GOLD},#a8873e)` : "transparent", color: p.popular ? "#000" : p.color, border: p.popular ? "none" : `1px solid ${p.color}60` }}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
          <Link to="/pricing" className="inline-flex items-center gap-2 text-sm font-semibold hover:underline" style={{ color: GOLD }}>
            See Full Pricing <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Trust */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">Built with security at its core</h2>
          <p className="text-slate-400 mb-8">Security is in our DNA — we eat our own dog food</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {["SOC2 Type II", "ISO27001", "GDPR Compliant", "99.9% Uptime SLA", "Data never leaves your region"].map(b => (
              <div key={b} className="px-4 py-2 rounded-xl border text-xs font-semibold text-white flex items-center gap-2" style={{ background: "#111827", borderColor: "#1F2937" }}>
                <Shield className="w-3.5 h-3.5" style={{ color: GOLD }} />{b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-24 px-6" style={{ background: "#070b14" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to unify your security stack?</h2>
          <p className="text-slate-400 mb-8">Join thousands of security teams who chose one platform over 47 tools.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link to="/register" className="px-8 py-4 rounded-xl text-base font-bold text-black hover:scale-105 transition-all" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
              Start Free
            </Link>
            <Link to="/onboarding" className="px-8 py-4 rounded-xl text-base font-bold text-white border hover:scale-105 transition-all" style={{ borderColor: GOLD + "60" }}>
              Talk to Sales
            </Link>
          </div>
          <div className="flex items-center gap-3 max-w-sm mx-auto mb-12">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email for updates"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none" style={{ background: "#111827", border: "1px solid #1F2937" }} />
            <button className="px-4 py-2.5 rounded-xl text-sm font-bold text-black" style={{ background: GOLD }}>Subscribe</button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
            {["Features", "Pricing", "Docs", "Blog", "Careers", "Security", "Privacy", "Terms"].map(l => (
              <Link key={l} to={l === "Pricing" ? "/pricing" : l === "Docs" ? "/docs" : "/"} className="hover:text-slate-400 transition-colors">{l}</Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}