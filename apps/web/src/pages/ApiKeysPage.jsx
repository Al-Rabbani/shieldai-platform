import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { KeyRound, Plus, Trash2, Copy, Check, AlertTriangle } from "lucide-react";

/* An API key is how a system authenticates without a person. The routes for this existed and nothing reached them,
 * so no customer could obtain a credential. Two rules this screen keeps:
 *   1. The key is shown ONCE, at issue time, because only its SHA-256 is stored. The panel says so instead of
 *      implying it can be looked up later.
 *   2. Scopes are chosen explicitly. A key with no scopes authenticates and is authorised for nothing, which is a
 *      credential that wastes an afternoon, so the server refuses it and this form will not submit it. */

const SCOPE_GROUPS = [
  { label: "Read", match: (p) => p.endsWith(":read") },
  { label: "Write and act", match: (p) => /:(write|manage|decide|create|delete|execute|run|apply)$/.test(p) },
  { label: "Everything else", match: () => true },
];

function groupScopes(permissions) {
  const taken = new Set();
  return SCOPE_GROUPS.map((group) => {
    const items = permissions.filter((p) => !taken.has(p) && group.match(p));
    items.forEach((p) => taken.add(p));
    return { label: group.label, items };
  }).filter((g) => g.items.length > 0);
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState([]);
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState(null);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState(null);

  async function load() {
    try {
      const [keyRows, catalogue] = await Promise.all([
        base44.admin.apiKeys(),
        base44.admin.permissionCatalogue(),
      ]);
      setKeys(Array.isArray(keyRows) ? keyRows : []);
      setPermissions(Array.isArray(catalogue?.permissions) ? catalogue.permissions : []);
      setLoadError(null);
    } catch (err) {
      setLoadError(err?.message || "Could not read the key register.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => groupScopes(permissions), [permissions]);

  function toggleScope(scope) {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  }

  async function issue(event) {
    event.preventDefault();
    setActionError(null);
    if (name.trim().length < 2) {
      setActionError("Give the key a name of at least two characters so it can be recognised later.");
      return;
    }
    if (scopes.length === 0) {
      setActionError("Choose at least one scope. A key with no scopes authenticates but is authorised for nothing.");
      return;
    }
    setIssuing(true);
    try {
      const created = await base44.admin.issueApiKey(name.trim(), scopes);
      setIssued(created);
      setName("");
      setScopes([]);
      setCopied(false);
      await load();
    } catch (err) {
      setActionError(err?.message || "The key was not issued.");
    } finally {
      setIssuing(false);
    }
  }

  async function revoke(keyId) {
    setActionError(null);
    try {
      await base44.admin.revokeApiKey(keyId);
      await load();
    } catch (err) {
      setActionError(err?.message || "The key was not revoked.");
    }
  }

  async function copyKey() {
    if (!issued?.key) return;
    try {
      await navigator.clipboard.writeText(issued.key);
      setCopied(true);
    } catch {
      setActionError("The browser refused clipboard access. Select the key and copy it by hand.");
    }
  }

  const active = keys.filter((k) => k.is_active).length;

  return (
    <div className="p-6 space-y-6 text-slate-200">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <KeyRound className="w-5 h-5" /> API Keys
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            A key authenticates a system, not a person. Its scopes are its permissions, so it can do exactly what
            they name and nothing else.
          </p>
        </div>
        <div className="text-right text-sm">
          <div className="text-slate-400">Active keys</div>
          <div className="text-2xl font-semibold">{loading ? "…" : active}</div>
        </div>
      </header>

      {loadError && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          {loadError}
        </div>
      )}

      {issued?.key && (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 space-y-2">
          <div className="text-sm font-medium text-emerald-200">
            Key issued. Copy it now: only its hash is stored, so it cannot be shown again.
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-black/40 px-3 py-2 text-xs font-mono text-emerald-100">
              {issued.key}
            </code>
            <button
              type="button"
              onClick={copyKey}
              className="inline-flex items-center gap-1 rounded border border-emerald-500/40 px-3 py-2 text-xs hover:bg-emerald-500/10"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button type="button" onClick={() => setIssued(null)} className="text-xs text-emerald-300 underline">
            I have stored it
          </button>
        </div>
      )}

      {actionError && (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {actionError}
        </div>
      )}

      <form onSubmit={issue} className="rounded border border-slate-700 bg-slate-900/40 p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[240px]">
            <span className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Key name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CI read-only, Splunk forwarder, ..."
              className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={issuing}
            className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {issuing ? "Issuing…" : "Issue key"}
          </button>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">
            Scopes ({scopes.length} selected{permissions.length ? ` of ${permissions.length} available` : ""})
          </div>
          {permissions.length === 0 ? (
            <div className="text-sm text-slate-400">
              The permission catalogue could not be read, so no scope can be chosen here.
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {groups.map((group) => (
                <div key={group.label}>
                  <div className="text-xs text-slate-500 mb-1">{group.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((scope) => {
                      const on = scopes.includes(scope);
                      return (
                        <button
                          type="button"
                          key={scope}
                          onClick={() => toggleScope(scope)}
                          className={`rounded-full border px-3 py-1 text-xs ${
                            on
                              ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-200"
                              : "border-slate-700 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          {scope}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      <div className="rounded border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60 text-slate-400">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Prefix</th>
              <th className="text-left px-4 py-2 font-medium">Scopes</th>
              <th className="text-left px-4 py-2 font-medium">Created</th>
              <th className="text-left px-4 py-2 font-medium">Last used</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-right px-4 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">Reading the key register…</td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No API keys have been issued. A system needs one to authenticate without a person.
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id} className="border-t border-slate-800">
                  <td className="px-4 py-2">{key.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-400">{key.key_prefix}…</td>
                  <td className="px-4 py-2 text-xs text-slate-300">
                    {(key.scopes || []).length ? (key.scopes || []).join(", ") : "none"}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {key.created_at ? new Date(key.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : "never"}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {key.is_active ? (
                      <span className="text-emerald-300">active</span>
                    ) : (
                      <span className="text-slate-500">revoked</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {key.is_active ? (
                      <button
                        type="button"
                        onClick={() => revoke(key.id)}
                        className="inline-flex items-center gap-1 rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Revoke
                      </button>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
