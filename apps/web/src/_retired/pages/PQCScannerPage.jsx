import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, Lock, Key, CheckCircle, Clock, TrendingUp, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const GOLD = "#C9A84C";
const SEVERITY_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };

const VULNERABLE_ALGORITHMS = [
  { name: "RSA-2048", risk: "CRITICAL", replacement: "ML-KEM-768 (CRYSTALS-Kyber)", timeline: "Breaks in ~5 years" },
  { name: "RSA-4096", risk: "HIGH", replacement: "ML-KEM-1024", timeline: "Breaks in ~7 years" },
  { name: "ECDSA P-256", risk: "CRITICAL", replacement: "ML-DSA-65 (CRYSTALS-Dilithium)", timeline: "Breaks in ~5 years" },
  { name: "ECDH", risk: "CRITICAL", replacement: "ML-KEM", timeline: "Breaks in ~5 years" },
  { name: "DH Key Exchange", risk: "CRITICAL", replacement: "ML-KEM", timeline: "Breaks in ~5 years" },
];

const QUANTUM_SAFE_ALGORITHMS = [
  { name: "ML-KEM (CRYSTALS-Kyber)", type: "Key Encapsulation", status: "NIST Approved" },
  { name: "ML-DSA (CRYSTALS-Dilithium)", type: "Digital Signatures", status: "NIST Approved" },
  { name: "SLH-DSA (SPHINCS+)", type: "Stateless Hash Signatures", status: "NIST Approved" },
  { name: "AES-256", type: "Symmetric Encryption", status: "Already Quantum-Resistant" },
  { name: "SHA-256/SHA-3", type: "Hashing", status: "Already Quantum-Resistant" },
];

