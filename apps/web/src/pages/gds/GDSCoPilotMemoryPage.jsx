import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Plus, Trash2, Info, Mic, Lock, RefreshCw } from "lucide-react";
import { CopilotBreadcrumb, COPILOT_PAGE_BG, COPILOT_CARD, BORDER, MUTED, TEXT, timeAgo } from "@/components/gds/CopilotShared";

/**
 * The Co-Pilot's memory, as it really is.
 *
 * This page was 292 lines over two stores that do not exist (CopilotMemoryReference, CopilotRiskDecision) and was not
 * routed, so it had never rendered. It now reads GET /copilot/memory, the store the planner is actually given, and it
 * states plainly what is NOT held rather than drawing tiles for it.
 *
 * What the store is: a preference, instruction or fact the operator stated, kept per tenant. Stating the same key again
 * replaces the value. POST /reasoning/mission prefixes its goal with up to 20 of them, most important first, so these
 * change how a mission answers.
 *
 * What it is not: nothing is inferred from a mission, no transcript is stored, and no memory is shared across tenants.
 */
const KINDS = [
  { value: "preference", label: "Preference", hint: "how answers should read" },
  { value: "instruction", label: "Instruction", hint: "something to always do" },
  { value: "fact", label: "Fact", hint: "something true about this estate" },
];

const ABSENCES = [
  { icon: Brain, title: "Nothing is inferred", body: "A mission cannot write a memory. Every row here was stated by a person; source reads operator_stated and confidence reads stated." },
  { icon: Mic, title: "No transcript is kept", body: "Speech is transcribed and the words go into the composer for review. The audio and the transcript are not stored on this platform." },
  { icon: Lock, title: "One tenant only", body: "The table is forced under row-level security, so another tenant's memory is invisible here and this one's is invisible there." },
];

