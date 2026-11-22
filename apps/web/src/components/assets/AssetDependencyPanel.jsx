import React, { useEffect, useMemo, useState } from "react";
import { Link2, Trash2, ShieldAlert } from "lucide-react";

const DEPENDENCY_TYPES = ["network", "data_flow", "authentication", "storage", "compute", "api_call", "identity", "dns"];

const TARGET_KINDS = [
  { value: "asset", label: "Asset (inventory)" },
  { value: "service", label: "Service" },
  { value: "database", label: "Database" },
  { value: "api", label: "API" },
  { value: "storage", label: "Storage" },
  { value: "external", label: "External dependency" },
];

const EMPTY = { asset_name: "", depends_on_name: "", depends_on_kind: "asset", dependency_type: "network", is_critical: false, responsible_agent: "", notes: "" };

export default function AssetDependencyPanel({ node, links, blastRadius, impact = {}, assets, allNames, onCreate, onDelete, showForm, setShowForm }) {
  const openFor = (name) => impact[name]?.open || 0;
  const criticalFor = (name) => impact[name]?.critical || 0;
  const [form, setForm] = useState({ ...EMPTY, asset_name: node?.id || "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm((prev) => ({ ...prev, asset_name: node?.id || "" }));
  }, [node?.id]);

  const outgoing = useMemo(
    () => (node ? links.filter((l) => l.asset_name === node.id) : []),
    [links, node]
  );
  const incoming = useMemo(
    () => (node ? links.filter((l) => l.depends_on_name === node.id) : []),
    [links, node]
  );

  const responsibleAgents = useMemo(
    () => [...new Set([...outgoing, ...incoming].map((l) => l.responsible_agent).filter(Boolean))],
    [outgoing, incoming]
  );

  async function submit(e) {
    e.preventDefault();
    if (!form.asset_name || !form.depends_on_name) return;
    setSaving(true);
    await onCreate(form);
    setSaving(false);
    setForm({ ...EMPTY, asset_name: form.asset_name });
    setShowForm(false);
  }

  return (
    <div className="p-4 space-y-4 max-h-[620px] overflow-y-auto">
      {!node ? (
        <div className="text-center py-10">
          <p className="text-sm font-semibold text-foreground">Select an asset</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click a node to see what it depends on, what would fail with it, and the declared responsible agent.
          </p>
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm font-bold text-foreground break-words">{node.id}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {node.kind === "asset"
                ? `${node.type?.replace("_", " ")} · ${node.provider}${node.region ? ` · ${node.region}` : ""} · risk ${node.risk}`
                : "External dependency (no Asset record)"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border p-2.5">
              <p className="text-[10px] uppercase text-muted-foreground">Depends on</p>
              <p className="text-lg font-bold font-mono text-blue-400">{outgoing.length}</p>
            </div>
            <div className="rounded-lg border border-border p-2.5">
              <p className="text-[10px] uppercase text-muted-foreground">Blast radius</p>
              <p className="text-lg font-bold font-mono text-amber-400">{blastRadius.length}</p>
            </div>
            <div className="rounded-lg border border-border p-2.5">
              <p className="text-[10px] uppercase text-muted-foreground">Open vulns</p>
              <p className={`text-lg font-bold font-mono ${openFor(node.id) > 0 ? "text-red-400" : "text-emerald-400"}`}>{openFor(node.id)}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Depends on</p>
            {outgoing.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No declared dependencies.</p>
            ) : (
              <div className="space-y-1.5">
                {outgoing.map((link) => (
                  <div key={link.id} className="rounded-lg border border-border p-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">{link.depends_on_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {link.depends_on_kind || "asset"} · {link.dependency_type?.replace(/_/g, " ")}
                        {link.responsible_agent ? ` · agent: ${link.responsible_agent}` : " · no agent declared"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {link.is_critical && <ShieldAlert size={12} className="text-red-400" />}
                      <button onClick={() => onDelete(link.id)} aria-label="Delete dependency link" className="text-muted-foreground hover:text-red-400">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Would break with this asset ({incoming.length} direct)
            </p>
            {incoming.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nothing currently declares a dependency on it.</p>
            ) : (
              <div className="space-y-1">
                {incoming.map((link) => (
                  <div key={link.id} className="flex items-center gap-1.5 text-[11px] text-foreground">
                    <Link2 size={11} className="text-amber-400 flex-shrink-0" />
                    <span className="truncate">{link.asset_name}</span>
                    <span className="text-[10px] text-muted-foreground">{link.is_critical ? "critical" : link.dependency_type?.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            )}
            {blastRadius.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Blast zone — fallout if this asset is compromised
                </p>
                {blastRadius.map((name) => (
                  <div key={name} className="flex items-center justify-between gap-2 rounded-md border border-amber-500/25 bg-amber-500/5 px-2 py-1">
                    <span className="text-[11px] text-foreground truncate">{name}</span>
                    <span className="text-[10px] font-mono flex-shrink-0">
                      <span className={openFor(name) > 0 ? "text-red-400" : "text-emerald-400"}>{openFor(name)} open</span>
                      {criticalFor(name) > 0 && <span className="text-red-400"> · {criticalFor(name)} critical</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Responsible agents</p>
            {responsibleAgents.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No agent declared on this asset's links.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {responsibleAgents.map((agent) => (
                  <span key={agent} className="text-[10px] px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
                    {agent}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              Declared on the link record — fleet execution is not verified by this view.
            </p>
          </div>
        </>
      )}

      {showForm && (
        <form onSubmit={submit} className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-[11px] font-bold text-foreground">Declare a dependency</p>
          <select
            value={form.asset_name}
            onChange={(e) => setForm({ ...form, asset_name: e.target.value })}
            aria-label="Dependent asset"
            className="w-full px-2 py-1.5 rounded-md text-[11px] bg-background border border-border text-foreground"
            required
          >
            <option value="">Select dependent asset…</option>
            {assets.map((a) => (
              <option key={a.id} value={a.name}>{a.name}</option>
            ))}
          </select>
          <select
            value={form.depends_on_kind}
            onChange={(e) => setForm({ ...form, depends_on_kind: e.target.value })}
            aria-label="What it depends on"
            className="w-full px-2 py-1.5 rounded-md text-[11px] bg-background border border-border text-foreground"
          >
            {TARGET_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
          </select>
          <input
            value={form.depends_on_name}
            onChange={(e) => setForm({ ...form, depends_on_name: e.target.value })}
            placeholder={
              form.depends_on_kind === "asset" ? "Depends on which asset *"
                : `Name of the ${form.depends_on_kind === "api" ? "API" : form.depends_on_kind} *`
            }
            list={form.depends_on_kind === "asset" ? "dependency-node-names" : undefined}
            className="w-full px-2 py-1.5 rounded-md text-[11px] bg-background border border-border text-foreground placeholder:text-muted-foreground"
            required
          />
          <datalist id="dependency-node-names">
            {allNames.map((name) => <option key={name} value={name} />)}
          </datalist>
          <select
            value={form.dependency_type}
            onChange={(e) => setForm({ ...form, dependency_type: e.target.value })}
            aria-label="Dependency type"
            className="w-full px-2 py-1.5 rounded-md text-[11px] bg-background border border-border text-foreground"
          >
            {DEPENDENCY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <input
            value={form.responsible_agent}
            onChange={(e) => setForm({ ...form, responsible_agent: e.target.value })}
            placeholder="Responsible agent role (optional)"
            className="w-full px-2 py-1.5 rounded-md text-[11px] bg-background border border-border text-foreground placeholder:text-muted-foreground"
          />
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={form.is_critical}
              onChange={(e) => setForm({ ...form, is_critical: e.target.checked })}
              className="accent-red-500"
            />
            Critical — failure of the dependency breaks this asset
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full px-3 py-1.5 rounded-md text-[11px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save link"}
          </button>
        </form>
      )}
    </div>
  );
}