/**
 * peaDocRequest v1 — PEA Secure Document Request Portal
 * 2026-06-04
 *
 * GET  ?ref=PEA-XXXX&token=XXX&docs=passport,passport_photo   → serve upload page
 * POST (multipart/form-data)                                   → receive & save documents
 * POST ?action=send  (JSON body)                               → send request email to applicant
 */

const BUILDER_APP = "69e2e852c48630e3502f13b1";
const AGENT_APP   = "6a14246111a4fa5e22999619";
const DOMAIN      = "https://primeendorsement.com";
const RESEND_URL  = "https://api.resend.com/emails";
const FROM_ADDR   = "Prime Endorsement Authority <admin@primeendorsement.com>";
const ADMIN_EMAIL = "admin@primeendorsement.com";

const HHTML = { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" };
const HJSON = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" };

const DOC_LABELS: Record<string, string> = {
  passport:              "Passport (Bio-data page)",
  passport_photo:        "Passport Photograph",
  proof_of_address:      "Proof of Address",
  business_registration: "Business Registration Certificate",
  business_plan:         "Business Plan",
  financial_projections: "Financial Projections",
  pitch_deck:            "Pitch Deck / Investor Presentation",
  additional:            "Additional Supporting Document",
};

const DOC_TO_FIELD: Record<string, string> = {
  passport:              "doc_passport_url",
  passport_photo:        "doc_passport_url",
  proof_of_address:      "doc_proof_address_url",
  business_registration: "doc_business_registration_url",
  business_plan:         "doc_business_plan_url",
  financial_projections: "doc_financial_projections_url",
  pitch_deck:            "doc_pitch_deck_url",
  additional:            "doc_additional_url",
};

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function listRecords(appId: string, serviceToken: string): Promise<any[]> {
  const res = await fetch(
    "https://app.base44.com/api/apps/" + appId + "/entities/Application",
    { headers: { Authorization: "Bearer " + serviceToken } }
  );
  if (!res.ok) return [];
  const body = await res.json();
  return Array.isArray(body) ? body : (body.data ?? []);
}

async function updateRecord(appId: string, recordId: string, serviceToken: string, data: object): Promise<void> {
  await fetch(
    "https://app.base44.com/api/apps/" + appId + "/entities/Application/" + recordId,
    {
      method: "PUT",
      headers: { Authorization: "Bearer " + serviceToken, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
}

function findApplication(records: any[], ref: string, token: string): any | null {
  return records.find(
    (r: any) =>
      r.reference_code === ref &&
      (r.session_token === token || r.invitation_token === token)
  ) ?? null;
}

// ─── Email helper ─────────────────────────────────────────────────────────────

async function sendEmail(resendKey: string, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + resendKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_ADDR, to: [to], subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Upload page HTML ─────────────────────────────────────────────────────────

function buildUploadPage(ref: string, token: string, requestedDocs: string[], adminNote: string): string {
  const docCards = requestedDocs.map(function(docKey) {
    const label = DOC_LABELS[docKey] || docKey;
    return [
      '<div class="card" id="card_' + docKey + '">',
      '<div class="card-row">',
      '<div class="card-icon">📄</div>',
      '<div class="card-info"><div class="card-name">' + label + '</div><div class="card-hint">PDF, JPG or PNG — max 10 MB</div></div>',
      '<div class="badge" id="badge_' + docKey + '">Required</div>',
      '</div>',
      '<div class="dropzone" id="zone_' + docKey + '" onclick="triggerPick(\'' + docKey + '\')">',
      '<div class="dz-icon">⬆</div>',
      '<div class="dz-text">Click to select file or drag and drop here</div>',
      '<input type="file" id="input_' + docKey + '" accept=".pdf,.jpg,.jpeg,.png" style="display:none" onchange="onFileSelected(\'' + docKey + '\', this)">',
      '</div>',
      '<div class="file-ready" id="ready_' + docKey + '" style="display:none"></div>',
      '</div>',
    ].join("");
  }).join("");

  const noteSection = adminNote
    ? '<div class="notice"><div class="notice-label">Note from Prime Endorsement Authority</div><div class="notice-body">' + adminNote + '</div></div>'
    : "";

  return "<!DOCTYPE html>" +
    '<html lang="en"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>Document Submission — Prime Endorsement Authority</title>" +
    "<style>" +
    "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }" +
    "body { background: #080d18; color: #e2e8f0; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; min-height: 100vh; padding: 28px 16px 64px; }" +
    ".container { max-width: 660px; margin: 0 auto; }" +
    ".header { text-align: center; margin-bottom: 36px; }" +
    ".logo { width: 56px; height: 56px; background: linear-gradient(135deg,#C9A84C,#a07c30); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 900; color: #080d18; margin-bottom: 12px; }" +
    ".brand { font-size: 11px; font-weight: 700; letter-spacing: .3em; color: #C9A84C; text-transform: uppercase; }" +
    ".page-title { font-size: 22px; font-weight: 700; color: #f1f5f9; margin: 14px 0 5px; }" +
    ".page-sub { font-size: 13px; color: #64748b; }" +
    ".ref-pill { display: inline-block; background: rgba(201,168,76,.1); border: 1px solid rgba(201,168,76,.3); color: #C9A84C; font-size: 11px; font-weight: 700; letter-spacing: .14em; padding: 4px 14px; border-radius: 20px; margin-top: 12px; }" +
    ".notice { background: rgba(201,168,76,.06); border: 1px solid rgba(201,168,76,.2); border-radius: 10px; padding: 16px 18px; margin-bottom: 24px; }" +
    ".notice-label { font-size: 10px; font-weight: 700; letter-spacing: .18em; color: #C9A84C; text-transform: uppercase; margin-bottom: 7px; }" +
    ".notice-body { font-size: 13px; color: #94a3b8; line-height: 1.65; }" +
    ".section-label { font-size: 11px; font-weight: 700; letter-spacing: .16em; color: #C9A84C; text-transform: uppercase; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid rgba(201,168,76,.15); }" +
    ".card { background: #0d1526; border: 1px solid rgba(201,168,76,.15); border-radius: 10px; padding: 18px; margin-bottom: 14px; transition: border-color .25s; }" +
    ".card.uploaded { border-color: rgba(34,197,94,.45); }" +
    ".card-row { display: flex; align-items: center; gap: 12px; margin-bottom: 13px; }" +
    ".card-icon { font-size: 20px; flex-shrink: 0; }" +
    ".card-info { flex: 1; }" +
    ".card-name { font-size: 14px; font-weight: 600; color: #e2e8f0; }" +
    ".card-hint { font-size: 11px; color: #475569; margin-top: 3px; }" +
    ".badge { font-size: 10px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; padding: 3px 9px; border-radius: 20px; background: rgba(239,68,68,.1); color: #ef4444; white-space: nowrap; }" +
    ".badge.done { background: rgba(34,197,94,.1); color: #22c55e; }" +
    ".dropzone { border: 2px dashed rgba(201,168,76,.22); border-radius: 8px; padding: 18px; text-align: center; cursor: pointer; transition: all .2s; }" +
    ".dropzone:hover { border-color: rgba(201,168,76,.55); background: rgba(201,168,76,.04); }" +
    ".dz-icon { font-size: 20px; color: #C9A84C; margin-bottom: 6px; }" +
    ".dz-text { font-size: 12px; color: #64748b; }" +
    ".file-ready { background: rgba(34,197,94,.06); border: 1px solid rgba(34,197,94,.22); border-radius: 6px; padding: 9px 13px; margin-top: 9px; font-size: 12px; color: #22c55e; }" +
    ".submit-btn { width: 100%; padding: 15px; background: linear-gradient(135deg,#C9A84C,#a07c30); color: #080d18; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; border: none; border-radius: 8px; cursor: pointer; margin-top: 24px; transition: opacity .2s; }" +
    ".submit-btn:disabled { opacity: .4; cursor: not-allowed; }" +
    ".progress-wrap { display: none; width: 100%; height: 4px; background: rgba(201,168,76,.14); border-radius: 2px; margin-top: 14px; overflow: hidden; }" +
    ".progress-bar { height: 100%; width: 0; background: linear-gradient(90deg,#C9A84C,#e8c97a); border-radius: 2px; transition: width .3s; }" +
    ".status-msg { text-align: center; font-size: 12px; color: #64748b; margin-top: 10px; min-height: 18px; }" +
    ".success { display: none; text-align: center; padding: 52px 16px; }" +
    ".success-icon { font-size: 54px; margin-bottom: 18px; }" +
    ".success-title { font-size: 22px; font-weight: 700; color: #22c55e; margin-bottom: 10px; }" +
    ".success-body { font-size: 13px; color: #64748b; line-height: 1.65; }" +
    ".footer-note { text-align: center; font-size: 10px; color: #334155; margin-top: 40px; line-height: 1.75; }" +
    "</style></head><body>" +
    '<div class="container">' +
    '<div class="header">' +
    '<div class="logo">P</div>' +
    '<div class="brand">Prime Endorsement Authority</div>' +
    '<div class="page-title">Document Submission Portal</div>' +
    '<div class="page-sub">Secure upload linked directly to your application portfolio</div>' +
    '<div class="ref-pill">REF: ' + ref + '</div>' +
    "</div>" +
    '<div id="main">' +
    noteSection +
    '<div class="section-label">Documents Requested</div>' +
    docCards +
    '<button class="submit-btn" id="submitBtn" disabled>Upload Documents to My Portfolio</button>' +
    '<div class="progress-wrap" id="progressWrap"><div class="progress-bar" id="progressBar"></div></div>' +
    '<div class="status-msg" id="statusMsg">Please upload all required documents above to continue.</div>' +
    "</div>" +
    '<div class="success" id="successScreen">' +
    '<div class="success-icon">✅</div>' +
    '<div class="success-title">Documents Submitted</div>' +
    '<div class="success-body">Your documents have been securely saved to your application portfolio.<br>The Prime Endorsement Authority team will review your submission shortly.<br><br><strong style="color:#C9A84C">Reference: ' + ref + '</strong></div>' +
    "</div>" +
    '<div class="footer-note">Prime Endorsement Authority — Secure Document Portal<br>This link is personal. Do not share it with others.<br>© 2026 Prime Endorsement Authority. All rights reserved.</div>' +
    "</div>" +
    "<script>" +
    'var REF="' + ref + '", TOKEN="' + token + '", DOCS=' + JSON.stringify(requestedDocs) + ', staged={};' +
    "function triggerPick(k){document.getElementById('input_'+k).click();}" +
    "function onFileSelected(k,el){" +
    "  var f=el.files[0]; if(!f) return;" +
    "  if(f.size>10485760){alert('File is too large — maximum 10 MB per document.');el.value='';return;}" +
    "  staged[k]=f;" +
    "  document.getElementById('ready_'+k).textContent='✅  '+f.name+' ('+(f.size/1024).toFixed(0)+' KB)';" +
    "  document.getElementById('ready_'+k).style.display='block';" +
    "  document.getElementById('zone_'+k).style.opacity='0.5';" +
    "  document.getElementById('badge_'+k).textContent='Ready'; document.getElementById('badge_'+k).className='badge done';" +
    "  document.getElementById('card_'+k).className='card uploaded';" +
    "  checkAllReady();" +
    "}" +
    "function checkAllReady(){" +
    "  var allDone=DOCS.every(function(d){return staged[d]!=null;});" +
    "  document.getElementById('submitBtn').disabled=!allDone;" +
    "  if(allDone) document.getElementById('statusMsg').textContent='All documents ready — click to submit your portfolio.';" +
    "}" +
    "document.getElementById('submitBtn').addEventListener('click',async function(){" +
    "  var btn=this; btn.disabled=true; btn.textContent='Uploading...';" +
    "  document.getElementById('progressWrap').style.display='block';" +
    "  document.getElementById('statusMsg').textContent='Uploading your documents securely...';" +
    "  var fd=new FormData();" +
    "  fd.append('ref',REF); fd.append('token',TOKEN);" +
    "  var idx=0; for(var k in staged){fd.append(k,staged[k]); idx++;}" +
    "  document.getElementById('progressBar').style.width='40%';" +
    "  try{" +
    "    var resp=await fetch(window.location.href,{method:'POST',body:fd});" +
    "    var data=await resp.json();" +
    "    document.getElementById('progressBar').style.width='100%';" +
    "    if(data.success){" +
    "      setTimeout(function(){document.getElementById('main').style.display='none';document.getElementById('successScreen').style.display='block';},600);" +
    "    } else {" +
    "      document.getElementById('statusMsg').textContent='Error: '+(data.error||'Upload failed. Please try again.');" +
    "      btn.disabled=false; btn.textContent='Upload Documents to My Portfolio';" +
    "    }" +
    "  } catch(e){" +
    "    document.getElementById('statusMsg').textContent='Network error — please check your connection and try again.';" +
    "    btn.disabled=false; btn.textContent='Upload Documents to My Portfolio';" +
    "  }" +
    "});" +
    "document.querySelectorAll('.dropzone').forEach(function(zone){" +
    "  zone.addEventListener('dragover',function(e){e.preventDefault();zone.style.borderColor='#C9A84C';});" +
    "  zone.addEventListener('dragleave',function(){zone.style.borderColor='';});" +
    "  zone.addEventListener('drop',function(e){" +
    "    e.preventDefault(); zone.style.borderColor='';" +
    "    var key=zone.id.replace('zone_',''), file=e.dataTransfer.files[0];" +
    "    if(file){var inp=document.getElementById('input_'+key);var dt=new DataTransfer();dt.items.add(file);inp.files=dt.files;onFileSelected(key,inp);}" +
    "  });" +
    "});" +
    "</script>" +
    "</body></html>";
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("OK", { headers: HJSON });

  const url        = new URL(req.url);
  const svcToken   = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
  const resendKey  = Deno.env.get("RESEND_API_KEY") || "";
  const actionParam = url.searchParams.get("action") || "";

  // ── ADMIN: Send document request email ─────────────────────────────────────
  if (req.method === "POST" && actionParam === "send") {
    let body: any;
    try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: HJSON }); }

    const { ref, requested_docs, message } = body;
    if (!ref || !Array.isArray(requested_docs) || requested_docs.length === 0) {
      return new Response(JSON.stringify({ error: "ref and requested_docs[] are required" }), { status: 400, headers: HJSON });
    }

    let rec: any = null;
    for (const appId of [BUILDER_APP, AGENT_APP]) {
      const recs = await listRecords(appId, svcToken);
      rec = recs.find((r: any) => r.reference_code === ref);
      if (rec) break;
    }
    if (!rec) return new Response(JSON.stringify({ error: "Applicant not found: " + ref }), { status: 404, headers: HJSON });

    const applicantName  = rec.applicant_name || "Applicant";
    const applicantEmail = rec.applicant_email || "";
    const recToken       = rec.session_token || rec.invitation_token || "";
    if (!applicantEmail) return new Response(JSON.stringify({ error: "No email address on record for this applicant" }), { status: 400, headers: HJSON });

    const portalUrl = DOMAIN + "/api/functions/peaDocRequest?ref=" + ref + "&token=" + recToken + "&docs=" + requested_docs.join(",");
    const docListHtml = requested_docs.map(function(d: string){ return "<li style='margin-bottom:6px;color:#94a3b8'>" + (DOC_LABELS[d] || d) + "</li>"; }).join("");
    const noteHtml    = message ? "<div style='background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.15);border-radius:6px;padding:13px;margin-bottom:18px'><p style='color:#94a3b8;font-size:12px;margin:0;line-height:1.65'><strong style='color:#C9A84C'>Note from PEA:</strong> " + message + "</p></div>" : "";

    const emailHtml = "<html><body style='margin:0;padding:0;background:#080d18;font-family:Inter,sans-serif'>" +
      "<div style='max-width:590px;margin:0 auto;padding:38px 18px'>" +
      "<div style='text-align:center;margin-bottom:26px'>" +
      "<div style='width:52px;height:52px;background:linear-gradient(135deg,#C9A84C,#a07c30);border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#080d18;margin-bottom:10px'>P</div>" +
      "<div style='font-size:10px;font-weight:700;letter-spacing:.3em;color:#C9A84C;text-transform:uppercase'>Prime Endorsement Authority</div>" +
      "<div style='font-size:9px;color:#64748b;letter-spacing:.18em;text-transform:uppercase;margin-top:3px'>Document Request Notice</div></div>" +
      "<div style='background:#0d1526;border:1px solid rgba(201,168,76,.2);border-radius:10px;padding:28px;margin-bottom:16px'>" +
      "<p style='color:#94a3b8;font-size:13px;margin:0 0 13px'>Dear <strong style='color:#e2e8f0'>" + applicantName + "</strong>,</p>" +
      "<p style='color:#94a3b8;font-size:13px;line-height:1.7;margin:0 0 13px'>Further to your application <strong style='color:#C9A84C'>" + ref + "</strong>, the Prime Endorsement Authority requires the following additional documents to proceed with your assessment:</p>" +
      "<ul style='margin:0 0 18px 18px;padding:0'>" + docListHtml + "</ul>" +
      noteHtml +
      "<p style='color:#94a3b8;font-size:13px;line-height:1.7;margin:0 0 22px'>Please use the secure button below to access your personal document upload portal. All submitted documents will be saved directly to your application portfolio.</p>" +
      "<div style='text-align:center;margin:22px 0'><a href='" + portalUrl + "' style='display:inline-block;background:#C9A84C;color:#080d18;padding:13px 28px;border-radius:6px;font-size:12px;font-weight:700;letter-spacing:.07em;text-decoration:none;text-transform:uppercase'>Upload My Documents &rarr;</a></div>" +
      "<div style='background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.14);border-radius:6px;padding:12px;margin-top:16px'>" +
      "<p style='color:#64748b;font-size:11px;margin:0 0 4px'><strong style='color:#C9A84C'>Reference:</strong> " + ref + "</p>" +
      "<p style='color:#64748b;font-size:11px;margin:0 0 4px'><strong style='color:#C9A84C'>Platform:</strong> primeendorsement.com</p>" +
      "<p style='color:#64748b;font-size:11px;margin:0'><strong style='color:#C9A84C'>Security:</strong> This link is personal. Do not share it.</p></div></div>" +
      "<p style='color:#475569;font-size:9px;text-align:center;line-height:1.6'>Prime Endorsement Authority — Official Communication<br>&copy; 2026 All rights reserved.</p>" +
      "</div></body></html>";

    const sent = await sendEmail(resendKey, applicantEmail, "Document Request — Prime Endorsement Authority | Ref: " + ref, emailHtml);
    if (!sent) return new Response(JSON.stringify({ error: "Email delivery failed" }), { status: 500, headers: HJSON });

    return new Response(JSON.stringify({ success: true, sent_to: applicantEmail, portal_url: portalUrl, docs_requested: requested_docs }), { headers: HJSON });
  }

  // ── GET: Serve upload page ──────────────────────────────────────────────────
  if (req.method === "GET") {
    const ref   = url.searchParams.get("ref")   || "";
    const token = url.searchParams.get("token") || "";
    const docs  = (url.searchParams.get("docs") || "passport,passport_photo,proof_of_address").split(",").filter(function(d){ return !!DOC_LABELS[d]; });
    const note  = url.searchParams.get("note")  || "";

    if (!ref || !token) {
      return new Response(
        "<html><body style='background:#080d18;color:#ef4444;font-family:sans-serif;text-align:center;padding:60px'><h2>Invalid Link</h2><p>This document request link is invalid or has expired. Please contact admin@primeendorsement.com</p></body></html>",
        { status: 400, headers: HHTML }
      );
    }

    let rec: any = null;
    for (const appId of [BUILDER_APP, AGENT_APP]) {
      const recs = await listRecords(appId, svcToken);
      rec = findApplication(recs, ref, token);
      if (rec) break;
    }
    if (!rec) {
      return new Response(
        "<html><body style='background:#080d18;color:#ef4444;font-family:sans-serif;text-align:center;padding:60px'><h2>Access Denied</h2><p>This link could not be verified. Please contact admin@primeendorsement.com</p></body></html>",
        { status: 403, headers: HHTML }
      );
    }

    return new Response(buildUploadPage(ref, token, docs, note), { headers: HHTML });
  }

  // ── POST: Receive uploaded files ────────────────────────────────────────────
  if (req.method === "POST") {
    let formData: FormData;
    try { formData = await req.formData(); } catch { return new Response(JSON.stringify({ success: false, error: "Could not parse form data" }), { status: 400, headers: HJSON }); }

    const ref   = (formData.get("ref")   as string) || url.searchParams.get("ref")   || "";
    const token = (formData.get("token") as string) || url.searchParams.get("token") || "";
    if (!ref || !token) return new Response(JSON.stringify({ success: false, error: "Missing ref or token" }), { status: 400, headers: HJSON });

    let rec: any = null, recId = "", recAppId = "";
    for (const appId of [BUILDER_APP, AGENT_APP]) {
      const recs = await listRecords(appId, svcToken);
      const found = findApplication(recs, ref, token);
      if (found) { rec = found; recId = found.id; recAppId = appId; break; }
    }
    if (!rec) return new Response(JSON.stringify({ success: false, error: "Invalid or expired session" }), { status: 403, headers: HJSON });

    const updates: Record<string, string> = { documents_submitted: "true" };
    const savedDocs: string[] = [];

    for (const [key, value] of formData.entries()) {
      if (key === "ref" || key === "token") continue;
      if (!(value instanceof File)) continue;
      const file = value as File;
      const fileName = ref + "_" + key + "_" + Date.now() + "_" + file.name;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const uploadForm = new FormData();
      uploadForm.append("file", new Blob([bytes], { type: file.type }), fileName);
      const uploadRes = await fetch(
        "https://app.base44.com/api/apps/" + BUILDER_APP + "/storage/upload",
        { method: "POST", headers: { Authorization: "Bearer " + svcToken }, body: uploadForm }
      );
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        const fileUrl = uploadData.url || uploadData.file_url || null;
        const fieldName = DOC_TO_FIELD[key] || null;
        if (fieldName && fileUrl) {
          updates[fieldName] = fileUrl;
          savedDocs.push(DOC_LABELS[key] || key);
        }
      }
    }

    // Save to both Builder and Agent DB
    await updateRecord(BUILDER_APP, recId, svcToken, updates);
    const agentRecs = await listRecords(AGENT_APP, svcToken);
    const agentRec  = agentRecs.find(function(r: any){ return r.reference_code === ref; });
    if (agentRec) await updateRecord(AGENT_APP, agentRec.id, svcToken, updates);

    // Notify admin
    const adminHtml = "<div style='font-family:sans-serif;background:#080d18;color:#e2e8f0;padding:26px;border-radius:9px;max-width:460px;margin:0 auto'>" +
      "<h3 style='color:#C9A84C;margin-bottom:12px'>&#128206; Documents Submitted &mdash; " + ref + "</h3>" +
      "<p style='color:#94a3b8;font-size:13px'><strong style='color:#e2e8f0'>" + (rec.applicant_name || "") + "</strong> submitted: " + savedDocs.join(", ") + "</p>" +
      "<p style='color:#64748b;font-size:12px;margin-top:10px'>Documents saved to applicant portfolio in the admin dashboard.</p></div>";
    await sendEmail(resendKey, ADMIN_EMAIL, "Documents Submitted: " + ref + " — " + (rec.applicant_name || ""), adminHtml);

    return new Response(JSON.stringify({ success: true, saved: savedDocs }), { headers: HJSON });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: HJSON });
}
