# shieldai-zen

**In-app runtime protection for Python web applications.**

Block SQL injection, XSS, path traversal, command injection, and SSRF with less than 1ms overhead. Supports FastAPI, Django, Flask, and any ASGI/WSGI framework.

[![PyPI version](https://badge.fury.io/py/shieldai-zen.svg)](https://pypi.org/project/shieldai-zen/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Quick Start

```bash
pip install shieldai-zen
```

### FastAPI / Starlette

```python
from fastapi import FastAPI
from shieldai_zen import ZenFirewallMiddleware

app = FastAPI()
app.add_middleware(ZenFirewallMiddleware, token="zen_your_token")
```

### Django

```python
# settings.py
MIDDLEWARE = [
    'shieldai_zen.DjangoZenMiddleware',
    # ... your other middleware
]
SHIELD_ZEN_TOKEN = 'zen_your_token'
SHIELD_ZEN_MODE = 'block'   # or 'monitor'
```

### Flask

```python
from flask import Flask
from shieldai_zen import FlaskZen

app = Flask(__name__)
FlaskZen(app, token="zen_your_token")
```

---

## What It Blocks

| Attack | Example | Action |
|---|---|---|
| SQL Injection | `' OR 1=1--` | 🛑 Blocked |
| XSS | `<script>alert(1)</script>` | 🛑 Blocked |
| Path Traversal | `../../etc/passwd` | 🛑 Blocked |
| Command Injection | `; bash -i >& /dev/tcp/...` | 🛑 Blocked |
| SSRF | `http://169.254.169.254/...` | 🛑 Blocked |

---

## Configuration

```python
app.add_middleware(ZenFirewallMiddleware,
    token="zen_your_token",      # from ShieldAI dashboard
    mode="block",                # "block" (default) | "monitor" (log only)
    threshold=60,                # risk score to block (0-100)
    app_name="my-api",           # shown in ShieldAI dashboard
)
```

### Environment Variables

```bash
SHIELD_ZEN_TOKEN=zen_xxxxxxxxxxxx
SHIELD_APP_NAME=my-api
```

---

## Get Your Token

1. Go to [shieldai.dev](https://shieldai.dev)
2. Navigate to **Protect → Zen Firewall → Add Protected App**
3. Select **Python** and copy your token

---

## License

MIT © ShieldAI Security
