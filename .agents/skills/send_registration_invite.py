#!/usr/bin/env python3
"""
Send a PEA registration invite email via Hostinger SMTP.
Usage: python send_registration_invite.py <email> <name> <role> <registration_url> <reference_code>
"""
import sys
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

def build_html(first_name, email, role, reg_url, ref_code, role_portal):
    year = datetime.now().year
    portal_url = f"https://primeendorsement.com/{role_portal}"
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
body{{margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif}}
.w{{max-width:600px;margin:0 auto}}
.hdr{{background:#111827;border-bottom:2px solid #C9A84C;padding:36px 40px;text-align:center}}
.badge{{display:inline-block;border:1px solid #C9A84C;padding:4px 14px;border-radius:2px;margin-bottom:12px}}
.badge span{{color:#C9A84C;font-size:10px;letter-spacing:4px;text-transform:uppercase}}
.logo{{color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:4px;text-transform:uppercase}}
.sub{{color:#e2e8f0;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.7;margin-top:4px}}
.body{{padding:36px 40px;background:#111827}}
.greet{{color:#C9A84C;font-size:18px;margin-bottom:12px}}
.txt{{color:#94a3b8;font-size:14px;line-height:1.8;margin-bottom:16px}}
.ref-box{{background:#0A0E1A;border:1px solid #C9A84C;border-radius:6px;padding:14px 20px;margin:22px 0;text-align:center}}
.ref-lbl{{color:#64748b;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px}}
.ref-val{{color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:3px}}
.info-box{{background:#0d1220;border:1px solid #1F2937;border-radius:6px;padding:16px 20px;margin:16px 0}}
.info-row{{margin-bottom:8px;color:#94a3b8;font-size:13px;line-height:1.6}}
.info-row strong{{color:#e2e8f0}}
.btn{{display:block;width:fit-content;margin:26px auto;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:14px 40px;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase}}
.cta-sub{{text-align:center;font-size:12px;color:#64748b;margin-top:8px}}
.cta-sub a{{color:#C9A84C;text-decoration:none}}
.divider{{border:none;border-top:1px solid #1F2937;margin:24px 0}}
.security{{text-align:center;color:#64748b;font-size:11px;letter-spacing:1px}}
.footer{{background:#0d1220;padding:22px 40px;text-align:center;border-top:1px solid #1F2937}}
.footer p{{color:#475569;font-size:12px;line-height:1.7;margin:3px 0}}
.footer a{{color:#C9A84C;text-decoration:none}}
</style>
</head>
<body><div class="w">
<div class="hdr">
  <div class="badge"><span>Sovereign Digital Authority</span></div>
  <div class="logo">PRIME ENDORSEMENT AUTHORITY</div>
  <div class="sub">AI-Powered Digital Registration</div>
</div>
<div class="body">
  <div class="greet">Welcome, {first_name} &#127963;</div>
  <p class="txt">You have been invited to apply for <strong style="color:#e2e8f0">Prime Endorsement Authority</strong> certification. Your personalised, secure registration link is ready below.</p>

  <div class="ref-box">
    <div class="ref-lbl">Your Application Reference</div>
    <div class="ref-val">{ref_code}</div>
  </div>

  <div class="info-box">
    <div class="info-row"><strong>&#128203; Role:</strong> {role}</div>
    <div class="info-row"><strong>&#128272; Email:</strong> {email}</div>
    <div class="info-row"><strong>&#128179; Service Fee:</strong> £1,200.00 (inc. £200 VAT) — payable after registration</div>
    <div class="info-row"><strong>&#8987; Link Expires:</strong> 72 hours from receipt</div>
  </div>

  <p class="txt">Click the button below to begin your AI-powered 5-step registration. Your reference code will be pre-loaded and your email pre-verified.</p>

  <a href="{reg_url}" class="btn">Begin Your Registration &#8594;</a>
  <p class="cta-sub">Or copy this link: <a href="{reg_url}">{reg_url[:60]}...</a></p>

  <hr class="divider"/>

  <p class="txt" style="font-size:13px"><strong style="color:#e2e8f0">What happens next?</strong><br/>
  1. Complete the 5-step AI-powered registration<br/>
  2. Your application is AI-scored in real time<br/>
  3. Create your {role} portal account<br/>
  4. Pay the £1,200.00 endorsement fee securely via Stripe<br/>
  5. Track your 90-day review from your personal portal
  </p>

  <hr class="divider"/>
  <div class="security">&#128274; &nbsp; AES-256 Encrypted &nbsp;&#183;&nbsp; TLS 1.3 &nbsp;&#183;&nbsp; PCI DSS Compliant &nbsp;&#183;&nbsp; Zero-Trust Architecture</div>
</div>
<div class="footer">
  <p><strong style="color:#94a3b8">Prime Endorsement Authority</strong></p>
  <p>Questions? <a href="mailto:admin@primeendorsement.com">admin@primeendorsement.com</a></p>
  <p style="margin-top:8px">Portal: <a href="{portal_url}">{portal_url}</a></p>
  <p style="margin-top:8px">&copy; {year} Prime Endorsement Authority. All rights reserved.</p>
</div>
</div></body></html>"""

def main():
    if len(sys.argv) < 6:
        print("Usage: send_registration_invite.py <email> <name> <role> <reg_url> <ref_code>")
        sys.exit(1)

    to_email   = sys.argv[1]
    name       = sys.argv[2]
    role       = sys.argv[3]
    reg_url    = sys.argv[4]
    ref_code   = sys.argv[5]

    smtp_host  = os.environ.get("HOSTINGER_SMTP_HOST", "smtp.hostinger.com")
    smtp_port  = int(os.environ.get("HOSTINGER_SMTP_PORT", "465"))
    smtp_user  = "admin@primeendorsement.com"
    smtp_pass  = os.environ.get("SMTP_PASSWORD") or os.environ.get("HOSTINGER_SMTP_PASSWORD", "")

    if not smtp_pass:
        print("ERROR: SMTP_PASSWORD not set")
        sys.exit(1)

    first_name  = name.split()[0]
    role_portal = "co-founder-portal" if "co" in role.lower() else "founder-portal"
    html_body   = build_html(first_name, to_email, role, reg_url, ref_code, role_portal)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your Prime Endorsement Authority Registration Link — {ref_code}"
    msg["From"]    = '"Prime Endorsement Authority" <admin@primeendorsement.com>'
    msg["To"]      = to_email
    msg["Reply-To"] = "admin@primeendorsement.com"
    msg.attach(MIMEText(html_body, "html"))

    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL(smtp_host, smtp_port, context=ctx) as server:
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, to_email, msg.as_string())

    print(f"SUCCESS: Registration invite sent to {to_email}")
    print(f"Reference: {ref_code}")
    print(f"Link: {reg_url}")

if __name__ == "__main__":
    main()
