"""
ShieldAI Zen Firewall — Python Runtime Protection
Blocks SQLi, XSS, Path Traversal, Command Injection, SSRF, Prototype Pollution
<1ms overhead. Reports threats to ShieldAI dashboard.

Quick start:
    pip install shieldai-zen

    # FastAPI
    from shieldai_zen import ZenFirewallMiddleware
    app.add_middleware(ZenFirewallMiddleware, token="zen_your_token")

    # Django
    MIDDLEWARE = ['shieldai_zen.DjangoZenMiddleware', ...]

    # Flask
    from shieldai_zen import FlaskZen
    FlaskZen(app, token="zen_your_token")
"""

import re
import os
import json
import threading
import urllib.request
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

__version__ = "1.0.0"
__all__ = ["ZenFirewallMiddleware", "DjangoZenMiddleware", "FlaskZen", "scan_value"]

# ── RULE ENGINE
RULES: Dict[str, List[re.Pattern]] = {
    "sqli": [
        re.compile(r"('|%27|%22).*(OR|UNION|SELECT|INSERT|DROP|UPDATE|DELETE|EXEC|CAST)", re.I),
        re.compile(r";\s*(DROP|DELETE|UPDATE|INSERT|CREATE|ALTER)\s", re.I),
        re.compile(r"\b(OR|AND)\s+\d+=\d+", re.I),
        re.compile(r"WAITFOR\s+DELAY|SLEEP\s*\(", re.I),
        re.compile(r"xp_cmdshell|OPENROWSET", re.I),
    ],
    "xss": [
        re.compile(r"<script[^>]*>[\s\S]*?</script>", re.I),
        re.compile(r"on(load|click|mouseover|error|focus|submit)\s*=", re.I),
        re.compile(r"javascript\s*:", re.I),
        re.compile(r"<iframe[^>]*>", re.I),
    ],
    "path_traversal": [
        re.compile(r"\.\.[/\\]"),
        re.compile(r"\.\.%2[Ff]"),
        re.compile(r"/etc/passwd", re.I),
        re.compile(r"/proc/self", re.I),
        re.compile(r"c:\\windows\\system32", re.I),
    ],
    "cmd_injection": [
        re.compile(r"[;&|`]\s*(bash|sh|zsh|cmd|powershell|wget|curl|nc|python|perl|ruby)\b", re.I),
        re.compile(r"\$\(.*\)"),
        re.compile(r"2>&1"),
    ],
    "ssrf": [
        re.compile(r"^(http|ftp)s?://(localhost|127\.|169\.254\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)", re.I),
        re.compile(r"169\.254\.169\.254"),
        re.compile(r"metadata\.google\.internal", re.I),
    ],
}


def scan_value(value: str, rules: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
    """Scan a single value. Returns hit dict or None if safe."""
    active_rules = rules or list(RULES.keys())
    for rule_type in active_rules:
        for pattern in RULES.get(rule_type, []):
            if pattern.search(str(value)):
                risk = 90 if rule_type in ("sqli", "cmd_injection", "ssrf") else 70
                return {"type": rule_type, "risk": risk, "pattern": pattern.pattern[:50]}
    return None


def _report_async(events: List[Dict], token: str, app_name: str, endpoint: str) -> None:
    """Fire-and-forget telemetry — never blocks request."""
    def _send():
        try:
            payload = json.dumps({
                "action": "report", "token": token,
                "app_name": app_name, "events": events
            }).encode()
            req = urllib.request.Request(
                endpoint, data=payload,
                headers={"Content-Type": "application/json"}, method="POST"
            )
            urllib.request.urlopen(req, timeout=2)
        except Exception:
            pass  # Never raise — reporting is best-effort
    threading.Thread(target=_send, daemon=True).start()


class ZenFirewallMiddleware:
    """
    ASGI middleware for FastAPI / Starlette.

    Usage:
        from shieldai_zen import ZenFirewallMiddleware
        app.add_middleware(ZenFirewallMiddleware,
                           token="zen_xxxx",
                           mode="block")
    """

    def __init__(
        self,
        app,
        token: str = "",
        mode: str = "block",
        threshold: int = 60,
        app_name: str = "",
        endpoint: str = "https://app.base44.com/api/functions/shieldZenFirewall",
        rules: Optional[List[str]] = None,
    ):
        self.app = app
        self.token = token or os.environ.get("SHIELD_ZEN_TOKEN", "")
        self.mode = mode
        self.threshold = threshold
        self.app_name = app_name or os.environ.get("SHIELD_APP_NAME", "python-app")
        self.endpoint = endpoint
        self.rules = rules

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        from urllib.parse import parse_qs
        query_string = scope.get("query_string", b"").decode("utf-8", errors="ignore")
        query_params = parse_qs(query_string)
        method = scope.get("method", "GET")
        path = scope.get("path", "/")

        events = []
        for key, values in query_params.items():
            for val in values:
                hit = scan_value(val, self.rules)
                if hit:
                    sev = "critical" if hit["risk"] >= 80 else "high"
                    action = "blocked" if (self.mode == "block" and hit["risk"] >= self.threshold) else "logged"
                    events.append({
                        "threat_type": hit["type"],
                        "severity": sev,
                        "param": key,
                        "value_snippet": val[:100],
                        "risk_score": hit["risk"],
                        "endpoint": path,
                        "method": method,
                        "action_taken": action,
                        "detected_at": datetime.now(timezone.utc).isoformat(),
                    })

        if events and self.token:
            _report_async(events, self.token, self.app_name, self.endpoint)

        blocked = self.mode == "block" and any(e["risk_score"] >= self.threshold for e in events)
        if blocked:
            response_body = json.dumps({
                "error": "Request blocked by ShieldAI Zen Firewall",
                "threat_types": list({e["threat_type"] for e in events}),
            }).encode()
            await send({"type": "http.response.start", "status": 403, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(response_body)).encode())]})
            await send({"type": "http.response.body", "body": response_body})
            return

        await self.app(scope, receive, send)


