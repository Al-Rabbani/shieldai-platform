# 🛡️ ShieldAI Zen Firewall SDK

In-app runtime defense & real-time threat detection for Express, Fastify, and Hono.

**Version:** 1.0.0  
**License:** MIT  
**Repository:** https://github.com/shieldai/zen-firewall-sdk

---

## Features

- ✅ **Real-Time Attack Detection** — Detects SQL injection, XSS, path traversal, SSRF, XXE, command injection
- ✅ **Zero Latency** — Middleware-based, no external API calls (optional webhook for reporting)
- ✅ **Block or Monitor Mode** — Choose to block attacks or just log them
- ✅ **Rate Limiting** — Built-in per-IP request rate limiting
- ✅ **Bot Detection** — Identifies scanning tools and suspicious user agents
- ✅ **Custom Rules** — Add your own threat patterns
- ✅ **Zero Dependencies** — Pure JavaScript/TypeScript, minimal overhead

---

## Installation

```bash
npm install @shieldai/zen-firewall
```

---

## Quick Start

### Express

```javascript
const express = require('express');
const ZenFirewall = require('@shieldai/zen-firewall').default;

const app = express();

// Initialize Zen Firewall
const zen = new ZenFirewall({
  mode: 'block', // 'block' = stop attacks, 'monitor' = log only
  logLevel: 'info',
  webhookUrl: 'https://api.shieldai.com/threats',
  apiKey: 'sk_live_xxx',
});

// Use as middleware (BEFORE your routes)
app.use(zen.middleware());

// Your routes
app.post('/api/users', (req, res) => {
  res.json({ message: 'User created' });
});

app.listen(3000, () => console.log('Server running on :3000'));
```

### Fastify

```javascript
const Fastify = require('fastify');
const ZenFirewall = require('@shieldai/zen-firewall').default;

const fastify = Fastify();
const zen = new ZenFirewall({ mode: 'block' });

fastify.register((f, opts, next) => {
  f.use(zen.middleware());
  next();
});

fastify.post('/api/users', async (req, reply) => {
  return { message: 'User created' };
});

fastify.listen({ port: 3000 }, () => console.log('Server running on :3000'));
```

### Hono

```javascript
import { Hono } from 'hono';
import ZenFirewall from '@shieldai/zen-firewall';

const app = new Hono();
const zen = new ZenFirewall({ mode: 'block' });

app.use(zen.middleware());

app.post('/api/users', async (c) => {
  return c.json({ message: 'User created' });
});

export default app;
```

---

## Configuration

```javascript
const zen = new ZenFirewall({
  // Enable/disable firewall
  enabled: true,

  // 'block' = stop attacks, 'monitor' = log only
  mode: 'block',

  // Log level
  logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'

  // Send threat events to backend (optional)
  webhookUrl: 'https://api.shieldai.com/threats',
  apiKey: 'sk_live_xxx', // ShieldAI API key

  // Rate limiting config
  rateLimit: {
    enabled: true,
    windowMs: 60000, // 1 minute window
    maxRequests: 100, // max 100 requests per window
    keyGenerator: (req) => req.ip, // custom key (default: IP)
  },

  // Skip protection on these paths
  skipPaths: ['/health', '/metrics', '/status', '/docs'],

  // Add custom threat patterns
  customRules: [
    {
      id: 'custom_001',
      name: 'Block /admin without API key header',
      pattern: /^\/admin/,
      severity: 'high',
      action: 'block',
      checkLocations: ['path', 'headers'],
    },
  ],
});
```

---

## Threat Types Detected

| Threat Type | Severity | Example Payloads |
|---|---|---|
| SQL Injection | Critical | `1' OR '1'='1'--`, `UNION SELECT * FROM users` |
| XSS (Cross-Site Scripting) | High | `<script>alert('xss')</script>`, `javascript:void(0)` |
| Path Traversal | High | `../../../etc/passwd`, `..%2f..%2fetc%2fpasswd` |
| SSRF (Server-Side Request Forgery) | Critical | `http://localhost:8080`, `http://169.254.169.254/metadata` |
| Command Injection | Critical | `; rm -rf /`, `` `cat /etc/passwd` `` |
| XXE (XML External Entity) | High | `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>` |
| Rate Limit Abuse | Medium | >100 requests per minute from same IP |
| Bot Detection | Medium | Requests from scanners (sqlmap, nikto, nessus) |

---

## Getting Threat Data

### In-Memory Log

```javascript
const zen = new ZenFirewall({ mode: 'monitor' });

// ... middleware initialized ...

// Get all detected threats
const threats = zen.getThreatLog();
threats.forEach(t => {
  console.log(`${t.timestamp} — ${t.threat_type} from ${t.source_ip}`);
});

// Get statistics
const stats = zen.getStats();
console.log(`Total threats: ${stats.total_threats_detected}`);
console.log(`Blocked: ${stats.threats_blocked}`);
console.log(`Critical: ${stats.critical}`);
```

### Webhook Integration

When `webhookUrl` is configured, threats are sent in real-time:

```javascript
// Zen Firewall will POST this to your webhook:
{
  "id": "zen_1717949877123_abc123xyz",
  "timestamp": "2026-06-09T17:17:57Z",
  "threat_type": "sqli_001",
  "severity": "critical",
  "endpoint": "/api/users",
  "method": "POST",
  "source_ip": "203.0.113.45",
  "user_agent": "Mozilla/5.0...",
  "payload": "{\"id\":\"1' OR '1'='1'--\"}",
  "rule_triggered": "SQL Injection — OR Clause",
  "action_taken": "blocked",
  "response_time_ms": 3.2
}
```

You can send these to ShieldAI's platform for visualization and trending:

```javascript
const zen = new ZenFirewall({
  webhookUrl: 'https://api.shieldai.com/v1/threats/ingest',
  apiKey: process.env.SHIELDAI_API_KEY,
  mode: 'block',
});
```

---

## Performance

- **Latency overhead:** ~1-3ms per request (regex matching)
- **Memory:** ~2MB base + threat log buffer
- **CPU:** <1% on typical applications

Zen Firewall is designed for production use with minimal performance impact.

---

## Limitations

- Pattern-based detection (not ML-based)
- Local analysis only (no external API calls by default)
- Regex patterns can have false positives/negatives
- Not a replacement for WAF — use alongside cloud WAF (Cloudflare, AWS WAF)

---

## Comparison to Alternatives

| Feature | Zen Firewall | OWASP ModSecurity | Cloudflare WAF |
|---|---|---|---|
| Installation | npm install | Nginx/Apache module | Cloud-based |
| Cost | Free (MIT) | Free (open source) | $20+/month |
| Setup time | 2 minutes | 1 hour+ | 5 minutes |
| False positives | Low | Medium | Very low |
| Customization | Easy (JS) | Hard (ModSec rules) | Easy (UI) |
| On-premise | ✅ | ✅ | ❌ |
| Real-time reporting | Optional webhook | File-based logs | ✅ Dashboard |

---

## Roadmap

- [ ] ML-based anomaly detection
- [ ] Integration with ShieldAI dashboard
- [ ] OWASP ESAPI rule engine compatibility
- [ ] WebSocket attack detection
- [ ] Automatic rule updates via npm

---

## License

MIT — Use freely in commercial projects.

---

## Support

- 📧 Email: security@shieldai.com
- 🐛 Issues: https://github.com/shieldai/zen-firewall-sdk/issues
- 📚 Docs: https://www.shieldai.com/docs/zen-firewall