export default function PQCScannerPage() {
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);

  const { data: repos = [] } = useQuery({
    queryKey: ["code-repos"],
    queryFn: () => base44.entities.CodeRepository.list(),
  });

  const { data: attackSurface = [] } = useQuery({
    queryKey: ["attack-surface"],
    queryFn: () => base44.entities.AttackSurface.list(),
  });

  const { data: containers = [] } = useQuery({
    queryKey: ["containers"],
    queryFn: () => base44.entities.ContainerImage.list(),
  });

  const runScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    
    // Simulate scan progress
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setScanResults({
            rsaInstances: 47,
            eccInstances: 23,
            quantumSafe: 12,
            migrationEffort: 340,
            findings: [
              { location: "api/auth.js:47", algorithm: "RSA-2048", keySize: "2048", risk: "CRITICAL", fix: "Migrate to ML-KEM-768", priority: "Immediate" },
              { location: "TLS: api.shieldai.dev", algorithm: "ECDHE-RSA", keySize: "P-256", risk: "HIGH", fix: "Upgrade to X25519 + ML-KEM", priority: "High" },
              { location: "Container: node:18-alpine", algorithm: "OpenSSL 3.0.8", keySize: "varies", risk: "MEDIUM", fix: "Upgrade to OpenSSL 3.4+", priority: "Medium" },
              { location: "AWS KMS: prod-key", algorithm: "RSA_4096", keySize: "4096", risk: "HIGH", fix: "Switch to AWS ML-KEM keys", priority: "High" },
            ]
          });
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  const readinessScore = scanResults ? Math.round((scanResults.quantumSafe / (scanResults.rsaInstances + scanResults.eccInstances + scanResults.quantumSafe)) * 100) : 0;
  const daysUntilDeadline = Math.floor((new Date("2030-12-31") - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            <Lock className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Post-Quantum Cryptography Readiness</h1>
            <p className="text-slate-400 text-sm">NIST PQC standards finalized. Quantum computers will break RSA-2048 by 2030. Find where you're vulnerable.</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-400">Quantum Readiness Score</div>
              <div className={`text-3xl font-black ${readinessScore > 50 ? "text-green-400" : readinessScore > 20 ? "text-amber-400" : "text-red-400"}`}>
                {readinessScore}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Days Until CRA/NIS2 Deadline</div>
              <div className="text-2xl font-bold text-white">~{daysUntilDeadline.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <Card className="bg-[#111827] border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">RSA Instances Found</span>
                <Key className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-3xl font-black text-white">{scanResults?.rsaInstances || 0}</div>
              <div className="text-xs text-slate-500 mt-1">Must migrate to ML-KEM</div>
            </CardContent>
          </Card>
          <Card className="bg-[#111827] border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">ECC Instances Found</span>
                <Lock className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-3xl font-black text-white">{scanResults?.eccInstances || 0}</div>
              <div className="text-xs text-slate-500 mt-1">Must migrate to ML-DSA</div>
            </CardContent>
          </Card>
          <Card className="bg-[#111827] border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Quantum-Safe Algorithms</span>
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-3xl font-black text-white">{scanResults?.quantumSafe || 0}</div>
              <div className="text-xs text-slate-500 mt-1">Already compliant</div>
            </CardContent>
          </Card>
          <Card className="bg-[#111827] border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Migration Effort</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-black text-white">{scanResults?.migrationEffort || 0}h</div>
              <div className="text-xs text-slate-500 mt-1">Estimated hours</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Scan Section */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card className="bg-[#111827] border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: GOLD }} />
              PQC Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400">Scan your entire infrastructure for quantum-vulnerable cryptography across code, certificates, containers, and cloud configurations.</p>
            {isScanning ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Scanning...</span>
                  <span className="text-white font-semibold">{scanProgress}%</span>
                </div>
                <Progress value={scanProgress} className="h-2" />
              </div>
            ) : (
              <Button onClick={runScan} className="w-full" style={{ background: GOLD, color: "#0A0E1A" }}>
                <Shield className="w-4 h-4 mr-2" />
                Run PQC Scan
              </Button>
            )}
            <div className="text-xs text-slate-500">
              Scans: Code repositories • TLS certificates • Container images • Dependencies • Cloud KMS
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111827] border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: GOLD }} />
              Migration Planner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Phase 1: Inventory</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Complete</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Phase 2: High-Risk Certificates (6 months)</span>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">In Progress</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Phase 3: Application Crypto (12 months)</span>
                <Badge className="bg-slate-700 text-slate-400 border-slate-600">Pending</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Phase 4: Infrastructure Keys (24 months)</span>
                <Badge className="bg-slate-700 text-slate-400 border-slate-600">Pending</Badge>
              </div>
            </div>
            <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
              <Download className="w-4 h-4 mr-2" />
              Generate Migration Report
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Findings Table */}
      {scanResults && (
        <Card className="bg-[#111827] border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Quantum-Vulnerable Cryptography Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scanResults.findings.map((finding, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      finding.risk === "CRITICAL" ? "bg-red-500 animate-pulse" :
                      finding.risk === "HIGH" ? "bg-orange-500" :
                      "bg-yellow-500"
                    }`} />
                    <div>
                      <div className="text-sm font-semibold text-white">{finding.location}</div>
                      <div className="text-xs text-slate-400">{finding.algorithm} • {finding.keySize}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge style={{ 
                      background: finding.risk === "CRITICAL" ? `${SEVERITY_COLORS.critical}20` : 
                                 finding.risk === "HIGH" ? `${SEVERITY_COLORS.high}20` : 
                                 `${SEVERITY_COLORS.medium}20`,
                      color: finding.risk === "CRITICAL" ? SEVERITY_COLORS.critical :
                             finding.risk === "HIGH" ? SEVERITY_COLORS.high :
                             SEVERITY_COLORS.medium
                    }}>
                      {finding.risk}
                    </Badge>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Priority</div>
                      <div className="text-sm font-bold text-white">{finding.priority}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Fix</div>
                      <div className="text-sm text-emerald-400">{finding.fix}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Algorithm Reference */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-[#111827] border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Vulnerable Algorithms (Migrate Away)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {VULNERABLE_ALGORITHMS.map((algo, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-semibold">{algo.name}</span>
                  <Badge style={{ background: `${SEVERITY_COLORS[algo.risk.toLowerCase()]}20`, color: SEVERITY_COLORS[algo.risk.toLowerCase()] }}>
                    {algo.risk}
                  </Badge>
                </div>
                <div className="text-xs text-slate-400">
                  Replace with: <span className="text-emerald-400">{algo.replacement}</span> • {algo.timeline}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-[#111827] border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Quantum-Safe Algorithms (NIST-Approved)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {QUANTUM_SAFE_ALGORITHMS.map((algo, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-semibold">{algo.name}</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {algo.status}
                  </Badge>
                </div>
                <div className="text-xs text-slate-400">{algo.type}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}