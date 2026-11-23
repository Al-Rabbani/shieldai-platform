import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, FileText, Download, ChevronDown, ChevronUp } from "lucide-react";

const GOLD = "#C9A84C";

const CRYPTO_INVENTORY = [
  { id: 1, asset: "api-gateway TLS cert", algorithm: "RSA-2048", vulnerable: true, location: "TLS/HTTPS", protects: "All API traffic", complexity: "Medium", replacement: "CRYSTALS-Kyber" },
  { id: 2, asset: "auth-service SSH keys", algorithm: "RSA-4096", vulnerable: true, location: "SSH config", protects: "Server access", complexity: "Low", replacement: "CRYSTALS-Dilithium" },
  { id: 3, asset: "database encryption", algorithm: "AES-256", vulnerable: false, location: "Cloud KMS", protects: "Customer PII", complexity: "N/A", replacement: "Already safe" },
  { id: 4, asset: "JWT signing", algorithm: "RS256 (RSA)", vulnerable: true, location: "auth-service/jwt.js:47", protects: "Session tokens", complexity: "Low", replacement: "EdDSA/CRYSTALS" },
  { id: 5, asset: "S3 bucket encryption", algorithm: "AES-256-GCM", vulnerable: false, location: "AWS KMS", protects: "File storage", complexity: "N/A", replacement: "Already safe" },
  { id: 6, asset: "GitHub deploy keys", algorithm: "ECDSA-256", vulnerable: true, location: ".github/deploy", protects: "CI/CD access", complexity: "Low", replacement: "CRYSTALS-Dilithium" },
  { id: 7, asset: "Payment gateway TLS", algorithm: "RSA-2048", vulnerable: true, location: "TLS/PCI", protects: "Payment data", complexity: "HIGH", replacement: "CRYSTALS-Kyber" },
  { id: 8, asset: "VPN certificates", algorithm: "DH-2048", vulnerable: true, location: "VPN config", protects: "Network tunnel", complexity: "Medium", replacement: "Kyber-1024" },
  { id: 9, asset: "Code signing cert", algorithm: "RSA-3072", vulnerable: true, location: "build/sign.sh", protects: "Release integrity", complexity: "Medium", replacement: "CRYSTALS-Dilithium" },
  { id: 10, asset: "Password hashing", algorithm: "bcrypt", vulnerable: false, location: "auth/hash.js", protects: "User passwords", complexity: "N/A", replacement: "Already safe" },
  { id: 11, asset: "API signatures", algorithm: "HMAC-SHA256", vulnerable: false, location: "api/middleware", protects: "API integrity", complexity: "N/A", replacement: "Already safe" },
  { id: 12, asset: "Internal CA cert", algorithm: "RSA-2048", vulnerable: true, location: "PKI/internal", protects: "Internal TLS", complexity: "High", replacement: "CRYSTALS-Kyber" },
];

const COMPLIANCE_STATUS = [
  { name: "NIST PQC (FIPS 203/204/205)", score: 26 },
  { name: "NSA CNSA 2.0 Suite", score: 18 },
  { name: "UK NCSC Quantum Guidance", score: 31 },
  { name: "EU ENISA PQC Roadmap", score: 22 },
];

const PHASES = [
  { phase: 1, title: "NOW — Critical", items: ["Payment gateway TLS", "JWT signing"], count: 2, duration: "1 week", desc: "Highest sensitivity data at risk" },
  { phase: 2, title: "3 months", items: ["API gateway", "GitHub deploy keys", "SSH keys"], count: 3, duration: "2 weeks", desc: "Authentication systems" },
  { phase: 3, title: "6 months", items: ["VPN", "Code signing", "Internal CA"], count: 3, duration: "3 weeks", desc: "Internal communications" },
  { phase: 4, title: "12 months", items: ["Remaining items"], count: 1, duration: "1 week", desc: "Less critical systems" },
];

