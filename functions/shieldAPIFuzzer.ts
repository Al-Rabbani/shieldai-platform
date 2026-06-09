// ShieldAI — PRODUCTION API Discovery & Fuzzer v1
// REAL: OpenAPI/Swagger spec discovery + parameter-level fuzzing
// Discovers all endpoints from spec or crawling, then fuzzes each with security payloads
// Aikido parity: "API Discovery & Fuzzing" feature in Attack pillar

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });

  const body = await req.json().catch(() => ({}));
  const {
    target_url,
    action = "discover",      // discover | fuzz | full (discover then fuzz)
    spec_url,                 // optional: direct URL to OpenAPI spec
    auth_type = "none",
    auth_config = {},
    fuzz_depth = "standard",  // quick | standard | deep
    nickname,
  } = body;

  if (!target_url) return Response.json({ error: "target_url required" }, { status: 400 });

  const base = target_url.replace(/\/$/, "");
  const findings: any[] = [];
  const discoveredEndpoints: any[] = [];

  const authHeaders: Record<string, string> = { "User-Agent": "ShieldAI-APIFuzzer/1.0 (Security Research)" };
  if (auth_type === "bearer" && auth_config.token) authHeaders["Authorization"] = `Bearer ${auth_config.token}`;
  if (auth_type === "basic" && auth_config.username) authHeaders["Authorization"] = `Basic ${btoa(`${auth_config.username}:${auth_config.password || ""}`)}`;
  if (auth_type === "apikey" && auth_config.key) authHeaders[auth_config.header || "X-API-Key"] = auth_config.key;

  const go = async (url: string, opts: RequestInit = {}): Promise<Response | null> => {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 8000);
      const r = await fetch(url, { ...opts, signal: c.signal, headers: { ...authHeaders, ...(opts.headers as Record<string, string> || {}) } });
      clearTimeout(t);
      return r;
    } catch (_) { return null; }
  };

  const addFinding = (type: string, title: string, sev: string, endpoint: string, method: string,
    param: string, payload: string, evidence: string, desc: string, remediation: string, cvss: number, cwe: string) => {
    findings.push({
      type, title, severity: sev, endpoint, method, parameter: param,
      payload: payload.slice(0, 200), evidence: evidence.slice(0, 500),
      description: desc, remediation, cvss_score: cvss, cwe,
      owasp: cweToOwasp(cwe), status: "open", detected_at: new Date().toISOString(),
    });
  };

  const cweToOwasp = (cwe: string) => ({
    "CWE-89": "A03:2021 Injection", "CWE-79": "A03:2021 XSS",
    "CWE-284": "A01:2021 Broken Access Control", "CWE-200": "A02:2021 Info Disclosure",
    "CWE-16": "A05:2021 Misconfiguration", "CWE-918": "A10:2021 SSRF",
    "CWE-307": "A07:2021 Auth Failure",
  }[cwe] || "OWASP Top 10");

  // ── PHASE 1: API SPEC DISCOVERY
  const specCandidates = [
    spec_url,
    `${base}/openapi.json`, `${base}/openapi.yaml`, `${base}/api/openapi.json`,
    `${base}/swagger.json`, `${base}/swagger.yaml`, `${base}/api/swagger.json`,
    `${base}/api-docs`, `${base}/api-docs.json`, `${base}/v1/openapi.json`,
    `${base}/v2/api-docs`, `${base}/v3/api-docs`, `${base}/api/v1/openapi.json`,
    `${base}/.well-known/openapi.json`,
  ].filter(Boolean) as string[];

  let openApiSpec: any = null;
  let specSourceUrl = "";

  for (const candidate of specCandidates) {
    const r = await go(candidate);
    if (!r || r.status !== 200) continue;
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("json") && !ct.includes("yaml") && !ct.includes("text")) continue;
    try {
      const text = await r.text();
      const parsed = JSON.parse(text);
      if (parsed.openapi || parsed.swagger || parsed.paths) {
        openApiSpec = parsed;
        specSourceUrl = candidate;
        break;
      }
    } catch (_) {}
  }

  // ── PHASE 2: ENDPOINT EXTRACTION FROM SPEC
  if (openApiSpec) {
    const paths = openApiSpec.paths || {};
    const basePath = openApiSpec.basePath || openApiSpec.servers?.[0]?.url?.replace(/^https?:\/\/[^/]+/, "") || "";

    for (const [path, pathItem] of Object.entries(paths as Record<string, any>)) {
      const methods = ["get", "post", "put", "patch", "delete", "head", "options"];
      for (const method of methods) {
        const operation = pathItem[method];
        if (!operation) continue;

        const params: any[] = [
          ...(operation.parameters || []),
          ...(pathItem.parameters || []),
        ];

        const bodySchema = operation.requestBody?.content?.["application/json"]?.schema;
        const bodyProps = bodySchema?.properties || {};

        discoveredEndpoints.push({
          path: basePath + path,
          full_url: base + basePath + path,
          method: method.toUpperCase(),
          summary: operation.summary || operation.description || "",
          parameters: params.map((p: any) => ({
            name: p.name,
            in: p.in,
            required: p.required || false,
            type: p.schema?.type || p.type || "string",
          })),
          body_params: Object.keys(bodyProps),
          auth_required: !!operation.security || !!openApiSpec.security,
          tags: operation.tags || [],
        });
      }
    }

    // Also flag if spec is publicly accessible
    if (!auth_type || auth_type === "none") {
      addFinding("info_disclosure", "API Specification Publicly Accessible", "low",
        specSourceUrl, "GET", "", "", `HTTP 200 at ${specSourceUrl}`,
        `Full API specification discovered at ${specSourceUrl}. This gives attackers a complete map of all endpoints, parameters, and data models.`,
        "Restrict API spec access to authenticated users or internal networks only.",
        3.7, "CWE-200");
    }
  }

  // ── PHASE 3: CRAWL-BASED DISCOVERY (if no spec found)
  if (!openApiSpec) {
    const commonPaths = [
      "/api", "/api/v1", "/api/v2", "/api/v3",
      "/api/users", "/api/user", "/api/auth", "/api/login",
      "/api/products", "/api/items", "/api/orders", "/api/search",
      "/api/admin", "/api/health", "/api/status", "/api/config",
      "/api/upload", "/api/files", "/api/export", "/api/import",
      "/graphql", "/graphiql", "/api/graphql",
      "/rest/api/2", "/rest/v1",
    ];

    for (const p of commonPaths) {
      const r = await go(`${base}${p}`);
      if (!r || r.status === 404 || r.status === 503) continue;
      discoveredEndpoints.push({
        path: p,
        full_url: `${base}${p}`,
        method: "GET",
        status: r.status,
        content_type: r.headers.get("content-type") || "",
        discovered_by: "crawl",
      });
    }

    // Check for GraphQL introspection
    const gqlRes = await go(`${base}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ __schema { types { name } } }" }),
    });
    if (gqlRes?.ok) {
      const gqlData = await gqlRes.json().catch(() => null);
      if (gqlData?.data?.__schema) {
        const types = gqlData.data.__schema.types || [];
        addFinding("graphql_introspection", "GraphQL Introspection Enabled", "medium",
          `${base}/graphql`, "POST", "query", "{ __schema { types { name } } }",
          `Introspection returned ${types.length} types`,
          "GraphQL introspection is enabled in production. Attackers can map your entire API schema.",
          "Disable introspection in production. Add query depth limiting and rate limiting.",
          5.3, "CWE-200");
        discoveredEndpoints.push({ path: "/graphql", full_url: `${base}/graphql`, method: "POST", type: "graphql", types_count: types.length });
      }
    }
  }

  if (action === "discover") {
    return Response.json({
      success: true, target_url: base, nickname: nickname || base,
      spec_found: !!openApiSpec, spec_url: specSourceUrl || null,
      endpoints_discovered: discoveredEndpoints.length,
      endpoints: discoveredEndpoints, findings,
      scanned_at: new Date().toISOString(),
    });
  }

  // ── PHASE 4: PARAMETER-LEVEL FUZZING
  const endpointsToFuzz = discoveredEndpoints.slice(0, fuzz_depth === "deep" ? 50 : fuzz_depth === "standard" ? 25 : 10);

  // Fuzz payloads per vulnerability class
  const FUZZ_PAYLOADS = {
    sqli: [
      { p: "1'", triggers: ["sql", "syntax error", "mysql", "postgresql", "ora-", "sqlite", "unterminated"] },
      { p: "' OR '1'='1'--", triggers: ["sql", "syntax", "error", "unexpected token"] },
      { p: "1; DROP TABLE users--", triggers: ["sql", "syntax", "drop"] },
    ],
    xss: [
      { p: `<script>alert('sa_${Date.now()}');</script>`, marker: `sa_${Date.now()}` },
      { p: `"><img src=x onerror=alert(1)>`, marker: "onerror=alert" },
    ],
    idor: [
      { p: "0", expected_change: true },
      { p: "99999999", expected_change: true },
      { p: "../admin", expected_change: true },
      { p: "-1", expected_change: true },
    ],
    auth_bypass: [
      { p: "admin", header_name: "X-Forwarded-For", header_val: "127.0.0.1" },
      { p: "", header_name: "X-Original-URL", header_val: "/admin" },
    ],
  };

  for (const endpoint of endpointsToFuzz) {
    const url = endpoint.full_url || `${base}${endpoint.path}`;
    const method = endpoint.method || "GET";
    const params = endpoint.parameters || [];

    // SQL Injection fuzzing — test each parameter
    for (const param of params.filter((p: any) => p.in === "query" || p.in === "path")) {
      for (const { p, triggers } of FUZZ_PAYLOADS.sqli) {
        const testUrl = param.in === "query"
          ? `${url}?${param.name}=${encodeURIComponent(p)}`
          : url.replace(`{${param.name}}`, encodeURIComponent(p));

        const r = await go(testUrl);
        if (!r) continue;
        const respBody = (await r.text().catch(() => "")).toLowerCase();
        const hit = triggers.find(t => respBody.includes(t));
        if (hit) {
          addFinding("sql_injection", `SQL Injection: ${method} ${endpoint.path}?${param.name}`,
            "critical", url, method, param.name, p,
            `SQL error keyword "${hit}" in response. Payload: ${p}`,
            `Parameter '${param.name}' is vulnerable to SQL injection. Unsanitized input is concatenated into SQL query.`,
            "Use parameterized queries/prepared statements. Never concatenate user input into SQL.",
            9.8, "CWE-89");
          break;
        }
      }
    }

    // XSS fuzzing — GET parameters
    if (method === "GET") {
      for (const param of params.filter((p: any) => p.in === "query")) {
        const { p: xssPayload, marker } = FUZZ_PAYLOADS.xss[0];
        const testUrl = `${url}?${param.name}=${encodeURIComponent(xssPayload)}`;
        const r = await go(testUrl);
        if (!r) continue;
        const b = await r.text().catch(() => "");
        if (b.includes(marker) && b.includes("<script>")) {
          addFinding("xss", `Reflected XSS: ${method} ${endpoint.path}?${param.name}`,
            "high", url, method, param.name, xssPayload,
            "XSS payload reflected unescaped in response",
            `Parameter '${param.name}' reflects user input without HTML encoding. XSS attack possible.`,
            "HTML-encode all reflected parameters. Implement Content Security Policy.",
            7.2, "CWE-79");
        }
      }
    }

    // IDOR — test numeric ID parameters
    const idParams = params.filter((p: any) =>
      (p.name === "id" || p.name.endsWith("_id") || p.name === "userId") && (p.in === "path" || p.in === "query")
    );
    for (const param of idParams) {
      // Request ID=1 vs ID=2 — if both 200 and different content → potential IDOR
      const url1 = param.in === "path" ? url.replace(`{${param.name}}`, "1") : `${url}?${param.name}=1`;
      const url2 = param.in === "path" ? url.replace(`{${param.name}}`, "2") : `${url}?${param.name}=2`;
      const [r1, r2] = await Promise.all([go(url1), go(url2)]);
      if (r1?.ok && r2?.ok) {
        const [b1, b2] = await Promise.all([r1.text().catch(() => ""), r2.text().catch(() => "")]);
        if (b1.length > 100 && b2.length > 100 && b1 !== b2 && !b1.includes("unauthorized") && !b2.includes("unauthorized")) {
          addFinding("idor", `Potential IDOR: ${method} ${endpoint.path} — ${param.name} parameter`,
            "high", url, method, param.name, "1 vs 2",
            `Both ID=1 and ID=2 returned HTTP 200 with different bodies (${b1.length} vs ${b2.length} chars). No ownership check detected.`,
            `Accessing different resource IDs returns data without authorization check. Object-level access control may be missing.`,
            "Implement object-level authorization. Verify requesting user owns the requested resource ID.",
            8.1, "CWE-284");
        }
      }
    }

    // Mass assignment — POST/PUT body parameter injection
    if ((method === "POST" || method === "PUT" || method === "PATCH") && endpoint.body_params?.length > 0) {
      const maliciousBody: Record<string, any> = {};
      for (const p of endpoint.body_params.slice(0, 5)) maliciousBody[p] = "test";
      // Add fields that shouldn't be user-settable
      maliciousBody["role"] = "admin";
      maliciousBody["is_admin"] = true;
      maliciousBody["admin"] = true;
      maliciousBody["verified"] = true;
      maliciousBody["balance"] = 99999;

      const r = await go(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(maliciousBody),
      });
      if (r?.ok) {
        const respBody = await r.json().catch(() => null);
        if (respBody && (respBody.role === "admin" || respBody.is_admin === true || respBody.admin === true)) {
          addFinding("mass_assignment", `Mass Assignment: ${method} ${endpoint.path}`,
            "high", url, method, "role/is_admin", JSON.stringify({ role: "admin", is_admin: true }),
            `Response contains: ${JSON.stringify(respBody).slice(0, 200)}`,
            "Privileged fields (role, admin, verified) were accepted in request body and reflected in response.",
            "Implement allowlist of accepted body parameters. Never bind request body directly to model.",
            7.5, "CWE-915");
        }
      }
    }

    // Authentication check — unauthenticated access to authenticated endpoints
    if (endpoint.auth_required) {
      const unauthRes = await go(url, { method, headers: { "Content-Type": "application/json" } }); // no auth headers
      if (unauthRes && (unauthRes.status === 200 || unauthRes.status === 201)) {
        addFinding("broken_auth", `Unauthenticated Access: ${method} ${endpoint.path}`,
          "critical", url, method, "", "",
          `Endpoint marked as requiring auth returned HTTP ${unauthRes.status} without credentials`,
          "Endpoint accessible without authentication despite being marked as requiring it in the API spec.",
          "Implement authentication middleware on all protected routes.",
          9.1, "CWE-284");
      }
    }
  }

  // Rate limiting check on API auth endpoint
  const authEps = discoveredEndpoints.filter(e => e.path.includes("auth") || e.path.includes("login") || e.path.includes("token"));
  for (const ep of authEps.slice(0, 1)) {
    const rs = await Promise.allSettled(
      Array(6).fill(null).map(() => go(ep.full_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@test.com", password: `wrong_${Math.random()}` }),
      }))
    );
    const ok = rs.filter(r => r.status === "fulfilled" && r.value && r.value.status !== 429).length;
    if (ok >= 6) {
      addFinding("rate_limit", `No Rate Limiting: POST ${ep.path}`,
        "medium", ep.full_url, "POST", "email/password", "6 rapid requests",
        "6/6 requests accepted without throttling",
        "No rate limiting on authentication API endpoint. Enables credential brute force attacks.",
        "Implement rate limiting: max 5-10 attempts/IP/minute with exponential backoff.",
        5.9, "CWE-307");
    }
  }

  return Response.json({
    success: true,
    target_url: base,
    nickname: nickname || base,
    spec_found: !!openApiSpec,
    spec_url: specSourceUrl || null,
    endpoints_discovered: discoveredEndpoints.length,
    endpoints_fuzzed: endpointsToFuzz.length,
    total_findings: findings.length,
    critical: findings.filter(f => f.severity === "critical").length,
    high: findings.filter(f => f.severity === "high").length,
    medium: findings.filter(f => f.severity === "medium").length,
    low: findings.filter(f => f.severity === "low").length,
    risk_score: Math.min(100,
      findings.filter(f => f.severity === "critical").length * 20 +
      findings.filter(f => f.severity === "high").length * 10 +
      findings.filter(f => f.severity === "medium").length * 3),
    endpoints: discoveredEndpoints,
    findings,
    data_sources: ["OpenAPI/Swagger Discovery", "Active HTTP Fuzzing", "IDOR Detection", "Mass Assignment Testing", "Auth Bypass Testing"],
    scanned_at: new Date().toISOString(),
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
});
