import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";

const INTEGRATIONS = ["GitHub", "GitLab", "AWS", "GCP", "Azure", "Slack", "Jira", "PagerDuty", "Datadog", "Snyk", "SonarQube", "Bitbucket"];

function MatrixRain() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const cols = Math.floor(canvas.width / 20);
    const drops = Array(cols).fill(1);
    const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEF";
    const draw = () => {
      ctx.fillStyle = "rgba(3,7,18,0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(59,130,246,0.12)";
      ctx.font = "13px JetBrains Mono";
      drops.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * 20, y * 20);
        if (y * 20 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    };
    const interval = setInterval(draw, 60);
    return () => clearInterval(interval);
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-[0.35]" />;
}

function TypewriterText({ text, delay = 0 }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  useEffect(() => {
    if (!started) return;
    let i = 0;
    const t = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(t);
    }, 45);
    return () => clearInterval(t);
  }, [started, text]);
  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-0.5 h-8 bg-blue-400 ml-1 animate-blink align-bottom" />
      )}
    </span>
  );
}

function AnimatedCount({ target, suffix = "" }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / 80);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(start);
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{val.toLocaleString()}{suffix}</span>;
}

function HexGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full opacity-[0.05]">
        <defs>
          <pattern id="hexDemo" width="60" height="52" patternUnits="userSpaceOnUse">
            <polygon points="30,2 58,17 58,45 30,50 2,45 2,17" fill="none" stroke="#3b82f6" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexDemo)" />
      </svg>
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full blur-[150px]" style={{ background: "rgba(59,130,246,0.06)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px]" style={{ background: "rgba(139,92,246,0.05)" }} />
    </div>
  );
}

