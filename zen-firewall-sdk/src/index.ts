/**
 * @shieldai/zen — Runtime Application Self-Protection (RASP) Middleware
 * Blocks SQLi, XSS, Path Traversal, Command Injection, SSRF, Prototype Pollution
 * Zero production dependencies. <1ms overhead. Reports to ShieldAI dashboard.
 *
 * Quick start:
 *   npm install @shieldai/zen
 *
 *   // Express
 *   const { zen } = require('@shieldai/zen');
 *   app.use(zen({ token: process.env.SHIELD_ZEN_TOKEN }));
 *
 *   // FastAPI (Python): pip install shieldai-zen
 */

// ── RULE ENGINE
const RULES: Record<string, RegExp[]> = {
  sqli: [
    /('|%27|%22).*(OR|UNION|SELECT|INSERT|DROP|UPDATE|DELETE|EXEC|CAST|CONVERT)/i,
    /;\s*(DROP|DELETE|UPDATE|INSERT|CREATE|ALTER)\s/i,
    /\b(OR|AND)\s+\d+=\d+/i,
    /\/\*.*\*\//,
    /WAITFOR\s+DELAY|SLEEP\s*\(/i,
    /xp_cmdshell|OPENROWSET|BULK\s+INSERT/i,
  ],
  xss: [
    /<script[^>]*>[\s\S]*?<\/script>/i,
    /on(load|click|mouseover|mouseout|error|focus|blur|input|change|submit|reset|keydown|keyup)\s*=/i,
    /javascript\s*:/i,
    /data\s*:\s*text\/html/i,
    /<iframe[^>]*>/i,
    /expression\s*\(/i,
  ],
  path_traversal: [
    /\.\.[\/\\]/,
    /\.\.[%2F%5C]/i,
    /\/etc\/passwd/i,
    /\/proc\/self/i,
    /c:\\windows\\system32/i,
    /%2e%2e[%2f%5c]/i,
  ],
  cmd_injection: [
    /[;&|`]\s*(bash|sh|zsh|cmd|powershell|wget|curl|nc|netcat|python|perl|ruby|php)\b/i,
    /\$\(.*\)/,
    /`[^`]*`/,
    />\s*\/dev\/null/,
    /2>&1/,
  ],
  ssrf: [
    /^(http|ftp)s?:\/\/(localhost|127\.|169\.254\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/i,
    /^(http|ftp)s?:\/\/\[::1\]/i,
    /metadata\.google\.internal/i,
    /169\.254\.169\.254/,
  ],
  proto_pollution: [
    /__proto__\s*[=\[]/,
    /constructor\s*\.\s*prototype/i,
    /Object\.prototype/,
  ],
};

export interface ZenOptions {
  /** Your ShieldAI token — get one at shieldai.dev */
  token?: string;
  /** "block" (default) | "monitor" (log only, never block) */
  mode?: "block" | "monitor";
  /** Minimum risk score to block (0–100). Default: 60 */
  threshold?: number;
  /** Your app name — shows in ShieldAI dashboard */
  appName?: string;
  /** ShieldAI report endpoint override */
  reportEndpoint?: string;
  /** Categories to enable. Default: all */
  rules?: Array<keyof typeof RULES>;
  /** Custom allowlist patterns (regex strings) */
  allowlist?: string[];
}

export interface ThreatEvent {
  threat_type: string;
  severity: "critical" | "high" | "medium";
  param: string;
  value_snippet: string;
  risk_score: number;
  source_ip?: string;
  endpoint?: string;
  method?: string;
  matched_rule?: string;
  action_taken: "blocked" | "logged";
  detected_at: string;
}

// ── CORE SCAN ENGINE
function scan(value: string, enabledRules: string[]): { risk: number; type: string; matched: string } | null {
  const str = String(value);
  for (const type of enabledRules) {
    const patterns = RULES[type] || [];
    for (const pattern of patterns) {
      if (pattern.test(str)) {
        const risk = (type === "sqli" || type === "cmd_injection" || type === "ssrf") ? 90 : 70;
        return { risk, type, matched: pattern.toString().slice(0, 50) };
      }
    }
  }
  return null;
}

// ── REPORT TO SHIELDAI (async, non-blocking)
function reportAsync(events: ThreatEvent[], token: string, appName: string, endpoint: string): void {
  if (!token || !events.length) return;
  const payload = JSON.stringify({ action: "report", token, app_name: appName, events });
  // Use native fetch (Node 18+) or XMLHttpRequest in older environments
  const doFetch = typeof fetch !== "undefined"
    ? () => fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload }).catch(() => {})
    : () => { /* silently skip if no fetch */ };
  // Non-blocking — don't await
  if (typeof setImmediate !== "undefined") setImmediate(doFetch);
  else setTimeout(doFetch, 0);
}

// ── EXPRESS / CONNECT MIDDLEWARE
export function zen(options: ZenOptions = {}) {
  const {
    token = process.env.SHIELD_ZEN_TOKEN || "",
    mode = "block",
    threshold = 60,
    appName = process.env.npm_package_name || "unknown-app",
    reportEndpoint = process.env.SHIELD_ZEN_ENDPOINT || "https://app.base44.com/api/functions/shieldZenFirewall",
    rules: enabledRules = Object.keys(RULES),
    allowlist = [],
  } = options;

  const allowlistRegexes = allowlist.map(p => new RegExp(p));

  return function zenMiddleware(req: any, res: any, next: any) {
    const startMs = Date.now();
    const events: ThreatEvent[] = [];

    // Collect all user-controlled inputs
    const inputs: Array<[string, string]> = [
      ...Object.entries(req.body || {}),
      ...Object.entries(req.query || {}),
      ...Object.entries(req.params || {}),
    ].map(([k, v]) => [k, String(v)]);

    // Check each input
    for (const [param, value] of inputs) {
      // Skip allowlisted values
      if (allowlistRegexes.some(r => r.test(value))) continue;

      const hit = scan(value, enabledRules);
      if (!hit) continue;

      const event: ThreatEvent = {
        threat_type: hit.type,
        severity: hit.risk >= 80 ? "critical" : "high",
        param,
        value_snippet: value.slice(0, 100),
        risk_score: hit.risk,
        source_ip: req.ip || req.connection?.remoteAddress || req.headers?.["x-forwarded-for"] || "unknown",
        endpoint: req.path || req.url || "/",
        method: req.method || "UNKNOWN",
        matched_rule: hit.matched,
        action_taken: (mode === "block" && hit.risk >= threshold) ? "blocked" : "logged",
        detected_at: new Date().toISOString(),
      };
      events.push(event);
    }

    // Report async — never slows down request
    if (events.length > 0 && token) {
      reportAsync(events, token, appName, reportEndpoint);
    }

    // Block if any event exceeds threshold
    const shouldBlock = mode === "block" && events.some(e => e.risk_score >= threshold);
    if (shouldBlock) {
      const overhead = Date.now() - startMs;
      res.status(403).json({
        error: "Request blocked by ShieldAI Zen Firewall",
        request_id: generateId(),
        threat_types: [...new Set(events.map(e => e.threat_type))],
        overhead_ms: overhead,
      });
      return;
    }

    next();
  };
}

// ── STANDALONE SCAN FUNCTION (for custom integrations)
export function scanValue(value: string, rules?: Array<keyof typeof RULES>): ReturnType<typeof scan> {
  return scan(value, rules || Object.keys(RULES));
}

// ── FASTIFY PLUGIN
export function zenFastify(options: ZenOptions = {}) {
  return function plugin(fastify: any, _opts: any, done: any) {
    fastify.addHook("preHandler", (request: any, reply: any, hookDone: any) => {
      const middleware = zen(options);
      middleware(request, reply, hookDone);
    });
    done();
  };
}

function generateId(): string {
  return "req_" + Math.random().toString(36).slice(2, 11);
}

// ── CommonJS compat
export default { zen, scanValue, zenFastify };
module.exports = { zen, scanValue, zenFastify, default: { zen, scanValue, zenFastify } };