export default function GDSCoPilotMemoryPage() {
  const [memories, setMemories] = useState([]);
  const [basis, setBasis] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("preference");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [writeError, setWriteError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const payload = await base44.platform.memories();
      setMemories(payload.memories || []);
      setBasis(payload.basis || null);
    } catch (err) {
      setLoadError(err.message || "The memory store could not be read.");
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(event) {
    event.preventDefault();
    setWriteError(null);
    setNotice(null);
    if (!key.trim() || !value.trim()) {
      setWriteError("A key and a value are both required.");
      return;
    }
    setSaving(true);
    try {
      const result = await base44.platform.remember({ kind, key: key.trim(), value: value.trim() });
      setNotice(result.created ? "Recorded." : "Replaced the existing value for that key.");
      setKey("");
      setValue("");
      await load();
    } catch (err) {
      setWriteError(err.message || "That memory could not be recorded.");
    } finally {
      setSaving(false);
    }
  }

  async function forget(memory) {
    setWriteError(null);
    setNotice(null);
    try {
      await base44.platform.forget(memory.id);
      setNotice(`Forgot "${memory.key}".`);
      await load();
    } catch (err) {
      setWriteError(err.message || "That memory could not be removed.");
    }
  }

  const byKind = KINDS.map(k => ({ ...k, count: memories.filter(m => m.kind === k.value).length }));

  return (
    <div style={COPILOT_PAGE_BG}>
      <CopilotBreadcrumb items={[{ label: "Memory & Standing Instructions" }]} />

      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: TEXT }}>Memory &amp; Standing Instructions</h1>
          <p className="text-[12px] mt-1" style={{ color: MUTED }}>
            What the Co-Pilot is given when it plans a mission, in your own words.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-[11px] font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
          style={{ background: "#141d35", border: `1px solid ${BORDER}`, color: TEXT, cursor: loading ? "wait" : "pointer" }}
        >
          <RefreshCw size={12} /> {loading ? "Reading…" : "Re-read"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl p-4" style={COPILOT_CARD}>
          <div className="text-[10px] font-semibold tracking-wider" style={{ color: MUTED }}>HELD</div>
          <div className="text-2xl font-bold mt-1" style={{ color: TEXT }}>{loading ? "—" : memories.length}</div>
          <div className="text-[10px] mt-1" style={{ color: MUTED }}>memories for this tenant</div>
        </div>
        {byKind.map(k => (
          <div key={k.value} className="rounded-xl p-4" style={COPILOT_CARD}>
            <div className="text-[10px] font-semibold tracking-wider" style={{ color: MUTED }}>{k.label.toUpperCase()}</div>
            <div className="text-2xl font-bold mt-1" style={{ color: TEXT }}>{loading ? "—" : k.count}</div>
            <div className="text-[10px] mt-1" style={{ color: MUTED }}>{k.hint}</div>
          </div>
        ))}
      </div>

      {basis && (
        <p className="text-[10px] mb-4 leading-relaxed" style={{ color: MUTED }}>{basis}</p>
      )}

      {loadError && (
        <div className="rounded-xl p-3 mb-4 text-[11px]" style={{ background: "#2a1215", border: "1px solid #7f1d1d", color: "#fca5a5" }}>
          The store could not be read: {loadError}. Nothing below is a measured zero.
        </div>
      )}

      <form onSubmit={save} className="rounded-xl p-4 mb-5" style={COPILOT_CARD}>
        <div className="text-[11px] font-semibold mb-3 flex items-center gap-1.5" style={{ color: TEXT }}>
          <Plus size={13} /> Teach the Co-Pilot something
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {KINDS.map(k => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
              style={{
                background: kind === k.value ? "#1e3a5f" : "#141d35",
                border: `1px solid ${kind === k.value ? "#3b82f6" : BORDER}`,
                color: kind === k.value ? "#93c5fd" : MUTED,
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
        <input
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="key, e.g. briefing_style"
          className="w-full mb-2 rounded-lg px-3 py-2 text-[12px] outline-none"
          style={{ background: "#0d1428", border: `1px solid ${BORDER}`, color: TEXT }}
        />
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={2}
          placeholder="What should it know or always do? Written as you would say it."
          className="w-full mb-3 rounded-lg px-3 py-2 text-[12px] outline-none resize-none"
          style={{ background: "#0d1428", border: `1px solid ${BORDER}`, color: TEXT }}
        />
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="submit"
            disabled={saving}
            className="text-[11px] font-bold px-4 py-2 rounded-lg text-white"
            style={{ background: saving ? "#1e3a5f" : "#3b82f6", cursor: saving ? "wait" : "pointer" }}
          >
            {saving ? "Saving…" : "Remember"}
          </button>
          {notice && <span className="text-[11px]" style={{ color: "#4ade80" }}>{notice}</span>}
          {writeError && <span className="text-[11px]" style={{ color: "#fca5a5" }}>{writeError}</span>}
        </div>
      </form>

      <div className="rounded-xl overflow-hidden mb-5" style={COPILOT_CARD}>
        <div className="px-4 py-3 text-[11px] font-semibold" style={{ borderBottom: `1px solid ${BORDER}`, color: TEXT }}>
          Held for this tenant
        </div>
        {!loading && memories.length === 0 && !loadError && (
          <div className="px-4 py-6 text-[12px]" style={{ color: MUTED }}>
            Nothing is held yet, so a mission currently plans from its goal alone. Anything you record here is added to the
            front of the goal before the model sees it.
          </div>
        )}
        {memories.map(m => (
          <div key={m.id} className="px-4 py-3 flex items-start justify-between gap-4" style={{ borderTop: `1px solid ${BORDER}` }}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "#141d35", border: `1px solid ${BORDER}`, color: "#93c5fd" }}>
                  {m.kind.toUpperCase()}
                </span>
                <span className="text-[12px] font-semibold" style={{ color: TEXT }}>{m.key}</span>
                {m.pinned && <span className="text-[10px]" style={{ color: "#fbbf24" }}>pinned</span>}
              </div>
              <p className="text-[12px] mt-1 leading-relaxed" style={{ color: TEXT }}>{m.value}</p>
              <p className="text-[10px] mt-1" style={{ color: MUTED }}>
                {m.source === "operator_stated" ? "stated by a person" : m.source} · confidence {m.confidence} · updated{" "}
                {m.updated_at ? timeAgo(m.updated_at) : "unknown"} · used {m.use_count} time(s)
              </p>
            </div>
            <button
              onClick={() => forget(m)}
              title="Remove this memory. Missions stop seeing it immediately."
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0"
              style={{ background: "#2a1215", border: "1px solid #7f1d1d", color: "#fca5a5" }}
            >
              <Trash2 size={11} /> Forget
            </button>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {ABSENCES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl p-4" style={COPILOT_CARD}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Info size={12} style={{ color: MUTED }} />
              <span className="text-[11px] font-semibold" style={{ color: TEXT }}>{title}</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>{body}</p>
            {title === "No transcript is kept" && (
              <p className="text-[10px] mt-2" style={{ color: MUTED }}>
                <Icon size={10} className="inline mr-1" />Voice is wired: the composer records, transcribes and shows the words.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
