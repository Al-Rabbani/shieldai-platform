import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ExternalLink, Share2, Sheet } from "lucide-react";

export default function ScanSheetShareCard() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  async function share() {
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await base44.functions.invoke("gdsWeeklyScanSheet", { action: "share", email: address });
      setNotice({ type: "ok", text: `Shared with ${response.data?.shared_with}.`, url: response.data?.spreadsheet_url });
      setEmail("");
    } catch (error) {
      setNotice({ type: "err", text: error?.response?.data?.error || error.message });
    }
    setBusy(false);
  }

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-xs font-bold text-white flex items-center gap-1.5">
        <Sheet size={13} className="text-emerald-400" /> Weekly scan log spreadsheet
      </p>
      <p className="text-[10px] text-slate-500">
        Every Monday's vulnerability scan log is written to one Google Sheet, a tab per week. Share it with your team lead so they can follow the backlog.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") share(); }}
          placeholder="team-lead@company.com"
          className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none"
        />
        <button
          onClick={share}
          disabled={busy || !email.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition disabled:opacity-40"
        >
          <Share2 size={12} /> {busy ? "Sharing…" : "Share"}
        </button>
      </div>
      {notice && (
        <p className={`text-[11px] ${notice.type === "err" ? "text-red-400" : "text-emerald-300"}`}>
          {notice.text}{" "}
          {notice.url && (
            <a href={notice.url} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">
              Open sheet <ExternalLink size={10} />
            </a>
          )}
        </p>
      )}
    </div>
  );
}