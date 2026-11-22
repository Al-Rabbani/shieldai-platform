import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import { buildLiveDataOverride } from "@/lib/liveDataOverride";
import ThreatFeedCard from "@/components/threatintel/ThreatFeedCard";
import DarkWebTable from "@/components/threatintel/DarkWebTable";
import APTActorCard from "@/components/threatintel/APTActorCard";
import RansomwareGroupCard from "@/components/threatintel/RansomwareGroupCard";
import GlobalThreatMapPanel from "@/components/threatintel/GlobalThreatMapPanel";
import AttackPivotMap from "@/components/threatintel/AttackPivotMap";
import AttackSurfaceGraph from "@/components/threatintel/AttackSurfaceGraph";
import ThreatHuntPanel from "@/components/threatintel/ThreatHuntPanel";
import AIResponseModal from "@/components/shared/AIResponseModal";

const TABS = [
  { key: "feeds", label: "Intelligence Feeds" },
  { key: "darkweb", label: "Dark Web" },
  { key: "apt", label: "APT Actors" },
  { key: "ransomware", label: "Ransomware Groups" },
  { key: "surface", label: "Attack Surface" },
  { key: "pivots", label: "Attack Pivots" },
];

export default function ThreatIntelligencePage() {
  const [feeds, setFeeds] = useState([]);
  const [darkWeb, setDarkWeb] = useState([]);
  const [actors, setActors] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("feeds");
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [huntResult, setHuntResult] = useState(null);
  const [huntLoading, setHuntLoading] = useState(true);

  useEffect(() => {
    buildLiveDataOverride().catch(() => ({ liveDataOverride: "" })).then(({ liveDataOverride }) =>
      invokeAction("gdsAgentOS", {
        action: "command",
        command_type: "threat_hunt",
        input: "Run proactive threat hunt for Global Digital Security. Check: LockBit 3.0 targeting EU MSPs, Scattered Spider SIM-swap, Volt Typhoon pre-positioning, GentleKiller EDR bypasses. Cross-reference with our dark web alerts and credential leaks for globaldigitalstreams.com.",
        priority: "high",
        live_data_override: liveDataOverride,
      })
    ).then(setHuntResult).catch(e => setHuntResult({ response: `Error: ${e.message}` })).finally(() => setHuntLoading(false));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [tf, dw, apt, rg] = await Promise.all([
      base44.entities.ThreatIntelFeed.list("-detected_at", 50).catch(() => []),
      base44.entities.DarkWebAlert.list("-detected_at", 20).catch(() => []),
      base44.entities.APTActor.list("-last_seen", 20).catch(() => []),
      base44.entities.RansomwareGroup.list("-last_seen", 20).catch(() => []),
    ]);
    setFeeds(tf); setDarkWeb(dw); setActors(apt); setGroups(rg);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const affectsUsCount = feeds.filter(f => f.affects_you).length;
  const activeApt = actors.filter(a => a.status === "active").length;

  async function runHunt() {
    setModalTitle("AI Threat Hunt");
    setModalLoading(true); setModalData(null);
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const result = await invokeAction("gdsAgentOS", {
      action: "command",
      command_type: "threat_hunt",
      input: "Run full threat hunt across all intelligence feeds and report active threats, IOCs, and TTPs affecting GDS",
      live_data_override: liveDataOverride,
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  async function briefFeed(feed) {
    setModalTitle(`Threat Brief — ${feed.title}`);
    setModalLoading(true); setModalData(null);
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const result = await invokeAction("gdsAgentOS", {
      action: "command",
      command_type: "threat_hunt",
      input: `Threat brief for: ${feed.title}. ${feed.description}. Affected asset: ${feed.affected_asset}. Action required: ${feed.action_required}`,
      live_data_override: liveDataOverride,
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">🌐 Global Threat Intelligence Centre</h1>
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ● LIVE
        </span>
        <button onClick={runHunt} className="ml-auto px-4 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition">
          🎯 AI Threat Hunt
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active Threat Feeds", value: feeds.length, color: "text-white" },
          { label: "Affects Us", value: affectsUsCount, color: "text-red-400" },
          { label: "Dark Web Alerts", value: darkWeb.length, color: "text-white" },
          { label: "Active APT Groups", value: activeApt, color: "text-orange-400" },
        ].map((t, i) => (
          <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      <GlobalThreatMapPanel feeds={feeds} />
      <ThreatHuntPanel loading={huntLoading} result={huntResult} />

      <div className="flex items-center gap-1 rounded-xl p-1 w-fit" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${tab === t.key ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-slate-800"}`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          {tab === "feeds" && (
            feeds.length === 0 ? <p className="text-sm text-slate-500">No intelligence feed items.</p> : (
              <div className="space-y-3">
                {feeds.map(f => <ThreatFeedCard key={f.id} feed={f} onBrief={briefFeed} />)}
              </div>
            )
          )}
          {tab === "surface" && <AttackSurfaceGraph />}
          {tab === "pivots" && <AttackPivotMap />}
          {tab === "darkweb" && <DarkWebTable alerts={darkWeb} />}
          {tab === "apt" && (
            actors.length === 0 ? <p className="text-sm text-slate-500">No APT actors tracked.</p> : (
              <div className="grid grid-cols-3 gap-4">
                {actors.map(a => <APTActorCard key={a.id} actor={a} />)}
              </div>
            )
          )}
          {tab === "ransomware" && (
            groups.length === 0 ? <p className="text-sm text-slate-500">No ransomware groups tracked.</p> : (
              <div className="grid grid-cols-3 gap-4">
                {groups.map(g => <RansomwareGroupCard key={g.id} group={g} />)}
              </div>
            )
          )}
        </>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onRegenerate={runHunt} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}