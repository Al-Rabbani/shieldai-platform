import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Star, Shield, CheckCircle, Zap } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Breadcrumb, Card, Skeleton, EmptyState, PAGE_BG
} from "@/components/gds/GDSOSShared";

const CATEGORIES = ["all", "security", "productivity", "analytics", "communication", "storage", "ai", "devops", "monitoring"];
const PRICING_COLORS = { free: "#10b981", one_time: "#3b82f6", subscription: "#f59e0b", usage_based: "#14b8a6" };

export default function GDSMarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["marketplace-listings"],
    queryFn: () => base44.entities.MarketplaceListing.list("", 100).catch(() => []),
  });

  const filtered = listings.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || l.category === category;
    return matchesSearch && matchesCategory;
  });

  const featured = listings.filter(l => l.is_featured);
  const certified = listings.filter(l => l.is_verified);
  const free = listings.filter(l => l.pricing_model === "free");

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Integration Hub", path: "/integration-hub" }, { label: "Marketplace" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Connector Marketplace</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Browse and install connectors, integrations, and tools</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5" glow>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Listings</span>
          <p className="text-2xl font-black font-mono mt-2" style={{ color: CYAN }}>{listings.length}</p>
        </Card>
        <Card className="p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Featured</span>
          <p className="text-2xl font-black font-mono mt-2" style={{ color: HIGH }}>{featured.length}</p>
        </Card>
        <Card className="p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Certified</span>
          <p className="text-2xl font-black font-mono mt-2" style={{ color: LOW }}>{certified.length}</p>
        </Card>
        <Card className="p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Free</span>
          <p className="text-2xl font-black font-mono mt-2" style={{ color: "#10b981" }}>{free.length}</p>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="p-5">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search connectors, integrations..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: `${BORDER}40`, border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.slice(0, 5).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${category === cat ? "text-white" : ""}`}
                style={{ background: category === cat ? CYAN : `${BORDER}40`, border: `1px solid ${category === cat ? CYAN : BORDER}`, color: category === cat ? "#020817" : MUTED }}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Listings Grid */}
      {isLoading ? <Skeleton lines={8} /> : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No listings found" description="Try adjusting your search or filters" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((listing, i) => {
            const priceColor = PRICING_COLORS[listing.pricing_model] || MUTED;
            return (
              <Card key={listing.id || i} className="p-5" glow>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${BORDER}40`, border: `1px solid ${BORDER}` }}>
                    <Zap className="w-6 h-6" style={{ color: CYAN }} />
                  </div>
                  {listing.is_verified && <Shield className="w-5 h-5" style={{ color: LOW }} />}
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{listing.name}</h3>
                <p className="text-[10px] mb-2 line-clamp-2" style={{ color: MUTED }}>{listing.description}</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{listing.category}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: priceColor, background: `${priceColor}15` }}>{listing.pricing_model}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3" style={{ color: HIGH }} />
                    <span className="text-xs font-bold text-white">{listing.rating?.toFixed(1) || "—"}</span>
                    <span className="text-[10px]" style={{ color: MUTED }}>({listing.reviews_count || 0})</span>
                  </div>
                  <span className="text-[10px]" style={{ color: MUTED }}>{listing.installs_count || 0} installs</span>
                </div>
                <button className="w-full py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                  style={{ background: CYAN, color: "#020817" }}>
                  Install
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}