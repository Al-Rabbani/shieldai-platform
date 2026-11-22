import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Key, AlertTriangle, CheckCircle, RefreshCw, Eye, EyeOff, ExternalLink, Clock, Shield, FileText, Scan, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const GOLD = "#C9A84C";

const SECRETS = [
  { id: 1, name: "STRIPE_SECRET_KEY", type: "Payment API", repo: "payment-svc", file: "src/config.js", line: 14, developer: "priya.nair", age_days: 12, liveness: "active", last_used: "2 hours ago", rotated: false },
  { id: 2, name: "AWS_SECRET_ACCESS_KEY", type: "Cloud Credentials", repo: "data-pipeline", file: ".env.prod", line: 3, developer: "tom.wright", age_days: 47, liveness: "active", last_used: "45 min ago", rotated: false },
  { id: 3, name: "GITHUB_PAT", type: "SCM Token", repo: "api-gateway", file: "scripts/deploy.sh", line: 7, developer: "sarah.chen", age_days: 3, liveness: "expired", last_used: "Never", rotated: false },
  { id: 4, name: "SENDGRID_API_KEY", type: "Email Service", repo: "notification-svc", file: "src/mailer.js", line: 5, developer: "carlos.d", age_days: 89, liveness: "active", last_used: "6 hours ago", rotated: false },
  { id: 5, name: "OPENAI_API_KEY", type: "AI Service", repo: "ml-inference", file: "notebooks/test.py", line: 2, developer: "nina.patel", age_days: 1, liveness: "active", last_used: "3 min ago", rotated: false },
  { id: 6, name: "POSTGRES_PASSWORD", type: "Database", repo: "auth-service", file: "docker-compose.yml", line: 18, developer: "james.malik", age_days: 120, liveness: "unknown", last_used: "Unknown", rotated: false },
  { id: 7, name: "TWILIO_AUTH_TOKEN", type: "Telecom", repo: "auth-service", file: ".env.test", line: 11, developer: "james.malik", age_days: 5, liveness: "revoked", last_used: "Never", rotated: true },
  { id: 8, name: "SLACK_BOT_TOKEN", type: "Collaboration", repo: "admin-portal", file: "config/integrations.js", line: 3, developer: "lisa.ho", age_days: 30, liveness: "active", last_used: "1 day ago", rotated: false },
];

const LIVENESS_COLORS = { active: "#ef4444", expired: "#eab308", revoked: "#22c55e", unknown: "#6B7280" };
const LIVENESS_LABELS = { active: "🔴 LIVE", expired: "🟡 EXPIRED", revoked: "✅ ROTATED", unknown: "⬜ UNVERIFIED" };

