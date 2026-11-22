import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, ShieldOff, Loader2, Copy, Check } from "lucide-react";

/**
 * Two-factor authentication, against the platform's own routes.
 *
 * Nothing here is inferred. The state comes from GET /auth/mfa/status, the secret and recovery codes are shown
 * exactly once from POST /auth/mfa/enrol and never read back, and turning the factor off requires the password
 * plus a working code. If a call fails, the server's own message is displayed and no state is assumed.
 */
export default function MfaSettingsPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [enrolment, setEnrolment] = useState(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      setStatus(await base44.auth.mfaStatus());
      setError("");
    } catch (err) {
      setError(err?.message || "Could not read the second-factor state.");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function startEnrol() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setEnrolment(await base44.auth.mfaEnrol());
    } catch (err) {
      setError(err?.message || "Could not start enrolment.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrol() {
    setBusy(true);
    setError("");
    try {
      const result = await base44.auth.mfaConfirm(code.trim());
      setEnrolment(null);
      setCode("");
      setNotice(`Two-factor is on. ${result.recovery_codes_remaining} recovery codes remain unused.`);
      await refresh();
    } catch (err) {
      setError(err?.message || "That code was not accepted.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await base44.auth.mfaDisable(password, code.trim());
      setPassword("");
      setCode("");
      setNotice("Two-factor is off. Your account is protected by its password alone.");
      await refresh();
    } catch (err) {
      setError(err?.message || "Could not turn two-factor off.");
    } finally {
      setBusy(false);
    }
  }

  function copy(value, label) {
    navigator.clipboard?.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  const card = { background: "#0d1424", border: "1px solid #1e3a5f" };
  const muted = { color: "#94a3b8" };

  return (
    <div className="min-h-screen p-6" style={{ background: "#0a0f1e" }}>
      <div className="max-w-3xl mx-auto space-y-4">
        <header>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck size={20} style={{ color: "#3b82f6" }} />
            Two-factor authentication
          </h1>
          <p className="text-xs mt-1" style={muted}>
            A 6-digit code from an authenticator app, on top of your password.
          </p>
        </header>

        {error && (
          <div className="rounded-lg p-3 text-xs" style={{ background: "#2a1015", border: "1px solid #7f1d1d", color: "#fca5a5" }}>
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-lg p-3 text-xs" style={{ background: "#0f2419", border: "1px solid #166534", color: "#86efac" }}>
            {notice}
          </div>
        )}

        <section className="rounded-xl p-4" style={card}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status?.mfa_enabled ? (
                <ShieldCheck size={16} style={{ color: "#10b981" }} />
              ) : (
                <ShieldOff size={16} style={{ color: "#f59e0b" }} />
              )}
              <span className="text-sm font-semibold text-white">
                {loading ? "Reading state…" : status?.mfa_enabled ? "Enabled" : "Not enabled"}
              </span>
            </div>
            {loading && <Loader2 size={14} className="animate-spin" style={muted} />}
          </div>

          {!loading && status && (
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <dt style={muted}>Enrolled</dt>
                <dd className="text-white mt-0.5">
                  {status.enrolled_at ? new Date(status.enrolled_at).toLocaleString() : "—"}
                </dd>
              </div>
              <div>
                <dt style={muted}>Recovery codes left</dt>
                <dd className="text-white mt-0.5">{status.recovery_codes_remaining}</dd>
              </div>
              <div>
                <dt style={muted}>Enrolment in progress</dt>
                <dd className="text-white mt-0.5">{status.enrolment_in_progress ? "yes, not yet enforced" : "no"}</dd>
              </div>
            </dl>
          )}
        </section>

        {!loading && status && !status.mfa_enabled && !enrolment && (
          <section className="rounded-xl p-4" style={card}>
            <p className="text-xs" style={muted}>
              You will need an authenticator app. The shared secret and your recovery codes are shown once, here,
              and cannot be read back afterwards.
            </p>
            <button
              onClick={startEnrol}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: "#1d4ed8" }}
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
              Start enrolment
            </button>
          </section>
        )}

        {enrolment && (
          <section className="rounded-xl p-4 space-y-3" style={card}>
            <h2 className="text-sm font-semibold text-white">1. Add this secret to your authenticator</h2>
            <div className="rounded-lg p-3" style={{ background: "#060a14", border: "1px solid #1e3a5f" }}>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs break-all" style={{ color: "#93c5fd" }}>{enrolment.secret}</code>
                <button onClick={() => copy(enrolment.secret, "secret")} className="shrink-0" style={muted} aria-label="Copy secret">
                  {copied === "secret" ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-[10px] mt-2 break-all" style={muted}>{enrolment.provisioning_uri}</p>
            </div>

            <h2 className="text-sm font-semibold text-white">2. Save your recovery codes</h2>
            <div className="rounded-lg p-3 grid grid-cols-2 gap-1" style={{ background: "#060a14", border: "1px solid #1e3a5f" }}>
              {enrolment.recovery_codes.map((c) => (
                <code key={c} className="text-xs" style={{ color: "#e2e8f0" }}>{c}</code>
              ))}
            </div>
            <button onClick={() => copy(enrolment.recovery_codes.join("\n"), "codes")} className="inline-flex items-center gap-1 text-[11px]" style={muted}>
              {copied === "codes" ? <Check size={12} /> : <Copy size={12} />}
              Copy all codes
            </button>

            <h2 className="text-sm font-semibold text-white">3. Prove the app works</h2>
            <div className="flex items-end gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                placeholder="123456"
                className="w-32 rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: "#060a14", border: "1px solid #1e3a5f" }}
              />
              <button
                onClick={confirmEnrol}
                disabled={busy || code.trim().length < 6}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                style={{ background: "#047857" }}
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Confirm and enable
              </button>
            </div>
            <p className="text-[11px]" style={muted}>
              Nothing is enforced until this succeeds, so a mistyped secret cannot lock you out.
            </p>
          </section>
        )}

        {!loading && status?.mfa_enabled && (
          <section className="rounded-xl p-4 space-y-3" style={card}>
            <h2 className="text-sm font-semibold text-white">Turn two-factor off</h2>
            <p className="text-xs" style={muted}>
              This needs your password and a current code, so a stolen session alone cannot remove it.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: "#060a14", border: "1px solid #1e3a5f" }}
              />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code or recovery code"
                className="rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: "#060a14", border: "1px solid #1e3a5f" }}
              />
              <button
                onClick={disable}
                disabled={busy || !password || !code.trim()}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                style={{ background: "#b91c1c" }}
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldOff size={13} />}
                Turn off
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
