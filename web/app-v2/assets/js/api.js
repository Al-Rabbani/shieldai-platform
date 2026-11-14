/* GDS OS — API client (Phase 1)
   Same-origin /api proxy. Token in sessionStorage. No demo data, ever. */
(function (global) {
  "use strict";

  var BASE = (global.GDS_API_BASE || "/api").replace(/\/$/, "");
  var TOKEN_KEY = "gds.token";
  var USER_KEY = "gds.user";

  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }
  function setToken(t) {
    try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }
  function getUser() {
    try { return JSON.parse(sessionStorage.getItem(USER_KEY) || "null"); } catch (e) { return null; }
  }
  function setUser(u) {
    try { u ? sessionStorage.setItem(USER_KEY, JSON.stringify(u)) : sessionStorage.removeItem(USER_KEY); } catch (e) {}
  }
  function clear() { setToken(""); setUser(null); }

  function ApiError(message, status, code) {
    this.name = "ApiError";
    this.message = message;
    this.status = status || 0;
    this.code = code || "error";
  }
  ApiError.prototype = Object.create(Error.prototype);

  function extractMessage(payload, status) {
    if (payload && typeof payload === "object") {
      var d = payload.detail;
      if (typeof d === "string") return d;
      if (Array.isArray(d) && d.length && d[0] && d[0].msg) return d[0].msg;
      if (payload.message) return payload.message;
      if (payload.error) return typeof payload.error === "string" ? payload.error : "Request failed";
    }
    if (status === 401) return "Session expired. Please sign in again.";
    if (status === 403) return "You do not have permission for this resource.";
    if (status === 404) return "Resource not found.";
    if (status >= 500) return "Server error (" + status + ").";
    return "Request failed (" + status + ").";
  }

  function request(path, options) {
    options = options || {};
    var headers = { "Accept": "application/json" };
    if (options.body && !options.raw) headers["Content-Type"] = "application/json";
    var token = getToken();
    if (token && !options.noAuth) headers["Authorization"] = "Bearer " + token;

    var controller = ("AbortController" in global) ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, options.timeout || 20000) : null;

    return fetch(BASE + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body ? (options.raw ? options.body : JSON.stringify(options.body)) : undefined,
      signal: controller ? controller.signal : undefined,
      credentials: "same-origin"
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.text().then(function (text) {
        var payload = null;
        if (text) { try { payload = JSON.parse(text); } catch (e) { payload = text; } }
        if (!res.ok) {
          if (res.status === 401 && !options.noAuth) { clear(); }
          throw new ApiError(extractMessage(payload, res.status), res.status, "http");
        }
        return payload;
      });
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      if (err instanceof ApiError) throw err;
      if (err && err.name === "AbortError") throw new ApiError("Request timed out.", 0, "timeout");
      throw new ApiError("Cannot reach the API. Check your connection.", 0, "network");
    });
  }

  var api = {
    base: BASE,
    get: function (p, o) { return request(p, o); },
    post: function (p, body, o) { o = o || {}; o.method = "POST"; o.body = body; return request(p, o); },
    token: getToken,
    user: getUser,
    setToken: setToken,
    setUser: setUser,
    clear: clear,
    ApiError: ApiError,

    login: function (email, password) {
      return request("/auth/login", { method: "POST", body: { email: email, password: password }, noAuth: true })
        .then(function (data) {
          /* The API authenticates with an httpOnly session cookie, not a bearer token.
             Confirm the session actually works before treating the user as signed in. */
          var user = (data && data.user_id) ? data : (data && data.user) || null;
          if (user) setUser(user);
          return api.me().then(function (me) { return me || user; });
        });
    },
    logout: function () {
      return request("/auth/logout", { method: "POST", body: {} }).catch(function () {}).then(clear);
    },
    session: function () { return request("/auth/me", { timeout: 8000 }); },
    me: function () { return request("/auth/me").then(function (u) { setUser(u); return u; }); }
  };

  global.GDS = global.GDS || {};
  global.GDS.api = api;
})(window);
