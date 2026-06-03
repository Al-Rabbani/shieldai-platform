/**
 * peaAdminDashboard — LIVE Admin Command Centre
 * Prime Endorsement Authority · Global Digital Authority Standard
 * URL: /api/functions/peaAdminDashboard
 * Protected: requires X-Admin-Token header or ?adminKey= query param
 */

const BUILDER_APP  = "69e2e852c48630e3502f13b1";
const DOMAIN       = "https://primeendorsement.com";
const RESEND_API   = "https://api.resend.com/emails";
const FROM_EMAIL   = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL  = "admin@primeendorsement.com";

const _tok    = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
const _resend = Deno.env.get("RESEND_API_KEY")       || "";
const _admin  = Deno.env.get("ADMIN_DASHBOARD_KEY")  || "PEA-ADMIN-2026";

const H = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin-Token",
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Frame-Options": "DENY",
};

const HJSON = { ...H, "Content-Type": "application/json" };

async function fetchDB(): Promise<any[]> {
  const r = await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application`, {
    headers: { Authorization: `Bearer ${_tok}` },
  });
  if (!r.ok) throw new Error(`DB ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : data.records || [];
}

async function updateDB(id: string, fields: Record<string, any>): Promise<void> {
  await fetch(`https://app.base44.com/api/apps/${BUILDER_APP}/entities/Application/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${_tok}`, "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await fetch(RESEND_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${_resend}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
}

function normalise(a: any) {
  const v = a.venture || {};
  const f = a.founder || {};
  return {
    id:            a.id || "",
    ref:           a.reference_code || "—",
    name:          a.applicant_name  || f.full_name || f.name || "—",
    email:         a.applicant_email || f.email     || "—",
    phone:         a.phone_number    || f.phone     || "—",
    nationality:   a.nationality     || f.nationality || "—",
    country:       a.country_of_residence || f.country_of_residence || "—",
    role:          a.applicant_role  || a.application_type || f.role || "Founder",
    venture:       a.venture_name    || v.company_name || v.name || "—",
    sector:        a.venture_sector  || v.sector || "—",
    stage:         a.venture_stage   || v.stage  || "—",
    description:   a.venture_description || v.one_liner || "—",
    linkedin:      a.linkedin_url    || f.linkedin || "",
    website:       a.website_url     || v.website  || "",
    status:        a.status          || "draft",
    payment:       a.payment_status  || "unpaid",
    payment_amt:   a.payment_amount  || 0,
    payment_date:  a.payment_date    || "",
    stripe_session: a.stripe_session_id || "",
    ai_score:      a.ai_score        || null,
    ai_summary:    a.ai_summary      || "",
    kyc:           a.kyc_verified    || false,
    docs:          a.documents_submitted || false,
    submitted_at:  a.submitted_at    || a.created_date || "",
    updated_at:    a.updated_date    || "",
    notes:         a.notes           || "",
    reviewer:      a.reviewer_id     || "",
    day90:         a.day_90_start    || "",
    doc_passport:  a.doc_passport_url || "",
    doc_address:   a.doc_proof_address_url || "",
    doc_business:  a.doc_business_registration_url || "",
    doc_plan:      a.doc_business_plan_url || "",
    doc_financials: a.doc_financial_projections_url || "",
    doc_pitch:     a.doc_pitch_deck_url || "",
    cofound_name:  a.co_founder_name  || "",
    cofound_email: a.co_founder_email || "",
  };
}

// ── API Handler ───────────────────────────────────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });

  const url  = new URL(req.url);
  const key  = req.headers.get("X-Admin-Token") || url.searchParams.get("adminKey") || "";
  const path = url.pathname.replace(/.*\/peaAdminDashboard/, "") || "/";

  // ── API routes (JSON) ─────────────────────────────────────────────────────
  if (path.startsWith("/api/")) {
    if (key !== _admin) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: HJSON });

    // GET /api/applications
    if (req.method === "GET" && path === "/api/applications") {
      try {
        const records = await fetchDB();
        return new Response(JSON.stringify({ ok: true, records: records.map(normalise), ts: Date.now() }), { headers: HJSON });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: HJSON });
      }
    }

    // POST /api/action
    if (req.method === "POST" && path === "/api/action") {
      try {
        const body = await req.json();
        const { action, id, ref, email, name, venture, notes, reason } = body;

        const records = await fetchDB();
        const app = records.find((r: any) => r.id === id || r.reference_code === ref);
        if (!app) return new Response(JSON.stringify({ ok: false, error: "Record not found" }), { status: 404, headers: HJSON });

        const ap = normalise(app);

        if (action === "endorse") {
          await updateDB(app.id, { status: "approved", day_90_start: new Date().toISOString() });
          await sendEmail(ap.email, "🏛️ Prime Endorsement Authority — Endorsement Decision", `
            <div style="font-family:Inter,Arial,sans-serif;background:#0A0E1A;color:#e2e8f0;padding:40px 24px;max-width:600px;margin:0 auto">
              <div style="border:1px solid rgba(201,168,76,0.3);border-radius:8px;padding:32px">
                <div style="text-align:center;margin-bottom:28px">
                  <div style="color:#C9A84C;font-size:10px;letter-spacing:5px;text-transform:uppercase;margin-bottom:8px">PRIME ENDORSEMENT AUTHORITY</div>
                  <div style="color:#C9A84C;font-size:20px;font-weight:700;letter-spacing:3px;text-transform:uppercase">OFFICIAL ENDORSEMENT NOTICE</div>
                  <div style="width:48px;height:2px;background:#C9A84C;margin:12px auto"></div>
                </div>
                <p style="color:#e2e8f0;margin-bottom:16px">Dear ${ap.name},</p>
                <p style="color:#94a3b8;line-height:1.7;margin-bottom:16px">We are pleased to inform you that the Prime Endorsement Authority has reviewed your application (Reference: <strong style="color:#C9A84C">${ap.ref}</strong>) and your venture <strong>${ap.venture}</strong> has been formally <strong style="color:#4ade80">ENDORSED</strong>.</p>
                <p style="color:#94a3b8;line-height:1.7;margin-bottom:16px">Your 90-day expert assessment period has now commenced. Your digitally signed endorsement certificate will be issued within 5 business days.</p>
                ${notes ? '<div style="background:rgba(201,168,76,0.06);border-left:3px solid #C9A84C;padding:12px 16px;border-radius:0 4px 4px 0;margin-bottom:16px"><p style="color:#C9A84C;font-size:12px;margin-bottom:4px">REVIEWER NOTES</p><p style="color:#94a3b8;font-size:13px">'+notes+'</p></div>' : ""}
                <p style="color:#64748b;font-size:12px;margin-top:24px">Prime Endorsement Authority · admin@primeendorsement.com</p>
              </div>
            </div>`);
          return new Response(JSON.stringify({ ok: true, message: "Application endorsed. Email sent." }), { headers: HJSON });
        }

        if (action === "decline") {
          await updateDB(app.id, { status: "rejected", notes: reason || notes || "" });
          await sendEmail(ap.email, "Prime Endorsement Authority — Application Outcome", `
            <div style="font-family:Inter,Arial,sans-serif;background:#0A0E1A;color:#e2e8f0;padding:40px 24px;max-width:600px;margin:0 auto">
              <div style="border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:32px">
                <div style="text-align:center;margin-bottom:28px">
                  <div style="color:#C9A84C;font-size:10px;letter-spacing:5px;text-transform:uppercase;margin-bottom:8px">PRIME ENDORSEMENT AUTHORITY</div>
                  <div style="color:#e2e8f0;font-size:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase">APPLICATION OUTCOME NOTICE</div>
                </div>
                <p style="color:#e2e8f0;margin-bottom:16px">Dear ${ap.name},</p>
                <p style="color:#94a3b8;line-height:1.7;margin-bottom:16px">Following a thorough review of your application (Reference: <strong style="color:#C9A84C">${ap.ref}</strong>), we regret to inform you that your application for Prime Endorsement has not been successful at this time.</p>
                ${reason ? '<div style="background:rgba(239,68,68,0.06);border-left:3px solid #ef4444;padding:12px 16px;border-radius:0 4px 4px 0;margin-bottom:16px"><p style="color:#ef4444;font-size:12px;margin-bottom:4px">DECISION RATIONALE</p><p style="color:#94a3b8;font-size:13px">'+reason+'</p></div>' : ""}
                <p style="color:#94a3b8;line-height:1.7;margin-bottom:16px">A formal decision letter with detailed feedback will be sent separately. You may appeal this decision within 28 days.</p>
                <p style="color:#64748b;font-size:12px;margin-top:24px">Prime Endorsement Authority · admin@primeendorsement.com</p>
              </div>
            </div>`);
          return new Response(JSON.stringify({ ok: true, message: "Application declined. Email sent." }), { headers: HJSON });
        }

        if (action === "request_info") {
          await updateDB(app.id, { status: "info_requested" });
          await sendEmail(ap.email, "Prime Endorsement Authority — Additional Information Required", `
            <div style="font-family:Inter,Arial,sans-serif;background:#0A0E1A;color:#e2e8f0;padding:40px 24px;max-width:600px;margin:0 auto">
              <div style="border:1px solid rgba(251,191,36,0.3);border-radius:8px;padding:32px">
                <div style="text-align:center;margin-bottom:28px">
                  <div style="color:#C9A84C;font-size:10px;letter-spacing:5px;text-transform:uppercase;margin-bottom:8px">PRIME ENDORSEMENT AUTHORITY</div>
                  <div style="color:#fbbf24;font-size:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase">INFORMATION REQUEST</div>
                </div>
                <p style="color:#e2e8f0;margin-bottom:16px">Dear ${ap.name},</p>
                <p style="color:#94a3b8;line-height:1.7;margin-bottom:16px">The review panel for your application (Reference: <strong style="color:#C9A84C">${ap.ref}</strong>) requires additional information before proceeding.</p>
                ${notes ? '<div style="background:rgba(251,191,36,0.06);border-left:3px solid #fbbf24;padding:12px 16px;border-radius:0 4px 4px 0;margin-bottom:16px"><p style="color:#fbbf24;font-size:12px;margin-bottom:4px">INFORMATION REQUIRED</p><p style="color:#94a3b8;font-size:13px">'+notes+'</p></div>' : ""}
                <p style="color:#94a3b8;line-height:1.7;margin-bottom:16px">Please respond within <strong>14 days</strong> to avoid delays to your assessment. Reply directly to this email or contact admin@primeendorsement.com.</p>
                <p style="color:#64748b;font-size:12px;margin-top:24px">Prime Endorsement Authority · admin@primeendorsement.com</p>
              </div>
            </div>`);
          return new Response(JSON.stringify({ ok: true, message: "Information request sent." }), { headers: HJSON });
        }

        if (action === "update_status") {
          const { new_status } = body;
          const updates: any = { status: new_status };
          if (new_status === "approved" && !app.day_90_start) updates.day_90_start = new Date().toISOString();
          await updateDB(app.id, updates);
          return new Response(JSON.stringify({ ok: true, message: `Status updated to ${new_status}` }), { headers: HJSON });
        }

        if (action === "save_notes") {
          await updateDB(app.id, { notes: notes || "" });
          return new Response(JSON.stringify({ ok: true, message: "Notes saved." }), { headers: HJSON });
        }

        if (action === "verify_kyc") {
          await updateDB(app.id, { kyc_verified: true });
          return new Response(JSON.stringify({ ok: true, message: "KYC marked as verified." }), { headers: HJSON });
        }

        if (action === "send_payment") {
          // Trigger peaSendPaymentLetter
          const r = await fetch(`${DOMAIN}/api/functions/peaSendPaymentLetter`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference_code: ap.ref }),
          });
          const d = await r.json();
          return new Response(JSON.stringify({ ok: d.success || d.ok, message: d.message || d.error || "Payment letter triggered." }), { headers: HJSON });
        }

        return new Response(JSON.stringify({ ok: false, error: "Unknown action" }), { status: 400, headers: HJSON });

      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: HJSON });
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: HJSON });
  }

  // ── Serve HTML dashboard ──────────────────────────────────────────────────
  const apiBase = `${DOMAIN}/api/functions/peaAdminDashboard`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Command Centre | Prime Endorsement Authority</title>
