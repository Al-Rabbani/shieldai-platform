import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Wrench, CheckCircle, AlertTriangle } from "lucide-react";
import {
  BORDER, CYAN, DANGER, LOW, MEDIUM, MUTED, TEXT,
  Skeleton, EmptyState, Breadcrumb, Card, PAGE_BG
} from "@/components/gds/GDSOSShared";

const CATEGORIES = ["all","scanner","remediation","threat_intel","hunting","correlation","governance","compliance","testing","cicd","orchestration","notification","reporting"];

const CAT_COLORS = {
  scanner: "#60a5fa",
  remediation: DANGER,
  threat_intel: "#8b5cf6",
  hunting: MEDIUM,
  correlation: CYAN,
  governance: "#f97316",
  compliance: LOW,
  testing: "#ec4899",
  cicd: "#14b8a6",
  orchestration: "#a78bfa",
  notification: "#eab308",
  reporting: "#6ee7b7",
};

const ROLE_COLOR = { admin: DANGER, analyst: CYAN, viewer: MEDIUM };

function CatBadge({ cat }) {
  const color = CAT_COLORS[cat] || MUTED;
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {cat}
    </span>
  );
}

export default function GDSKernelToolsPage() {
  const [catFilter, setCatFilter] = useState("all");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["kernel-tools"],
    queryFn: () => base44.functions.invoke("gdsKernelGateway", { action: "tools" }).then(r => r.data),
  });

  const tools = (data?.tools || []).filter(t => catFilter === "all" || t.category === catFilter);

  return (
    <div style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "AI Kernel", path: "/kernel" }, { label: "Tool Registry" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Tool Registry — EDP-002</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded font-mono"
            style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
            {data?.total ?? 0} tools
          </span>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1 flex-wrap mb-6 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all capitalize"
            style={{
              background: catFilter === cat ? `${CYAN}15` : "transparent",
              color: catFilter === cat ? CYAN : MUTED,
              border: catFilter === cat ? `1px solid ${CYAN}30` : "1px solid transparent"
            }}>
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? <Skeleton lines={6} /> : tools.length === 0
        ? <EmptyState icon={Wrench} title="No tools found" description="No tools match this category" />
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tools.map((tool, i) => {
              const catColor = CAT_COLORS[tool.category] || MUTED;
              const roleColor = ROLE_COLOR[tool.min_role] || MUTED;
              return (
                <Card key={tool.id || i} glow className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Wrench className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: catColor }} />
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full"
                      style={{ background: `${LOW}10`, border: `1px solid ${LOW}25` }}>
                      <span className="w-1 h-1 rounded-full" style={{ background: LOW }} />
                      <span className="text-[8px] font-black" style={{ color: LOW }}>LIVE</span>
                    </div>
                  </div>
                  <p className="text-sm font-black text-white mb-2">{tool.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <CatBadge cat={tool.category} />
                    {tool.requires_approval ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1"
                        style={{ color: DANGER, background: `${DANGER}12`, border: `1px solid ${DANGER}25` }}>
                        <AlertTriangle className="w-2.5 h-2.5" />Approval Required
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1"
                        style={{ color: LOW, background: `${LOW}12`, border: `1px solid ${LOW}25` }}>
                        <CheckCircle className="w-2.5 h-2.5" />No Approval
                      </span>
                    )}
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize"
                      style={{ color: roleColor, background: `${roleColor}12`, border: `1px solid ${roleColor}25` }}>
                      {tool.min_role}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}