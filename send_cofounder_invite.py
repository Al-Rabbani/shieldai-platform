import os, json, secrets, datetime, urllib.request

SERVICE_TOKEN = os.environ.get("BASE44_SERVICE_TOKEN","")
RESEND_KEY = os.environ.get("RESEND_API_KEY","")
LOGO_URL = "https://media.base44.com/images/public/6a14246111a4fa5e22999619/5c4547244_PrimeLogo.png"
REC_ID = "6a1d84ab9ef4917aeb86682c"
REF = "PEA-IFV-CF-704377"
PLATFORM_URL = "https://primeendorsement.com"
SUPPORT_EMAIL = "admin@primeendorsement.com"
VENTURE = "RABBANI AI ECO SYSTEM"
FOUNDER_CO = "Global Digital Streams LTD"
YEAR = 2026
TO_NAME = "SAYYID MUHYIDDIN"
TO_EMAIL = "president@rabgifgroupltd.com"

# Fresh token
TOKEN = secrets.token_urlsafe(32)
EXPIRY = (datetime.datetime.utcnow() + datetime.timedelta(days=3)).strftime('%Y-%m-%dT%H:%M:%SZ')
REG_URL = f"https://primeendorsement.com/api/functions/peaRegister?token={TOKEN}"

# Save token to DB
req = urllib.request.Request(
    f"https://app.base44.com/api/apps/69e2e852c48630e3502f13b1/entities/Application/{REC_ID}",
    data=json.dumps({"session_token": TOKEN, "token_expires_at": EXPIRY, "registration_email_sent": False}).encode(),
    headers={"Authorization": f"Bearer {SERVICE_TOKEN}", "Content-Type": "application/json"},
    method="PUT"
)
resp = urllib.request.urlopen(req, timeout=10)
saved = json.load(resp)
print(f"Token saved: {str(saved.get('session_token',''))[:20]}...")

steps_html = ""
steps = [
    ("1","Access the Registration Portal","Click the secure registration link and create your applicant account on the PEA Platform."),
    ("2","Create Your Secure Applicant Profile","Full legal name, date of birth, nationality, country of residence, address, phone, email, professional background, and educational qualifications."),
    ("3","Co-Founder &amp; Project Participation Information","Your proposed role within the venture, area of expertise, relevant professional experience, and any prior startup, innovation, or leadership experience."),
    ("4","Upload Supporting Documents","Personal ID (passport, national ID, photo), academic and professional documents (CV, certificates), business and innovation evidence, and compliance declarations."),
]
for num, title, desc in steps:
    steps_html += f'<div style="display:table;width:100%;margin-bottom:16px"><div style="display:table-cell;width:44px;vertical-align:top"><div style="width:32px;height:32px;background:#C9A84C;color:#0A0E1A;border-radius:50%;font-weight:700;font-size:13px;line-height:32px;text-align:center">{num}</div></div><div style="display:table-cell;vertical-align:top;padding-left:4px"><div style="color:#e2e8f0;font-size:13px;font-weight:600;margin-bottom:4px">{title}</div><div style="color:#94a3b8;font-size:12px;line-height:1.7">{desc}</div></div></div>'

next_html = ""
nexts = [
    ("1","Registration Review","Your onboarding information undergoes structured verification and eligibility review."),
    ("2","Payment Invitation","Where eligible, an official payment invitation is issued through the PEA Platform."),
    ("3","Application Activation","Following payment confirmation, your endorsement application is activated for structured review."),
    ("4","Tracking Portal Access","A secure applicant tracking link is issued to monitor your application progress."),
]
for icon, title, desc in nexts:
    next_html += f'<div style="background:#0d1220;border:1px solid #1e293b;border-radius:6px;padding:12px 14px;margin-bottom:10px"><table style="width:100%;border-collapse:collapse"><tr><td style="width:26px;vertical-align:top;color:#C9A84C;font-size:14px;font-weight:700">({icon})</td><td style="vertical-align:top;padding-left:10px"><div style="color:#e2e8f0;font-size:12px;font-weight:600;margin-bottom:3px">{title}</div><div style="color:#64748b;font-size:11px;line-height:1.7">{desc}</div></td></tr></table></div>'

