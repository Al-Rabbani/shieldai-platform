import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Container, Lock, AlertTriangle, Shield, FileText, Package } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, SevBadge, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";

export default function GDSContainerImageSecurityPage() {
  const [filters, setFilters] = useState({ runs_as_root: false, is_signed: false, secrets_detected: false });

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["container-images"],
    queryFn: () => base44.entities.ContainerImage.list("-analyzed_at", 300).catch(() => []),
  });

  const filteredImages = images.filter(img => {
    const matchRoot = !filters.runs_as_root || img.runs_as_root === true;
    const matchSigned = !filters.is_signed || img.is_signed === true;
    const matchSecrets = !filters.secrets_detected || img.secrets_detected === true;
    return matchRoot && matchSigned && matchSecrets;
  });

  const stats = {
    total: images.length,
    unsigned: images.filter(img => !img.is_signed).length,
    root: images.filter(img => img.runs_as_root).length,
    withSecrets: images.filter(img => img.secrets_detected).length,
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "DevSecOps", path: "/devsecops" }, { label: "Container Image Security" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Container className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Container Image Security</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Container image vulnerabilities, secrets detection, and signing verification</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 text-xs cursor-pointer px-3 py-2 rounded-xl" style={{ background: filters.runs_as_root ? `${DANGER}15` : "rgba(255,255,255,0.04)", border: `1px solid ${filters.runs_as_root ? DANGER + "40" : BORDER}` }}>
            <input type="checkbox" checked={filters.runs_as_root} onChange={(e) => setFilters({ ...filters, runs_as_root: e.target.checked })} className="w-4 h-4" style={{ accentColor: DANGER }} />
            <span style={{ color: filters.runs_as_root ? DANGER : MUTED }}>Root Users</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer px-3 py-2 rounded-xl" style={{ background: filters.is_signed ? `${LOW}15` : "rgba(255,255,255,0.04)", border: `1px solid ${filters.is_signed ? LOW + "40" : BORDER}` }}>
            <input type="checkbox" checked={filters.is_signed} onChange={(e) => setFilters({ ...filters, is_signed: e.target.checked })} className="w-4 h-4" style={{ accentColor: LOW }} />
            <span style={{ color: filters.is_signed ? LOW : MUTED }}>Signed Only</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer px-3 py-2 rounded-xl" style={{ background: filters.secrets_detected ? `${DANGER}15` : "rgba(255,255,255,0.04)", border: `1px solid ${filters.secrets_detected ? DANGER + "40" : BORDER}` }}>
            <input type="checkbox" checked={filters.secrets_detected} onChange={(e) => setFilters({ ...filters, secrets_detected: e.target.checked })} className="w-4 h-4" style={{ accentColor: DANGER }} />
            <span style={{ color: filters.secrets_detected ? DANGER : MUTED }}>Has Secrets</span>
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Images Scanned</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: stats.unsigned > 0 ? `${DANGER}08` : "transparent", border: stats.unsigned > 0 ? `1px solid ${DANGER}30` : "none" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Unsigned Images</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.unsigned > 0 ? DANGER : MUTED }}>{stats.unsigned}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: stats.root > 0 ? `${HIGH}08` : "transparent", border: stats.root > 0 ? `1px solid ${HIGH}30` : "none" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Root Containers</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.root > 0 ? HIGH : MUTED }}>{stats.root}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: stats.withSecrets > 0 ? `${DANGER}08` : "transparent", border: stats.withSecrets > 0 ? `1px solid ${DANGER}30` : "none" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>With Secrets</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.withSecrets > 0 ? DANGER : MUTED }}>{stats.withSecrets}</p>
        </Card>
      </div>

      {/* Images Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Container Images</h3>
        {isLoading ? <Skeleton lines={6} /> : filteredImages.length === 0 ? (
          <EmptyState icon={Container} title="No container images" description={images.length === 0 ? "Scan your container images to see security analysis" : "No images match the current filters"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Image", "Tag", "Registry", "Root User", "Signed", "Signature Verified", "Secrets", "Packages", "Critical Vulns", "High Vulns", "SBOM", "Risk", "Grade"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredImages.slice(0, 100).map((img, i) => {
                  const riskColor = (img.risk_score || 0) >= 80 ? DANGER : (img.risk_score || 0) >= 50 ? HIGH : (img.risk_score || 0) >= 20 ? MEDIUM : LOW;
                  const grade = (img.risk_score || 0) >= 80 ? "F" : (img.risk_score || 0) >= 60 ? "D" : (img.risk_score || 0) >= 40 ? "C" : (img.risk_score || 0) >= 20 ? "B" : "A";
                  return (
                    <tr key={img.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-3">
                        <p className="text-sm font-semibold text-white truncate max-w-xs">{img.image_name}</p>
                        <p className="text-[10px]" style={{ color: MUTED }}>{timeAgo(img.analyzed_at)}</p>
                      </td>
                      <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{img.tag || "latest"}</td>
                      <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{img.registry || "—"}</td>
                      <td className="py-3 px-3">
                        {img.runs_as_root ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${HIGH}15`, color: HIGH }}>⚠️ Root</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>✓ Non-root</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {img.is_signed ? <Shield className="w-4 h-4" style={{ color: LOW }} /> : <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />}
                      </td>
                      <td className="py-3 px-3">
                        {img.signature_verified ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>✓ Verified</span>
                        ) : (
                          <span className="text-[10px]" style={{ color: MUTED }}>—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {img.secrets_detected ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>⚠️ {img.secrets_detected} secrets</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>✓ Clean</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{img.total_packages || 0}</td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>{img.critical_vulnerabilities || 0}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${HIGH}15`, color: HIGH }}>{img.high_vulnerabilities || 0}</span>
                      </td>
                      <td className="py-3 px-3">
                        {img.sbom_generated ? <FileText className="w-4 h-4" style={{ color: LOW }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-xs font-black font-mono" style={{ color: riskColor }}>{img.risk_score || 0}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ background: `${riskColor}15`, color: riskColor }}>{grade}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}