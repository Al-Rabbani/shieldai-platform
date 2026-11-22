import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Cpu, Zap, Clock3, DollarSign } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const MODEL_COLORS = {
  anthropic: "#a855f7", openai: "#10b981", google: "#3b82f6", xai: "#ef4444",
  meta: "#f97316", deepseek: "#06b6d4", mistral: "#f59e0b"
};

export default function GDSGASCIModelsPage() {
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["gasci-providers"],
    queryFn: () => base44.entities.ModelProvider.list("-created_at", 100).catch(() => []),
  });

  const stats = {
    active: providers.filter(p => p.is_active).length,
    bestQuality: providers.length > 0 ? providers.reduce((max, p) => (p.quality_score || 0) > (max.quality_score || 0) ? p : max, providers[0]) : null,
    fastest: providers.length > 0 ? providers.reduce((min, p) => (p.avg_latency_ms || Infinity) < (min.avg_latency_ms || Infinity) ? p : min, providers[0]) : null,
    cheapest: providers.length > 0 ? providers.reduce((min, p) => (p.cost_per_1k_input || Infinity) < (min.cost_per_1k_input || Infinity) ? p : min, providers[0]) : null
  };

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "GASCI", path: "/gasci" }, { label: "Models" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Multi-LLM Router</h1>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Model provider management and routing</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active Models</p>
          <p className="text-2xl font-black" style={{ color: LOW }}>{stats.active}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Best Quality</p>
          <p className="text-lg font-black" style={{ color: CYAN }}>{stats.bestQuality?.name || "—"}</p>
          <p className="text-[10px]" style={{ color: MUTED }}>{Math.round((stats.bestQuality?.quality_score || 0) * 100)}% quality</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Fastest</p>
          <p className="text-lg font-black" style={{ color: HIGH }}>{stats.fastest?.name || "—"}</p>
          <p className="text-[10px]" style={{ color: MUTED }}>{stats.fastest?.avg_latency_ms || 0}ms</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Most Cost Effective</p>
          <p className="text-lg font-black" style={{ color: "#06b6d4" }}>{stats.cheapest?.name || "—"}</p>
          <p className="text-[10px]" style={{ color: MUTED }}>${stats.cheapest?.cost_per_1k_input || 0}/1k</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={10} /> : providers.length === 0 ? (
          <div className="text-center py-12"><p className="text-sm" style={{ color: MUTED }}>No model providers</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Name", "Provider", "Type", "Quality", "Latency", "Cost/1k In", "Cost/1k Out", "Active", "Weight"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {providers.map(provider => (
                  <tr key={provider.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-4"><p className="text-xs font-semibold text-white">{provider.name}</p></td>
                    <td className="py-3 px-4"><span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${MODEL_COLORS[provider.provider] || MUTED}30`, color: MODEL_COLORS[provider.provider] || MUTED }}>{provider.provider}</span></td>
                    <td className="py-3 px-4"><span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>{provider.model_type}</span></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${(provider.quality_score || 0) * 100}%`, background: LOW }} />
                        </div>
                        <span className="text-[9px]" style={{ color: MUTED }}>{Math.round((provider.quality_score || 0) * 100)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4"><p className={`text-xs font-bold ${(provider.avg_latency_ms || 0) < 500 ? 'text-green-400' : (provider.avg_latency_ms || 0) < 2000 ? 'text-yellow-400' : 'text-red-400'}`}>{provider.avg_latency_ms || 0}ms</p></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>${provider.cost_per_1k_input || 0}</p></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>${provider.cost_per_1k_output || 0}</p></td>
                    <td className="py-3 px-4">{provider.is_active ? <Zap className="w-4 h-4" style={{ color: LOW }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: MUTED }}>{provider.routing_weight || 0}%</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}