import React, { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import LinearConnectionCard from "@/components/settings/LinearConnectionCard";
import LinearFindingTickets from "@/components/settings/LinearFindingTickets";
import LinearLinkTable from "@/components/settings/LinearLinkTable";
import { RefreshCw, Workflow } from "lucide-react";

const CONNECTOR_ID = "6afe2658cb6d1a5f73a5d2ab";
const TEAM_KEY = "gds_linear_team_id";

export default function LinearIntegrationPage() {
  const [connected, setConnected] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState(() => localStorage.getItem(TEAM_KEY) || "");
  const [findings, setFindings] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [creating, setCreating] = useState(null);
  const [message, setMessage] = useState(null);
  const pollRef = useRef(null);

  const loadRecords = useCallback(async () => {
    const [{ items: findingRows }, { items: linkRows }] = await Promise.all([
      base44.entities.TriagedFinding.filter({ status: "open", severity: "critical" }, { sort: "-cvss_score", limit: 20 }).catch(() => ({ items: [] })),
      base44.entities.LinearIssueLink.list({ sort: "-synced_at", limit: 100 }),
    ]);
    setFindings(findingRows || []);
    setLinks(linkRows || []);
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const response = await base44.functions.invoke("gdsLinearSync", { action: "list_teams" });
      const data = response.data || {};
      setTeams(data.teams || []);
      setViewer(data.viewer || null);
      setConnected(true);
      setTeamId((current) => {
        if (current && (data.teams || []).some((team) => team.id === current)) return current;
        const next = data.teams?.[0]?.id || "";
        if (next) localStorage.setItem(TEAM_KEY, next);
        return next;
      });
    } catch {
      setConnected(false);
      setTeams([]);
      setViewer(null);
    }
  }, []);

  const load = useCallback(async () => {
    const authed = await base44.auth.isAuthenticated().catch(() => false);
    if (!authed) { setLoading(false); return; }
    await Promise.all([fetchTeams(), loadRecords()]);
    setLoading(false);
  }, [fetchTeams, loadRecords]);

  useEffect(() => {
    load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  async function connect() {
    setBusy(true);
    setMessage(null);
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, "_blank");
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          fetchTeams();
        }
      }, 500);
    } catch (error) {
      setMessage({ type: "err", text: error.message });
    }
    setBusy(false);
  }

  async function disconnect() {
    setBusy(true);
    await base44.connectors.disconnectAppUser(CONNECTOR_ID).catch(() => {});
    setConnected(false);
    setTeams([]);
    setViewer(null);
    setBusy(false);
  }

  function changeTeam(value) {
    setTeamId(value);
    localStorage.setItem(TEAM_KEY, value);
  }

  async function createTicket(findingId) {
    setCreating(findingId);
    setMessage(null);
    try {
      const response = await base44.functions.invoke("gdsLinearSync", { action: "create_ticket", finding_id: findingId, team_id: teamId });
      const data = response.data || {};
      setMessage({ type: "ok", text: data.created ? `Created ${data.link?.identifier} in Linear.` : `Nothing created: ${data.reason}.` });
      await loadRecords();
    } catch (error) {
      setMessage({ type: "err", text: error?.response?.data?.error || error.message });
    }
    setCreating(null);
  }

  async function createAll() {
    const existing = links.map((link) => link.finding_id);
    const pending = findings.filter((finding) => !existing.includes(finding.id));
    setCreating("all");
    let created = 0;
    for (const finding of pending) {
      try {
        const response = await base44.functions.invoke("gdsLinearSync", { action: "create_ticket", finding_id: finding.id, team_id: teamId });
        if (response.data?.created) created += 1;
      } catch {
        break;
      }
    }
    setMessage({ type: "ok", text: `${created} ticket(s) created in Linear.` });
    await loadRecords();
    setCreating(null);
  }

  async function syncNow() {
    setSyncing(true);
    setMessage(null);
    try {
      const response = await base44.functions.invoke("gdsLinearSync", { action: "sync_states" });
      const data = response.data || {};
      setMessage({ type: "ok", text: `${data.synced || 0} ticket(s) checked · ${data.updated || 0} finding status update(s) written back.` });
      await loadRecords();
    } catch (error) {
      setMessage({ type: "err", text: error?.response?.data?.error || error.message });
    }
    setSyncing(false);
  }

  const existingFindingIds = links.map((link) => link.finding_id);

  return (
    <div className="min-h-screen p-4 space-y-3" style={{ background: "#0a0f1e" }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <Workflow size={22} className="text-blue-400 mt-0.5" />
          <div>
            <h1 className="text-xl font-bold text-white">Linear ticketing</h1>
            <p className="text-xs text-slate-500">Critical findings become Linear tickets; the board's state is written back to the finding status.</p>
            <p className="text-[10px] text-amber-300/80 mt-0.5">Background automation (new critical finding, and completion sync) raises tickets with the Linear account of the admin who saved it — so an admin must connect Linear here for those to fire.</p>
          </div>
        </div>
        <button
          onClick={syncNow}
          disabled={syncing || !connected}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-40"
        >
          <RefreshCw size={13} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync from Linear"}
        </button>
      </div>

      {message && (
        <div className={`rounded-lg px-3 py-2 text-[11px] border ${message.type === "err" ? "bg-red-500/10 border-red-500/40 text-red-300" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-16" />
      ) : (
        <>
          <LinearConnectionCard
            connected={connected}
            viewer={viewer}
            teams={teams}
            teamId={teamId}
            onTeamChange={changeTeam}
            onConnect={connect}
            onDisconnect={disconnect}
            busy={busy}
          />

          <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className="text-xs font-bold text-white mb-2">Critical findings → tickets</p>
            <LinearFindingTickets
              findings={findings}
              existingFindingIds={existingFindingIds}
              onCreate={createTicket}
              onCreateAll={createAll}
              creating={creating}
              disabled={!connected || syncing}
            />
          </div>

          <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className="text-xs font-bold text-white mb-2">Linked tickets</p>
            <LinearLinkTable links={links} />
          </div>
        </>
      )}
    </div>
  );
}