export default function DemoPage() {
  const [showSticky, setShowSticky] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  const { data: scorecards = [] } = useQuery({ queryKey: ["demo-scorecards"], queryFn: () => base44.entities.AIScoreCard.list("-scored_at", 5), initialData: [] });
  const { data: campaigns = [] } = useQuery({ queryKey: ["demo-campaigns"], queryFn: () => base44.entities.PentestCampaign.list("-created_date", 10), initialData: [] });
  const { data: cloudAccounts = [] } = useQuery({ queryKey: ["demo-cloud"], queryFn: () => base44.entities.CloudAccount.list("-created_date", 10), initialData: [] });
  const { data: runtimeThreats = [] } = useQuery({ queryKey: ["demo-threats"], queryFn: () => base44.entities.RuntimeThreat.list("-last_seen", 10), initialData: [] });

  useEffect(() => {
    setHeroVisible(true);
    const handler = () => setShowSticky(window.scrollY > 300);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const activeThreats = runtimeThreats.filter(t => t.status === "active").length || 3;
  const marqueeItems = [
    `🔴 ${activeThreats} ACTIVE RUNTIME THREATS`,
    `⚡ 1,247 FINDINGS TRACKED`,
    `🤖 1,000+ ATTACK AGENTS DEPLOYED`,
    `🛡️ 755 ASSETS PROTECTED`,
    `📋 ${Math.max(campaigns.length, 4)} CAMPAIGNS RUNNING`,
    `☁️ ${Math.max(cloudAccounts.length, 4)} CLOUD ACCOUNTS`,
    `✅ 100% PLATFORM UPTIME`,
    `🧠 ShieldAI-Triage-v2.1 ACTIVE`,
  ];

  const pillars = [
    { icon: "🔍", label: "CODE", desc: "SAST · SCA · Secrets Detection · AutoFix PRs", grad: "from-purple-900/40 to-purple-900/10", border: "rgba(139,92,246,0.3)", glow: "rgba(139,92,246,0.2)", path: "/code" },
    { icon: "☁️", label: "CLOUD", desc: "CSPM · VM Scanning · Container Security · Attack Paths", grad: "from-blue-900/40 to-blue-900/10", border: "rgba(59,130,246,0.3)", glow: "rgba(59,130,246,0.2)", path: "/cloud" },
    { icon: "🔴", label: "RUNTIME", desc: "Live Threat Detection · Incident Response · Threat Intel", grad: "from-red-900/40 to-red-900/10", border: "rgba(239,68,68,0.3)", glow: "rgba(239,68,68,0.15)", path: "/runtime" },
    { icon: "📋", label: "GOVERNANCE", desc: "Policy Engine · Compliance · SLA Tracking · Evidence Vault", grad: "from-emerald-900/40 to-emerald-900/10", border: "rgba(16,185,129,0.3)", glow: "rgba(16,185,129,0.15)", path: "/compliance" },
  ];

  const sampleCards = scorecards.slice(0, 3);

  return (
    <div className="min-h-screen text-[#e2e8f0]" style={{ background: "#030712" }}>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes float-shield { 0%,100%{transform:translateY(0) rotate(-5deg)} 50%{transform:translateY(-12px) rotate(5deg)} }
        @keyframes gradient-hero { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes card-fade-up { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Marquee ticker */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-7 overflow-hidden flex items-center"
        style={{ background: "#050d1a", borderBottom: "1px solid rgba(6,182,212,0.15)" }}>
        <div className="flex gap-12 whitespace-nowrap text-[10px] font-mono font-semibold"
          style={{ animation: "marquee 40s linear infinite", color: "#06b6d4" }}>
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="flex-shrink-0 px-6 opacity-80">{item}</span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav className="fixed top-7 left-0 right-0 z-50 backdrop-blur-xl"
        style={{ background: "rgba(3,7,18,0.92)", borderBottom: "1px solid rgba(30,58,95,0.3)" }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🛡️</span>
            <span className="text-base font-black text-white">Shield</span>
            <span className="text-base font-black text-blue-400">AI</span>
            <span className="text-[9px] font-mono text-slate-600 ml-1 px-1.5 py-0.5 rounded" style={{ border: "1px solid rgba(30,58,95,0.5)" }}>v2.1</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-500">
            {["Platform", "Features", "Pricing", "Docs"].map(l => (
              <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-slate-400 hover:text-white transition-colors hidden md:block">Dashboard</Link>
            <a href="mailto:hello@shieldai.io"
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold btn-interactive transition-all"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}>
              Request Access
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ paddingTop: "5rem" }}>
        <MatrixRain />
        <HexGrid />

        {/* Floating shield */}
        <div className="absolute right-16 top-1/2 -translate-y-1/2 hidden xl:block"
          style={{ animation: "float-shield 4s ease-in-out infinite", filter: "drop-shadow(0 0 40px rgba(59,130,246,0.3))" }}>
          <div className="text-[160px] opacity-20">🛡️</div>
        </div>

        <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-mono"
            style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            ShieldAI-Triage-v2.1 · Live Demo Environment · Enterprise-Ready
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-none mb-4"
            style={{ opacity: heroVisible ? 1 : 0, transition: "opacity 0.5s" }}>
            <TypewriterText text="AUTONOMOUS" delay={200} />
          </h1>
          <h1 className="text-5xl md:text-7xl font-black leading-none mb-8"
            style={{
              background: "linear-gradient(135deg, #60a5fa 0%, #818cf8 40%, #06b6d4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundSize: "200% 200%",
              animation: "gradient-hero 5s ease infinite",
            }}>
            SECURITY INTELLIGENCE
          </h1>

          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
            style={{ opacity: heroVisible ? 1 : 0, transition: "opacity 1s 1s" }}>
            The AI-native security platform that finds, scores, and fixes vulnerabilities before attackers do.
            <br />
            <span className="text-slate-500 text-base">CODE · CLOUD · RUNTIME · GOVERNANCE — one unified platform.</span>
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap mb-16">
            <Link to="/"
              className="px-8 py-4 rounded-xl text-white font-black text-base btn-interactive transition-all"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", boxShadow: "0 0 30px rgba(59,130,246,0.4)" }}>
              Explore Live Platform →
            </Link>
            <a href="mailto:hello@shieldai.io"
              className="px-8 py-4 rounded-xl text-slate-300 hover:text-white font-semibold text-base btn-interactive transition-all"
              style={{ border: "1px solid rgba(30,58,95,0.6)", background: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)" }}>
              ▶ Watch Demo
            </a>
          </div>

          {/* Hero stats mini-bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { val: 1000, suffix: "+", label: "Attack Agents", color: "#06b6d4" },
              { val: activeThreats, suffix: "", label: "Active Threats", color: "#ef4444" },
              { val: 755, suffix: "", label: "Assets Protected", color: "#10b981" },
              { val: 100, suffix: "%", label: "Platform Uptime", color: "#8b5cf6" },
            ].map(({ val, suffix, label, color }) => (
              <div key={label} className="rounded-xl p-4 text-center"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(30,58,95,0.4)", backdropFilter: "blur(8px)" }}>
                <p className="text-2xl font-black font-mono" style={{ color }}>
                  <AnimatedCount target={val} suffix={suffix} />
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Pillars */}
      <section className="py-24 px-6" style={{ background: "#050d1a" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-3">Full-Spectrum Security Coverage</h2>
            <p className="text-slate-500">Four integrated security pillars, one autonomous platform.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {pillars.map((p, i) => (
              <Link key={p.label} to={p.path}
                className={`rounded-2xl p-6 card-hover relative overflow-hidden`}
                style={{
                  background: `linear-gradient(145deg, ${p.border.replace("0.3)", "0.08)")}, #0a0f1e)`,
                  border: `1px solid ${p.border}`,
                  animationDelay: `${i * 100}ms`,
                }}>
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2"
                  style={{ background: p.glow, filter: "blur(20px)" }} />
                <div className="relative">
                  <div className="text-4xl mb-4">{p.icon}</div>
                  <h3 className="text-lg font-black text-white mb-2 font-mono">{p.label}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{p.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI Engine */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono mb-4"
              style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)" }}>
              🧠 Powered by ShieldAI-Triage-v2.1
            </div>
            <h2 className="text-3xl font-black text-white mb-3">Triage in &lt; 8 Seconds</h2>
            <p className="text-slate-500">Every finding scored in real-time. Context-aware. Business-impact-driven.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[["< 8s", "Avg Triage Time", "#8b5cf6"], ["94%", "Scoring Accuracy", "#10b981"], ["100%", "Finding Coverage", "#3b82f6"]].map(([val, lbl, color]) => (
              <div key={lbl} className="rounded-2xl p-6 text-center"
                style={{ background: `${color}0d`, border: `1px solid ${color}25` }}>
                <p className="text-4xl font-black mb-2 font-mono" style={{ color }}>{val}</p>
                <p className="text-xs text-slate-500">{lbl}</p>
              </div>
            ))}
          </div>
          {sampleCards.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {sampleCards.map((sc, i) => (
                <div key={sc.id} className="rounded-2xl p-5 card-hover"
                  style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.5)", animationDelay: `${i * 150}ms` }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono capitalize"
                      style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
                      {sc.finding_type?.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">⚡ {sc.triage_time_seconds}s</span>
                  </div>
                  <p className="text-sm font-semibold text-white mb-2 line-clamp-2">{sc.finding_title}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{sc.ai_reasoning}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1e293b" }}>
                      <div className="h-full rounded-full" style={{ width: `${sc.ai_priority_score}%`, background: "#8b5cf6" }} />
                    </div>
                    <span className="text-[10px] font-mono text-violet-400">{sc.ai_priority_score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Video placeholder */}
      <section className="py-20 px-6" style={{ background: "#050d1a" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-black text-white mb-3">See It In Action</h2>
          <p className="text-slate-500 mb-8">Watch how ShieldAI autonomously finds and triages vulnerabilities in real-time.</p>
          <div className="relative rounded-2xl overflow-hidden border cursor-pointer group"
            style={{ aspectRatio: "16/9", background: "linear-gradient(135deg, #0a0f1e 0%, #050d1a 100%)", borderColor: "rgba(30,58,95,0.5)" }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-full backdrop-blur flex items-center justify-center group-hover:scale-110 transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 0 40px rgba(59,130,246,0.2)" }}>
                <span className="text-3xl ml-1">▶</span>
              </div>
              <p className="text-slate-400 text-sm font-medium">Watch 2-min Platform Demo</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#030712]/60 to-transparent" />
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-6">Trusted by security teams at</p>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {["Acme Corp", "FinSecure Bank", "TechStart Ltd", "CloudNative Inc", "CyberDefend Pro"].map(org => (
              <div key={org} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white card-hover"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(30,58,95,0.4)", backdropFilter: "blur(8px)" }}>
                {org}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { quote: "ShieldAI cut our MTTR from days to hours. The AI triage is genuinely game-changing.", name: "Sarah Chen", role: "CISO, FinSecure Bank" },
              { quote: "We replaced 4 point solutions with ShieldAI. Coverage is comprehensive and the agents just work.", name: "Marcus Webb", role: "VP Security, CloudNative Inc" },
              { quote: "The compliance automation alone saved us 3 weeks of audit prep. Investor-ready reports in minutes.", name: "Priya Sharma", role: "Head of GRC, TechStart Ltd" },
            ].map((t) => (
              <div key={t.name} className="rounded-xl p-5 text-left card-hover"
                style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(30,58,95,0.4)", backdropFilter: "blur(8px)" }}>
                <p className="text-sm text-slate-300 italic leading-relaxed mb-4">"{t.quote}"</p>
                <p className="text-xs font-semibold text-white">{t.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration logos */}
      <section className="py-20 px-6" style={{ background: "#050d1a" }}>
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl font-black text-white mb-3">Connects to Your Entire Stack</h2>
          <p className="text-slate-500 mb-10">Native integrations with the tools your team already uses.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {INTEGRATIONS.map(name => (
              <div key={name} className="px-5 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white card-hover transition-all"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(30,58,95,0.4)" }}>
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sticky CTA */}
      {showSticky && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between gap-4 animate-slide-in-up"
          style={{ background: "rgba(10,15,30,0.96)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(30,58,95,0.4)", boxShadow: "0 -8px 32px rgba(0,0,0,0.4)" }}>
          <div>
            <p className="text-sm font-black text-white">Ready to secure your infrastructure?</p>
            <p className="text-xs text-slate-500">ShieldAI autonomously finds, scores, and fixes vulnerabilities — 24/7.</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link to="/"
              className="px-5 py-2.5 rounded-lg text-white text-sm font-bold btn-interactive transition-all"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}>
              Explore Platform →
            </Link>
            <a href="mailto:hello@shieldai.io"
              className="px-5 py-2.5 rounded-lg text-slate-400 hover:text-white text-sm transition-all"
              style={{ border: "1px solid rgba(30,58,95,0.5)" }}>
              Contact Sales
            </a>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-10 px-6" style={{ borderTop: "1px solid rgba(30,58,95,0.3)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <span className="text-sm font-black text-white">Shield</span>
            <span className="text-sm font-black text-blue-400">AI</span>
            <span className="text-xs text-slate-600 ml-2">Autonomous Security Intelligence</span>
          </div>
          <p className="text-xs text-slate-600">© 2026 ShieldAI. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="mailto:hello@shieldai.io" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}