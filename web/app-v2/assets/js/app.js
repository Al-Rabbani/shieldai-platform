/* GDS OS — Application bootstrap, router and shell wiring (Phase 1) */
(function (global) {
  "use strict";

  var api = global.GDS.api, ui = global.GDS.ui, views = global.GDS.views;

  var ROUTES = [
    { id: "overview", label: "Overview", icon: "◉", group: "Operations", view: "overview", sub: "Platform health and posture" },
    { id: "findings", label: "Findings", icon: "⚑", group: "Operations", view: "findings", sub: "Vulnerability register" },
    { id: "incidents", label: "Incidents", icon: "▲", group: "Operations", view: "incidents", sub: "Response queue" },
    { id: "agents", label: "Agent fleet", icon: "⬢", group: "Autonomy", view: "agents", sub: "Registered agents" },
    { id: "missions", label: "Missions", icon: "◈", group: "Autonomy", view: "missions", sub: "Agentic mission log" },
    { id: "cloud", label: "Cloud posture", icon: "☁", group: "Surface", view: "cloud", sub: "Environments and CIEM" },
    { id: "approvals", label: "Approvals", icon: "✓", group: "Governance", view: "approvals", sub: "Human-in-the-loop" },
    { id: "audit", label: "Audit trail", icon: "≡", group: "Governance", view: "audit", sub: "Immutable event log" }
  ];

  var el = function (id) { return document.getElementById(id); };
  var current = null;

  /* ---------------- theme ---------------- */
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem("gds.theme"); } catch (e) {}
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    el("theme-toggle").addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("gds.theme", next); } catch (e) {}
    });
  }

  /* ---------------- nav ---------------- */
  function buildNav() {
    var groups = {};
    ROUTES.forEach(function (r) { (groups[r.group] = groups[r.group] || []).push(r); });
    var html = "";
    Object.keys(groups).forEach(function (g) {
      html += '<div class="nav-group"><div class="nav-label">' + ui.esc(g) + "</div>";
      groups[g].forEach(function (r) {
        html += '<div class="nav-item" data-route="' + r.id + '" role="link" tabindex="0">' +
          '<span class="ic">' + r.icon + "</span><span>" + ui.esc(r.label) + "</span></div>";
      });
      html += "</div>";
    });
    el("nav").innerHTML = html;
    Array.prototype.forEach.call(el("nav").querySelectorAll("[data-route]"), function (node) {
      node.addEventListener("click", function () { go(node.getAttribute("data-route")); });
      node.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(node.getAttribute("data-route")); }
      });
    });
  }

  function markActive(id) {
    Array.prototype.forEach.call(el("nav").querySelectorAll("[data-route]"), function (n) {
      n.classList.toggle("active", n.getAttribute("data-route") === id);
    });
  }

  /* ---------------- router ---------------- */
  function currentRoute() {
    var id = (location.hash || "").replace(/^#\/?/, "") || "overview";
    for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i].id === id) return ROUTES[i];
    return ROUTES[0];
  }

  function go(id) {
    if (location.hash === "#/" + id) render(); else location.hash = "#/" + id;
    if (window.innerWidth <= 900) el("sidebar").classList.remove("open");
  }

  var pills = { risk: null, open: null };
  var ctx = {
    setPills: function (p) {
      if (p && "risk" in p) pills.risk = p.risk;
      if (p && "open" in p) pills.open = p.open;
      paintPills();
    }
  };
  function paintPills() {
    var pr = el("pill-risk"), po = el("pill-open");
    if (pills.risk) { pr.hidden = false; pr.textContent = pills.risk; } else { pr.hidden = true; }
    if (pills.open) { po.hidden = false; po.textContent = pills.open; } else { po.hidden = true; }
  }

  function render() {
    var route = currentRoute();
    current = route;
    markActive(route.id);
    el("crumb-section").textContent = route.label;
    el("crumb-sub").textContent = route.sub || "";
    document.title = "GDS OS — " + route.label;
    pills.risk = null; pills.open = null; paintPills();

    var view = el("view");
    view.innerHTML = '<div class="page-head"><div><h2>' + ui.esc(route.label) + "</h2><p>" + ui.esc(route.sub || "") + "</p></div></div>" + ui.skeleton("kpi") + ui.skeleton();

    var fn = views[route.view];
    if (!fn) { view.innerHTML = ui.empty("View not built yet", "This page arrives in Phase 2."); return; }

    fn(ctx).then(function (html) {
      if (current !== route) return;
      view.innerHTML = html;
      if (typeof fn.after === "function") { try { fn.after(); } catch (e) { console.error("after hook", e); } }
      view.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    }).catch(function (err) {
      if (current !== route) return;
      view.innerHTML = '<div class="page-head"><div><h2>' + ui.esc(route.label) + "</h2></div></div>" + ui.error(err);
      if (err && err.status === 401) signOutLocal();
    });
  }

  /* ---------------- connection indicator ---------------- */
  function setConn(ok, text) {
    var node = el("conn-state");
    node.innerHTML = '<span class="dot ' + (ok ? "ok" : "bad") + '"></span><span>' + ui.esc(text) + "</span>";
  }

  function ping() {
    api.get("/health", { timeout: 8000 }).then(function (h) {
      setConn(true, (h && h.status ? h.status : "connected") + " · " + (h && h.version ? "v" + h.version : "API"));
      el("foot").textContent = "GDS OS · " + ROUTES.length + " views · API " + api.base +
        " · " + new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
    }).catch(function () { setConn(false, "API unreachable"); });
  }

  /* ---------------- auth ---------------- */
  function showGate(message) {
    el("auth-gate").hidden = false;
    el("auth-gate").style.display = "grid";
    el("app").hidden = true;
    el("app").style.display = "none";
    el("auth-api").textContent = api.base;
    if (message) {
      var box = el("login-error");
      box.hidden = false; box.textContent = message;
    }
  }

  function signOutLocal() {
    api.clear();
    showGate();
  }

  function paintUser(user) {
    if (!user) return;
    var chip = el("user-chip");
    chip.hidden = false;
    var email = user.email || user.username || "";
    el("user-name").textContent = user.full_name || email.split("@")[0] || "Signed in";
    el("user-role").textContent = (user.role && (user.role.name || user.role)) || user.tenant_id || "member";
    el("user-initial").textContent = (email[0] || "U").toUpperCase();
  }

  function enterApp() {
    el("auth-gate").hidden = true;
    el("auth-gate").style.display = "none";
    el("app").hidden = false;
    el("app").style.display = "grid";
    if (!el("nav").children.length) buildNav();
    if (!location.hash) location.hash = "#/overview";
    render();
    ping();
  }

  function bindAuth() {
    el("login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = el("login-btn"), errBox = el("login-error");
      errBox.hidden = true;
      btn.disabled = true; btn.textContent = "Signing in…";
      api.login(el("email").value.trim(), el("password").value).then(function (user) {
        btn.disabled = false; btn.textContent = "Sign in";
        paintUser(user || api.user() || {});
        enterApp();
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = "Sign in";
        errBox.hidden = false;
        errBox.textContent = err.message || "Sign-in failed.";
      });
    });

    el("logout").addEventListener("click", function () {
      api.logout().then(signOutLocal);
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    initTheme();
    bindAuth();
    el("refresh").addEventListener("click", function () { render(); ping(); });
    el("open-nav").addEventListener("click", function () { el("sidebar").classList.add("open"); });
    el("close-nav").addEventListener("click", function () { el("sidebar").classList.remove("open"); });
    window.addEventListener("hashchange", render);

    /* Cookie sessions: always probe the real identity endpoint.
       Signed in only if it answers 200. */
    api.session().then(function (user) {
      paintUser(user);
      enterApp();
    }).catch(function () {
      showGate();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
