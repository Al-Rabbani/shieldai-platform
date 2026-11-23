import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Radio, Plus, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BG = "#020817";

const PROVIDER_COLORS = {
  mitre: DANGER, alienvault: CYAN, virus_total: HIGH,
  abuse_ch: "#a855f7", tor_exit: MEDIUM, cisa: "#f59e0b"
};

export default function GDSThreatIntelFeedsPage() {
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFeed, setNewFeed] = useState({ name: "", url: "", provider: "", update_interval_hours: 24 });

  const { data: feeds = [], isLoading } = useQuery({
    queryKey: ["threat-feeds"], queryFn: () => base44.entities.ThreatIntelFeed.list("", 50).catch(() => []),
  });

  const addFeedMutation = useMutation({
    mutationFn: async (data) => await base44.entities.ThreatIntelFeed.create(data),
    onSuccess: () => { qc.invalidateQueries(["threat-feeds"]); setShowAddModal(false); setNewFeed({ name: "", url: "", provider: "", update_interval_hours: 24 }); },
  });

  const updateFeedMutation = useMutation({
    mutationFn: async ({ id, data }) => await base44.entities.ThreatIntelFeed.update(id, data),
    onSuccess: () => { qc.invalidateQueries(["threat-feeds"]); },
  });

  const handleAddFeed = () => {
    addFeedMutation.mutate(newFeed);
  };

  const handleRefresh = (feed) => {
    updateFeedMutation.mutate({ id: feed.id, data: { last_synced_at: new Date().toISOString() } });
  };

  const activeFeeds = feeds.filter(f => f.is_active).length;
  const totalIOCs = feeds.reduce((sum, f) => sum + (f.ioc_count || 0), 0);

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Threat Intel", path: "/threat-intel" }, { label: "Intelligence Feeds" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Radio className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Intelligence Feeds</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Manage threat intelligence feed integrations</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Feed
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Feeds</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{feeds.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{activeFeeds}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total IOCs</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{totalIOCs.toLocaleString()}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg IOCs/Feed</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{feeds.length > 0 ? Math.round(totalIOCs / feeds.length).toLocaleString() : 0}</p>
        </Card>
      </div>

      {isLoading ? <Skeleton lines={6} /> : feeds.length === 0 ? (
        <EmptyState icon={Radio} title="No intelligence feeds" description="Add threat intelligence feeds to populate data" actionLabel="Add Feed" actionPath="#" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feeds.map((feed) => {
            const providerColor = PROVIDER_COLORS[feed.provider?.toLowerCase()] || MUTED;
            return (
              <Card key={feed.id} className="p-5" style={{ background: feed.is_active ? `${CYAN}05` : CARD, border: `1px solid ${feed.is_active ? CYAN + "30" : BORDER}` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-bold text-white">{feed.name}</h3>
                      {feed.is_active && <CheckCircle className="w-4 h-4" style={{ color: LOW }} />}
                      {!feed.is_active && <XCircle className="w-4 h-4" style={{ color: MUTED }} />}
                    </div>
                    <p className="text-xs font-mono truncate" style={{ color: MUTED }}>{feed.feed_url || "No URL"}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${providerColor}15`, color: providerColor }}>
                    {feed.provider || "Unknown"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div>
                    <p className="font-bold mb-1" style={{ color: MUTED }}>IOC Count</p>
                    <p className="text-sm font-bold" style={{ color: TEXT }}>{feed.ioc_count?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="font-bold mb-1" style={{ color: MUTED }}>Update Interval</p>
                    <p className="text-sm" style={{ color: TEXT }}>{feed.update_interval_hours || 24}h</p>
                  </div>
                  <div>
                    <p className="font-bold mb-1" style={{ color: MUTED }}>Last Sync</p>
                    <p className="text-sm" style={{ color: MUTED }}>{timeAgo(feed.last_synced_at)}</p>
                  </div>
                  <div>
                    <p className="font-bold mb-1" style={{ color: MUTED }}>False Positive Rate</p>
                    <p className="text-sm" style={{ color: feed.false_positive_rate < 0.1 ? LOW : feed.false_positive_rate < 0.3 ? MEDIUM : HIGH }}>
                      {((feed.false_positive_rate || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => handleRefresh(feed)} disabled={updateFeedMutation.isPending} className="flex-1 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                    <RefreshCw className={`w-3 h-3 mr-1.5 ${updateFeedMutation.isPending ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Feed Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent style={{ background: "#0a1628", border: `1px solid ${BORDER}` }}>
          <DialogHeader>
            <DialogTitle className="text-white">Add Intelligence Feed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label style={{ color: TEXT }}>Feed Name</Label>
              <Input value={newFeed.name} onChange={(e) => setNewFeed({...newFeed, name: e.target.value})} placeholder="e.g., AlienVault OTX" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
            </div>
            <div>
              <Label style={{ color: TEXT }}>Provider</Label>
              <select value={newFeed.provider} onChange={(e) => setNewFeed({...newFeed, provider: e.target.value})} className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                <option value="">Select provider</option>
                <option value="mitre">MITRE ATT&CK</option>
                <option value="alienvault">AlienVault OTX</option>
                <option value="virus_total">VirusTotal</option>
                <option value="abuse_ch">Abuse.ch</option>
                <option value="tor_exit">Tor Exit Nodes</option>
                <option value="cisa">CISA</option>
              </select>
            </div>
            <div>
              <Label style={{ color: TEXT }}>Feed URL</Label>
              <Input value={newFeed.url} onChange={(e) => setNewFeed({...newFeed, url: e.target.value})} placeholder="https://..." style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
            </div>
            <div>
              <Label style={{ color: TEXT }}>Update Interval (hours)</Label>
              <Input type="number" value={newFeed.update_interval_hours} onChange={(e) => setNewFeed({...newFeed, update_interval_hours: parseInt(e.target.value)})} style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={() => setShowAddModal(false)} variant="ghost" className="flex-1" style={{ color: MUTED }}>Cancel</Button>
              <Button onClick={handleAddFeed} disabled={!newFeed.name || !newFeed.provider} className="flex-1" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>Add Feed</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}