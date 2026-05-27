#!/usr/bin/env python3
"""
PEA Email Sender — pea_send_email.py
Sends email from admin@primeendorsement.com via Hostinger SMTP (primary)
with Resend API as fallback.

Usage:
  python3 pea_send_email.py <to> <subject> <html_body>
  echo '{"to":"..","subject":"..","html":".."}' | python3 pea_send_email.py

Env vars needed:
  SMTP_PASSWORD or HOSTINGER_SMTP_PASSWORD
  RESEND_API_KEY (for fallback)
"""
import smtplib, ssl, sys, os, json, urllib.request, urllib.error
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST  = "smtp.hostinger.com"
SMTP_PORT  = 465
SMTP_USER  = "admin@primeendorsement.com"
FROM_NAME  = "Prime Endorsement Authority"
RESEND_API = "https://api.resend.com/emails"

def send_via_smtp(to: str, subject: str, html: str, smtp_pass: str) -> dict:
    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=20) as server:
        server.login(SMTP_USER, smtp_pass)
        msg = MIMEMultipart("alternative")
        msg["From"]    = f"{FROM_NAME} <{SMTP_USER}>"
        msg["To"]      = to
        msg["Subject"] = subject
        msg.attach(MIMEText(html, "html"))
        server.sendmail(SMTP_USER, [to], msg.as_string())
    return {"success": True, "method": "smtp", "to": to}

def send_via_resend(to: str, subject: str, html: str, api_key: str) -> dict:
    payload = json.dumps({
        "from":    f"{FROM_NAME} <{SMTP_USER}>",
        "to":      [to],
        "subject": subject,
        "html":    html,
    }).encode()
    req = urllib.request.Request(
        RESEND_API,
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        result = json.loads(resp.read())
    return {"success": True, "method": "resend", "id": result.get("id"), "to": to}

def send(to: str, subject: str, html: str) -> dict:
    smtp_pass  = os.environ.get("SMTP_PASSWORD") or os.environ.get("HOSTINGER_SMTP_PASSWORD", "")
    resend_key = os.environ.get("RESEND_API_KEY", "")

    errors = []

    # Primary: Hostinger SMTP
    if smtp_pass:
        try:
            return send_via_smtp(to, subject, html, smtp_pass)
        except Exception as e:
            errors.append(f"SMTP: {e}")

    # Fallback: Resend
    if resend_key:
        try:
            return send_via_resend(to, subject, html, resend_key)
        except Exception as e:
            errors.append(f"Resend: {e}")

    return {"success": False, "errors": errors}

if __name__ == "__main__":
    source = sys.stdin.read().strip() if not sys.stdin.isatty() else ""
    if source:
        data   = json.loads(source)
        to      = data["to"]
        subject = data["subject"]
        html    = data["html"]
    elif len(sys.argv) >= 4:
        to      = sys.argv[1]
        subject = sys.argv[2]
        html    = sys.argv[3]
    else:
        print(json.dumps({"success": False, "error": "Need to|subject|html args or JSON on stdin"}))
        sys.exit(1)

    result = send(to, subject, html)
    print(json.dumps(result))
    sys.exit(0 if result.get("success") else 1)
