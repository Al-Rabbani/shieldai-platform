import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, Check, ChevronRight, Github, GitMerge, Code, Cloud, ClipboardCheck, Brain, Target, Bell, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

const GOLD = "#C9A84C";

const GOALS = [
  { id: "code", icon: "🔍", label: "Finding vulnerabilities in my code" },
  { id: "cloud", icon: "☁️", label: "Securing my cloud infrastructure" },
  { id: "compliance", icon: "📋", label: "Achieving compliance (SOC2/ISO27001)" },
  { id: "ai", icon: "🤖", label: "Securing AI systems" },
  { id: "attack", icon: "🎯", label: "Understanding my attack surface" },
  { id: "monitoring", icon: "🚨", label: "Real-time threat monitoring" },
];

function ProgressBar({ step, total }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#1F2937" }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(step / total) * 100}%`, background: `linear-gradient(90deg,${GOLD},#f0c56a)` }} />
    </div>
  );
}

export default function WelcomePage() {
  const [step, setStep] = useState(0);
  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState([]);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("high");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPhase, setScanPhase] = useState("Initializing...");
  const [scanDone, setScanDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => { base44.auth.me().then(u => { setUser(u); setAlertEmail(u?.email || ""); }).catch(() => {}); }, []);

  const SCAN_PHASES = ["Cloning repository...", "Checking dependencies...", "Scanning for secrets...", "Analyzing code patterns...", "Running AI SAST...", "Checking for CVEs...", "Building SBOM...", "Finalizing report..."];

  const startScan = () => {
    setStep(3);
    let p = 0;
    let phaseIdx = 0;
    const iv = setInterval(() => {
      p += Math.random() * 3 + 1;
      phaseIdx = Math.min(Math.floor((p / 100) * SCAN_PHASES.length), SCAN_PHASES.length - 1);
      setScanProgress(Math.min(p, 100));
      setScanPhase(SCAN_PHASES[phaseIdx]);
      if (p >= 100) {
        clearInterval(iv);
        setScanDone(true);
      }
    }, 80);
  };

  const finish = () => {
    setShowConfetti(true);
    setStep(5);
  };

  const toggleGoal = (id) => setGoals(g => g.includes(id) ? g.filter(x => x !== id) : [...g, id]);

  const getRecommendedRoutes = () => {
    const routes = [];
    if (goals.includes("code")) routes.push({ label: "Fix your critical code findings →", path: "/code/findings" });
    if (goals.includes("cloud")) routes.push({ label: "Connect your cloud account →", path: "/cloud" });
    if (goals.includes("compliance")) routes.push({ label: "Start your compliance journey →", path: "/governance/compliance" });
    if (goals.includes("ai")) routes.push({ label: "Secure your AI systems →", path: "/ai-spm" });
    if (goals.includes("attack")) routes.push({ label: "Map your attack surface →", path: "/attack/surface" });
    if (!routes.length) {
      routes.push({ label: "View your security dashboard →", path: "/" });
      routes.push({ label: "Connect your first cloud account →", path: "/cloud" });
      routes.push({ label: "Set up continuous pentest →", path: "/attack/pentest" });
    }
    return routes.slice(0, 3);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-body" style={{ background: "#0A0E1A" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.5s ease both}
        @keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
        .confetti-piece{animation:confettiFall 3s ease-in forwards}
      `}</style>

      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="confetti-piece absolute w-2 h-2 rounded-sm"
              style={{ left: Math.random() * 100 + "%", top: "-20px", background: [GOLD, "#ef4444", "#22c55e", "#3b82f6", "#8b5cf6"][i % 5], animationDelay: Math.random() * 2 + "s" }} />
          ))}
        </div>
      )}

      <div className="w-full max-w-xl">
        {/* Step 0 — Welcome Screen */}
        {step === 0 && (
          <div className="fu text-center rounded-3xl border p-10" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
              <Shield className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Welcome to ShieldAI{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}! 👋</h1>
            <p className="text-slate-400 mb-2">Let's get you protected.</p>
            <p className="text-slate-500 text-sm mb-8">This takes about 5 minutes.</p>
            <ProgressBar step={0} total={5} />
            <p className="text-xs text-slate-600 mt-2 mb-8">0% complete</p>
            <button onClick={() => setStep(1)} className="px-10 py-4 rounded-xl text-lg font-black text-black transition-all hover:scale-105" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
              Start Setup →
            </button>
          </div>
        )}

        {/* Step 1 — Goals */}
        {step === 1 && (
          <div className="fu rounded-3xl border p-8" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <ProgressBar step={1} total={5} />
            <p className="text-xs text-slate-500 mt-2 mb-6">Step 1 of 5</p>
            <h2 className="text-2xl font-black text-white mb-2">What's your biggest security concern?</h2>
            <p className="text-slate-400 text-sm mb-6">Select all that apply — we'll personalise your dashboard.</p>
            <div className="grid grid-cols-1 gap-3 mb-8">
              {GOALS.map(g => (
                <button key={g.id} onClick={() => toggleGoal(g.id)}
                  className="flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all hover:scale-[1.01]"
                  style={{ borderColor: goals.includes(g.id) ? GOLD : "#1F2937", background: goals.includes(g.id) ? GOLD + "10" : "transparent" }}>
                  <span className="text-xl">{g.icon}</span>
                  <span className="text-sm text-slate-300">{g.label}</span>
                  {goals.includes(g.id) && <Check className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: GOLD }} />}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="w-full py-3 rounded-xl font-bold text-black" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — Connect Code */}
        {step === 2 && (
          <div className="fu rounded-3xl border p-8" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <ProgressBar step={2} total={5} />
            <p className="text-xs text-slate-500 mt-2 mb-6">Step 2 of 5</p>
            <h2 className="text-2xl font-black text-white mb-2">Connect your first repository</h2>
            <p className="text-slate-400 text-sm mb-6">We'll scan it automatically and show you your security posture.</p>
            <div className="space-y-3 mb-6">
              <button className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.02]" style={{ background: "#0d1220", borderColor: "#374151" }}>
                <Github className="w-6 h-6 text-white" />
                <div className="text-left">
                  <div className="text-sm font-bold text-white">Connect GitHub</div>
                  <div className="text-xs text-slate-500">OAuth — secure, read-only access</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 ml-auto" />
              </button>
              <div className="grid grid-cols-2 gap-3">
                {[["GitLab", GitMerge, "#fc6d26"], ["Bitbucket", Code, "#0052cc"]].map(([name, Icon, color]) => (
                  <button key={name} className="flex items-center justify-center gap-2 p-3 rounded-xl border transition-all hover:scale-[1.02] text-sm font-semibold text-slate-300" style={{ background: "#0d1220", borderColor: "#374151" }}>
                    <Icon className="w-4 h-4" style={{ color }} /> {name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button onClick={startScan} className="flex-1 py-3 rounded-xl font-bold text-black mr-3" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
                Connect & Scan
              </button>
              <button onClick={startScan} className="text-sm text-slate-500 hover:text-slate-400 transition-colors">Skip for now →</button>
            </div>
          </div>
        )}

        {/* Step 3 — Scanning */}
        {step === 3 && (
          <div className="fu rounded-3xl border p-8 text-center" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <ProgressBar step={3} total={5} />
            <p className="text-xs text-slate-500 mt-2 mb-8">Step 3 of 5</p>
            {!scanDone ? (
              <>
                <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-6" style={{ borderColor: GOLD + "30", borderTopColor: GOLD }} />
                <h2 className="text-xl font-black text-white mb-2">Running your first security scan...</h2>
                <p className="text-slate-400 text-sm mb-6">{scanPhase}</p>
                <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: "#1F2937" }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${scanProgress}%`, background: `linear-gradient(90deg,${GOLD},#f0c56a)` }} />
                </div>
                <p className="text-xs text-slate-600">{Math.floor(scanProgress)}%</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "#22c55e20" }}>
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-xl font-black text-white mb-2">🎉 Scan complete!</h2>
                <p className="text-slate-400 text-sm mb-6">We found <span className="text-red-400 font-bold">3 critical</span> and <span className="text-orange-400 font-bold">7 high</span> issues you didn't know about.</p>
                <div className="grid grid-cols-4 gap-3 mb-8">
                  {[["3", "Critical", "#ef4444"], ["7", "High", "#f97316"], ["12", "Medium", "#eab308"], ["5", "Low", "#3b82f6"]].map(([n, l, c]) => (
                    <div key={l} className="rounded-xl p-3 text-center" style={{ background: "#0d1220", border: `1px solid ${c}22` }}>
                      <div className="text-xl font-black" style={{ color: c }}>{n}</div>
                      <div className="text-[10px] text-slate-500">{l}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setStep(4)} className="w-full py-3 rounded-xl font-bold text-black" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
                  Continue →
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 4 — Alerts */}
        {step === 4 && (
          <div className="fu rounded-3xl border p-8" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <ProgressBar step={4} total={5} />
            <p className="text-xs text-slate-500 mt-2 mb-6">Step 4 of 5</p>
            <h2 className="text-2xl font-black text-white mb-2">Where should we send security alerts?</h2>
            <p className="text-slate-400 text-sm mb-6">Get notified instantly when critical issues are found.</p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Email address</label>
                <input value={alertEmail} onChange={e => setAlertEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: "#0d1220", border: "1px solid #1F2937" }} />
              </div>
              <button className="w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:scale-[1.01]" style={{ background: "#0d1220", borderColor: "#374151" }}>
                <div className="w-7 h-7 rounded flex items-center justify-center bg-[#4a154b]">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-slate-300">Connect Slack (optional)</span>
                <ChevronRight className="w-4 h-4 text-slate-500 ml-auto" />
              </button>
              <div>
                <label className="text-xs text-slate-400 block mb-2">Alert me on:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[["critical", "Critical only"], ["high", "High+"], ["medium", "Medium+"]].map(([id, label]) => (
                    <button key={id} onClick={() => setAlertSeverity(id)}
                      className="py-2 rounded-lg text-xs font-semibold border transition-all"
                      style={alertSeverity === id ? { background: GOLD + "20", color: GOLD, borderColor: GOLD + "40" } : { color: "#6b7280", borderColor: "#1F2937" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={finish} className="w-full py-3 rounded-xl font-bold text-black" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
              Finish Setup →
            </button>
          </div>
        )}

        {/* Step 5 — Done */}
        {step === 5 && (
          <div className="fu rounded-3xl border p-8 text-center" style={{ background: "#111827", borderColor: GOLD + "40" }}>
            <ProgressBar step={5} total={5} />
            <p className="text-xs text-slate-500 mt-2 mb-8">Complete!</p>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-black text-white mb-2">Your ShieldAI dashboard is ready!</h2>
            <p className="text-slate-400 text-sm mb-8">Here's what we recommend you do next.</p>
            <div className="space-y-3 mb-8 text-left">
              {getRecommendedRoutes().map((r, i) => (
                <Link key={i} to={r.path} className="flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:scale-[1.01]" style={{ background: "#0d1220", borderColor: "#1F2937" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-black flex-shrink-0" style={{ background: GOLD }}>{i + 1}</span>
                  <span className="text-sm text-slate-300">{r.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 ml-auto" />
                </Link>
              ))}
            </div>
            <div className="flex gap-3">
              <Link to="/" className="flex-1 py-3 rounded-xl font-bold text-black text-center" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
                Go to Dashboard
              </Link>
              <Link to="/onboarding" className="px-4 py-3 rounded-xl font-bold text-slate-300 border text-sm" style={{ borderColor: "#374151" }}>
                Take a tour
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}