<meta name="robots" content="noindex,nofollow"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --g:#C9A84C;--gd:rgba(201,168,76,0.25);--gg:rgba(201,168,76,0.08);--gh:rgba(201,168,76,0.15);
  --bg:#060a14;--bg1:#080d18;--bg2:#0a1020;--bg3:#0d1428;--card:#0f1623;--card2:#111827;
  --br:rgba(201,168,76,0.12);--br2:rgba(255,255,255,0.06);
  --tx:#e2e8f0;--mu:#64748b;--m2:#94a3b8;
  --gr:#22c55e;--rd:#ef4444;--bl:#3b82f6;--pu:#a855f7;--or:#f59e0b;--cy:#06b6d4;
}
html,body{height:100%;overflow:hidden}
body{background:var(--bg);color:var(--tx);font-family:'Inter',sans-serif;display:flex;flex-direction:column}

/* ── SCROLLBAR ── */
::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--gd);border-radius:2px}

/* ── TICKER ── */
.ticker{background:rgba(8,13,24,.97);border-bottom:1px solid rgba(201,168,76,.07);padding:3px 0;overflow:hidden;white-space:nowrap;flex-shrink:0}
.ticker-inner{display:inline-flex;animation:tick 40s linear infinite}
@keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.tick-item{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.22em;color:rgba(201,168,76,.35);text-transform:uppercase;padding:0 40px}

