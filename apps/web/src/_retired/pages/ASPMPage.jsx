import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Search, Filter, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ASPMRiskMatrix from "@/components/aspm/ASPMRiskMatrix";
import ASPMAssetRow from "@/components/aspm/ASPMAssetRow";

const SCANNER_COLORS = { SAST: "#3b82f6", SCA: "#10b981", DAST: "#f97316", Pentest: "#ef4444", VMScanner: "#8b5cf6", CloudScanner: "#06b6d4", License: "#eab308", EOL: "#64748b" };

export default function ASPMPage() {
  const didSeed = useRef(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("risk_score");
  const [teamFilter, setTeamFilter] = useState("all");
  const [critFilter, setCritFilter] = useState("all");

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["aspm-assets"],
    queryFn: () => base44.entities.ASPMAsset.list("-risk_score", 200),
    initialData: []
  });

  useEffect(() => {
    if (didSeed.current || assets.length > 0) return;
    didSeed.current = true;
    const seed = async () => {
      const now = new Date().toISOString();
      await Promise.all([
        base44.entities.ASPMAsset.create({ name: "payment-processor", asset_type: "repository", team: "Backend", owner: "alice@company.com", environment: "production", business_criticality: "critical", internet_facing: true, risk_score: 94, total_findings: 23, critical_count: 4, high_count: 8, medium_count: 7, low_count: 4, sla_breached_count: 3, scanners_coverage: "SAST,SCA,Secrets,DAST,Pentest", last_scanned: now, linked_repo: "github.com/company/payment-processor", tech_stack: "Node.js, PostgreSQL, Redis", tags: "payments,pci-dss,critical-path" }),
        base44.entities.ASPMAsset.create({ name: "auth-service", asset_type: "container", team: "Platform", owner: "bob@company.com", environment: "production", business_criticality: "critical", internet_facing: true, risk_score: 88, total_findings: 18, critical_count: 2, high_count: 6, medium_count: 7, low_count: 3, sla_breached_count: 2, scanners_coverage: "SCA,VMScanner,CloudScanner,Pentest", last_scanned: now, tech_stack: "Java, Spring Boot, Docker", tags: "auth,iam,critical-path" }),
        base44.entities.ASPMAsset.create({ name: "api-gateway", asset_type: "api", team: "API Team", owner: "carol@company.com", environment: "production", business_criticality: "high", internet_facing: true, risk_score: 76, total_findings: 14, critical_count: 1, high_count: 4, medium_count: 6, low_count: 3, sla_breached_count: 1, scanners_coverage: "DAST,Pentest,SAST", last_scanned: now, tech_stack: "Go, Kong", tags: "gateway,public-api" }),
        base44.entities.ASPMAsset.create({ name: "prod-web-01", asset_type: "vm", team: "Infrastructure", owner: "dave@company.com", environment: "production", business_criticality: "high", internet_facing: true, risk_score: 71, total_findings: 9, critical_count: 0, high_count: 5, medium_count: 3, low_count: 1, sla_breached_count: 0, scanners_coverage: "VMScanner,CloudScanner", last_scanned: now, tech_stack: "Ubuntu 22.04, nginx", tags: "web,dmz" }),
        base44.entities.ASPMAsset.create({ name: "ml-inference-engine", asset_type: "repository", team: "ML Team", owner: "eve@company.com", environment: "production", business_criticality: "high", internet_facing: false, risk_score: 68, total_findings: 11, critical_count: 1, high_count: 2, medium_count: 5, low_count: 3, sla_breached_count: 1, scanners_coverage: "SAST,SCA,Secrets", last_scanned: now, tech_stack: "Python, FastAPI, TensorFlow", tags: "ml,gpu,internal" }),
        base44.entities.ASPMAsset.create({ name: "prod-data-bucket", asset_type: "cloud", team: "DevOps", owner: "frank@company.com", environment: "production", business_criticality: "critical", internet_facing: true, risk_score: 85, total_findings: 7, critical_count: 1, high_count: 3, medium_count: 2, low_count: 1, sla_breached_count: 2, scanners_coverage: "CloudScanner", last_scanned: now, linked_cloud_account: "AWS prod-account", tech_stack: "AWS S3", tags: "storage,pii,gdpr" }),
        base44.entities.ASPMAsset.create({ name: "frontend-app", asset_type: "repository", team: "Frontend", owner: "grace@company.com", environment: "production", business_criticality: "medium", internet_facing: true, risk_score: 52, total_findings: 8, critical_count: 0, high_count: 2, medium_count: 4, low_count: 2, sla_breached_count: 0, scanners_coverage: "SAST,SCA,DAST", last_scanned: now, tech_stack: "React, TypeScript", tags: "spa,public" }),
        base44.entities.ASPMAsset.create({ name: "worker-service", asset_type: "container", team: "Platform", owner: "bob@company.com", environment: "staging", business_criticality: "medium", internet_facing: false, risk_score: 38, total_findings: 4, critical_count: 0, high_count: 1, medium_count: 2, low_count: 1, sla_breached_count: 0, scanners_coverage: "SCA,VMScanner", last_scanned: now, tech_stack: "Node.js, Docker", tags: "background-jobs,internal" }),
        base44.entities.ASPMAsset.create({ name: "marketing-site", asset_type: "domain", team: "Frontend", owner: "grace@company.com", environment: "production", business_criticality: "low", internet_facing: true, risk_score: 29, total_findings: 3, critical_count: 0, high_count: 0, medium_count: 2, low_count: 1, sla_breached_count: 0, scanners_coverage: "DAST,SAST", last_scanned: now, tech_stack: "Next.js, Vercel", tags: "marketing,public" }),
      ]);
    };
    seed().catch(() => {});
  }, [assets.length]);

  const teams = [...new Set(assets.map(a => a.team).filter(Boolean))];
  const totalSlaBreaches = assets.reduce((s, a) => s + (a.sla_breached_count || 0), 0);
  const avgRisk = assets.length > 0 ? Math.round(assets.reduce((s, a) => s + (a.risk_score || 0), 0) / assets.length) : 0;
  const critAtRisk = assets.filter(a => a.business_criticality === "critical" && (a.critical_count || 0) > 0).length;

  const filtered = assets.filter(a => {
    if (teamFilter !== "all" && a.team !== teamFilter) return false;
    if (critFilter !== "all" && a.business_criticality !== critFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.name?.toLowerCase().includes(q) && !a.team?.toLowerCase().includes(q) && !a.owner?.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "risk_score") return (b.risk_score || 0) - (a.risk_score || 0);
    if (sortBy === "critical_count") return (b.critical_count || 0) - (a.critical_count || 0);
    if (sortBy === "total_findings") return (b.total_findings || 0) - (a.total_findings || 0);
    return 0;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="rounded-2xl p-8 relative overflow-hidden" style={{
        background: "linear-gradient(135deg, #0e0b1a 0%, #130e24 50%, #0e0b1a 100%)",
        border: "1px solid rgba(139,92,246,0.3)",
        boxShadow: "0 0 60px rgba(139,92,246,0.08)"
      }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #8b5cf6 0%, transparent 50%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold text-violet-400 uppercase tracking-widest">Application Security Posture Management</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2" style={{ textShadow: "0 0 30px rgba(139,92,246,0.3)" }}>
            ASPM — <span style={{ color: "#8b5cf6" }}>Unified Risk View</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Unified view of every asset, every scanner, every finding — with ownership and risk context.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Assets", value: assets.length, color: "#8b5cf6", icon: "🗺️" },
          { label: "Critical at Risk", value: critAtRisk, color: "#ef4444", icon: "🔴" },
          { label: "SLA Breaches", value: totalSlaBreaches, color: "#f97316", icon: "⏰" },
          { label: "Avg Risk Score", value: `${avgRisk}/100`, color: avgRisk > 70 ? "#ef4444" : avgRisk > 40 ? "#f97316" : "#10b981", icon: "📊" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #0f172a, #0a0f1e)", border: "1px solid rgba(30,58,95,0.4)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span>{s.icon}</span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Risk Matrix */}
      {assets.length > 0 && <ASPMRiskMatrix assets={assets} />}

      {/* Filters */}
      <div className="rounded-xl p-4 flex flex-wrap gap-3 items-center" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.5)" }}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs w-48" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.6)" }} />
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="h-8 text-xs w-36" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.6)" }}>
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Teams</SelectItem>
            {teams.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={critFilter} onValueChange={setCritFilter}>
          <SelectTrigger className="h-8 text-xs w-40" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.6)" }}>
            <SelectValue placeholder="Criticality" />
          </SelectTrigger>
          <SelectContent>
            {["all","critical","high","medium","low"].map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-8 text-xs w-40" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.6)" }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="risk_score" className="text-xs">Sort: Risk Score</SelectItem>
            <SelectItem value="critical_count" className="text-xs">Sort: Critical Findings</SelectItem>
            <SelectItem value="total_findings" className="text-xs">Sort: Total Findings</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs font-mono text-slate-500 ml-auto">{filtered.length} assets</span>
      </div>

      {/* Asset Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(30,58,95,0.5)" }}>
        <div className="grid text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider px-4 py-2.5"
          style={{ background: "#070d14", borderBottom: "1px solid rgba(30,58,95,0.5)",
            gridTemplateColumns: "90px 1fr 100px 120px 120px 80px 80px 120px 80px 60px 80px 60px" }}>
          <span>Criticality</span><span>Asset</span><span>Type</span><span>Team</span><span>Owner</span>
          <span>Facing</span><span>Env</span><span>Scanners</span><span>Findings</span>
          <span>Crit</span><span>Risk</span><span>SLA</span>
        </div>
        {isLoading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-14 animate-pulse" style={{ background: i % 2 === 0 ? "#0a0f1e" : "#080d18", borderBottom: "1px solid rgba(30,58,95,0.3)" }} />)
        ) : filtered.map((asset, i) => (
          <ASPMAssetRow key={asset.id} asset={asset} index={i} scannerColors={SCANNER_COLORS} />
        ))}
      </div>
    </div>
  );
}