import React, { useState, useMemo } from "react";
import { Cloud, AlertTriangle, Shield, TrendingUp, Filter, X } from "lucide-react";
import { Card, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT } from "@/components/gds/GDSOSShared";

const SEVERITY_COLORS = {
  critical: { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.5)", text: "#ef4444", pulse: true },
  high: { bg: "rgba(249,115,22,0.15)", border: "rgba(249,115,22,0.5)", text: "#f97316", pulse: false },
  medium: { bg: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.5)", text: "#eab308", pulse: false },
  low: { bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.5)", text: "#3b82f6", pulse: false },
};

const CLOUD_PROVIDERS = {
  aws: { color: "#ff9900", label: "AWS" },
  azure: { color: "#0078d4", label: "Azure" },
  gcp: { color: "#4285f4", label: "GCP" },
};

export default function CloudRiskHeatmap({ cloudFindings = [], identityFindings = [], k8sFindings = [] }) {
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Aggregate findings by asset and severity
  const assetRiskData = useMemo(() => {
    const allFindings = [...cloudFindings, ...identityFindings, ...k8sFindings];
    
    const assetMap = allFindings.reduce((acc, finding) => {
      const assetId = finding.asset_id || finding.resource || finding.asset_name || "unknown";
      const severity = (finding.severity || finding.normalized_severity || "low").toLowerCase();
      const provider = finding.cloud_provider || finding.provider || "unknown";
      
      if (!acc[assetId]) {
        acc[assetId] = {
          id: assetId,
          name: finding.asset_name || finding.resource || assetId,
          provider,
          asset_type: finding.asset_type || finding.service || "Unknown",
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          total: 0,
          findings: [],
        };
      }
      
      acc[assetId][severity] = (acc[assetId][severity] || 0) + 1;
      acc[assetId].total++;
      acc[assetId].findings.push(finding);
      
      return acc;
    }, {});

    return Object.values(assetMap).map(asset => ({
      ...asset,
      riskScore: (asset.critical * 4 + asset.high * 3 + asset.medium * 2 + asset.low * 1),
      maxSeverity: asset.critical > 0 ? "critical" : asset.high > 0 ? "high" : asset.medium > 0 ? "medium" : "low",
    })).sort((a, b) => b.riskScore - a.riskScore);
  }, [cloudFindings, identityFindings, k8sFindings]);

  // Filter data
  const filteredData = useMemo(() => {
    return assetRiskData.filter(asset => {
      const matchesSeverity = selectedSeverity === "all" || asset.maxSeverity === selectedSeverity;
      const matchesProvider = selectedProvider === "all" || asset.provider?.toLowerCase() === selectedProvider.toLowerCase();
      return matchesSeverity && matchesProvider;
    });
  }, [assetRiskData, selectedSeverity, selectedProvider]);

  // Summary stats
  const stats = useMemo(() => {
    const total = assetRiskData.reduce((sum, a) => sum + a.total, 0);
    const critical = assetRiskData.reduce((sum, a) => sum + a.critical, 0);
    const high = assetRiskData.reduce((sum, a) => sum + a.high, 0);
    const medium = assetRiskData.reduce((sum, a) => sum + a.medium, 0);
    const low = assetRiskData.reduce((sum, a) => sum + a.low, 0);
    const avgRisk = assetRiskData.length > 0 
      ? Math.round(assetRiskData.reduce((sum, a) => sum + a.riskScore, 0) / assetRiskData.length)
      : 0;
    
    return { total, critical, high, medium, low, avgRisk, assets: assetRiskData.length };
  }, [assetRiskData]);

  const getCellSize = (riskScore) => {
    if (riskScore >= 20) return "w-24 h-24";
    if (riskScore >= 10) return "w-20 h-20";
    if (riskScore >= 5) return "w-16 h-16";
    return "w-12 h-12";
  };

  const getCellColor = (maxSeverity) => {
    return SEVERITY_COLORS[maxSeverity] || SEVERITY_COLORS.low;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Cloud className="w-5 h-5" style={{ color: CYAN }} />
            Cloud Asset Risk Heatmap
          </h3>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>
            {assetRiskData.length} Assets · {stats.total} Vulnerabilities · Avg Risk Score: {stats.avgRisk}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={selectedSeverity} 
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold outline-none"
            style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High+</option>
            <option value="medium">Medium+</option>
            <option value="low">Low+</option>
          </select>
          <select 
            value={selectedProvider} 
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold outline-none"
            style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="all">All Providers</option>
            <option value="aws">AWS</option>
            <option value="azure">Azure</option>
            <option value="gcp">GCP</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <div className="p-3 rounded-xl text-center" style={{ background: "rgba(239,68,68,0.1)", border: `1px solid rgba(239,68,68,0.3)` }}>
          <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Critical</p>
          <p className="text-2xl font-black" style={{ color: DANGER }}>{stats.critical}</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: "rgba(249,115,22,0.1)", border: `1px solid rgba(249,115,22,0.3)` }}>
          <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>High</p>
          <p className="text-2xl font-black" style={{ color: HIGH }}>{stats.high}</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: "rgba(234,179,8,0.1)", border: `1px solid rgba(234,179,8,0.3)` }}>
          <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Medium</p>
          <p className="text-2xl font-black" style={{ color: MEDIUM }}>{stats.medium}</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: "rgba(59,130,246,0.1)", border: `1px solid rgba(59,130,246,0.3)` }}>
          <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Low</p>
          <p className="text-2xl font-black" style={{ color: LOW }}>{stats.low}</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: "rgba(0,212,255,0.1)", border: `1px solid rgba(0,212,255,0.3)` }}>
          <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Assets</p>
          <p className="text-2xl font-black" style={{ color: CYAN }}>{stats.assets}</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: "rgba(139,92,246,0.1)", border: `1px solid rgba(139,92,246,0.3)` }}>
          <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Avg Risk</p>
          <p className="text-2xl font-black" style={{ color: "#8b5cf6" }}>{stats.avgRisk}</p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 max-h-[600px] overflow-y-auto pr-2">
        {filteredData.map((asset) => {
          const color = getCellColor(asset.maxSeverity);
          const provider = CLOUD_PROVIDERS[asset.provider?.toLowerCase()] || { color: MUTED, label: asset.provider || "Unknown" };
          
          return (
            <div
              key={asset.id}
              onClick={() => setSelectedAsset(selectedAsset?.id === asset.id ? null : asset)}
              className={`relative rounded-xl p-3 cursor-pointer transition-all hover:scale-105 ${color.pulse ? 'animate-pulse' : ''}`}
              style={{ 
                background: color.bg, 
                border: `2px solid ${color.border}`,
                boxShadow: `0 0 ${asset.riskScore * 2}px ${color.border}`
              }}
            >
              {/* Provider Badge */}
              <div className="absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center text-[8px] font-black"
                style={{ background: provider.color, color: "#fff" }}>
                {provider.label.slice(0, 2)}
              </div>

              {/* Asset Icon */}
              <div className="w-10 h-10 rounded-lg mb-2 flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.1)", border: `1px solid ${color.border}` }}>
                <Cloud className="w-5 h-5" style={{ color: color.text }} />
              </div>

              {/* Asset Name */}
              <p className="text-[10px] font-bold text-white truncate mb-1">{asset.name}</p>
              <p className="text-[8px] font-bold uppercase" style={{ color: MUTED }}>{asset.asset_type}</p>

              {/* Severity Breakdown */}
              <div className="mt-2 space-y-1">
                {asset.critical > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[8px]" style={{ color: DANGER }}>●</span>
                    <span className="text-[9px] font-black" style={{ color: DANGER }}>{asset.critical}</span>
                  </div>
                )}
                {asset.high > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[8px]" style={{ color: HIGH }}>●</span>
                    <span className="text-[9px] font-black" style={{ color: HIGH }}>{asset.high}</span>
                  </div>
                )}
                {asset.medium > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[8px]" style={{ color: MEDIUM }}>●</span>
                    <span className="text-[9px] font-black" style={{ color: MEDIUM }}>{asset.medium}</span>
                  </div>
                )}
                {asset.low > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[8px]" style={{ color: LOW }}>●</span>
                    <span className="text-[9px] font-black" style={{ color: LOW }}>{asset.low}</span>
                  </div>
                )}
              </div>

              {/* Risk Score */}
              <div className="mt-2 pt-2 border-t" style={{ borderColor: color.border }}>
                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Risk Score</p>
                <p className="text-lg font-black" style={{ color: color.text }}>{asset.riskScore}</p>
              </div>
            </div>
          );
        })}
      </div>

      {filteredData.length === 0 && (
        <div className="py-12 text-center">
          <Shield className="w-12 h-12 mx-auto mb-3" style={{ color: MUTED }} />
          <p className="text-sm font-bold text-white">No Assets Match Filters</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>Try adjusting your severity or provider filters</p>
        </div>
      )}

      {/* Asset Detail Panel */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-2xl rounded-2xl p-6" style={{ background: "#0a0f1c", border: `2px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-black text-white">Asset Details</h4>
              <button onClick={() => setSelectedAsset(null)} className="p-2 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" style={{ color: MUTED }} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Asset Name</p>
                <p className="text-sm font-bold text-white">{selectedAsset.name}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Provider</p>
                <p className="text-sm font-bold" style={{ color: CLOUD_PROVIDERS[selectedAsset.provider?.toLowerCase()]?.color || MUTED }}>
                  {selectedAsset.provider || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Asset Type</p>
                <p className="text-sm font-bold text-white">{selectedAsset.asset_type}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Risk Score</p>
                <p className="text-sm font-black" style={{ color: getCellColor(selectedAsset.maxSeverity).text }}>
                  {selectedAsset.riskScore}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Severity Breakdown</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 rounded-lg text-center" style={{ background: SEVERITY_COLORS.critical.bg, border: `1px solid ${SEVERITY_COLORS.critical.border}` }}>
                  <p className="text-[8px] font-bold" style={{ color: SEVERITY_COLORS.critical.text }}>Critical</p>
                  <p className="text-lg font-black" style={{ color: SEVERITY_COLORS.critical.text }}>{selectedAsset.critical}</p>
                </div>
                <div className="p-2 rounded-lg text-center" style={{ background: SEVERITY_COLORS.high.bg, border: `1px solid ${SEVERITY_COLORS.high.border}` }}>
                  <p className="text-[8px] font-bold" style={{ color: SEVERITY_COLORS.high.text }}>High</p>
                  <p className="text-lg font-black" style={{ color: SEVERITY_COLORS.high.text }}>{selectedAsset.high}</p>
                </div>
                <div className="p-2 rounded-lg text-center" style={{ background: SEVERITY_COLORS.medium.bg, border: `1px solid ${SEVERITY_COLORS.medium.border}` }}>
                  <p className="text-[8px] font-bold" style={{ color: SEVERITY_COLORS.medium.text }}>Medium</p>
                  <p className="text-lg font-black" style={{ color: SEVERITY_COLORS.medium.text }}>{selectedAsset.medium}</p>
                </div>
                <div className="p-2 rounded-lg text-center" style={{ background: SEVERITY_COLORS.low.bg, border: `1px solid ${SEVERITY_COLORS.low.border}` }}>
                  <p className="text-[8px] font-bold" style={{ color: SEVERITY_COLORS.low.text }}>Low</p>
                  <p className="text-lg font-black" style={{ color: SEVERITY_COLORS.low.text }}>{selectedAsset.low}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Recent Findings</p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedAsset.findings.slice(0, 10).map((finding, idx) => (
                  <div key={idx} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                    <p className="text-[10px] font-bold text-white truncate">{finding.title || finding.name || "Finding"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ 
                        background: `${SEVERITY_COLORS[finding.severity?.toLowerCase() || 'low']?.text}15`, 
                        color: SEVERITY_COLORS[finding.severity?.toLowerCase() || 'low']?.text 
                      }}>
                        {finding.severity || "Unknown"}
                      </span>
                      <span className="text-[8px]" style={{ color: MUTED }}>{finding.service || finding.resource_type || ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}