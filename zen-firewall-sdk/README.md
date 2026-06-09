# @shieldai/zen

**In-app runtime protection for Node.js applications.**

Block SQL injection, XSS, path traversal, command injection, SSRF, and prototype pollution — with less than 1ms overhead. Reports all threats to your [ShieldAI](https://shieldai.dev) security dashboard in real time.

[![npm version](https://badge.fury.io/js/%40shieldai%2Fzen.svg)](https://www.npmjs.com/package/@shieldai/zen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Quick Start

```bash
npm install @shieldai/zen
```

### Express / Connect

```javascript
const express = require('express');
const { zen } = require('@shieldai/zen');

const app = express();
app.use(express.json());

// Add Zen — that's it.
app.use(zen({ token: process.env.SHIELD_ZEN_TOKEN }));

app.get('/', (req, res) => res.json({ status: 'protected' }));
app.listen(3000);
```

### Fastify

```javascript
const fastify = require('fastify')();
const { zenFastify } = require('@shieldai/zen');

fastify.register(zenFastify({ token: process.env.SHIELD_ZEN_TOKEN }));
```

### TypeScript

```typescript
import express from 'express';
import { zen } from '@shieldai/zen';

const app = express();
app.use(zen({ token: process.env.SHIELD_ZEN_TOKEN, mode: 'block' }));
```

---

## What It Blocks

| Attack Type | Example Payload | Action |
|---|---|---|
| SQL Injection | `' OR 1=1--` | 🛑 Blocked |
| XSS | `<script>alert(1)</script>` | 🛑 Blocked |
| Path Traversal | `../../etc/passwd` | 🛑 Blocked |
| Command Injection | `; bash -i >& /dev/tcp/...` | 🛑 Blocked |
| SSRF | `http://169.254.169.254/latest/meta-data` | 🛑 Blocked |
| Prototype Pollution | `{"__proto__":{"admin":true}}` | 🛑 Blocked |

---

## Configuration

```javascript
app.use(zen({
  token: 'zen_your_token_here',  // from ShieldAI dashboard
  mode: 'block',                 // 'block' (default) | 'monitor' (log only)
  threshold: 60,                 // risk score to block (0-100, default: 60)
  appName: 'my-api',             // shown in dashboard
  rules: ['sqli', 'xss', 'path_traversal', 'cmd_injection', 'ssrf', 'proto_pollution'],
  allowlist: ['/^safe-value-pattern/'],  // regex patterns to skip
}));
```

### Environment Variables

```bash
SHIELD_ZEN_TOKEN=zen_xxxxxxxxxxxx  # Your ShieldAI token
SHIELD_ZEN_ENDPOINT=https://...    # Override report endpoint (optional)
```

---

## How It Works

1. **Intercepts** every incoming request — body, query params, and route params
2. **Scans** all user-controlled values against 25+ attack patterns across 6 categories
3. **Blocks** (in `block` mode) or **logs** (in `monitor` mode) matching requests
4. **Reports** threat telemetry to ShieldAI asynchronously — never blocks your response

**Overhead:** < 1ms per request (pure regex, no I/O on the hot path)

---

## Get Your Token

1. Sign up at [shieldai.dev](https://shieldai.dev)
2. Go to **Protect → Zen Firewall → Add Protected App**
3. Copy your install token
4. Set `SHIELD_ZEN_TOKEN=zen_your_token`

---

## Python

For Python/FastAPI/Django, install the Python companion:

```bash
pip install shieldai-zen
```

```python
from shieldai_zen import ZenFirewallMiddleware
app.add_middleware(ZenFirewallMiddleware, token="zen_your_token")
```

---

## License

MIT © ShieldAI Security