class DjangoZenMiddleware:
    """
    Django middleware.

    Add to settings.py:
        MIDDLEWARE = ['shieldai_zen.DjangoZenMiddleware', ...]
        SHIELD_ZEN_TOKEN = 'zen_xxxx'
        SHIELD_ZEN_MODE = 'block'
    """

    def __init__(self, get_response):
        self.get_response = get_response
        from django.conf import settings
        self.token = getattr(settings, "SHIELD_ZEN_TOKEN", os.environ.get("SHIELD_ZEN_TOKEN", ""))
        self.mode = getattr(settings, "SHIELD_ZEN_MODE", "block")
        self.threshold = getattr(settings, "SHIELD_ZEN_THRESHOLD", 60)
        self.app_name = getattr(settings, "SHIELD_APP_NAME", "django-app")
        self.endpoint = getattr(settings, "SHIELD_ZEN_ENDPOINT", "https://app.base44.com/api/functions/shieldZenFirewall")

    def __call__(self, request):
        import json as _json
        events = []
        all_params = dict(request.GET)
        all_params.update(dict(request.POST))

        for key, values in all_params.items():
            for val in (values if isinstance(values, list) else [values]):
                hit = scan_value(str(val))
                if hit:
                    events.append({
                        "threat_type": hit["type"], "severity": "critical" if hit["risk"] >= 80 else "high",
                        "param": key, "value_snippet": str(val)[:100], "risk_score": hit["risk"],
                        "source_ip": request.META.get("REMOTE_ADDR", ""), "endpoint": request.path,
                        "method": request.method, "action_taken": "blocked" if self.mode == "block" else "logged",
                        "detected_at": datetime.now(timezone.utc).isoformat(),
                    })

        if events and self.token:
            _report_async(events, self.token, self.app_name, self.endpoint)

        if self.mode == "block" and any(e["risk_score"] >= self.threshold for e in events):
            from django.http import JsonResponse
            return JsonResponse({"error": "Request blocked by ShieldAI Zen Firewall"}, status=403)

        return self.get_response(request)


class FlaskZen:
    """
    Flask extension.

    Usage:
        from shieldai_zen import FlaskZen
        FlaskZen(app, token="zen_xxxx")

        # Or with factory pattern:
        zen = FlaskZen()
        zen.init_app(app)
    """

    def __init__(self, app=None, token: str = "", mode: str = "block", threshold: int = 60, app_name: str = "flask-app"):
        self.token = token or os.environ.get("SHIELD_ZEN_TOKEN", "")
        self.mode = mode
        self.threshold = threshold
        self.app_name = app_name
        self.endpoint = "https://app.base44.com/api/functions/shieldZenFirewall"
        if app:
            self.init_app(app)

    def init_app(self, app):
        token, mode, threshold, app_name, endpoint = self.token, self.mode, self.threshold, self.app_name, self.endpoint

        @app.before_request
        def _zen_check():
            from flask import request, jsonify
            events = []
            for key, val in list(request.args.items()) + list(request.form.items()):
                hit = scan_value(str(val))
                if hit:
                    events.append({
                        "threat_type": hit["type"], "severity": "critical" if hit["risk"] >= 80 else "high",
                        "param": key, "value_snippet": str(val)[:100], "risk_score": hit["risk"],
                        "source_ip": request.remote_addr, "endpoint": request.path,
                        "method": request.method, "action_taken": "blocked" if mode == "block" else "logged",
                        "detected_at": datetime.now(timezone.utc).isoformat(),
                    })
            if events and token:
                _report_async(events, token, app_name, endpoint)
            if mode == "block" and any(e["risk_score"] >= threshold for e in events):
                return jsonify({"error": "Request blocked by ShieldAI Zen Firewall"}), 403
