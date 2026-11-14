/* GDS OS — UI primitives (Phase 1). No frameworks, no fake data. */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function h(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function badge(value) {
    var v = String(value == null ? "unknown" : value).toLowerCase();
    var cls = ["critical", "high", "medium", "low", "info", "ok", "healthy", "completed",
      "resolved", "open", "running", "online", "neutral"].indexOf(v) >= 0 ? v : "neutral";
    return '<span class="badge ' + cls + '">' + esc(value) + "</span>";
  }

  function sevOf(row) {
    var keys = ["severity", "normalized_severity", "risk_class", "risk_level", "risk", "level"];
    for (var i = 0; i < keys.length; i++) {
      var v = row && row[keys[i]];
      if (v) return String(v).toLowerCase();
    }
    return null;
  }

  function relTime(value) {
    if (!value) return "—";
    var d = new Date(value);
    if (isNaN(d.getTime())) return esc(String(value).slice(0, 19));
    var s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    if (s < 2592000) return Math.floor(s / 86400) + "d ago";
    return d.toISOString().slice(0, 10);
  }

  var PREFERRED = ["id", "title", "name", "severity", "status", "scanner", "target", "type",
    "category", "agent_id", "display_name", "detected_at", "created_at", "updated_at", "owner_team"];

  function pickColumns(rows, max) {
    max = max || 6;
    if (!rows || !rows.length) return [];
    var seen = {}, cols = [];
    PREFERRED.forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(rows[0], k) && cols.length < max) { cols.push(k); seen[k] = 1; }
    });
    Object.keys(rows[0]).forEach(function (k) {
      if (cols.length >= max || seen[k]) return;
      if (k === "tenant_id" || k === "description" || k === "remediation") return;
      cols.push(k);
    });
    return cols;
  }

  function cellValue(v) {
    if (v == null) return '<span class="muted">—</span>';
    if (typeof v === "object") {
      var s = JSON.stringify(v);
      return '<span class="mono" title="' + esc(s) + '">' + esc(s.length > 60 ? s.slice(0, 60) + "…" : s) + "</span>";
    }
    return esc(v);
  }

  /* Adaptive table: derives its own columns from real payload shape. */
  function table(rows, opts) {
    opts = opts || {};
    if (!rows || !rows.length) return emptyState(opts.emptyTitle || "Nothing to show", opts.emptyHint || "No records returned by the API.");
    var cols = opts.columns || pickColumns(rows, opts.maxColumns || 6);
    var head = cols.map(function (c) { return "<th>" + esc(c.replace(/_/g, " ")) + "</th>"; }).join("");
    var body = rows.slice(0, opts.limit || 50).map(function (r) {
      var tds = cols.map(function (c) {
        var v = r[c];
        if (/^(severity|normalized_severity|risk_level|status|state)$/i.test(c)) return "<td>" + badge(v) + "</td>";
        var isTime = /(detected_at|created_at|updated_at|first_seen|last_seen|published_at)$/i.test(c);
        if (isTime) return '<td class="mono" title="' + esc(v || "") + '">' + relTime(v) + "</td>";
        if (c === "id" || /_id$/.test(c)) return '<td class="mono">' + cellValue(v) + "</td>";
        return '<td class="truncate" title="' + esc(typeof v === "object" ? JSON.stringify(v) : v || "") + '">' + cellValue(v) + "</td>";
      }).join("");
      return "<tr>" + tds + "</tr>";
    }).join("");
    return '<div class="table-wrap"><table class="data"><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table></div>";
  }

  function card(title, inner, extraHead) {
    return '<section class="card">' +
      (title ? '<div class="card-head"><h3>' + esc(title) + "</h3>" + (extraHead ? '<div class="spacer"></div>' + extraHead : "") + "</div>" : "") +
      inner + "</section>";
  }

  function kpi(label, value, sub, tone) {
    return '<div class="card"><div class="kpi-label">' + esc(label) + "</div>" +
      '<div class="kpi-value ' + (tone || "") + '">' + esc(value) + "</div>" +
      (sub ? '<div class="kpi-sub">' + esc(sub) + "</div>" : "") + "</div>";
  }

  function skeleton(kind) {
    if (kind === "kpi") {
      return '<div class="grid kpi">' + Array(4).join().split(",").map(function () {
        return '<div class="card"><div class="skeleton sk-line" style="width:52%"></div><div class="skeleton sk-kpi" style="height:38px;margin-top:12px"></div></div>';
      }).join("") + "</div>";
    }
    var lines = Array.apply(null, Array(7)).map(function (_, i) {
      return '<div class="skeleton sk-line" style="width:' + (96 - i * 7) + '%"></div>';
    }).join("");
    return '<div class="card">' + lines + "</div>";
  }

  function emptyState(title, hint) {
    return '<div class="empty"><div class="state-icon">◇</div><h4>' + esc(title) + "</h4><p>" + esc(hint || "") + "</p></div>";
  }

  function errorState(err) {
    var msg = (err && err.message) || "Unknown error";
    var hint = err && err.status ? "HTTP " + err.status : (err && err.code === "network" ? "Network unreachable" : "");
    return '<div class="error-panel"><div class="state-icon">!</div><h4>Could not load data</h4><p>' + esc(msg) + "</p>" +
      (hint ? '<p class="mono">' + esc(hint) + "</p>" : "") + "</div>";
  }

  function pageHead(title, sub, actionsHtml) {
    return '<div class="page-head"><div><h2>' + esc(title) + "</h2>" +
      (sub ? "<p>" + esc(sub) + "</p>" : "") + "</div>" +
      (actionsHtml ? '<div class="spacer"></div>' + actionsHtml : "") + "</div>";
  }

  function bars(items) {
    if (!items.length) return emptyState("No distribution", "Nothing to chart.");
    var max = Math.max.apply(null, items.map(function (i) { return i.value; })) || 1;
    var colors = { critical: "var(--crit)", high: "var(--high)", medium: "var(--warn)", low: "var(--accent)", info: "var(--info)" };
    return '<div class="bars">' + items.map(function (i) {
      var pct = Math.round((i.value / max) * 100);
      return '<div class="bar-row"><span class="muted">' + esc(i.label) + "</span>" +
        '<span class="bar"><i style="width:' + pct + "%;background:" + (colors[String(i.label).toLowerCase()] || "var(--accent)") + '"></i></span>' +
        '<span class="n">' + i.value + "</span></div>";
    }).join("") + "</div>";
  }

  function countBy(rows, keyFn) {
    var out = {};
    (rows || []).forEach(function (r) {
      var k = keyFn(r);
      if (k == null || k === "") return;
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  }

  global.GDS = global.GDS || {};
  global.GDS.ui = {
    esc: esc, h: h, badge: badge, sevOf: sevOf, relTime: relTime, table: table,
    card: card, kpi: kpi, skeleton: skeleton, empty: emptyState, error: errorState,
    pageHead: pageHead, bars: bars, countBy: countBy, pickColumns: pickColumns
  };
})(window);