/* ── TOP NAV ── */
.topnav{background:rgba(6,10,20,.98);border-bottom:1px solid var(--br);padding:0 20px;height:54px;display:flex;align-items:center;gap:12px;flex-shrink:0;backdrop-filter:blur(20px)}
.logo-mark{width:32px;height:32px;background:linear-gradient(135deg,var(--g),#8a6a1e);border-radius:5px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#060a14;flex-shrink:0}
.logo-text{display:flex;flex-direction:column;line-height:1.1}
.logo-name{font-size:12px;font-weight:700;color:var(--tx);letter-spacing:.02em}
.logo-sub{font-size:8px;font-weight:600;color:var(--g);letter-spacing:.4em;text-transform:uppercase;font-family:'JetBrains Mono',monospace}
.nav-divider{width:1px;height:28px;background:var(--br2);margin:0 4px}
.nav-badge{display:flex;align-items:center;gap:5px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:3px;padding:3px 9px}
.nav-dot{width:5px;height:5px;border-radius:50%;background:#ef4444;animation:pulse-r 1.4s infinite}
@keyframes pulse-r{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}50%{box-shadow:0 0 0 5px rgba(239,68,68,0)}}
.nav-badge-text{font-family:'JetBrains Mono',monospace;font-size:8.5px;font-weight:700;color:#ef4444;letter-spacing:.15em;text-transform:uppercase}
.nav-spacer{flex:1}
.clock{font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(201,168,76,.6);letter-spacing:.12em}
.live-pill{display:flex;align-items:center;gap:5px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:12px;padding:4px 10px}
.live-dot{width:5px;height:5px;border-radius:50%;background:#22c55e;animation:pulse-g 2s infinite}
@keyframes pulse-g{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}50%{box-shadow:0 0 0 5px rgba(34,197,94,0)}}
.live-text{font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;color:#22c55e;letter-spacing:.18em;text-transform:uppercase}
.nav-logout{background:transparent;border:1px solid var(--br);color:var(--mu);padding:5px 12px;border-radius:4px;font-size:10px;font-weight:600;letter-spacing:.1em;cursor:pointer;transition:all .2s;text-transform:uppercase}
.nav-logout:hover{border-color:var(--rd);color:var(--rd)}

/* ── LAYOUT ── */
.layout{display:flex;flex:1;overflow:hidden}

/* ── SIDEBAR ── */
.sidebar{width:200px;background:var(--bg1);border-right:1px solid var(--br);display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto}
.sidebar-section{padding:14px 12px 6px;font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--mu);letter-spacing:.3em;text-transform:uppercase}
.nav-item{display:flex;align-items:center;gap:9px;padding:9px 14px;cursor:pointer;transition:all .15s;border-left:2px solid transparent;font-size:12px;font-weight:500;color:var(--m2)}
.nav-item:hover{background:var(--gg);color:var(--tx)}
.nav-item.active{background:var(--gh);border-left-color:var(--g);color:var(--g)}
.nav-item .icon{font-size:14px;flex-shrink:0}
.nav-item .count{margin-left:auto;background:rgba(201,168,76,.15);color:var(--g);font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;padding:1px 6px;border-radius:3px}
.nav-item .count.red{background:rgba(239,68,68,.15);color:var(--rd)}
.sidebar-bottom{margin-top:auto;padding:12px;border-top:1px solid var(--br)}
.sidebar-user{font-size:10px;color:var(--mu)}
.sidebar-email{font-size:10px;color:var(--g);font-family:'JetBrains Mono',monospace}

/* ── MAIN ── */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}

/* ── STATS BAR ── */
.stats-bar{background:var(--bg2);border-bottom:1px solid var(--br);padding:0 20px;height:68px;display:flex;align-items:center;gap:1px;flex-shrink:0;overflow-x:auto}
.stat-card{display:flex;flex-direction:column;padding:10px 18px;border-right:1px solid var(--br2);flex-shrink:0}
.stat-label{font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--mu);letter-spacing:.25em;text-transform:uppercase;margin-bottom:4px}
.stat-val{font-size:20px;font-weight:800;color:var(--tx);line-height:1}
.stat-val.gold{color:var(--g)}
.stat-val.green{color:var(--gr)}
.stat-val.red{color:var(--rd)}
.stat-val.blue{color:var(--bl)}
.stat-val.amber{color:var(--or)}
.stat-sub{font-size:9px;color:var(--mu);margin-top:2px}

/* ── TOOLBAR ── */
.toolbar{background:var(--bg1);border-bottom:1px solid var(--br);padding:8px 20px;display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap}
.search-box{display:flex;align-items:center;gap:6px;background:var(--bg3);border:1px solid var(--br);border-radius:5px;padding:5px 10px;flex:1;min-width:160px;max-width:280px}
.search-box input{background:none;border:none;outline:none;color:var(--tx);font-size:12px;flex:1;font-family:'Inter',sans-serif}
.search-box input::placeholder{color:var(--mu)}
.search-icon{font-size:11px;color:var(--mu)}
.filter-btn{display:flex;align-items:center;gap:5px;background:var(--bg3);border:1px solid var(--br);border-radius:5px;padding:5px 10px;cursor:pointer;font-size:11px;font-weight:500;color:var(--m2);transition:all .15s;white-space:nowrap}
.filter-btn:hover,.filter-btn.active{border-color:var(--g);color:var(--g);background:var(--gg)}
.filter-btn .dot{width:6px;height:6px;border-radius:50%}
.toolbar-right{margin-left:auto;display:flex;gap:8px;align-items:center}
.btn-refresh{background:transparent;border:1px solid var(--br);color:var(--mu);padding:5px 10px;border-radius:5px;font-size:11px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:4px}
.btn-refresh:hover{border-color:var(--g);color:var(--g)}
.btn-refresh.spinning .ref-icon{animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.ref-icon{display:inline-block}
.last-refresh{font-family:'JetBrains Mono',monospace;font-size:8.5px;color:var(--mu);letter-spacing:.08em}

/* ── TABLE WRAP ── */
.table-wrap{flex:1;overflow:auto;padding:16px 20px 80px}

/* ── TABLE ── */
.app-table{width:100%;border-collapse:collapse;font-size:12px}
.app-table thead th{background:var(--bg2);padding:9px 10px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:8.5px;font-weight:600;color:var(--mu);letter-spacing:.2em;text-transform:uppercase;border-bottom:1px solid var(--br);white-space:nowrap;position:sticky;top:0;z-index:2}
.app-table thead th:first-child{border-radius:5px 0 0 0}
.app-table thead th:last-child{border-radius:0 5px 0 0}
.app-table tbody tr{border-bottom:1px solid rgba(255,255,255,.03);transition:background .15s;cursor:pointer}
.app-table tbody tr:hover{background:rgba(201,168,76,.04)}
.app-table tbody tr.selected{background:rgba(201,168,76,.07);border-left:2px solid var(--g)}
.app-table td{padding:11px 10px;vertical-align:middle}

/* ── TABLE CELLS ── */
.ref-code{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--g);font-weight:600;letter-spacing:.08em;white-space:nowrap}
.applicant-cell{display:flex;flex-direction:column;gap:2px}
.app-name{font-weight:600;color:var(--tx);font-size:12px}
.app-email{font-size:10px;color:var(--mu);font-family:'JetBrains Mono',monospace}
.app-phone{font-size:10px;color:rgba(148,163,184,.5)}
.venture-cell{display:flex;flex-direction:column;gap:2px}
.vc-name{font-weight:500;color:var(--tx);font-size:12px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vc-sector{font-size:10px;color:var(--mu)}
.vc-stage{display:inline-block;font-size:8px;padding:1px 6px;border-radius:3px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);color:#93c5fd;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.1em;margin-top:2px}

/* STATUS BADGES */
.status-badge{display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:700;padding:3px 8px;border-radius:3px;letter-spacing:.1em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;white-space:nowrap}
.sb-draft      {background:rgba(100,116,139,.1);border:1px solid rgba(100,116,139,.25);color:#64748b}
.sb-invited    {background:rgba(129,140,248,.1);border:1px solid rgba(129,140,248,.25);color:#818cf8}
.sb-submitted  {background:rgba(201,168,76,.1); border:1px solid rgba(201,168,76,.3); color:#C9A84C}
.sb-under_review{background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.25);color:#38bdf8}
.sb-info_requested{background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);color:#fbbf24}
.sb-approved   {background:rgba(74,222,128,.1); border:1px solid rgba(74,222,128,.3); color:#4ade80}
.sb-rejected   {background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);color:#f87171}
.sb-on_hold    {background:rgba(251,191,36,.1); border:1px solid rgba(251,191,36,.25);color:#fbbf24}
.sb-withdrawn  {background:rgba(100,116,139,.1);border:1px solid rgba(100,116,139,.2); color:#94a3b8}

.pay-badge{display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:700;padding:2px 7px;border-radius:3px;letter-spacing:.1em;font-family:'JetBrains Mono',monospace;white-space:nowrap}
.pay-paid   {background:rgba(74,222,128,.08); border:1px solid rgba(74,222,128,.25); color:#4ade80}
.pay-unpaid {background:rgba(239,68,68,.08);  border:1px solid rgba(239,68,68,.2);   color:#f87171}
.pay-pending{background:rgba(251,191,36,.08); border:1px solid rgba(251,191,36,.2);  color:#fbbf24}

.score-pill{display:inline-flex;align-items:center;justify-content:center;width:36px;height:22px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700}
.score-high{background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.3);color:#4ade80}
.score-mid {background:rgba(201,168,76,.12); border:1px solid rgba(201,168,76,.3); color:#C9A84C}
.score-low {background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.3);color:#f87171}
.score-none{background:rgba(100,116,139,.08);border:1px solid rgba(100,116,139,.2);color:#475569;font-size:8px;letter-spacing:.08em}

.date-cell{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--mu);white-space:nowrap}
.date-time{font-size:8.5px;color:rgba(100,116,139,.5)}

.doc-indicators{display:flex;gap:3px}
.doc-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.doc-dot.have{background:var(--gr)}
.doc-dot.miss{background:rgba(100,116,139,.2)}

.actions-cell{display:flex;gap:4px;align-items:center}
.act-btn{padding:4px 8px;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid;transition:all .15s;letter-spacing:.04em;white-space:nowrap}
.act-btn:hover{transform:translateY(-1px)}
.act-view{background:var(--gg);border-color:var(--gd);color:var(--g)}
.act-view:hover{background:var(--gh)}
.act-endorse{background:rgba(74,222,128,.08);border-color:rgba(74,222,128,.3);color:#4ade80}
.act-endorse:hover{background:rgba(74,222,128,.15)}
.act-decline{background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.3);color:#f87171}
.act-decline:hover{background:rgba(248,113,113,.15)}

/* ── EMPTY STATE ── */
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;gap:12px;opacity:.7}
.empty-icon{font-size:36px}
.empty-title{font-size:14px;font-weight:600;color:var(--m2)}
.empty-sub{font-size:12px;color:var(--mu)}

/* ── DETAIL PANEL (slide-in) ── */
.detail-overlay{position:fixed;inset:0;background:rgba(4,8,16,.7);z-index:100;display:none;backdrop-filter:blur(4px)}
.detail-overlay.open{display:flex;justify-content:flex-end}
.detail-panel{width:min(680px,100vw);background:var(--bg1);border-left:1px solid var(--br);display:flex;flex-direction:column;height:100%;overflow-y:auto;animation:slideIn .25s ease-out}
@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
.dp-header{background:var(--bg2);border-bottom:1px solid var(--br);padding:16px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0;position:sticky;top:0;z-index:5}
.dp-title{display:flex;flex-direction:column;gap:2px;flex:1}
.dp-ref{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--g);letter-spacing:.12em}
.dp-name{font-size:16px;font-weight:700;color:var(--tx)}
.dp-close{background:transparent;border:1px solid var(--br);color:var(--mu);width:28px;height:28px;border-radius:4px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s}
.dp-close:hover{border-color:var(--rd);color:var(--rd)}

.dp-tabs{display:flex;border-bottom:1px solid var(--br);background:var(--bg2);flex-shrink:0}
.dp-tab{padding:10px 18px;font-size:11px;font-weight:600;color:var(--mu);cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;letter-spacing:.04em}
.dp-tab:hover{color:var(--tx)}
.dp-tab.active{color:var(--g);border-bottom-color:var(--g)}

.dp-body{padding:20px;display:flex;flex-direction:column;gap:16px}
.dp-section{display:flex;flex-direction:column;gap:8px}
.dp-section-title{font-family:'JetBrains Mono',monospace;font-size:8.5px;color:var(--mu);letter-spacing:.3em;text-transform:uppercase;padding-bottom:6px;border-bottom:1px solid var(--br2)}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.info-field{background:var(--bg3);border:1px solid var(--br2);border-radius:5px;padding:10px 12px}
.info-label{font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--mu);letter-spacing:.2em;text-transform:uppercase;margin-bottom:4px}
.info-val{font-size:12px;font-weight:500;color:var(--tx);word-break:break-word}
.info-val a{color:var(--g);text-decoration:none}
.info-val a:hover{text-decoration:underline}
.info-val.mono{font-family:'JetBrains Mono',monospace;font-size:11px}

.score-display{background:var(--bg3);border:1px solid rgba(201,168,76,.2);border-radius:8px;padding:16px;display:flex;align-items:center;gap:16px}
.score-big{font-family:'JetBrains Mono',monospace;font-size:42px;font-weight:800;color:var(--g);line-height:1}
.score-bar-wrap{flex:1}
.score-bar-label{font-size:10px;color:var(--mu);margin-bottom:6px}
.score-bar-bg{background:rgba(255,255,255,.06);border-radius:4px;height:6px;overflow:hidden}
.score-bar-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#a07c30,#C9A84C,#e8d07a);transition:width 1s ease-out}
.score-summary{font-size:11px;color:var(--m2);line-height:1.6;margin-top:8px}

.doc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.doc-item{background:var(--bg3);border:1px solid var(--br2);border-radius:5px;padding:10px 12px;display:flex;align-items:center;gap:8px;transition:border-color .15s}
.doc-item.has-doc{border-color:rgba(74,222,128,.2)}
.doc-item.has-doc:hover{border-color:rgba(74,222,128,.4)}
.doc-item a{text-decoration:none;display:flex;align-items:center;gap:8px;flex:1}
.doc-icon{font-size:16px;flex-shrink:0}
.doc-name{font-size:11px;font-weight:500;color:var(--tx)}
.doc-status{font-size:9px}
.doc-status.present{color:var(--gr)}
.doc-status.missing{color:var(--mu)}

.notes-area{background:var(--bg3);border:1px solid var(--br);border-radius:5px;padding:10px 12px;color:var(--tx);font-family:'Inter',sans-serif;font-size:12px;resize:vertical;min-height:80px;width:100%;outline:none;transition:border-color .2s;line-height:1.6}
.notes-area:focus{border-color:var(--g)}
.notes-area::placeholder{color:var(--mu)}

/* ── ACTION PANEL (bottom of detail) ── */
.action-panel{background:var(--bg2);border-top:1px solid var(--br);padding:16px 20px;flex-shrink:0;position:sticky;bottom:0}
.action-panel-title{font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--mu);letter-spacing:.3em;text-transform:uppercase;margin-bottom:12px}
.action-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.big-btn{padding:10px 14px;border-radius:5px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid;transition:all .2s;letter-spacing:.05em;text-align:center;display:flex;align-items:center;justify-content:center;gap:6px}
.big-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,.3)}
.big-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.btn-endorse{background:rgba(74,222,128,.1);border-color:rgba(74,222,128,.4);color:#4ade80}
.btn-endorse:hover:not(:disabled){background:rgba(74,222,128,.18);box-shadow:0 4px 20px rgba(74,222,128,.15)}
.btn-decline{background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.3);color:#f87171}
.btn-decline:hover:not(:disabled){background:rgba(248,113,113,.15);box-shadow:0 4px 20px rgba(248,113,113,.12)}
.btn-info-req{background:rgba(251,191,36,.08);border-color:rgba(251,191,36,.25);color:#fbbf24}
.btn-info-req:hover:not(:disabled){background:rgba(251,191,36,.15)}
.btn-payment{background:rgba(201,168,76,.08);border-color:rgba(201,168,76,.3);color:var(--g)}
.btn-payment:hover:not(:disabled){background:rgba(201,168,76,.15)}
.btn-kyc{background:rgba(59,130,246,.08);border-color:rgba(59,130,246,.25);color:#93c5fd}
.btn-kyc:hover:not(:disabled){background:rgba(59,130,246,.15)}
.btn-save{background:rgba(255,255,255,.04);border-color:var(--br);color:var(--m2)}
.btn-save:hover:not(:disabled){border-color:var(--g);color:var(--g)}
.status-select-wrap{display:flex;gap:8px;align-items:center}
.status-select{background:var(--bg3);border:1px solid var(--br);color:var(--tx);padding:7px 10px;border-radius:5px;font-size:11px;flex:1;outline:none;cursor:pointer}
.status-select:focus{border-color:var(--g)}
.btn-apply{background:var(--gg);border:1px solid var(--gd);color:var(--g);padding:7px 14px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;letter-spacing:.05em}
.btn-apply:hover{background:var(--gh)}

/* ── TOAST ── */
.toast-wrap{position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:8px;z-index:999}
.toast{background:var(--card2);border-radius:6px;padding:10px 16px;font-size:12px;font-weight:500;display:flex;align-items:center;gap:8px;border-left:3px solid;animation:toastIn .25s ease-out;box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:300px}
.toast.success{border-color:var(--gr);color:#4ade80}
.toast.error  {border-color:var(--rd);color:#f87171}
.toast.info   {border-color:var(--g); color:var(--g)}
@keyframes toastIn{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}

/* ── STATUS CHANGE SELECTOR ── */
.section-row{display:flex;gap:8px;align-items:flex-start}

/* ── LOADING ── */
.loading-row td{text-align:center;padding:60px;color:var(--mu);font-size:13px}
.spinner-inline{display:inline-block;width:20px;height:20px;border:2px solid var(--br);border-top-color:var(--g);border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:8px}

/* ── AUTH SCREEN ── */
.auth-screen{position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;justify-content:center;z-index:200}
.auth-card{background:var(--card);border:1px solid var(--br);border-radius:10px;padding:36px;width:100%;max-width:360px;text-align:center}
.auth-logo{width:52px;height:52px;background:linear-gradient(135deg,var(--g),#8a6a1e);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#060a14;margin:0 auto 20px}
.auth-title{font-size:18px;font-weight:700;color:var(--tx);margin-bottom:4px;letter-spacing:.02em}
.auth-sub{font-size:11px;color:var(--mu);letter-spacing:.2em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;margin-bottom:28px}
.auth-input{width:100%;background:var(--bg3);border:1px solid var(--br);border-radius:5px;padding:12px 14px;color:var(--tx);font-size:13px;letter-spacing:.12em;outline:none;text-align:center;font-family:'JetBrains Mono',monospace;transition:border-color .2s;margin-bottom:12px}
.auth-input:focus{border-color:var(--g)}
.auth-btn{width:100%;background:var(--g);color:#060a14;border:none;border-radius:5px;padding:12px;font-size:13px;font-weight:800;cursor:pointer;letter-spacing:.1em;text-transform:uppercase;transition:all .2s}
.auth-btn:hover{background:#d4a93c;box-shadow:0 0 24px rgba(201,168,76,.3)}
.auth-error{color:var(--rd);font-size:11px;margin-top:8px;display:none}

@media(max-width:768px){
  .sidebar{display:none}
  .stats-bar{height:auto;padding:8px}
  .stat-card{padding:8px 12px}
  .detail-panel{width:100vw}
  .info-grid,.doc-grid,.action-grid{grid-template-columns:1fr}
}
</style>
</head>
<body>

<!-- AUTH SCREEN -->
<div class="auth-screen" id="authScreen">
  <div class="auth-card">
    <div class="auth-logo">P</div>
    <div class="auth-title">Command Centre</div>
    <div class="auth-sub">Prime Endorsement Authority</div>
    <input class="auth-input" type="password" id="authInput" placeholder="ENTER ACCESS CODE" autocomplete="off"/>
    <button class="auth-btn" onclick="doAuth()">AUTHENTICATE</button>
    <div class="auth-error" id="authError">⚠ Invalid access code</div>
  </div>
</div>

<!-- TICKER -->
<div class="ticker">
  <div class="ticker-inner" id="tickerInner">
    <span class="tick-item">PEA COMMAND CENTRE</span>
    <span class="tick-item">·</span>
    <span class="tick-item">LIVE MONITORING ACTIVE</span>
    <span class="tick-item">·</span>
    <span class="tick-item">GLOBAL DIGITAL AUTHORITY STANDARD</span>
    <span class="tick-item">·</span>
    <span class="tick-item">AES-256 · TLS 1.3 · ISO 27001</span>
    <span class="tick-item">·</span>
    <span class="tick-item">STRIPE PCI DSS LEVEL 1</span>
    <span class="tick-item">·</span>
    <span class="tick-item">UKVI ENDORSED PROCESS</span>
    <span class="tick-item">·</span>
    <span class="tick-item">PEA COMMAND CENTRE</span>
    <span class="tick-item">·</span>
    <span class="tick-item">LIVE MONITORING ACTIVE</span>
    <span class="tick-item">·</span>
    <span class="tick-item">GLOBAL DIGITAL AUTHORITY STANDARD</span>
    <span class="tick-item">·</span>
    <span class="tick-item">AES-256 · TLS 1.3 · ISO 27001</span>
    <span class="tick-item">·</span>
    <span class="tick-item">STRIPE PCI DSS LEVEL 1</span>
    <span class="tick-item">·</span>
    <span class="tick-item">UKVI ENDORSED PROCESS</span>
    <span class="tick-item">·</span>
  </div>
</div>

<!-- TOP NAV -->
<div class="topnav">
  <div class="logo-mark">P</div>
  <div class="logo-text">
    <div class="logo-name">Prime Endorsement Authority</div>
    <div class="logo-sub">Admin Command Centre</div>
  </div>
  <div class="nav-divider"></div>
  <div class="nav-badge">
    <div class="nav-dot"></div>
    <div class="nav-badge-text">SECURE SESSION</div>
  </div>
  <div class="nav-spacer"></div>
  <div class="clock" id="clockEl">--:--:--</div>
  <div class="live-pill">
    <div class="live-dot"></div>
    <div class="live-text">LIVE</div>
  </div>
  <button class="nav-logout" onclick="logout()">SIGN OUT</button>
</div>

<!-- LAYOUT -->
<div class="layout">
  <!-- SIDEBAR -->
  <div class="sidebar">
    <div class="sidebar-section">Navigation</div>
    <div class="nav-item active" onclick="setView('all')">
      <span class="icon">📋</span>
      <span>All Applications</span>
      <span class="count" id="cnt-all">0</span>
    </div>
    <div class="nav-item" onclick="setView('pending')">
      <span class="icon">⏳</span>
      <span>Pending Review</span>
      <span class="count red" id="cnt-pending">0</span>
    </div>
    <div class="nav-item" onclick="setView('payment')">
      <span class="icon">💳</span>
      <span>Awaiting Payment</span>
      <span class="count" id="cnt-payment">0</span>
    </div>
    <div class="nav-item" onclick="setView('approved')">
      <span class="icon">✅</span>
      <span>Endorsed</span>
      <span class="count" id="cnt-approved">0</span>
    </div>
    <div class="nav-item" onclick="setView('rejected')">
      <span class="icon">❌</span>
      <span>Declined</span>
      <span class="count" id="cnt-rejected">0</span>
    </div>
    <div class="sidebar-section" style="margin-top:8px">Quick Links</div>
    <div class="nav-item" onclick="window.open('${DOMAIN}','_blank')">
      <span class="icon">🌐</span>
      <span>Live Site</span>
    </div>
    <div class="nav-item" onclick="window.open('${DOMAIN}/applicant-portal','_blank')">
      <span class="icon">👤</span>
      <span>Applicant Portal</span>
    </div>
    <div class="sidebar-bottom">
      <div class="sidebar-user">Signed in as</div>
      <div class="sidebar-email">admin@primeendorsement.com</div>
    </div>
  </div>

  <!-- MAIN -->
  <div class="main">
    <!-- STATS BAR -->
    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-label">Total Applications</div>
        <div class="stat-val gold" id="st-total">—</div>
        <div class="stat-sub">all time</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pending Review</div>
        <div class="stat-val red" id="st-pending">—</div>
        <div class="stat-sub">action required</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Awaiting Payment</div>
        <div class="stat-val amber" id="st-payment">—</div>
        <div class="stat-sub">unpaid sessions</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Endorsed</div>
        <div class="stat-val green" id="st-endorsed">—</div>
        <div class="stat-sub">approved</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Conversion Rate</div>
        <div class="stat-val blue" id="st-rate">—</div>
        <div class="stat-sub">paid / total</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Revenue Collected</div>
        <div class="stat-val gold" id="st-revenue">—</div>
        <div class="stat-sub">GBP · confirmed</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Score</div>
        <div class="stat-val" id="st-score">—</div>
        <div class="stat-sub">assessment avg</div>
      </div>
    </div>

    <!-- TOOLBAR -->
    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="searchInput" placeholder="Search name, ref, email, venture…" oninput="applyFilters()"/>
      </div>
      <button class="filter-btn active" onclick="setStatusFilter('')" id="fb-all">All</button>
      <button class="filter-btn" onclick="setStatusFilter('submitted')" id="fb-submitted">
        <span class="dot" style="background:#C9A84C"></span>Submitted
      </button>
      <button class="filter-btn" onclick="setStatusFilter('under_review')" id="fb-under_review">
        <span class="dot" style="background:#38bdf8"></span>Under Review
      </button>
      <button class="filter-btn" onclick="setStatusFilter('approved')" id="fb-approved">
        <span class="dot" style="background:#4ade80"></span>Endorsed
      </button>
      <button class="filter-btn" onclick="setStatusFilter('rejected')" id="fb-rejected">
        <span class="dot" style="background:#f87171"></span>Declined
      </button>
      <div class="toolbar-right">
        <span class="last-refresh" id="lastRefreshEl">—</span>
        <button class="btn-refresh" id="refreshBtn" onclick="loadData(true)">
          <span class="ref-icon">↻</span> Refresh
        </button>
      </div>
    </div>

    <!-- TABLE -->
    <div class="table-wrap">
      <table class="app-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Applicant</th>
            <th>Venture</th>
            <th>Role</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Score</th>
            <th>Submitted</th>
            <th>Docs</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="appTableBody">
          <tr class="loading-row"><td colspan="10"><span class="spinner-inline"></span>Loading applications…</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- DETAIL OVERLAY -->
<div class="detail-overlay" id="detailOverlay" onclick="closeDetail(event)">
  <div class="detail-panel" id="detailPanel">
    <div class="dp-header">
      <div class="dp-title">
        <div class="dp-ref" id="dp-ref">—</div>
        <div class="dp-name" id="dp-name">—</div>
      </div>
      <div id="dp-status-badge"></div>
      <button class="dp-close" onclick="closeDetailPanel()">✕</button>
    </div>
    <div class="dp-tabs">
      <div class="dp-tab active" onclick="setDpTab('overview',this)">Overview</div>
      <div class="dp-tab" onclick="setDpTab('documents',this)">Documents</div>
      <div class="dp-tab" onclick="setDpTab('venture',this)">Venture</div>
      <div class="dp-tab" onclick="setDpTab('notes',this)">Notes</div>
    </div>
    <div class="dp-body" id="dpBody"></div>
    <div class="action-panel">
      <div class="action-panel-title">Administrative Actions</div>
      <div class="action-grid">
        <button class="big-btn btn-endorse" id="btnEndorse" onclick="doAction('endorse')">✅ Endorse Application</button>
        <button class="big-btn btn-decline" id="btnDecline" onclick="doAction('decline')">❌ Decline Application</button>
        <button class="big-btn btn-info-req" onclick="doAction('request_info')">📋 Request Information</button>
        <button class="big-btn btn-payment"  onclick="doAction('send_payment')">💳 Send Payment Link</button>
        <button class="big-btn btn-kyc"      onclick="doAction('verify_kyc')">🪪 Mark KYC Verified</button>
        <button class="big-btn btn-save"     onclick="doAction('save_notes')">💾 Save Notes</button>
      </div>
      <div class="status-select-wrap">
        <select class="status-select" id="statusSelect">
          <option value="">— Update Status —</option>
          <option value="invited">Invited</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="info_requested">Info Requested</option>
          <option value="on_hold">On Hold</option>
          <option value="approved">Endorsed</option>
          <option value="rejected">Declined</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
        <button class="btn-apply" onclick="doAction('update_status')">Apply</button>
      </div>
    </div>
  </div>
</div>

<!-- TOAST CONTAINER -->
<div class="toast-wrap" id="toastWrap"></div>

<script>
// ── CONFIG ────────────────────────────────────────────────────────────────────
const API_BASE   = "${apiBase}";
let   ADMIN_KEY  = "";
let   allRecords = [];
let   filtered   = [];
let   currentView= "all";
let   statusFilter="";
let   selectedApp= null;
let   currentTab = "overview";
let   autoRefreshTimer = null;

// ── AUTH ──────────────────────────────────────────────────────────────────────
function doAuth(){
  const k = document.getElementById("authInput").value.trim();
  if(!k){return;}
  ADMIN_KEY = k;
  loadData(true);
}
document.getElementById("authInput").addEventListener("keydown", e=>{if(e.key==="Enter")doAuth();});

function logout(){
  ADMIN_KEY=""; allRecords=[];
  document.getElementById("authScreen").style.display="flex";
  clearInterval(autoRefreshTimer);
}

// ── CLOCK ─────────────────────────────────────────────────────────────────────
function updateClock(){
  const now=new Date();
  document.getElementById("clockEl").textContent=
    now.toLocaleTimeString("en-GB",{hour12:false,timeZone:"Europe/London"})+" UTC";
}
setInterval(updateClock,1000);updateClock();

// ── DATA LOADING ──────────────────────────────────────────────────────────────
async function loadData(manual=false){
  const btn=document.getElementById("refreshBtn");
  btn.classList.add("spinning");
  try{
    const r = await fetch(API_BASE+"/api/applications",{
      headers:{"X-Admin-Token":ADMIN_KEY}
    });
    if(r.status===401){
      document.getElementById("authError").style.display="block";
      document.getElementById("authScreen").style.display="flex";
      btn.classList.remove("spinning");
      return;
    }
    document.getElementById("authScreen").style.display="none";
    const d = await r.json();
    if(!d.ok){toast("Error loading data","error");btn.classList.remove("spinning");return;}
    allRecords = d.records || [];
    updateStats();
    applyFilters();
    updateSidebarCounts();
    const now=new Date();
    document.getElementById("lastRefreshEl").textContent=
      "Updated "+now.toLocaleTimeString("en-GB",{hour12:false});
    if(manual) toast("Data refreshed — "+allRecords.length+" applications","info");
    // Update ticker
    updateTicker();
  }catch(e){
    toast("Network error: "+e.message,"error");
  }
  btn.classList.remove("spinning");
}

// Auto-refresh every 60 seconds
autoRefreshTimer = setInterval(()=>loadData(false), 60000);
loadData(true);

// ── STATS ─────────────────────────────────────────────────────────────────────
function updateStats(){
  const total    = allRecords.length;
  const pending  = allRecords.filter(r=>["submitted","under_review","info_requested"].includes(r.status)).length;
  const awaitPay = allRecords.filter(r=>r.payment==="unpaid"||r.payment==="pending").length;
  const endorsed = allRecords.filter(r=>r.status==="approved").length;
  const paid     = allRecords.filter(r=>r.payment==="paid").length;
  const rate     = total>0?Math.round((paid/total)*100):0;
  const revenue  = allRecords.filter(r=>r.payment==="paid").reduce((s,r)=>s+(r.payment_amt||1200),0);
  const scored   = allRecords.filter(r=>r.ai_score);
  const avgScore = scored.length>0?Math.round(scored.reduce((s,r)=>s+(r.ai_score||0),0)/scored.length):null;

  document.getElementById("st-total").textContent   = total;
  document.getElementById("st-pending").textContent  = pending;
  document.getElementById("st-payment").textContent  = awaitPay;
  document.getElementById("st-endorsed").textContent = endorsed;
  document.getElementById("st-rate").textContent     = rate+"%";
  document.getElementById("st-revenue").textContent  = "£"+revenue.toLocaleString();
  document.getElementById("st-score").textContent    = avgScore||"—";
}

function updateSidebarCounts(){
  document.getElementById("cnt-all").textContent      = allRecords.length;
  document.getElementById("cnt-pending").textContent  = allRecords.filter(r=>["submitted","under_review"].includes(r.status)).length;
  document.getElementById("cnt-payment").textContent  = allRecords.filter(r=>r.payment==="unpaid"||r.payment==="pending").length;
  document.getElementById("cnt-approved").textContent = allRecords.filter(r=>r.status==="approved").length;
  document.getElementById("cnt-rejected").textContent = allRecords.filter(r=>r.status==="rejected").length;
}

function updateTicker(){
  const endorsed = allRecords.filter(r=>r.status==="approved").length;
  const total    = allRecords.length;
  const paid     = allRecords.filter(r=>r.payment==="paid").length;
  const tpl = [
    "PEA COMMAND CENTRE","·","LIVE MONITORING ACTIVE","·",
    "TOTAL APPLICATIONS: "+total,"·",
    "ENDORSED: "+endorsed,"·",
    "PAYMENTS CONFIRMED: "+paid,"·",
    "GLOBAL DIGITAL AUTHORITY STANDARD","·",
    "AES-256 · TLS 1.3 · ISO 27001","·","UKVI ENDORSED PROCESS","·"
  ];
  const inner = tpl.map(t=>'<span class="tick-item">'+t+'</span>').join("").repeat(2);
  document.getElementById("tickerInner").innerHTML = inner;
}

// ── FILTERS ───────────────────────────────────────────────────────────────────
function setView(v){
  currentView=v;
  document.querySelectorAll(".nav-item").forEach(el=>{
    el.classList.toggle("active", el.getAttribute("onclick")&&el.getAttribute("onclick").includes("'"+v+"'"));
  });
  applyFilters();
}

function setStatusFilter(s){
  statusFilter=s;
  document.querySelectorAll(".filter-btn").forEach(b=>b.classList.remove("active"));
  const id="fb-"+(s||"all");
  const btn=document.getElementById(id);
  if(btn)btn.classList.add("active");
  applyFilters();
}

function applyFilters(){
  const q=(document.getElementById("searchInput").value||"").toLowerCase();
  filtered=allRecords.filter(r=>{
    if(statusFilter && r.status!==statusFilter)return false;
    if(currentView==="pending" && !["submitted","under_review","info_requested"].includes(r.status))return false;
    if(currentView==="payment" && r.payment==="paid")return false;
    if(currentView==="approved"&& r.status!=="approved")return false;
    if(currentView==="rejected"&& r.status!=="rejected")return false;
    if(q){
      const haystack=(r.ref+r.name+r.email+r.venture+r.phone+r.nationality).toLowerCase();
      if(!haystack.includes(q))return false;
    }
    return true;
  });
  renderTable();
}

// ── TABLE RENDER ──────────────────────────────────────────────────────────────
function renderTable(){
  const tbody=document.getElementById("appTableBody");
  if(!filtered.length){
    tbody.innerHTML='<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">🗂️</div><div class="empty-title">No applications found</div><div class="empty-sub">Adjust your filters or refresh</div></div></td></tr>';
    return;
  }
  tbody.innerHTML=filtered.map(r=>{
    const statusCls="sb-"+(r.status||"draft");
    const payClass=r.payment==="paid"?"pay-paid":r.payment==="pending"?"pay-pending":"pay-unpaid";
    const payLabel=r.payment==="paid"?"PAID ✓":r.payment==="pending"?"PENDING":"UNPAID";
    const score=r.ai_score;
    const scorePill=score
      ?'<span class="score-pill '+(score>=75?"score-high":score>=50?"score-mid":"score-low")+'">'+score+'</span>'
      :'<span class="score-pill score-none">N/A</span>';
    const dt=r.submitted_at?new Date(r.submitted_at):null;
    const dateStr=dt?dt.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—";
    const timeStr=dt?dt.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false}):"";
    const docs=[r.doc_passport,r.doc_address,r.doc_business,r.doc_plan,r.doc_financials,r.doc_pitch];
    const docDots=docs.map(d=>'<div class="doc-dot '+(d?"have":"miss")+'"></div>').join("");
    const isSelected=selectedApp&&selectedApp.id===r.id?"selected":"";
    return '<tr class="'+isSelected+'" onclick="openDetail(\''+r.id+'\')">'+
      '<td><div class="ref-code">'+r.ref+'</div></td>'+
      '<td><div class="applicant-cell"><div class="app-name">'+(r.name||"<em style=color:#475569>Pending</em>")+'</div><div class="app-email">'+r.email+'</div>'+(r.phone&&r.phone!=="—"?'<div class="app-phone">'+r.phone+'</div>':"")+'</div></td>'+
      '<td><div class="venture-cell"><div class="vc-name" title="'+r.venture+'">'+r.venture+'</div>'+(r.sector&&r.sector!=="—"?'<div class="vc-sector">'+r.sector+'</div>':"")+(r.stage&&r.stage!=="—"?'<div class="vc-stage">'+r.stage+'</div>':"")+'</div></td>'+
      '<td style="font-size:11px;color:var(--m2)">'+r.role+'</td>'+
      '<td><span class="status-badge '+statusCls+'">'+fmtStatus(r.status)+'</span></td>'+
      '<td><span class="pay-badge '+payClass+'">'+payLabel+'</span></td>'+
      '<td>'+scorePill+'</td>'+
      '<td><div class="date-cell">'+dateStr+'</div><div class="date-time">'+timeStr+'</div></td>'+
      '<td><div class="doc-indicators">'+docDots+'</div></td>'+
      '<td><div class="actions-cell">'+
        '<button class="act-btn act-view" onclick="event.stopPropagation();openDetail(\''+r.id+'\')">View</button>'+
        (r.status!=="approved"?'<button class="act-btn act-endorse" onclick="event.stopPropagation();quickEndorse(\''+r.id+'\')">✓</button>':"")+''+
      '</div></td>'+
    '</tr>';
  }).join("");
}

function fmtStatus(s){
  const m={draft:"Draft",invited:"Invited",submitted:"Submitted",under_review:"Under Review",
    info_requested:"Info Req.",ai_screening:"Screening",payment_due:"Payment Due",
    in_review:"Expert Review",approved:"Endorsed",rejected:"Declined",
    on_hold:"On Hold",withdrawn:"Withdrawn"};
  return m[s]||s;
}

// ── DETAIL PANEL ──────────────────────────────────────────────────────────────
function openDetail(id){
  selectedApp=allRecords.find(r=>r.id===id);
  if(!selectedApp)return;
  renderTable();
  renderDetailPanel();
  document.getElementById("detailOverlay").classList.add("open");
}

function closeDetailPanel(){
  document.getElementById("detailOverlay").classList.remove("open");
  selectedApp=null;
  renderTable();
}

function closeDetail(e){
  if(e.target===document.getElementById("detailOverlay"))closeDetailPanel();
}

function setDpTab(tab,el){
  currentTab=tab;
  document.querySelectorAll(".dp-tab").forEach(t=>t.classList.remove("active"));
  el.classList.add("active");
  renderDetailBody();
}

function renderDetailPanel(){
  if(!selectedApp)return;
  const a=selectedApp;
  document.getElementById("dp-ref").textContent=a.ref;
  document.getElementById("dp-name").textContent=a.name||"Registration Pending";
  const sc="sb-"+(a.status||"draft");
  document.getElementById("dp-status-badge").innerHTML='<span class="status-badge '+sc+'">'+fmtStatus(a.status)+'</span>';
  // Pre-fill status select
  document.getElementById("statusSelect").value=a.status||"";
  renderDetailBody();
}

function renderDetailBody(){
  if(!selectedApp)return;
  const a=selectedApp;
  const body=document.getElementById("dpBody");
  
  if(currentTab==="overview"){
    const scoreHTML=a.ai_score?
      '<div class="score-display">'+
        '<div class="score-big">'+a.ai_score+'</div>'+
        '<div class="score-bar-wrap">'+
          '<div class="score-bar-label">Assessment Score / 100</div>'+
          '<div class="score-bar-bg"><div class="score-bar-fill" id="scoreBar" style="width:0%"></div></div>'+
          (a.ai_summary?'<div class="score-summary">'+a.ai_summary+'</div>':"")+'</div></div>'+
        '<script>setTimeout(()=>{const b=document.getElementById("scoreBar");if(b)b.style.width="'+a.ai_score+'%"},100)<\/script>':
      '<div style="background:var(--bg3);border:1px solid var(--br2);border-radius:5px;padding:12px;text-align:center;color:var(--mu);font-size:12px">No assessment score yet</div>';
    
    body.innerHTML=
      '<div class="dp-section">'+
        '<div class="dp-section-title">Applicant Information</div>'+
        '<div class="info-grid">'+
          field("Full Name",a.name||"Pending")+
          field("Email",a.email?'<a href="mailto:'+a.email+'">'+a.email+'</a>':"")+
          field("Phone",a.phone)+
          field("Nationality",a.nationality)+
          field("Country",a.country)+
          field("Date of Birth",a.dob||"—")+
          field("Role",a.role)+
          (a.linkedin?field("LinkedIn",'<a href="'+a.linkedin+'" target="_blank">View Profile ↗</a>'):"")+'</div></div>'+
      '<div class="dp-section">'+
        '<div class="dp-section-title">Application Status</div>'+
        '<div class="info-grid">'+
          field("Current Status",fmtStatus(a.status))+
          field("Payment",a.payment==="paid"?'<span style="color:#4ade80">✓ Paid — £1,200.00</span>':'<span style="color:#f87171">'+a.payment+'</span>')+
          field("Submitted",a.submitted_at?new Date(a.submitted_at).toLocaleString("en-GB"):"Not yet")+
          field("Last Updated",a.updated_at?new Date(a.updated_at).toLocaleString("en-GB"):"—")+
          field("KYC Verified",a.kyc?'<span style="color:#4ade80">✓ Verified</span>':'<span style="color:#f87171">Not Verified</span>')+
          field("Documents",a.docs?'<span style="color:#4ade80">✓ Submitted</span>':'<span style="color:#f87171">Incomplete</span>')+
          (a.day90?field("90-Day Started",new Date(a.day90).toLocaleDateString("en-GB")):"")+'</div></div>'+
      (a.cofound_name?
        '<div class="dp-section"><div class="dp-section-title">Co-Founder Information</div><div class="info-grid">'+
        field("Co-Founder Name",a.cofound_name)+field("Co-Founder Email",a.cofound_email?'<a href="mailto:'+a.cofound_email+'">'+a.cofound_email+'</a>':"")+'</div></div>':"")+
      '<div class="dp-section"><div class="dp-section-title">Assessment Score</div>'+scoreHTML+'</div>';
  }

  if(currentTab==="documents"){
    const docs=[
      {key:"doc_passport",  label:"Passport / ID Document",icon:"🪪"},
      {key:"doc_address",   label:"Proof of Address",       icon:"🏠"},
      {key:"doc_business",  label:"Business Registration",  icon:"🏢"},
      {key:"doc_plan",      label:"Business Plan",          icon:"📄"},
      {key:"doc_financials",label:"Financial Projections",  icon:"📊"},
      {key:"doc_pitch",     label:"Pitch Deck",             icon:"📑"},
    ];
    const docItems=docs.map(d=>{
      const url=a[d.key];
      const hasDoc=!!url;
      return '<div class="doc-item '+(hasDoc?"has-doc":"")+'">'+
        (hasDoc
          ?'<a href="'+url+'" target="_blank" rel="noopener">'+
            '<span class="doc-icon">'+d.icon+'</span>'+
            '<div><div class="doc-name">'+d.label+'</div>'+
            '<div class="doc-status present">✓ Uploaded — Click to View</div></div></a>'
          :'<span class="doc-icon" style="opacity:.4">'+d.icon+'</span>'+
            '<div><div class="doc-name" style="color:var(--mu)">'+d.label+'</div>'+
            '<div class="doc-status missing">Not submitted</div></div>')+
        '</div>';
    }).join("");
    body.innerHTML='<div class="dp-section"><div class="dp-section-title">Submitted Documents</div><div class="doc-grid">'+docItems+'</div></div>';
  }

  if(currentTab==="venture"){
    body.innerHTML=
      '<div class="dp-section"><div class="dp-section-title">Venture Profile</div>'+
      '<div class="info-grid">'+
        field("Venture Name",a.venture)+
        field("Sector",a.sector)+
        field("Stage",a.stage)+
        (a.website?field("Website",'<a href="'+a.website+'" target="_blank">'+a.website+'</a>'):"")+
      '</div></div>'+
      (a.description&&a.description!=="—"?
        '<div class="dp-section"><div class="dp-section-title">Venture Description</div>'+
        '<div style="background:var(--bg3);border:1px solid var(--br2);border-radius:5px;padding:14px;font-size:12px;color:var(--m2);line-height:1.7">'+a.description+'</div></div>':"")+
      (a.ai_summary?
        '<div class="dp-section"><div class="dp-section-title">Expert Summary</div>'+
        '<div style="background:rgba(201,168,76,0.04);border:1px solid rgba(201,168,76,0.15);border-radius:5px;padding:14px;font-size:12px;color:var(--m2);line-height:1.7">'+a.ai_summary+'</div></div>':"");
  }

  if(currentTab==="notes"){
    body.innerHTML=
      '<div class="dp-section"><div class="dp-section-title">Internal Notes</div>'+
      '<textarea class="notes-area" id="notesArea" placeholder="Enter internal notes, reviewer comments, or action items…">'+
        (a.notes||"")+'</textarea>'+
      '<div style="font-size:10px;color:var(--mu);margin-top:6px">Notes are private and will be emailed to applicants only when using &quot;Endorse&quot;, &quot;Decline&quot;, or &quot;Request Info&quot; actions.</div></div>';
  }
}

function field(label,val){
  return '<div class="info-field"><div class="info-label">'+label+'</div><div class="info-val">'+(val||"—")+'</div></div>';
}

// ── ACTIONS ───────────────────────────────────────────────────────────────────
async function doAction(action){
  if(!selectedApp){toast("No application selected","error");return;}
  const a=selectedApp;
  let reason="", notes="";

  if(action==="decline"){
    reason=prompt("Enter reason for declining (optional):")||"";
  }
  if(action==="request_info"){
    notes=prompt("Specify what information is required:")||"";
    if(!notes){toast("Please specify what information is needed","error");return;}
  }
  if(action==="endorse"){
    if(!confirm("Endorse application "+a.ref+" for "+a.venture+"? This will notify the applicant.")){return;}
    notes=document.getElementById("notesArea")?.value||"";
  }
  if(action==="save_notes"){
    notes=document.getElementById("notesArea")?.value||"";
  }
  if(action==="update_status"){
    const ns=document.getElementById("statusSelect").value;
    if(!ns){toast("Please select a status","error");return;}
    if(!confirm("Update status to: "+fmtStatus(ns)+"?")){return;}
    const r=await apiCall({action,id:a.id,ref:a.ref,new_status:ns});
    if(r.ok){toast(r.message,"success");await loadData(false);renderDetailPanel();}
    else toast(r.error||"Error","error");
    return;
  }

  const payload={action,id:a.id,ref:a.ref,email:a.email,name:a.name,venture:a.venture,notes,reason};
  const r=await apiCall(payload);
  if(r.ok){
    toast(r.message||"Action completed","success");
    await loadData(false);
    if(action!=="save_notes")closeDetailPanel();
  } else {
    toast(r.error||r.message||"Error","error");
  }
}

async function quickEndorse(id){
  const a=allRecords.find(r=>r.id===id);
  if(!a)return;
  if(!confirm("Quick-endorse "+a.ref+" ("+a.venture+")? Applicant will be notified."))return;
  const r=await apiCall({action:"endorse",id:a.id,ref:a.ref,email:a.email,name:a.name,venture:a.venture,notes:""});
  if(r.ok){toast("Application endorsed ✓","success");loadData(false);}
  else toast(r.error||"Error","error");
}

async function apiCall(body){
  try{
    const r=await fetch(API_BASE+"/api/action",{
      method:"POST",
      headers:{"Content-Type":"application/json","X-Admin-Token":ADMIN_KEY},
      body:JSON.stringify(body)
    });
    return await r.json();
  }catch(e){return {ok:false,error:e.message};}
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function toast(msg,type="info"){
  const wrap=document.getElementById("toastWrap");
  const el=document.createElement("div");
  el.className="toast "+type;
  el.innerHTML=(type==="success"?"✅ ":type==="error"?"⚠️ ":"ℹ️ ")+msg;
  wrap.appendChild(el);
  setTimeout(()=>el.remove(),4000);
}
</script>
</body>
</html>`;

  return new Response(html, { headers: H });
}