html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Co-Founder Registration Invitation | Prime Endorsement Authority</title></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:660px;margin:0 auto;background:#111827;border-radius:12px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.5)">
  <div style="background:linear-gradient(135deg,#0d1220 0%,#0f1629 100%);border-bottom:3px solid #C9A84C;padding:32px;text-align:center">
    <img src="{LOGO_URL}" alt="PEA" style="height:80px;width:auto;display:inline-block;margin-bottom:12px"/>
    <div style="color:#C9A84C;font-size:13px;font-weight:700;letter-spacing:5px;text-transform:uppercase">Prime Endorsement Authority</div>
    <div style="color:#94a3b8;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:4px">Innovator Founder Visa Endorsement Programme</div>
    <div style="display:inline-block;margin-top:12px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:20px;padding:5px 18px">
      <span style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Official Co-Founder Nomination &amp; Registration Notice</span>
    </div>
  </div>
  <div style="background:#0A0E1A;padding:10px 32px;text-align:center;border-bottom:1px solid #1e293b">
    <span style="color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase">Reference: </span>
    <span style="color:#C9A84C;font-size:12px;font-weight:700;letter-spacing:3px">{REF}</span>
  </div>
  <div style="padding:32px 36px 0">
    <p style="color:#e2e8f0;font-size:15px;font-weight:600;margin:0 0 10px">Dear {TO_NAME},</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.9;margin:0 0 14px">Greetings from the <strong style="color:#e2e8f0">Prime Endorsement Authority (PEA)</strong>.</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.9;margin:0 0 14px">We are pleased to formally notify you that <strong style="color:#C9A84C">{FOUNDER_CO}</strong>, an approved Founder of the <strong style="color:#e2e8f0">{VENTURE}</strong>, has officially nominated you as a <strong style="color:#C9A84C">Co-Founder</strong> of the project and has initiated a request on your behalf to commence the endorsement process under the <strong style="color:#e2e8f0">Innovator Founder Visa Route</strong>.</p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.9;margin:0 0 24px">This communication serves as your official <strong style="color:#e2e8f0">Registration Request &amp; Co-Founder Nomination Notice</strong> and invites you to commence the onboarding and registration process through the Prime Endorsement Authority Platform Application.</p>
  </div>
  <div style="padding:0 36px 24px">
    <div style="background:#0d1220;border:1px solid #C9A84C;border-left:4px solid #C9A84C;border-radius:8px;padding:20px">
      <div style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px">Co-Founder Nomination Notice</div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 12px">Based on information submitted to the Prime Endorsement Authority, you have been identified as a proposed strategic contributor and Co-Founder associated with the <strong style="color:#e2e8f0">{VENTURE}</strong>, a high-growth innovation-driven initiative led by <strong style="color:#C9A84C">{FOUNDER_CO}</strong>.</p>
      <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 12px">In support of the proposed project structure and founder ecosystem, an application has been initiated on your behalf to begin structured assessment for endorsement consideration under the <strong style="color:#e2e8f0">Innovator Founder Visa Route</strong>.</p>
      <p style="color:#64748b;font-size:12px;line-height:1.7;margin:0;font-style:italic">Please note that your nomination as a Co-Founder does not constitute endorsement approval and remains subject to successful registration, programme compliance, eligibility review, innovation assessment, due diligence, and endorsement evaluation.</p>
    </div>
  </div>
  <div style="padding:0 36px 24px">
    <div style="background:linear-gradient(135deg,#0a1800 0%,#0d1f00 100%);border:1px solid rgba(34,197,94,0.25);border-radius:8px;padding:24px;text-align:center">
      <div style="color:#86efac;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">Registration Required - Action Needed</div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 20px">To proceed with your onboarding and endorsement consideration, you are required to complete your registration through the secure Prime Endorsement Authority Platform Application.</p>
      <a href="{REG_URL}" style="display:inline-block;background:#C9A84C;color:#0A0E1A;text-decoration:none;padding:16px 48px;border-radius:10px;font-weight:700;font-size:13px;letter-spacing:3px;text-transform:uppercase">Begin Registration</a>
      <div style="color:#475569;font-size:10px;margin-top:10px">Secure SSL portal - Link valid for 3 days - Ref: {REF}</div>
    </div>
  </div>
  <div style="padding:0 36px 24px">
    <div style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #1e293b">How to Complete Your Registration</div>
    {steps_html}
  </div>
  <div style="padding:0 36px 24px">
    <div style="background:#0d1220;border:1px solid #1e293b;border-radius:8px;overflow:hidden">
      <div style="background:#0A0E1A;padding:12px 16px;border-bottom:1px solid #1e293b">
        <div style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Required Information &amp; Supporting Documents</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr style="border-bottom:1px solid #1e293b">
          <td style="padding:12px 16px;vertical-align:top;width:50%;border-right:1px solid #1e293b">
            <div style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">A - Personal ID</div>
            <div style="color:#94a3b8;line-height:1.9">Valid Passport (bio-data page)<br/>National ID (if applicable)<br/>Passport-size photograph</div>
          </td>
          <td style="padding:12px 16px;vertical-align:top">
            <div style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">B - Academic &amp; Professional</div>
            <div style="color:#94a3b8;line-height:1.9">CV / Resume<br/>Educational certificates<br/>Professional certifications</div>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;vertical-align:top;border-right:1px solid #1e293b">
            <div style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">C - Business &amp; Innovation</div>
            <div style="color:#94a3b8;line-height:1.9">Business profile / Portfolio<br/>Innovation contribution statement<br/>LinkedIn / professional links</div>
          </td>
          <td style="padding:12px 16px;vertical-align:top">
            <div style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">D - Compliance</div>
            <div style="color:#94a3b8;line-height:1.9">Proof of residential address<br/>Declaration of accuracy<br/>Compliance acknowledgements</div>
          </td>
        </tr>
      </table>
    </div>
  </div>
  <div style="padding:0 36px 24px">
    <div style="color:#C9A84C;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #1e293b">What Happens After Registration?</div>
    {next_html}
  </div>
  <div style="padding:0 36px 24px">
    <div style="background:#1a0a00;border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:18px">
      <div style="color:#fca5a5;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px">Important Notice</div>
      <ol style="color:#94a3b8;font-size:12px;line-height:2;margin:0;padding-left:18px">
        <li>Nomination as a Co-Founder does not guarantee endorsement approval, visa approval, or immigration approval.</li>
        <li>All applicants remain subject to programme eligibility, due diligence, innovation assessment, compliance screening, and endorsement criteria.</li>
        <li>Submission of incomplete or inaccurate information may delay or affect processing outcomes.</li>
        <li>Official communications shall only be issued through authorised Prime Endorsement Authority channels and the platform application.</li>
      </ol>
    </div>
  </div>
  <div style="padding:0 36px 32px;text-align:center">
    <p style="color:#94a3b8;font-size:13px;line-height:1.8;margin:0 0 20px">Kindly proceed with your registration at the earliest opportunity using the secure registration link below:</p>
    <a href="{REG_URL}" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#e2c05a);color:#0A0E1A;text-decoration:none;padding:18px 56px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:3px;text-transform:uppercase">Start Your Registration</a>
    <div style="color:#475569;font-size:10px;margin-top:12px">Secure SSL-encrypted portal - Link valid 3 days</div>
  </div>
  <div style="background:#0d1220;border-top:2px solid #C9A84C;padding:24px 36px">
    <p style="color:#94a3b8;font-size:13px;margin:0 0 6px">Yours faithfully,</p>
    <p style="color:#C9A84C;font-size:14px;font-weight:700;margin:8px 0 2px">Prime Endorsement Authority (PEA)</p>
    <p style="color:#e2e8f0;font-size:12px;font-weight:600;margin:0 0 2px">Innovator Founder Visa Endorsement Programme Team</p>
    <p style="color:#64748b;font-size:11px;font-style:italic;margin:0 0 16px">Official Co-Founder Registration &amp; Applicant Processing Unit</p>
    <table style="width:100%;font-size:11px;border-collapse:collapse">
      <tr><td style="color:#64748b;padding:3px 0;width:130px">Platform Access:</td><td><a href="{PLATFORM_URL}" style="color:#C9A84C;text-decoration:none">{PLATFORM_URL}</a></td></tr>
      <tr><td style="color:#64748b;padding:3px 0">Applicant Support:</td><td><a href="mailto:{SUPPORT_EMAIL}" style="color:#C9A84C;text-decoration:none">{SUPPORT_EMAIL}</a></td></tr>
      <tr><td style="color:#64748b;padding:3px 0">Reference Number:</td><td style="color:#C9A84C;font-weight:700;letter-spacing:2px">{REF}</td></tr>
    </table>
  </div>
  <div style="background:#0A0E1A;padding:14px 36px;text-align:center;border-top:1px solid #1e293b">
    <p style="color:#374151;font-size:10px;margin:0">© {YEAR} Prime Endorsement Authority - primeendorsement.com - All rights reserved.</p>
    <p style="color:#374151;font-size:10px;margin:4px 0 0">This is an official communication. Do not reply directly to this email.</p>
  </div>
</div>
</body></html>"""

SUBJECT = f"Co-Founder Nomination & Registration Request - Innovator Founder Visa Endorsement Process ({VENTURE})"
payload = json.dumps({
    "from": "Prime Endorsement Authority <admin@primeendorsement.com>",
    "to": [TO_EMAIL],
    "subject": SUBJECT,
    "html": html
}).encode()

req2 = urllib.request.Request(
    "https://api.resend.com/emails",
    data=payload,
    headers={"Authorization": f"Bearer {RESEND_KEY}", "Content-Type": "application/json"},
    method="POST"
)
resp2 = urllib.request.urlopen(req2, timeout=20)
result = json.load(resp2)
print(f"EMAIL SENT!")
print(f"  To: {TO_EMAIL}")
print(f"  Message ID: {result.get('id','?')}")
print(f"  Ref: {REF}")
print(f"  Token valid until: {EXPIRY}")
