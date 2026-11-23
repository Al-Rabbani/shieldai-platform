import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Cpu, Sparkles, CheckCircle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Breadcrumb, Card, Skeleton, EmptyState, PAGE_BG
} from "@/components/gds/GDSOSShared";

const LANGUAGE_COLORS = { typescript: "#3b82f6", python: "#f59e0b", go: "#14b8a6", java: "#f97316", rust: "#ef4444" };

export default function GDSConnectorSDKPage() {
  const [activeTab, setActiveTab] = useState("sdk");
  const { data: sdks = [], isLoading: loadS } = useQuery({
    queryKey: ["connector-sdks"],
    queryFn: () => base44.entities.ConnectorSDK.list("", 100).catch(() => []),
  });
  const { data: templates = [], isLoading: loadT } = useQuery({
    queryKey: ["connector-templates"],
    queryFn: () => base44.entities.ConnectorTemplate.list("", 100).catch(() => []),
  });
  const { data: packages = [], isLoading: loadP } = useQuery({
    queryKey: ["connector-packages"],
    queryFn: () => base44.entities.ConnectorPackage.list("", 100).catch(() => []),
  });

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Integration Hub", path: "/integration-hub" }, { label: "SDK Studio" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Connector SDK Studio</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Generate connectors with AI-powered SDK tools</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
          style={{ background: CYAN, color: "#020817" }}>
          <Sparkles className="w-4 h-4" /> Generate with AI
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: BORDER }}>
        <button onClick={() => setActiveTab("sdk")}
          className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "sdk" ? "text-white border-b-2" : ""}`}
          style={{ borderColor: activeTab === "sdk" ? CYAN : "transparent", color: activeTab === "sdk" ? CYAN : MUTED }}>
          SDKs
        </button>
        <button onClick={() => setActiveTab("templates")}
          className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "templates" ? "text-white border-b-2" : ""}`}
          style={{ borderColor: activeTab === "templates" ? CYAN : "transparent", color: activeTab === "templates" ? CYAN : MUTED }}>
          Templates
        </button>
        <button onClick={() => setActiveTab("packages")}
          className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "packages" ? "text-white border-b-2" : ""}`}
          style={{ borderColor: activeTab === "packages" ? CYAN : "transparent", color: activeTab === "packages" ? CYAN : MUTED }}>
          Packages
        </button>
      </div>

      {activeTab === "sdk" && (
        <Card className="overflow-hidden">
          {loadS ? <Skeleton lines={6} /> : sdks.length === 0 ? (
            <EmptyState icon={Cpu} title="No SDKs" description="Generate your first SDK" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Language</th>
                    <th className="pb-3 font-semibold">AI Generated</th>
                    <th className="pb-3 font-semibold">Endpoints</th>
                    <th className="pb-3 font-semibold">Test Coverage</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                  {sdks.map((sdk, i) => (
                    <tr key={sdk.id || i} className="text-white">
                      <td className="py-3 font-semibold">{sdk.name}</td>
                      <td className="py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: LANGUAGE_COLORS[sdk.language], background: `${LANGUAGE_COLORS[sdk.language]}15` }}>
                          {sdk.language}
                        </span>
                      </td>
                      <td className="py-3">{sdk.ai_generated ? <Sparkles className="w-4 h-4" style={{ color: CYAN }} /> : "—"}</td>
                      <td className="py-3 font-mono">{sdk.endpoints_count || 0}</td>
                      <td className="py-3">
                        <div className="w-16 h-2 rounded-full" style={{ background: BORDER }}>
                          <div className="h-full rounded-full" style={{ width: `${sdk.test_coverage || 0}%`, background: sdk.test_coverage >= 80 ? LOW : sdk.test_coverage >= 50 ? MEDIUM : DANGER }} />
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sdk.status === "active" ? "text-green-400 bg-green-400/15" : sdk.status === "beta" ? "text-blue-400 bg-blue-400/15" : "text-slate-400 bg-slate-400/15"}`}>
                          {sdk.status}
                        </span>
                      </td>
                      <td className="py-3" style={{ color: MUTED }}>{sdk.generated_at ? new Date(sdk.generated_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "templates" && (
        <Card className="overflow-hidden">
          {loadT ? <Skeleton lines={6} /> : templates.length === 0 ? (
            <EmptyState icon={Cpu} title="No templates" description="Connector templates will appear here" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {templates.map((t, i) => (
                <Card key={t.id || i} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{t.template_type}</span>
                    <span className="text-[10px]" style={{ color: MUTED }}>{t.category}</span>
                  </div>
                  <p className="text-sm font-bold text-white mb-2">{t.template_type} Template</p>
                  <div className="text-[10px] space-y-1" style={{ color: MUTED }}>
                    <p>Auth: <span className="text-white">{t.auth_type}</span></p>
                    <p>Uses: <span className="text-white">{t.use_count || 0}</span></p>
                    <div className="flex items-center gap-2">
                      <span>Success Rate:</span>
                      <div className="flex-1 w-12 h-1.5 rounded-full" style={{ background: BORDER }}>
                        <div className="h-full rounded-full" style={{ width: `${t.success_rate || 0}%`, background: t.success_rate >= 90 ? LOW : LOW }} />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "packages" && (
        <Card className="overflow-hidden">
          {loadP ? <Skeleton lines={6} /> : packages.length === 0 ? (
            <EmptyState icon={Cpu} title="No packages" description="Connector packages will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Language</th>
                    <th className="pb-3 font-semibold">Size</th>
                    <th className="pb-3 font-semibold">Version</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                  {packages.map((p, i) => (
                    <tr key={p.id || i} className="text-white">
                      <td className="py-3 font-mono">{p.name}</td>
                      <td className="py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{p.package_type}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: LANGUAGE_COLORS[p.language], background: `${LANGUAGE_COLORS[p.language]}15` }}>
                          {p.language}
                        </span>
                      </td>
                      <td className="py-3 font-mono">{(p.size_kb || 0).toLocaleString()} KB</td>
                      <td className="py-3 font-mono">{p.version}</td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === "published" ? "text-green-400 bg-green-400/15" : "text-slate-400 bg-slate-400/15"}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}