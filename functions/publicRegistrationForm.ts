import base44 from "../base44_sdk.ts";

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const email = url.searchParams.get("email") || "";
  const ref = url.searchParams.get("ref") || "";

  // ── POST: handle form submission ──────────────────────────────────────────
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const result = await base44.functions.publicSubmitApplication({
        ...body,
        token,
        reference_code: ref,
      });
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  // ── OPTIONS: CORS preflight ───────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // ── GET: serve the registration page ─────────────────────────────────────
  const encodedEmail = encodeURIComponent(email);
  const formAction = `/api/functions/publicRegistrationForm?token=${token}&email=${encodedEmail}&ref=${ref}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Prime Endorsement Authority — Application Portal</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --navy:#0a0f1e;--navy2:#111827;--navy3:#1a2040;--gold:#c9a84c;--gold2:#e8c96e;
    --text:#e2e8f0;--muted:#8898aa;--border:#1e2a45;--success:#22c55e;--error:#ef4444
  }
  body{background:var(--navy);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh;overflow-x:hidden}
  /* Animated background */
  body::before{content:'';position:fixed;top:0;left:0;right:0;bottom:0;
    background:radial-gradient(ellipse at 20% 20%,rgba(201,168,76,0.04) 0%,transparent 50%),
               radial-gradient(ellipse at 80% 80%,rgba(26,32,64,0.8) 0%,transparent 50%);
    pointer-events:none;z-index:0}

  /* Top progress bar */
  .progress-track{position:fixed;top:0;left:0;right:0;height:3px;background:var(--border);z-index:100}
  .progress-fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold2));transition:width 0.5s ease;width:20%}

  /* Header */
  .header{position:relative;z-index:1;text-align:center;padding:48px 20px 32px;border-bottom:1px solid var(--border)}
  .header-badge{display:inline-block;border:1px solid var(--gold);padding:5px 16px;border-radius:2px;margin-bottom:14px}
  .header-badge span{color:var(--gold);font-size:10px;letter-spacing:4px;text-transform:uppercase}
  .header h1{font-family:'Playfair Display',serif;font-size:28px;color:var(--gold2);letter-spacing:3px;text-transform:uppercase;font-weight:600}
  .header h2{font-family:'Playfair Display',serif;font-size:28px;color:#fff;letter-spacing:3px;text-transform:uppercase;font-weight:400;margin-top:2px}
  .header-sub{color:var(--muted);font-size:13px;letter-spacing:2px;text-transform:uppercase;margin-top:12px}

  /* Step indicators */
  .steps{display:flex;justify-content:center;gap:0;padding:28px 20px;position:relative;z-index:1;overflow-x:auto}
  .step-item{display:flex;flex-direction:column;align-items:center;min-width:80px;position:relative}
  .step-item:not(:last-child)::after{content:'';position:absolute;top:14px;left:calc(50% + 14px);width:calc(100% - 28px);height:1px;background:var(--border)}
  .step-item.active .step-circle{background:var(--gold);color:var(--navy);border-color:var(--gold)}
  .step-item.done .step-circle{background:var(--success);border-color:var(--success);color:#fff}
  .step-circle{width:28px;height:28px;border-radius:50%;border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--muted);transition:all 0.3s;position:relative;z-index:1;background:var(--navy2)}
  .step-label{font-size:10px;color:var(--muted);margin-top:6px;text-align:center;max-width:70px;line-height:1.3;letter-spacing:0.5px}
  .step-item.active .step-label{color:var(--gold)}

  /* Main container */
  .container{max-width:720px;margin:0 auto;padding:0 20px 80px;position:relative;z-index:1}

  /* Step panels */
  .step-panel{display:none;animation:fadeIn 0.4s ease}
  .step-panel.active{display:block}
  @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

  /* Card */
  .card{background:var(--navy2);border:1px solid var(--border);border-radius:10px;padding:36px;margin-top:8px}
  .card-header{margin-bottom:28px}
  .card-step{color:var(--gold);font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px}
  .card-title{font-family:'Playfair Display',serif;font-size:22px;color:#fff;font-weight:400}
  .card-desc{color:var(--muted);font-size:13px;margin-top:6px;line-height:1.6}

  /* Form grid */
  .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  .form-grid .full{grid-column:1/-1}
  @media(max-width:560px){.form-grid{grid-template-columns:1fr}}

  /* Form fields */
  .field{display:flex;flex-direction:column;gap:6px}
  .field label{font-size:12px;color:var(--muted);letter-spacing:1px;text-transform:uppercase}
  .field label .req{color:var(--gold);margin-left:3px}
  .field input,.field select,.field textarea{
    background:#0d1220;border:1px solid var(--border);border-radius:6px;
    color:var(--text);font-family:'Inter',sans-serif;font-size:14px;
    padding:12px 14px;transition:border-color 0.2s,box-shadow 0.2s;outline:none;width:100%
  }
  .field input:focus,.field select:focus,.field textarea:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,168,76,0.1)}
  .field input[readonly]{color:var(--gold);cursor:default;border-color:rgba(201,168,76,0.3)}
  .field input.valid{border-color:var(--success)}
  .field input.invalid{border-color:var(--error)}
  .field textarea{resize:vertical;min-height:100px}
  .field select option{background:#111827}
  .field .hint{font-size:11px;color:var(--muted);margin-top:2px}
  .word-count{font-size:11px;color:var(--muted);text-align:right;margin-top:3px}

  /* Upload zones */
  .upload-zone{border:2px dashed var(--gold);border-radius:8px;padding:28px;text-align:center;cursor:pointer;transition:all 0.2s;position:relative;background:rgba(201,168,76,0.02)}
  .upload-zone:hover{background:rgba(201,168,76,0.06);border-color:var(--gold2)}
  .upload-zone input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
  .upload-zone .uz-icon{font-size:28px;margin-bottom:8px}
  .upload-zone .uz-title{color:var(--gold);font-size:14px;font-weight:500;margin-bottom:4px}
  .upload-zone .uz-sub{color:var(--muted);font-size:12px}
  .upload-zone.uploaded{border-color:var(--success);background:rgba(34,197,94,0.05)}
  .upload-done{display:flex;align-items:center;gap:10px;background:#0d1220;border:1px solid var(--success);border-radius:6px;padding:10px 14px;margin-top:8px}
  .upload-done .check{color:var(--success);font-size:16px}
  .upload-done .fname{color:#fff;font-size:13px}
  .upload-done .fsize{color:var(--muted);font-size:11px;margin-left:auto}
  .upload-optional{opacity:0.7}

  /* AI Assessment */
  .ai-init{text-align:center;padding:40px 0}
  .ai-spinner{display:inline-block;width:48px;height:48px;border:3px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:20px}
  @keyframes spin{to{transform:rotate(360deg)}}
  .ai-init h3{color:var(--gold2);font-family:'Playfair Display',serif;font-size:18px;margin-bottom:8px}
  .ai-init p{color:var(--muted);font-size:13px}
  .ai-results{display:none}
  .score-row{margin-bottom:18px}
  .score-row-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .score-label{color:var(--text);font-size:13px}
  .score-val{color:var(--gold);font-size:13px;font-weight:600}
  .score-bar-track{background:var(--border);border-radius:99px;height:6px;overflow:hidden}
  .score-bar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--gold),var(--gold2));width:0;transition:width 1s ease}
  .score-badge{display:inline-flex;align-items:center;gap:6px;color:var(--success);font-size:13px}
  .ai-result-card{background:linear-gradient(135deg,#0d1a0d,#0a1a0a);border:1px solid var(--success);border-radius:10px;padding:28px;text-align:center;margin-top:28px;display:none}
  .ai-result-card .eligible-badge{display:inline-block;background:var(--success);color:#fff;font-size:12px;letter-spacing:3px;text-transform:uppercase;padding:6px 20px;border-radius:3px;margin-bottom:14px}
  .ai-result-card .score-big{font-family:'Playfair Display',serif;font-size:52px;color:var(--gold2);line-height:1}
  .ai-result-card .score-label2{color:var(--muted);font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-top:4px}
  .ai-result-card p{color:#a0aec0;font-size:14px;margin-top:12px}

  /* Declaration */
  .decl-text{background:#0d1220;border:1px solid var(--border);border-radius:6px;padding:20px;color:var(--muted);font-size:13px;line-height:1.8;margin-bottom:24px}
  .decl-text strong{color:var(--text)}
  .checkbox-row{display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;cursor:pointer}
  .checkbox-row input[type=checkbox]{width:18px;height:18px;accent-color:var(--gold);margin-top:2px;flex-shrink:0;cursor:pointer}
  .checkbox-row label{color:var(--text);font-size:14px;line-height:1.5;cursor:pointer}
  .ref-badge{display:flex;align-items:center;justify-content:space-between;background:#111827;border:1px solid var(--gold);border-radius:6px;padding:16px 20px;margin:24px 0}
  .ref-badge-label{color:var(--muted);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px}
  .ref-badge-val{color:var(--gold2);font-size:18px;font-family:'Playfair Display',serif;letter-spacing:2px}
  .ref-badge-pill{background:var(--gold);color:var(--navy);font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:4px 12px;border-radius:3px;font-weight:600}
  .sig-field input{font-style:italic;font-size:18px;letter-spacing:1px;color:var(--gold2) !important;font-family:'Playfair Display',serif !important}

  /* Buttons */
  .btn-row{display:flex;gap:12px;margin-top:28px}
  .btn-back{flex:0 0 auto;background:transparent;border:1px solid var(--border);color:var(--muted);padding:14px 24px;border-radius:6px;cursor:pointer;font-size:14px;transition:all 0.2s}
  .btn-back:hover{border-color:var(--gold);color:var(--gold)}
  .btn-next{flex:1;background:linear-gradient(135deg,var(--gold),var(--gold2),var(--gold));color:var(--navy);padding:16px 32px;border:none;border-radius:6px;cursor:pointer;font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:'Inter',sans-serif;transition:all 0.2s;box-shadow:0 4px 20px rgba(201,168,76,0.2)}
  .btn-next:hover{box-shadow:0 6px 28px rgba(201,168,76,0.4);transform:translateY(-1px)}
  .btn-next:disabled{opacity:0.5;cursor:not-allowed;transform:none}

  /* Success */
  .success-screen{display:none;text-align:center;padding:60px 20px;position:relative;z-index:1}
  .success-screen.show{display:block;animation:fadeIn 0.6s ease}
  .success-check{width:80px;height:80px;border-radius:50%;border:3px solid var(--success);display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 28px;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)}50%{box-shadow:0 0 0 14px rgba(34,197,94,0)}}
  .success-screen h1{font-family:'Playfair Display',serif;font-size:32px;color:var(--gold2);letter-spacing:3px;text-transform:uppercase;margin-bottom:10px}
  .success-screen h2{font-family:'Playfair Display',serif;font-size:20px;color:#fff;font-weight:400;margin-bottom:28px}
  .success-ref{display:inline-block;background:#111827;border:1px solid var(--gold);border-radius:6px;padding:12px 28px;color:var(--gold2);font-size:16px;letter-spacing:2px;margin-bottom:28px}
  .success-info{background:var(--navy2);border:1px solid var(--border);border-radius:8px;padding:24px;max-width:480px;margin:0 auto 28px;text-align:left}
  .success-info p{color:#a0aec0;font-size:14px;line-height:1.7;margin-bottom:10px}
  .success-info p:last-child{margin-bottom:0}
  .success-info strong{color:var(--gold)}
  .btn-home{display:inline-block;background:linear-gradient(135deg,var(--gold),var(--gold2));color:var(--navy);text-decoration:none;padding:14px 36px;border-radius:6px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-size:14px;margin-top:8px}

  /* Error / loading */
  .form-error{background:rgba(239,68,68,0.1);border:1px solid var(--error);border-radius:6px;padding:12px 16px;color:#fca5a5;font-size:13px;margin-top:16px;display:none}
  .submitting-overlay{display:none;position:fixed;inset:0;background:rgba(6,11,23,0.9);z-index:200;align-items:center;justify-content:center;flex-direction:column;gap:20px}
  .submitting-overlay.show{display:flex}
  .submitting-overlay h3{color:var(--gold2);font-family:'Playfair Display',serif;font-size:20px}
  .submitting-overlay p{color:var(--muted);font-size:13px}

  /* Scrollbar */
  ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:var(--navy)}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
</style>
</head>
<body>

<!-- Progress Bar -->
<div class="progress-track"><div class="progress-fill" id="progressBar"></div></div>

<!-- Submitting Overlay -->
<div class="submitting-overlay" id="submittingOverlay">
  <div class="ai-spinner"></div>
  <h3>Submitting your application…</h3>
  <p>Transmitting to Prime Endorsement Authority secure servers</p>
</div>

<!-- Header -->
<div class="header">
  <div class="header-badge"><span>Sovereign Digital Authority</span></div>
  <h1>PRIME ENDORSEMENT</h1>
  <h2>AUTHORITY</h2>
  <div class="header-sub">AI-Powered Application Portal</div>
</div>

<!-- Step Indicators -->
<div class="steps" id="stepIndicators">
  <div class="step-item active" data-step="1">
    <div class="step-circle">1</div>
    <div class="step-label">Identity</div>
  </div>
  <div class="step-item" data-step="2">
    <div class="step-circle">2</div>
    <div class="step-label">Venture</div>
  </div>
  <div class="step-item" data-step="3">
    <div class="step-circle">3</div>
    <div class="step-label">Documents</div>
  </div>
  <div class="step-item" data-step="4">
    <div class="step-circle">4</div>
    <div class="step-label">AI Assessment</div>
  </div>
  <div class="step-item" data-step="5">
    <div class="step-circle">5</div>
    <div class="step-label">Declaration</div>
  </div>
</div>

<!-- Container -->
<div class="container" id="mainForm">

  <!-- ── STEP 1: IDENTITY ── -->
  <div class="step-panel active" id="panel1">
    <div class="card">
      <div class="card-header">
        <div class="card-step">Step 1 of 5 — Identity Verification</div>
        <div class="card-title">Personal Identity</div>
        <div class="card-desc">Please provide your legal identity details. All information is encrypted and securely processed.</div>
      </div>
      <div class="form-grid">
        <div class="field full">
          <label>Full Legal Name <span class="req">*</span></label>
          <input type="text" id="fullName" placeholder="As it appears on your government ID" required/>
        </div>
        <div class="field full">
          <label>Email Address <span class="req">*</span></label>
          <input type="email" id="emailField" value="${email}" readonly placeholder="your@email.com"/>
          <div class="hint">🔒 Verified — linked to your invitation</div>
        </div>
        <div class="field">
          <label>Date of Birth <span class="req">*</span></label>
          <input type="date" id="dob" required/>
        </div>
        <div class="field">
          <label>Nationality <span class="req">*</span></label>
          <select id="nationality" required>
            <option value="">Select country…</option>
            <option>🇬🇧 United Kingdom</option><option>🇺🇸 United States</option><option>🇨🇦 Canada</option>
            <option>🇦🇺 Australia</option><option>🇩🇪 Germany</option><option>🇫🇷 France</option>
            <option>🇳🇬 Nigeria</option><option>🇬🇭 Ghana</option><option>🇿🇦 South Africa</option>
            <option>🇮🇳 India</option><option>🇸🇬 Singapore</option><option>🇦🇪 United Arab Emirates</option>
            <option>🇯🇵 Japan</option><option>🇧🇷 Brazil</option><option>🇲🇽 Mexico</option>
            <option>🇮🇹 Italy</option><option>🇪🇸 Spain</option><option>🇳🇱 Netherlands</option>
            <option>🇸🇪 Sweden</option><option>🇨🇭 Switzerland</option><option>Other</option>
          </select>
        </div>
        <div class="field">
          <label>Phone Number <span class="req">*</span></label>
          <input type="tel" id="phone" placeholder="+44 7700 900000" required/>
        </div>
        <div class="field">
          <label>LinkedIn Profile</label>
          <input type="url" id="linkedin" placeholder="https://linkedin.com/in/yourname"/>
        </div>
        <div class="field full">
          <label>How did you hear about us? <span class="req">*</span></label>
          <select id="referral" required>
            <option value="">Select…</option>
            <option>Direct invitation</option>
            <option>LinkedIn</option>
            <option>Referral from a member</option>
            <option>Search engine</option>
            <option>Conference or event</option>
            <option>Press or media</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn-next" onclick="nextStep(1)">Continue to Venture Details →</button>
      </div>
    </div>
  </div>

  <!-- ── STEP 2: VENTURE ── -->
  <div class="step-panel" id="panel2">
    <div class="card">
      <div class="card-header">
        <div class="card-step">Step 2 of 5 — Venture Intelligence</div>
        <div class="card-title">Your Venture</div>
        <div class="card-desc">Tell us about your company or venture. This information powers our AI eligibility assessment.</div>
      </div>
      <div class="form-grid">
        <div class="field full">
          <label>Company / Venture Name <span class="req">*</span></label>
          <input type="text" id="companyName" placeholder="Legal or trading name" required/>
        </div>
        <div class="field">
          <label>Registered Business Number</label>
          <input type="text" id="regNumber" placeholder="Optional"/>
        </div>
        <div class="field">
          <label>Website URL</label>
          <input type="url" id="website" placeholder="https://yourdomain.com"/>
        </div>
        <div class="field">
          <label>Industry Sector <span class="req">*</span></label>
          <select id="sector" required>
            <option value="">Select sector…</option>
            <option>FinTech</option><option>PropTech</option><option>HealthTech</option>
            <option>EdTech</option><option>CleanTech</option><option>AI / Machine Learning</option>
            <option>Web3 / Blockchain</option><option>Consumer</option><option>B2B SaaS</option>
            <option>Deep Tech</option><option>BioTech</option><option>LegalTech</option><option>Other</option>
          </select>
        </div>
        <div class="field">
          <label>Current Stage <span class="req">*</span></label>
          <select id="stage" required>
            <option value="">Select stage…</option>
            <option>Pre-Idea / Concept</option><option>Pre-Seed</option><option>Seed</option>
            <option>Series A</option><option>Series B+</option><option>Growth</option><option>Established</option>
          </select>
        </div>
        <div class="field">
          <label>Headquarters Country <span class="req">*</span></label>
          <select id="hqCountry" required>
            <option value="">Select country…</option>
            <option>🇬🇧 United Kingdom</option><option>🇺🇸 United States</option><option>🇨🇦 Canada</option>
            <option>🇦🇺 Australia</option><option>🇩🇪 Germany</option><option>🇫🇷 France</option>
            <option>🇳🇬 Nigeria</option><option>🇬🇭 Ghana</option><option>🇿🇦 South Africa</option>
            <option>🇮🇳 India</option><option>🇸🇬 Singapore</option><option>🇦🇪 UAE</option><option>Other</option>
          </select>
        </div>
        <div class="field">
          <label>Founded Year</label>
          <input type="number" id="foundedYear" placeholder="e.g. 2022" min="1990" max="2026"/>
        </div>
        <div class="field">
          <label>Team Size</label>
          <select id="teamSize">
            <option value="">Select…</option>
            <option>Solo founder</option><option>2–5</option><option>6–20</option>
            <option>21–50</option><option>51–200</option><option>200+</option>
          </select>
        </div>
        <div class="field">
          <label>Total Funding Raised (£ GBP)</label>
          <input type="text" id="funding" placeholder="e.g. £250,000 or Pre-revenue"/>
        </div>
        <div class="field full">
          <label>Executive Summary <span class="req">*</span></label>
          <textarea id="execSummary" placeholder="Describe your venture, its mission, and what makes it distinctive. (300 words max)" maxlength="1800" oninput="updateCount('execSummary','execCount',300)" required></textarea>
          <div class="word-count"><span id="execCount">0</span> / 300 words</div>
        </div>
        <div class="field full">
          <label>What problem does your venture solve? <span class="req">*</span></label>
          <textarea id="problemStatement" placeholder="Describe the core problem and your solution. (200 words max)" maxlength="1200" oninput="updateCount('problemStatement','probCount',200)" required></textarea>
          <div class="word-count"><span id="probCount">0</span> / 200 words</div>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn-back" onclick="prevStep(2)">← Back</button>
        <button class="btn-next" onclick="nextStep(2)">Continue to Documents →</button>
      </div>
    </div>
  </div>

  <!-- ── STEP 3: DOCUMENTS ── -->
  <div class="step-panel" id="panel3">
    <div class="card">
      <div class="card-header">
        <div class="card-step">Step 3 of 5 — Document Submission</div>
        <div class="card-title">Supporting Documents</div>
        <div class="card-desc">Please upload the required documents. Files are encrypted and only accessible to authorised reviewers.</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:20px">
        <!-- Doc 1 -->
        <div>
          <label style="font-size:12px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:8px">Government-Issued Photo ID <span style="color:var(--gold)">*</span></label>
          <div class="upload-zone" id="zone1" ondragover="event.preventDefault()" ondrop="handleDrop(event,'doc1','zone1','done1')">
            <input type="file" id="doc1" accept=".pdf,.jpg,.jpeg,.png" onchange="handleFile(this,'zone1','done1')"/>
            <div class="uz-icon">🪪</div>
            <div class="uz-title">Passport or National ID</div>
            <div class="uz-sub">PDF, JPG or PNG — drag & drop or click to browse</div>
          </div>
          <div class="upload-done" id="done1" style="display:none">
            <span class="check">✓</span>
            <span class="fname" id="fname1">—</span>
            <span class="fsize" id="fsize1">—</span>
          </div>
        </div>

        <!-- Doc 2 -->
        <div>
          <label style="font-size:12px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:8px">Proof of Address <span style="color:var(--gold)">*</span></label>
          <div class="upload-zone" id="zone2" ondragover="event.preventDefault()" ondrop="handleDrop(event,'doc2','zone2','done2')">
            <input type="file" id="doc2" accept=".pdf,.jpg,.jpeg,.png" onchange="handleFile(this,'zone2','done2')"/>
            <div class="uz-icon">🏠</div>
            <div class="uz-title">Utility Bill or Bank Statement</div>
            <div class="uz-sub">Dated within the last 90 days</div>
          </div>
          <div class="upload-done" id="done2" style="display:none">
            <span class="check">✓</span>
            <span class="fname" id="fname2">—</span>
            <span class="fsize" id="fsize2">—</span>
          </div>
        </div>

        <!-- Doc 3 (optional) -->
        <div class="upload-optional">
          <label style="font-size:12px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:8px">Company Registration Certificate <span style="color:var(--muted);font-size:10px">(recommended)</span></label>
          <div class="upload-zone" id="zone3" ondragover="event.preventDefault()" ondrop="handleDrop(event,'doc3','zone3','done3')">
            <input type="file" id="doc3" accept=".pdf,.jpg,.jpeg,.png" onchange="handleFile(this,'zone3','done3')"/>
            <div class="uz-icon">📄</div>
            <div class="uz-title">Certificate of Incorporation</div>
            <div class="uz-sub">Optional but strengthens your application</div>
          </div>
          <div class="upload-done" id="done3" style="display:none">
            <span class="check">✓</span>
            <span class="fname" id="fname3">—</span>
            <span class="fsize" id="fsize3">—</span>
          </div>
        </div>

        <!-- Doc 4 (optional) -->
        <div class="upload-optional">
          <label style="font-size:12px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:8px">Pitch Deck or Business Plan <span style="color:var(--muted);font-size:10px">(optional)</span></label>
          <div class="upload-zone" id="zone4" ondragover="event.preventDefault()" ondrop="handleDrop(event,'doc4','zone4','done4')">
            <input type="file" id="doc4" accept=".pdf,.pptx,.ppt" onchange="handleFile(this,'zone4','done4')"/>
            <div class="uz-icon">📊</div>
            <div class="uz-title">Pitch Deck or Business Plan</div>
            <div class="uz-sub">PDF or PowerPoint</div>
          </div>
          <div class="upload-done" id="done4" style="display:none">
            <span class="check">✓</span>
            <span class="fname" id="fname4">—</span>
            <span class="fsize" id="fsize4">—</span>
          </div>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn-back" onclick="prevStep(3)">← Back</button>
        <button class="btn-next" onclick="nextStep(3)">Continue to AI Assessment →</button>
      </div>
    </div>
  </div>

  <!-- ── STEP 4: AI ASSESSMENT ── -->
  <div class="step-panel" id="panel4">
    <div class="card">
      <div class="card-header">
        <div class="card-step">Step 4 of 5 — AI Eligibility Assessment</div>
        <div class="card-title">Prime Intelligence Engine</div>
        <div class="card-desc">Our sovereign AI is analysing your application against global endorsement criteria.</div>
      </div>

      <div class="ai-init" id="aiInit">
        <div class="ai-spinner"></div>
        <h3>Initialising Prime Intelligence Engine…</h3>
        <p id="aiStatusText">Connecting to secure assessment servers</p>
      </div>

      <div class="ai-results" id="aiResults">
        <div class="score-row"><div class="score-row-head"><span class="score-label">Identity Confidence</span><span class="score-val" id="sv1">—</span></div><div class="score-bar-track"><div class="score-bar-fill" id="sb1" data-target="94"></div></div></div>
        <div class="score-row"><div class="score-row-head"><span class="score-label">Venture Viability</span><span class="score-val" id="sv2">—</span></div><div class="score-bar-track"><div class="score-bar-fill" id="sb2" data-target="88"></div></div></div>
        <div class="score-row"><div class="score-row-head"><span class="score-label">Document Authenticity</span><span class="score-val" id="sv3">—</span></div><div class="score-bar-track"><div class="score-bar-fill" id="sb3" data-target="97"></div></div></div>
        <div class="score-row"><div class="score-row-head"><span class="score-label">Risk Profile</span><span class="score-val score-badge" id="sv4">—</span></div><div class="score-bar-track"><div class="score-bar-fill" id="sb4" data-target="92"></div></div></div>
        <div class="score-row"><div class="score-row-head"><span class="score-label">Global Compliance</span><span class="score-val score-badge" id="sv5">—</span></div><div class="score-bar-track"><div class="score-bar-fill" id="sb5" data-target="100"></div></div></div>
        <div class="score-row"><div class="score-row-head"><span class="score-label">Endorsement Eligibility</span><span class="score-val score-badge" id="sv6">—</span></div><div class="score-bar-track"><div class="score-bar-fill" id="sb6" data-target="91"></div></div></div>

        <div class="ai-result-card" id="aiResultCard">
          <div class="eligible-badge">ELIGIBLE</div>
          <div class="score-big">91</div>
          <div class="score-label2">Overall Endorsement Score</div>
          <p>Your application has passed AI pre-screening and qualifies for Prime Endorsement Authority review.</p>
        </div>
      </div>

      <div class="btn-row" id="aiNextBtn" style="display:none">
        <button class="btn-back" onclick="prevStep(4)">← Back</button>
        <button class="btn-next" onclick="nextStep(4)">Proceed to Declaration →</button>
      </div>
    </div>
  </div>

  <!-- ── STEP 5: DECLARATION ── -->
  <div class="step-panel" id="panel5">
    <div class="card">
      <div class="card-header">
        <div class="card-step">Step 5 of 5 — Declaration & Submission</div>
        <div class="card-title">Official Declaration</div>
        <div class="card-desc">Please read and confirm the declaration below before submitting your application.</div>
      </div>

      <div class="decl-text" id="declText">
        I, <strong id="declName">[Your Name]</strong>, hereby declare that all information provided in this application is true, accurate, and complete to the best of my knowledge. I understand that any false, misleading, or incomplete declaration may result in the immediate disqualification of my application and may be subject to applicable legal proceedings. I consent to Prime Endorsement Authority processing my personal and business data for the purpose of eligibility assessment, identity verification, and regulatory compliance, in accordance with applicable data protection legislation including the UK GDPR and the Data Protection Act 2018.
      </div>

      <div class="checkbox-row">
        <input type="checkbox" id="check1"/>
        <label for="check1">I confirm the above declaration is true, accurate, and complete</label>
      </div>
      <div class="checkbox-row">
        <input type="checkbox" id="check2"/>
        <label for="check2">I agree to the <a href="https://primeendorsement.com/terms" style="color:var(--gold)">Terms & Conditions</a> and <a href="https://primeendorsement.com/privacy" style="color:var(--gold)">Privacy Policy</a> of Prime Endorsement Authority</label>
      </div>
      <div class="checkbox-row">
        <input type="checkbox" id="check3"/>
        <label for="check3">I consent to identity verification and document analysis by AI-powered systems operated by Prime Endorsement Authority</label>
      </div>

      <div class="ref-badge">
        <div>
          <div class="ref-badge-label">Application Reference</div>
          <div class="ref-badge-val">${ref || 'PEA-2026-XXXXXX'}</div>
        </div>
        <div class="ref-badge-pill">ACTIVE</div>
      </div>

      <div class="field sig-field">
        <label>Digital Signature <span class="req">*</span></label>
        <input type="text" id="signature" placeholder="Type your full legal name to sign digitally" required/>
        <div class="hint">Your typed name constitutes a legally binding digital signature</div>
      </div>

      <div class="form-error" id="formError"></div>

      <div class="btn-row">
        <button class="btn-back" onclick="prevStep(5)">← Back</button>
        <button class="btn-next" id="submitBtn" onclick="submitApplication()">
          SUBMIT APPLICATION & PROCEED TO PAYMENT
        </button>
      </div>
    </div>
  </div>

</div><!-- /container -->

<!-- Success Screen -->
<div class="success-screen" id="successScreen">
  <div class="success-check">✓</div>
  <h1>APPLICATION RECEIVED</h1>
  <h2 id="successGreeting">Welcome to Prime Endorsement Authority</h2>
  <div class="success-ref" id="successRef">${ref || 'PEA-2026-XXXXXX'}</div>
  <div class="success-info">
    <p>🕐 Our expert panel will review your application within <strong>5–7 business days</strong>.</p>
    <p>📧 A secure payment link will be sent to <strong>${email || 'your email'}</strong> to complete your registration fee of <strong>£1,200.00 (inc. VAT)</strong>.</p>
    <p>🔒 Your reference code is your unique application identifier. Keep it safe.</p>
  </div>
  <a href="https://primeendorsement.com" class="btn-home">Return to Prime Endorsement Authority →</a>
</div>

<script>
  let currentStep = 1;
  const totalSteps = 5;
  const uploadedFiles = {};

  // ── Utilities ──
  function updateCount(textareaId, counterId, maxWords) {
    const words = document.getElementById(textareaId).value.trim().split(/\s+/).filter(w => w.length > 0);
    document.getElementById(counterId).textContent = words.length;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function handleFile(input, zoneId, doneId) {
    const file = input.files[0];
    if (!file) return;
    const num = doneId.replace('done','');
    uploadedFiles['doc' + num] = file.name;
    document.getElementById('fname' + num).textContent = file.name;
    document.getElementById('fsize' + num).textContent = formatFileSize(file.size);
    document.getElementById(doneId).style.display = 'flex';
    document.getElementById(zoneId).classList.add('uploaded');
  }

  function handleDrop(event, inputId, zoneId, doneId) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const input = document.getElementById(inputId);
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    handleFile(input, zoneId, doneId);
  }

  // ── Step navigation ──
  function setStep(step) {
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel' + step).classList.add('active');
    const pct = (step / totalSteps) * 100;
    document.getElementById('progressBar').style.width = pct + '%';
    document.querySelectorAll('.step-item').forEach(item => {
      const n = parseInt(item.dataset.step);
      item.classList.remove('active','done');
      if (n === step) item.classList.add('active');
      if (n < step) item.classList.add('done');
      if (n < step) item.querySelector('.step-circle').textContent = '✓';
      else item.querySelector('.step-circle').textContent = n;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    currentStep = step;
    if (step === 4) runAIAssessment();
  }

  function nextStep(from) {
    if (!validateStep(from)) return;
    setStep(from + 1);
  }

  function prevStep(from) {
    setStep(from - 1);
  }

  // ── Validation ──
  function validateStep(step) {
    if (step === 1) {
      if (!document.getElementById('fullName').value.trim()) return alert('Please enter your full legal name.'), false;
      if (!document.getElementById('dob').value) return alert('Please enter your date of birth.'), false;
      if (!document.getElementById('nationality').value) return alert('Please select your nationality.'), false;
      if (!document.getElementById('phone').value.trim()) return alert('Please enter your phone number.'), false;
      if (!document.getElementById('referral').value) return alert('Please tell us how you heard about us.'), false;
      document.getElementById('declName').textContent = document.getElementById('fullName').value;
    }
    if (step === 2) {
      if (!document.getElementById('companyName').value.trim()) return alert('Please enter your company name.'), false;
      if (!document.getElementById('sector').value) return alert('Please select your industry sector.'), false;
      if (!document.getElementById('stage').value) return alert('Please select your current stage.'), false;
      if (!document.getElementById('hqCountry').value) return alert('Please select your headquarters country.'), false;
      if (!document.getElementById('execSummary').value.trim()) return alert('Please provide your executive summary.'), false;
      if (!document.getElementById('problemStatement').value.trim()) return alert('Please describe the problem your venture solves.'), false;
    }
    if (step === 3) {
      if (!uploadedFiles['doc1']) return alert('Please upload your government-issued photo ID.'), false;
      if (!uploadedFiles['doc2']) return alert('Please upload your proof of address.'), false;
    }
    return true;
  }

  // ── AI Assessment Animation ──
  function runAIAssessment() {
    const statuses = [
      'Connecting to secure assessment servers…',
      'Verifying identity parameters…',
      'Analysing venture intelligence data…',
      'Cross-referencing global compliance database…',
      'Computing endorsement eligibility score…',
      'Finalising Prime Intelligence Report…'
    ];
    const scores = [
      { id: 'sb1', val: 'sv1', label: '94%', target: 94 },
      { id: 'sb2', val: 'sv2', label: '88%', target: 88 },
      { id: 'sb3', val: 'sv3', label: '97%', target: 97 },
      { id: 'sb4', val: 'sv4', label: '✓ Low Risk', target: 92 },
      { id: 'sb5', val: 'sv5', label: '✓ Passed', target: 100 },
      { id: 'sb6', val: 'sv6', label: '✓ Qualified', target: 91 },
    ];

    let si = 0;
    const ticker = setInterval(() => {
      if (si < statuses.length) {
        document.getElementById('aiStatusText').textContent = statuses[si++];
      } else clearInterval(ticker);
    }, 600);

    setTimeout(() => {
      document.getElementById('aiInit').style.display = 'none';
      document.getElementById('aiResults').style.display = 'block';
      scores.forEach((s, i) => {
        setTimeout(() => {
          document.getElementById(s.id).style.width = s.target + '%';
          setTimeout(() => { document.getElementById(s.val).textContent = s.label; }, 600);
          if (i === scores.length - 1) {
            setTimeout(() => {
              document.getElementById('aiResultCard').style.display = 'block';
              document.getElementById('aiNextBtn').style.display = 'flex';
            }, 900);
          }
        }, i * 600);
      });
    }, 3800);
  }

  // ── Submit ──
  async function submitApplication() {
    const sig = document.getElementById('signature').value.trim();
    if (!document.getElementById('check1').checked) return showError('Please confirm the declaration.');
    if (!document.getElementById('check2').checked) return showError('Please agree to the Terms & Conditions.');
    if (!document.getElementById('check3').checked) return showError('Please consent to AI verification.');
    if (!sig) return showError('Please provide your digital signature.');

    const fullName = document.getElementById('fullName').value;
    if (sig.toLowerCase() !== fullName.toLowerCase())
      return showError('Your signature must exactly match your full legal name: ' + fullName);

    document.getElementById('submittingOverlay').classList.add('show');

    const payload = {
      full_name: fullName,
      email: document.getElementById('emailField').value,
      dob: document.getElementById('dob').value,
      nationality: document.getElementById('nationality').value,
      phone: document.getElementById('phone').value,
      linkedin: document.getElementById('linkedin').value,
      referral: document.getElementById('referral').value,
      company_name: document.getElementById('companyName').value,
      reg_number: document.getElementById('regNumber').value,
      sector: document.getElementById('sector').value,
      stage: document.getElementById('stage').value,
      hq_country: document.getElementById('hqCountry').value,
      website: document.getElementById('website').value,
      founded_year: document.getElementById('foundedYear').value,
      team_size: document.getElementById('teamSize').value,
      funding_raised: document.getElementById('funding').value,
      exec_summary: document.getElementById('execSummary').value,
      problem_statement: document.getElementById('problemStatement').value,
      documents_uploaded: Object.keys(uploadedFiles),
      digital_signature: sig,
      token: '${token}',
      reference_code: '${ref}',
      ai_score: 91,
      submitted_at: new Date().toISOString()
    };

    try {
      const resp = await fetch('${formAction}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      document.getElementById('submittingOverlay').classList.remove('show');
      document.getElementById('mainForm').style.display = 'none';
      document.querySelector('.steps').style.display = 'none';
      document.getElementById('progressBar').style.width = '100%';
      const firstName = fullName.split(' ')[0];
      document.getElementById('successGreeting').textContent = 'Welcome to Prime Endorsement Authority, ' + firstName;
      document.getElementById('successRef').textContent = 'REF: ${ref}';
      document.getElementById('successScreen').classList.add('show');
    } catch(e) {
      document.getElementById('submittingOverlay').classList.remove('show');
      showError('Submission failed. Please try again or contact admin@primeendorsement.com');
    }
  }

  function showError(msg) {
    const el = document.getElementById('formError');
    el.textContent = msg;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Pre-fill email display
  window.addEventListener('DOMContentLoaded', () => {
    const emailEl = document.getElementById('emailField');
    if ('${email}') emailEl.value = decodeURIComponent('${email}');
  });
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
      "Cache-Control": "no-store",
    },
  });
}
