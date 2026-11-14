/* GDS OS — Phase 2 views
   Every page reads real API data. Nothing is mocked. A failure renders an error,
   never a zero, and an empty dataset says so explicitly. */
(function (global) {
  "use strict";

  var ui = global.GDS.ui;
  var api = global.GDS.api;
  var views = {};
  var esc = ui.esc;

  /* ---------- helpers ---------- */
  function rowsOf(d) {
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.items)) return d.items;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.results)) return d.results;
    if (Array.isArray(d.agents)) return d.agents;
    return [];
  }

  function settle(p) {
    return p.then(function (d) { return { ok: true, data: rowsOf(d) }; },
                  function (e) { return { ok: false, err: e }; });
  }

  function val(r, n) { return r.ok ? (typeof n === "number" ? n.toLocaleString() : n) : "—"; }

  function brief(err) {
    if (!err) return "request failed";
    var st = err.status || err.statusCode || err.code;
    var msg = err.message || err.detail || err.error || "";
    if (!msg && err.body && typeof err.body === "string") msg = err.body;
    if (!msg && err.detail) msg = err.detail;
    var out = (st ? "HTTP " + st : "");
    if (msg) out += (out ? " · " : "") + String(msg).slice(0, 140);
    return out || "request failed";
  }

  function unavail(r, what) {
    return ui.error("Could not load " + what + " — " + brief(r.err) +
      ". This is a live API failure, not an empty result.");
  }

  function sevCounts(rows) {
    var c = { critical: 0, high: 0, medium: 0, low: 0 };
    rows.forEach(function (r) {
      var s = String(r.severity || "").toLowerCase();
      if (s.indexOf("crit") === 0) c.critical++;
      else if (s.indexOf("high") === 0) c.high++;
      else if (s.indexOf("med") === 0) c.medium++;
      else if (s.indexOf("low") === 0) c.low++;
    });
    return c;
  }

  /* Shared detail drawer: shows every field of one record. */
  function drawer(record, title) {
    var rows = Object.keys(record).sort().map(function (k) {
      var v = record[k];
      if (v === null || v === undefined || v === "") return "";
      var text = typeof v === "object" ? JSON.stringify(v, null, 2) : String(v);
      return '<div class="kv"><div class="kv-k">' + esc(k.replace(/_/g, " ")) +
        '</div><div class="kv-v' + (text.length > 80 ? " wrap" : "") + '">' + esc(text) + "</div></div>";
    }).join("");
    return '<div class="drawer" id="drawer"><div class="drawer-h"><strong>' + esc(title || "Record") +
      '</strong><button class="btn-ghost" id="drawer-close" aria-label="Close">✕</button></div>' +
      '<div class="drawer-b">' + rows + "</div></div>";
  }

  function wireDrawer(host, rows) {
    host.querySelectorAll("tr[data-i]").forEach(function (tr) {
      tr.addEventListener("click", function () {
        var r = rows[Number(tr.getAttribute("data-i"))];
        if (!r) return;
        var old = host.querySelector("#drawer");
        if (old) old.remove();
        host.insertAdjacentHTML("beforeend", drawer(r, r.title || r.name || r.mission_id || "Record"));
        var d = host.querySelector("#drawer");
        d.querySelector("#drawer-close").addEventListener("click", function () { d.remove(); });
        d.classList.add("open");
      });
    });
  }

  /* Reusable filtered table page. */
  function tablePage(host, opts) {
    var all = opts.rows || [];
    var state = { q: "", sev: "", status: "" };

    function options(values) {
      return values.map(function (v) {
        return '<option value="' + esc(v) + '">' + esc(v) + "</option>";
      }).join("");
    }

    function apply() {
      var out = all.filter(function (r) {
        if (state.sev && String(r.severity || "").toLowerCase() !== state.sev) return false;
        if (state.status && String(r.status || "").toLowerCase() !== state.status) return false;
        if (state.q) {
          var hay = Object.keys(r).map(function (k) { return String(r[k] == null ? "" : r[k]); }).join(" ").toLowerCase();
          if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
        }
        return true;
      });
      var body = host.querySelector("#tp-body");
      body.innerHTML = out.length
        ? ui.table(out, { columns: opts.columns, limit: opts.limit || 100, maxColumns: opts.columns.length })
        : ui.empty("No records match", "The API returned data, but nothing matches these filters.");
      host.querySelector("#tp-count").textContent = out.length + " of " + all.length;
      wireDrawer(body, out);
    }

    var sevs = Array.from(new Set(all.map(function (r) { return String(r.severity || "").toLowerCase(); }).filter(Boolean))).sort();
    var stats = Array.from(new Set(all.map(function (r) { return String(r.status || "").toLowerCase(); }).filter(Boolean))).sort();

    host.innerHTML =
      '<div class="toolbar">' +
      '<input id="tp-q" class="inp" type="search" placeholder="Search ' + esc(opts.noun || "records") + '…" />' +
      (sevs.length ? '<select id="tp-sev" class="inp sel"><option value="">All severities</option>' + options(sevs) + "</select>" : "") +
      (stats.length ? '<select id="tp-status" class="inp sel"><option value="">All statuses</option>' + options(stats) + "</select>" : "") +
      '<span class="toolbar-count" id="tp-count"></span></div>' +
      '<div id="tp-body"></div>';

    var q = host.querySelector("#tp-q");
    q.addEventListener("input", function () { state.q = q.value; apply(); });
    var sv = host.querySelector("#tp-sev");
    if (sv) sv.addEventListener("change", function () { state.sev = sv.value; apply(); });
    var st = host.querySelector("#tp-status");
    if (st) st.addEventListener("change", function () { state.status = st.value; apply(); });
    apply();
  }

  /* ---------- Overview ---------- */
  views.overview = function () {
    return Promise.all([
      settle(api.get("/health")),
      settle(api.get("/findings/security")),
      settle(api.get("/agents")),
      settle(api.get("/incidents")),
      settle(api.get("/missions"))
    ]).then(function (r) {
      var health = r[0], findings = r[1], agents = r[2], incidents = r[3], missions = r[4];
      var fs = findings.data || [];
      var ag = agents.data || [];
      var c = sevCounts(fs);
      var openN = fs.filter(function (f) { return String(f.status || "").toLowerCase() !== "resolved"; }).length;
      var svc = (health.ok && health.data && health.data.services) || null;
      var svcRows = svc ? Object.keys(svc).map(function (k) { return { name: k, status: svc[k].status, latency: svc[k].latency_ms }; }) : [];
      var healthy = svcRows.filter(function (s) { return s.status === "healthy"; }).length;
      var operational = ag.filter(function (a) { return /operational/i.test(String(a.status || "")); }).length;
      var degraded = ag.filter(function (a) { return /degraded/i.test(String(a.status || "")); }).length;

      return '<section class="grid kpis">' +
        ui.kpi("Critical findings", val(findings, c.critical), findings.ok ? (c.critical ? "requires immediate action" : "none at critical severity") : brief(findings.err), c.critical ? "crit" : "") +
        ui.kpi("Open findings", val(findings, openN), findings.ok ? fs.length + " total in register" : brief(findings.err), openN ? "warn" : "") +
        ui.kpi("Agent fleet", val(agents, ag.length), agents.ok ? operational + " operational · " + degraded + " degraded" : brief(agents.err), "") +
        ui.kpi("Open incidents", val(incidents, (incidents.data || []).length), incidents.ok ? "live register" : brief(incidents.err), "") +
        "</section>" +
        '<section class="grid two">' +
        ui.card("Platform health",
          health.ok
            ? '<div class="lead">' + (svc ? healthy + " of " + svcRows.length + " services healthy" : "health payload has no service map") +
              ' <span class="mono muted">· v' + esc((health.data && health.data.version) || "?") + "</span></div>" +
              '<div class="svc-grid">' + svcRows.map(function (s) {
                return '<div class="svc"><span class="dot ' + (s.status === "healthy" ? "ok" : "bad") + '"></span>' +
                  "<span>" + esc(s.name) + "</span><span class=\"mono muted\">" +
                  (s.latency != null ? Math.round(s.latency) + "ms" : "") + "</span></div>";
              }).join("") + "</div>"
            : unavail(health, "platform health")) +
        ui.card("Finding distribution",
          findings.ok
            ? (fs.length ? ui.bars([
                { label: "critical", value: c.critical }, { label: "high", value: c.high },
                { label: "medium", value: c.medium }, { label: "low", value: c.low }
              ]) : ui.empty("No findings in register", "Scanners have not written any findings yet."))
            : unavail(findings, "findings")) +
        "</section>" +
        '<section class="grid">' +
        ui.card("Newest findings",
          findings.ok
            ? (fs.length ? ui.table(fs.slice(0, 6), { columns: ["severity", "title", "scanner", "target", "status", "detected_at"], maxColumns: 6 }) : ui.empty("No findings yet", "Nothing has been recorded by the detection pipeline."))
            : unavail(findings, "findings")) +
        ui.card("Recent missions",
          missions.ok
            ? (missions.data.length ? ui.table(missions.data.slice(0, 4), { columns: ["objective", "status", "risk_class", "created_at"], maxColumns: 4 }) : ui.empty("No missions", "No mission has been launched yet."))
            : unavail(missions, "missions")) +
        "</section>";
    });
  };

  /* ---------- Findings ---------- */
  var lastFindings = [];
  views.findings = function () {
    return settle(api.get("/findings/security")).then(function (r) {
      if (!r.ok) return unavail(r, "findings");
      lastFindings = r.data;
      return ui.card("Finding register",
        '<div class="lead">' + lastFindings.length + " findings from the canonical <span class=\"mono\">security_findings</span> table.</div>" +
        '<div id="findings-mount"></div>');
    });
  };
  views.findings.after = function () {
    var mount = document.getElementById("findings-mount");
    if (mount) {
      tablePage(mount, {
        rows: lastFindings, noun: "findings",
        columns: ["severity", "title", "scanner", "target", "status", "detected_at"],
        limit: 100
      });
    }
  };

  /* ---------- Incidents ---------- */
  views.incidents = function () {
    return settle(api.get("/incidents")).then(function (r) {
      return ui.card("Incident register",
        r.ok
          ? (r.data.length ? ui.table(r.data, { maxColumns: 6 }) :
             ui.empty("No incidents on record", "The incidents table is empty. Incidents are only created by correlation from alerts, so this reflects no detections promoted to an incident yet."))
          : unavail(r, "incidents"));
    });
  };

  /* ---------- Agents ---------- */
  views.agents = function () {
    return settle(api.get("/agents")).then(function (r) {
      if (!r.ok) return unavail(r, "agent registry");
      var ag = r.data;
      if (!ag.length) return ui.empty("No agents registered", "AGENT_REGISTRY returned nothing.");
      var ops = ag.filter(function (a) { return /operational/i.test(String(a.status || "")); }).length;
      var deg = ag.filter(function (a) { return /degraded/i.test(String(a.status || "")); }).length;
      var cards = ag.map(function (a) {
        var tools = a.allowed_capability_ids || a.tools || [];
        return '<div class="agent-card">' +
          '<div class="agent-top"><strong>' + esc(a.display_name || a.name || "agent") + "</strong>" + ui.badge(a.status) + "</div>" +
          '<div class="muted small">' + esc(a.team || a.department || "—") + "</div>" +
          (a.description ? '<p class="agent-desc">' + esc(a.description) + "</p>" : "") +
          '<div class="agent-meta"><span class="mono">' + (Array.isArray(tools) ? tools.length : 0) + " capabilities</span>" +
          (a.degraded_reason ? '<span class="warn small">' + esc(a.degraded_reason) + "</span>" : "") +
          "</div></div>";
      }).join("");
      return ui.card("Agent registry",
        '<div class="lead">' + ag.length + " agents · " + ops + " operational · " + deg + " degraded" +
        '<span class="mono muted"> · source AGENT_REGISTRY</span></div>' +
        '<div class="agent-grid">' + cards + "</div>");
    });
  };

  /* ---------- Missions ---------- */
  views.missions = function () {
    return settle(api.get("/missions")).then(function (r) {
      if (!r.ok) return unavail(r, "missions");
      if (!r.data.length) return ui.empty("No missions", "POST /missions starts the first one.");
      var rows = r.data.map(function (m) {
        return {
          id: m.id, objective: m.objective, status: m.status,
          risk_class: m.risk_class, mission_type: m.mission_type,
          created_at: m.created_at,
          report_chars: m.report ? String(m.report).length : 0
        };
      });
      return ui.card("Missions", '<div class="lead">' + rows.length + " mission records with persisted reports.</div>" +
        ui.table(rows, { maxColumns: 6 }));
    });
  };

  /* ---------- Cloud posture ---------- */
  views.cloud = function () {
    return Promise.all([settle(api.get("/cloud/environments")), settle(api.get("/cloud/ciem/findings"))]).then(function (r) {
      var env = r[0], ciem = r[1];
      var body = "";
      if (env.ok) body += env.data.length ? ui.table(env.data, { maxColumns: 5 })
        : ui.empty("No cloud environments connected", "Connect an account through /cloud/environments to populate posture here.");
      else body += unavail(env, "cloud environments");
      body += '<div class="divider"></div>';
      if (ciem.ok) body += ciem.data.length ? ui.table(ciem.data, { maxColumns: 5 })
        : ui.empty("No CIEM findings", "No identity entitlement findings recorded.");
      else body += ui.error("CIEM findings unavailable — " + brief(ciem.err) + ". The endpoint is failing, so this is unknown rather than clean.");
      return ui.card("Cloud posture", body);
    });
  };

  /* ---------- Approvals ---------- */
  views.approvals = function () {
    return settle(api.get("/approvals")).then(function (r) {
      return ui.card("Approvals",
        r.ok
          ? (r.data.length ? ui.table(r.data, { maxColumns: 6 })
             : ui.empty("No approvals pending", "Nothing is awaiting a decision. Approval records appear when a governed action requests one."))
          : unavail(r, "approvals"));
    });
  };

  /* ---------- Audit ---------- */
  views.audit = function () {
    return settle(api.get("/audit")).then(function (r) {
      if (!r.ok) return unavail(r, "audit trail");
      if (!r.data.length) return ui.empty("No audit records", "The audit table is empty.");
      var rows = r.data.slice(0, 50);
      var items = rows.map(function (a) {
        var detail = a.detail ? (typeof a.detail === "object" ? JSON.stringify(a.detail) : String(a.detail)) : "";
        return '<li class="tl-item"><span class="tl-dot"></span><div class="tl-body">' +
          '<div class="tl-top"><strong>' + esc(a.action || "action") + "</strong>" +
          '<span class="mono muted">' + esc(ui.relTime(a.created_at)) + "</span></div>" +
          '<div class="muted small">user ' + esc((a.user_id || "—").slice(0, 8)) + " · tenant " + esc((a.tenant_id || "—").slice(0, 8)) + "</div>" +
          (detail ? '<div class="tl-detail mono">' + esc(detail.slice(0, 220)) + "</div>" : "") +
          "</div></li>";
      }).join("");
      return ui.card("Audit trail", '<div class="lead">' + rows.length + " most recent records.</div>" +
        '<ol class="timeline">' + items + "</ol>");
    });
  };

  global.GDS = global.GDS || {};
  global.GDS.views = views;
})(window);