export default function QuantumReadinessPage() {
  const [expandedInfo, setExpandedInfo] = useState(true);
  const [activeTab, setActiveTab] = useState("inventory");
  const daysToDeadline = Math.ceil((new Date("2030-01-01") - new Date()) / (1000 * 60 * 60 * 24));
  const vulnerableCount = CRYPTO_INVENTORY.filter(c => c.vulnerable).length;
  const safeCount = CRYPTO_INVENTORY.filter(c => !c.vulnerable).length;
  const score = Math.round((safeCount / CRYPTO_INVENTORY.length) * 100);

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}`}</style>

      {/* Header */}
      <div className="fu flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Link to="/executive-dashboard" className="hover:text-white">Overview</Link><span>/</span>
            <span style={{ color: GOLD }}>Quantum Readiness</span>
          </div>
          <h1 className="text-2xl font-black text-white">Quantum Readiness</h1>
          <p className="text-slate-400 text-sm mt-0.5">Quantum computers will break today's encryption by 2030. Are you ready?</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border animate-pulse" style={{ background: "#111827", borderColor: "#ef4444", color: "#ef4444" }}>
          <Clock className="w-4 h-4" />
          <span className="text-sm font-black">T-{daysToDeadline.toLocaleString()} DAYS TO NIST PQC DEADLINE</span>
        </div>
      </div>

      {/* Hero Assessment */}
      <div className={`fu rounded-2xl p-6 border-l-4 ${score < 50 ? "border-l-red-500" : "border-l-yellow-500"}`} style={{ background: "#111827", borderColor: score < 50 ? "#ef444433" : "#eab30833", animationDelay: "100ms" }}>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="relative w-32 h-32">
            <svg width="128" height="128" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="52" fill="none" stroke="#1F2937" strokeWidth="12" />
              <circle cx="64" cy="64" r="52" fill="none" stroke={score < 50 ? "#ef4444" : "#eab308"} strokeWidth="12" strokeDasharray={`${(score / 100) * 326.7} 326.7`} strokeLinecap="round" transform="rotate(-90 64 64)" />
              <text x="64" y="60" textAnchor="middle" fill="white" fontSize="28" fontWeight="900">{score}</text>
              <text x="64" y="78" textAnchor="middle" fill="#6B7280" fontSize="9">VULNERABILITY</text>
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-white mb-2">Your Quantum Vulnerability Score: {score}/100</h2>
            <p className={`text-sm mb-4 ${score < 50 ? "text-red-400" : "text-yellow-400"}`}>
              {score < 50 ? "HIGH RISK" : "MODERATE RISK"} — {vulnerableCount} of {CRYPTO_INVENTORY.length} cryptographic implementations are quantum-vulnerable
            </p>
            <button className="px-6 py-2.5 rounded-lg text-sm font-bold text-black" style={{ background: GOLD }}>Run Full Quantum Scan</button>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="fu rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "140ms" }}>
        <button onClick={() => setExpandedInfo(!expandedInfo)} className="w-full flex items-center justify-between p-4 hover:bg-white/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-bold text-white">What is the Quantum Threat?</span>
          </div>
          {expandedInfo ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {expandedInfo && (
          <div className="px-4 pb-4 space-y-2 text-sm text-slate-300">
            <p>• Quantum computers can break RSA, ECC, and DH encryption — the basis of most internet security today</p>
            <p>• <strong>"Harvest Now, Decrypt Later"</strong>: adversaries are collecting your encrypted data today to decrypt when quantum computers arrive</p>
            <p>• NIST finalized post-quantum standards in 2024: CRYSTALS-Kyber, CRYSTALS-Dilithium, SPHINCS+, FALCON</p>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="fu grid grid-cols-2 md:grid-cols-4 gap-3" style={{ animationDelay: "180ms" }}>
        <div className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: "#374151" }}>
          <div className="text-xs text-slate-500 mb-1">Total Crypto Implementations</div>
          <div className="text-2xl font-black text-white">{CRYPTO_INVENTORY.length}</div>
        </div>
        <div className="rounded-xl p-4 border border-red-500/30" style={{ background: "#111827" }}>
          <div className="text-xs text-slate-500 mb-1">Quantum Vulnerable</div>
          <div className="text-2xl font-black text-red-400">{vulnerableCount}</div>
        </div>
        <div className="rounded-xl p-4 border border-green-500/30" style={{ background: "#111827" }}>
          <div className="text-xs text-slate-500 mb-1">Quantum Safe</div>
          <div className="text-2xl font-black text-green-400">{safeCount}</div>
        </div>
        <div className="rounded-xl p-4 border border-yellow-500/30" style={{ background: "#111827" }}>
          <div className="text-xs text-slate-500 mb-1">Needs Review</div>
          <div className="text-2xl font-black text-yellow-400">4</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="fu flex gap-2" style={{ animationDelay: "220ms" }}>
        <button onClick={() => setActiveTab("inventory")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "inventory" ? "text-black" : "text-slate-400 hover:text-white"}`} style={{ background: activeTab === "inventory" ? GOLD : "#111827" }}>Cryptography Inventory</button>
        <button onClick={() => setActiveTab("roadmap")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "roadmap" ? "text-black" : "text-slate-400 hover:text-white"}`} style={{ background: activeTab === "roadmap" ? GOLD : "#111827" }}>Migration Roadmap</button>
        <button onClick={() => setActiveTab("compliance")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "compliance" ? "text-black" : "text-slate-400 hover:text-white"}`} style={{ background: activeTab === "compliance" ? GOLD : "#111827" }}>Compliance</button>
      </div>

      {/* Inventory Table */}
      {activeTab === "inventory" && (
        <div className="fu rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "260ms" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
                {["Asset", "Algorithm", "Vulnerable", "Location", "Protects", "Complexity", "Replacement", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CRYPTO_INVENTORY.map((c, i) => (
                <tr key={c.id} className="hover:bg-white/5" style={{ borderBottom: "1px solid #1F2937", background: i % 2 === 0 ? "#111827" : "#0d1220" }}>
                  <td className="px-4 py-3 text-white font-medium">{c.asset}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{c.algorithm}</td>
                  <td className="px-4 py-3">
                    {c.vulnerable ? <span className="text-red-400 font-bold">🔴 YES</span> : <span className="text-green-400 font-bold">🟢 NO</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{c.location}</td>
                  <td className="px-4 py-3 text-slate-400">{c.protects}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.complexity === "HIGH" ? "bg-red-900/50 text-red-400" : c.complexity === "Medium" ? "bg-yellow-900/50 text-yellow-400" : "bg-green-900/50 text-green-400"}`}>{c.complexity}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{c.replacement}</td>
                  <td className="px-4 py-3">
                    {c.vulnerable && <button className="px-3 py-1 rounded text-[10px] font-bold text-black" style={{ background: GOLD }}>Migrate</button>}
                    {!c.vulnerable && <span className="text-green-400">✅</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Roadmap */}
      {activeTab === "roadmap" && (
        <div className="fu grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ animationDelay: "260ms" }}>
          {PHASES.map(p => (
            <div key={p.phase} className={`rounded-xl p-4 border ${p.phase === 1 ? "border-red-500/50" : "border-gray-700"}`} style={{ background: "#111827" }}>
              <div className="text-[10px] font-bold text-slate-500 mb-1">PHASE {p.phase}</div>
              <h3 className="text-sm font-black text-white mb-2">{p.title}</h3>
              <div className="text-xs text-slate-400 mb-2">{p.count} items • Est. {p.duration}</div>
              <p className="text-xs text-slate-500 mb-3">{p.desc}</p>
              <div className="space-y-1">
                {p.items.map((item, i) => (
                  <div key={i} className="text-[10px] text-slate-300 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />{item}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="md:col-span-2 lg:col-span-4 flex justify-center pt-4">
            <button className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-black" style={{ background: GOLD }}>
              <FileText className="w-4 h-4" /> Generate Migration Report
            </button>
          </div>
        </div>
      )}

      {/* Compliance */}
      {activeTab === "compliance" && (
        <div className="space-y-6">
          <div className="fu grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animationDelay: "260ms" }}>
            {COMPLIANCE_STATUS.map(c => (
              <div key={c.name} className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: "#1F2937" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white">{c.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${c.score >= 50 ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>{c.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#1F2937] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${c.score}%`, background: c.score >= 50 ? "#22c55e" : "#ef4444" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="fu flex justify-center" style={{ animationDelay: "300ms" }}>
            <button className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold border" style={{ borderColor: "#374151", color: "#9CA3AF" }}>
              <Download className="w-4 h-4" /> Export Compliance Certificate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}