export default function SecretsMonitorPage() {
  const [selected, setSelected] = useState(null);
  const [masked, setMasked] = useState({});
  const [showLivenessModal, setShowLivenessModal] = useState(false);
  const [checkingSecret, setCheckingSecret] = useState(null);
  const [livenessResult, setLivenessResult] = useState(null);
  const [showEnvScanner, setShowEnvScanner] = useState(false);
  const [envContent, setEnvContent] = useState("");
  const [envScanResults, setEnvScanResults] = useState(null);

  const active = SECRETS.filter(s => s.liveness === "active");

  const checkLiveness = (secret) => {
    setCheckingSecret(secret);
    setLivenessResult(null);
    setShowLivenessModal(true);
  };

  const runLivenessCheck = async () => {
    // Simulate liveness check
    setTimeout(() => {
      const isLive = Math.random() > 0.5;
      setLivenessResult({
        status: isLive ? "live" : "rotated",
        message: isLive ? "🔴 LIVE — This secret is still active and working. Rotate immediately!" : "✅ ROTATED — This secret has already been invalidated.",
        rotationUrl: isLive ? "https://console.aws.amazon.com/iam" : null
      });
      setCheckingSecret(null);
    }, 2000);
  };

  const scanEnvFile = () => {
    const patterns = [
      { regex: /AWS_SECRET_ACCESS_KEY/i, type: "AWS", status: "Found" },
      { regex: /STRIPE_SECRET_KEY/i, type: "Stripe", status: "Found" },
      { regex: /OPENAI_API_KEY/i, type: "OpenAI", status: "Found" },
      { regex: /GITHUB_TOKEN/i, type: "GitHub", status: "Found" },
    ];
    const found = patterns.filter(p => p.regex.test(envContent));
    setEnvScanResults(found);
    toast.success(`Found ${found.length} secret patterns in .env file`);
  };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Secrets Liveness Monitor</h1>
          <p className="text-slate-400 text-sm mt-0.5">Secrets detected in code — verified live via API ping</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowEnvScanner(true)} className="gap-2" style={{ background: "#8b5cf6" }}>
            <Scan className="w-4 h-4" /> Scan .env File
          </Button>
          <Button variant="outline" className="border-slate-700 text-slate-300">
            <FileText className="w-4 h-4 mr-2" /> Rotation Guides
          </Button>
        </div>
      </div>

      {/* Critical Alert Banner */}
      {active.length > 0 && (
        <div className="rounded-xl border p-4 flex items-center gap-3" style={{ background: "rgba(239,68,68,0.1)", borderColor: "#ef444466" }}>
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <span className="text-red-400 font-bold text-sm">{active.length} confirmed LIVE secrets in production code. </span>
            <span className="text-slate-300 text-sm">Rotate immediately to prevent credential abuse.</span>
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "LIVE (Confirmed)", value: active.length, color: "#ef4444" },
          { label: "Total Detected", value: SECRETS.length, color: GOLD },
          { label: "Repos Affected", value: [...new Set(SECRETS.map(s => s.repo))].length, color: "#f97316" },
          { label: "Rotated / Safe", value: SECRETS.filter(s => s.rotated || s.liveness === "revoked").length, color: "#22c55e" },
        ].map(k => (
          <Card key={k.label} className="p-4" style={{ background: "#111827", borderColor: k.color + "33" }}>
            <div className="text-[10px] text-slate-500 mb-1">{k.label}</div>
            <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
          </Card>
        ))}
      </div>

      {/* Secrets Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
        <table className="w-full text-xs">
          <thead><tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
            {["Secret", "Repo", "Type", "Liveness", "Age", "Action"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {SECRETS.map(s => (
              <tr key={s.id} onClick={() => setSelected(selected?.id === s.id ? null : s)}
                className="hover:bg-white/5 cursor-pointer transition-colors"
                style={{ borderBottom: "1px solid #1F2937", borderLeft: s.liveness === "active" ? "2px solid #ef4444" : "2px solid transparent" }}>
                <td className="px-4 py-3">
                  <div className="font-mono font-bold text-white text-[11px]">
                    {masked[s.id] ? s.name : s.name.slice(0, 8) + "●●●●●●●●"}
                  </div>
                  <div className="text-[10px] text-slate-500">{s.file}:{s.line}</div>
                </td>
                <td className="px-4 py-3 text-slate-400">{s.repo}</td>
                <td className="px-4 py-3 text-slate-300">{s.type}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold ${s.liveness === "active" ? "animate-pulse" : ""}`} style={{ color: LIVENESS_COLORS[s.liveness] }}>
                    {LIVENESS_LABELS[s.liveness]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{s.age_days}d</td>
                <td className="px-4 py-3">
                  {s.liveness === "active" && (
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); checkLiveness(s); }} className="h-7 text-xs" style={{ background: "#ef4444" }}>
                      Check Liveness
                    </Button>
                  )}
                  {s.liveness === "unknown" && (
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); checkLiveness(s); }} className="h-7 text-xs" style={{ background: "#6B7280" }}>
                      Verify
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Side Panel */}
      {selected && (
        <Card className="max-w-md" style={{ background: "#111827", borderColor: LIVENESS_COLORS[selected.liveness] + "55" }}>
          <CardHeader>
            <CardTitle className="text-white text-sm">Secret Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Developer</span><span className="text-white">{selected.developer}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Age</span><span className="text-white">{selected.age_days} days</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Last Used</span><span className="text-white">{selected.last_used}</span></div>
            <div className="p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef444433" }}>
              <div className="text-[10px] text-red-400 font-bold mb-1">Blast Radius</div>
              <div className="text-xs text-slate-300">Full access to {selected.type} resources</div>
            </div>
            {selected.liveness === "active" && (
              <Button className="w-full" style={{ background: "#ef4444" }}>🔄 Rotate Now</Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Liveness Check Modal */}
      {showLivenessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-lg" style={{ background: "#111827", borderColor: "#374151" }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">Check Secret Liveness</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowLivenessModal(false)}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Secret</div>
                <div className="text-white font-mono text-sm">{checkingSecret?.name || selected?.name}</div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-2">Enter the leaked secret value to verify if it's still active</label>
                <Textarea type="password" placeholder="Paste the secret value here (won't be stored)" className="bg-slate-800 border-slate-700 text-white font-mono" />
              </div>
              {livenessResult && (
                <div className={`p-4 rounded-lg border ${livenessResult.status === "live" ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30"}`}>
                  <div className="text-sm font-bold mb-1" style={{ color: livenessResult.status === "live" ? "#ef4444" : "#22c55e" }}>{livenessResult.message}</div>
                  {livenessResult.rotationUrl && (
                    <a href={livenessResult.rotationUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline">Rotate this secret →</a>
                  )}
                </div>
              )}
              <Button onClick={runLivenessCheck} disabled={checkingSecret} className="w-full" style={{ background: "#8b5cf6" }}>
                {checkingSecret ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Checking...</> : "Check Now"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* .env Scanner Modal */}
      {showEnvScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-2xl" style={{ background: "#111827", borderColor: "#374151" }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">Scan .env File</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => { setShowEnvScanner(false); setEnvScanResults(null); }}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={envContent}
                onChange={(e) => setEnvContent(e.target.value)}
                placeholder="Paste your .env file contents here (values will not be stored)"
                className="bg-slate-800 border-slate-700 text-white font-mono min-h-[200px]"
              />
              {envScanResults && (
                <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                  <div className="text-xs font-bold text-white mb-2">Detected Secrets ({envScanResults.length})</div>
                  <div className="space-y-1">
                    {envScanResults.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{r.type} Pattern</span>
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{r.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button onClick={scanEnvFile} className="flex-1" style={{ background: "#8b5cf6" }}>
                  <Scan className="w-4 h-4 mr-2" /> Scan Now
                </Button>
                <Button variant="outline" onClick={() => { setShowEnvScanner(false); setEnvScanResults(null); }} className="flex-1 border-slate-700 text-slate-300">
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}