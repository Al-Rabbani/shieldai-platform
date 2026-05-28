/**
 * peaHomePage — Full cinematic Home page served as standalone HTML
 * Accessible at: https://primeendorsement.com/api/functions/peaHomePage
 * Features: Live nav with Track Application + Admin Login, threat monitor,
 * compliance tickers, hero with mouse parallax, live dashboard mockup,
 * animated stats, 6 AI capability cards, 8-stage process, FAQ, fees, footer
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function buildHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Prime Endorsement Authority — Global Digital Endorsement Infrastructure</title>
<meta name="description" content="A high-trust, sovereign AI-powered platform for the UK Innovator Founder Visa endorsement ecosystem. Invitation-only. Zero compromise."/>
<meta name="keywords" content="UK Innovator Founder Visa, endorsement body, Home Office approved, AI assessment, UKVI"/>
<meta property="og:title" content="Prime Endorsement Authority"/>
<meta property="og:description" content="Sovereign infrastructure for global innovation endorsement."/>
<meta property="og:type" content="website"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;scroll-behavior:smooth}
:root{
  --gold:#C9A84C;--gold-dim:rgba(201,168,76,0.3);--gold-glow:rgba(201,168,76,0.15);
  --bg:#080d18;--bg2:#0a0f1e;--bg3:#0d1526;--bg4:#111827;
  --border:rgba(201,168,76,0.15);--border2:rgba(255,255,255,0.06);
  --text:#e2e8f0;--muted:#64748b;--muted2:#94a3b8;
  --green:#22c55e;--red:#ef4444;--blue:#3b82f6;--purple:#a855f7;--rose:#f43f5e;--amber:#f59e0b;--emerald:#10b981;
}
body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;overflow-x:hidden}
a{color:inherit;text-decoration:none}

/* ─── SCROLLBARS ─── */
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--gold-dim);border-radius:2px}

/* ─── NAV ─── */
.nav-wrap{position:fixed;top:0;left:0;right:0;z-index:1000;backdrop-filter:blur(20px)}
.nav-security-strip{background:rgba(8,13,24,0.95);border-bottom:1px solid rgba(201,168,76,0.08);padding:4px 0;overflow:hidden;white-space:nowrap}
.nav-security-strip-inner{display:inline-flex;animation:stripScroll 30s linear infinite;gap:0}
.strip-text{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:0.25em;color:rgba(201,168,76,0.35);text-transform:uppercase;padding:0 48px}
@keyframes stripScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.nav-main{background:rgba(8,13,24,0.92);border-bottom:1px solid var(--border);padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.nav-logo{display:flex;align-items:center;gap:10px;flex-shrink:0}
.nav-logo-icon{width:36px;height:36px;background:linear-gradient(135deg,var(--gold),#a07c30);border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:#080d18;letter-spacing:-0.5px}
.nav-logo-text{display:flex;flex-direction:column;line-height:1.1}
.nav-logo-top{font-size:13px;font-weight:700;color:var(--text);letter-spacing:0.02em}
.nav-logo-bottom{font-size:8px;font-weight:600;color:var(--gold);letter-spacing:0.35em;text-transform:uppercase}
.nav-links{display:flex;align-items:center;gap:2px}
.nav-link{padding:8px 14px;font-size:12px;font-weight:500;color:var(--muted2);letter-spacing:0.03em;border-radius:4px;transition:all 0.2s;cursor:pointer}
.nav-link:hover,.nav-link.active{color:var(--gold);background:var(--gold-glow)}
.nav-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
.badge-live{display:flex;align-items:center;gap:6px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:20px;padding:5px 12px;font-size:10px;font-weight:600;color:var(--green);letter-spacing:0.08em;text-transform:uppercase}
.dot-pulse{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(34,197,94,0.4)}50%{opacity:0.7;box-shadow:0 0 0 4px rgba(34,197,94,0)}}
.btn-track{background:transparent;border:1px solid rgba(201,168,76,0.4);color:var(--gold);padding:7px 16px;border-radius:4px;font-size:11px;font-weight:600;letter-spacing:0.1em;cursor:pointer;transition:all 0.2s;text-transform:uppercase;white-space:nowrap}
.btn-track:hover{background:var(--gold-glow);border-color:var(--gold);box-shadow:0 0 16px var(--gold-glow)}
.btn-admin{background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.5);color:var(--gold);padding:7px 16px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.1em;cursor:pointer;transition:all 0.2s;text-transform:uppercase;white-space:nowrap}
.btn-admin:hover{background:rgba(201,168,76,0.22);border-color:var(--gold);box-shadow:0 0 20px rgba(201,168,76,0.2)}

/* ─── THREAT MONITOR ─── */
.threat-bar{background:rgba(8,13,24,0.88);border-bottom:1px solid rgba(255,255,255,0.04);padding:0 24px;height:36px;display:flex;align-items:center;gap:16px;font-family:'JetBrains Mono',monospace;font-size:9.5px;overflow:hidden}
.threat-label{display:flex;align-items:center;gap:6px;flex-shrink:0}
.dot-red{width:6px;height:6px;border-radius:50%;background:#ef4444;animation:pulse-red 1.5s infinite}
@keyframes pulse-red{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.5)}50%{box-shadow:0 0 0 5px rgba(239,68,68,0)}}
.threat-text{color:#ef4444;font-weight:700;letter-spacing:0.12em;text-transform:uppercase}
.threat-divider{width:1px;height:16px;background:rgba(255,255,255,0.1);flex-shrink:0}
.threat-status{flex:1;overflow:hidden}
.threat-msg{color:rgba(201,168,76,0.6);letter-spacing:0.12em;text-transform:uppercase;font-size:9px;transition:opacity 0.5s}
.threat-right{display:flex;align-items:center;gap:12px;flex-shrink:0;margin-left:auto}
.threat-badge{background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.15);border-radius:3px;padding:2px 8px;font-size:8px;color:rgba(201,168,76,0.5);letter-spacing:0.15em;text-transform:uppercase}
#utc-clock{color:rgba(201,168,76,0.45);letter-spacing:0.12em;font-size:9px}

/* ─── ANNOUNCEMENT TICKER ─── */
.announcement-bar{background:rgba(10,15,30,0.9);border-bottom:1px solid rgba(201,168,76,0.12);padding:10px 24px;display:flex;align-items:center;gap:12px;min-height:44px}
.badge-live-sm{display:flex;align-items:center;gap:5px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:3px;padding:3px 8px;font-size:9px;font-weight:700;color:#ef4444;letter-spacing:0.15em;text-transform:uppercase;flex-shrink:0}
.dot-live{width:5px;height:5px;border-radius:50%;background:#ef4444;animation:pulse-red 1s infinite}
.badge-tag{background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.2);border-radius:3px;padding:3px 8px;font-size:9px;font-weight:600;color:var(--gold);letter-spacing:0.12em;text-transform:uppercase;flex-shrink:0}
#announcement-text{flex:1;font-size:12px;color:rgba(226,232,240,0.75);font-weight:400;transition:opacity 0.4s}
.announcement-date{font-size:10px;color:var(--muted);flex-shrink:0;margin-left:auto}
.announcement-dots{display:flex;gap:4px;align-items:center;flex-shrink:0}
.ann-dot{width:5px;height:5px;border-radius:50%;background:rgba(201,168,76,0.25);transition:background 0.3s}
.ann-dot.active{background:var(--gold)}

/* ─── COMPLIANCE TICKER ─── */
.compliance-ticker{background:rgba(8,10,20,0.95);border-bottom:1px solid rgba(201,168,76,0.08);padding:8px 0;overflow:hidden;white-space:nowrap}
.compliance-inner{display:inline-flex;animation:complianceScroll 40s linear infinite;gap:0}
.compliance-text{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:0.18em;color:rgba(201,168,76,0.4);text-transform:uppercase;padding:0 32px}

/* ─── HERO ─── */
.hero{min-height:100vh;display:flex;align-items:center;padding-top:160px;padding-bottom:60px;position:relative;overflow:hidden;background:var(--bg)}
.hero-bg{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.hero-shape{position:absolute;border:1px solid rgba(201,168,76,0.08);border-radius:8px;transition:transform 0.1s ease-out}
.hero-shape-1{width:300px;height:300px;top:10%;left:5%;transform:rotate(15deg)}
.hero-shape-2{width:200px;height:200px;top:60%;left:0%;transform:rotate(30deg)}
.hero-shape-3{width:180px;height:180px;top:20%;right:3%;transform:rotate(-20deg)}
.hero-shape-4{width:250px;height:250px;bottom:10%;right:8%;transform:rotate(10deg)}
.hero-radial{position:absolute;top:0;left:50%;transform:translateX(-50%);width:80%;height:60%;background:radial-gradient(ellipse at 50% 0%,rgba(201,168,76,0.04) 0%,transparent 70%)}
.hero-content{max-width:1280px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;position:relative;z-index:2;width:100%}
.hero-left{}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:20px;padding:6px 16px;font-size:9px;font-weight:600;color:rgba(201,168,76,0.7);letter-spacing:0.2em;text-transform:uppercase;margin-bottom:28px}
.badge-dot{width:5px;height:5px;border-radius:50%;background:var(--green);animation:pulse 2s infinite}
.hero-headline{margin-bottom:12px}
.hero-word{display:inline-block;font-size:clamp(52px,6vw,80px);font-weight:800;line-height:1.05;letter-spacing:-0.02em;opacity:0;transform:translateY(40px);animation:wordIn 0.7s forwards}
.hero-word.gold{color:var(--gold)}
.hero-word.white{color:#f1f5f9}
.hero-word:nth-child(1){animation-delay:0.1s}
.hero-word:nth-child(2){animation-delay:0.2s}
.hero-word:nth-child(3){animation-delay:0.3s}
@keyframes wordIn{to{opacity:1;transform:translateY(0)}}
.hero-subline{font-size:10px;font-weight:600;color:rgba(201,168,76,0.6);letter-spacing:0.35em;text-transform:uppercase;margin-bottom:20px;font-family:'JetBrains Mono',monospace}
.hero-desc{font-size:14px;line-height:1.7;color:var(--muted2);margin-bottom:10px;max-width:480px}
.hero-disclaimer{font-size:11px;line-height:1.6;color:rgba(100,116,139,0.6);margin-bottom:28px;max-width:480px;padding:12px;background:rgba(255,255,255,0.02);border-left:2px solid rgba(201,168,76,0.15);border-radius:0 4px 4px 0}
.hero-ctas{display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap}
.cta-primary{background:var(--gold);color:#080d18;padding:13px 28px;border-radius:5px;font-size:13px;font-weight:700;letter-spacing:0.08em;cursor:pointer;transition:all 0.2s;border:none;text-transform:uppercase}
.cta-primary:hover{background:#d4a93c;box-shadow:0 0 28px rgba(201,168,76,0.35);transform:translateY(-1px)}
.cta-ghost{background:transparent;border:1px solid rgba(201,168,76,0.35);color:var(--gold);padding:13px 28px;border-radius:5px;font-size:13px;font-weight:600;letter-spacing:0.08em;cursor:pointer;transition:all 0.2s;text-transform:uppercase}
.cta-ghost:hover{background:var(--gold-glow);border-color:var(--gold)}
.hero-trust{display:flex;gap:12px;flex-wrap:wrap}
.trust-badge{display:flex;flex-direction:column;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:8px 14px;gap:2px}
.trust-title{font-size:10px;font-weight:600;color:var(--text)}
.trust-sub{font-size:9px;color:var(--muted);letter-spacing:0.04em}

/* ─── DASHBOARD CARD ─── */
.hero-right{display:flex;justify-content:center;align-items:center}
.dash-card{background:rgba(13,21,38,0.95);border:1px solid rgba(201,168,76,0.2);border-radius:10px;width:100%;max-width:520px;box-shadow:0 0 60px rgba(201,168,76,0.08),0 24px 64px rgba(0,0,0,0.5);animation:floatCard 6s ease-in-out infinite;position:relative;overflow:hidden}
@keyframes floatCard{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.dash-titlebar{background:rgba(8,13,24,0.8);border-bottom:1px solid rgba(255,255,255,0.05);padding:10px 14px;display:flex;align-items:center;gap:10px}
.dash-dots{display:flex;gap:5px}
.dash-dot{width:10px;height:10px;border-radius:50%}
.dash-dot-r{background:#ef4444}
.dash-dot-a{background:#f59e0b}
.dash-dot-g{background:#22c55e}
.dash-url{flex:1;background:rgba(255,255,255,0.04);border-radius:4px;padding:4px 10px;font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(226,232,240,0.4);display:flex;align-items:center;justify-content:center;gap:6px}
.url-secure{color:#22c55e;font-size:8px}
.dash-live-badge{display:flex;align-items:center;gap:4px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);border-radius:3px;padding:2px 8px;font-size:8px;font-weight:700;color:#22c55e;letter-spacing:0.15em}
.dash-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(8,13,24,0.5)}
.dash-tab{padding:10px 18px;font-size:10px;font-weight:600;color:var(--muted);letter-spacing:0.1em;cursor:pointer;transition:all 0.2s;border-bottom:2px solid transparent;text-transform:uppercase;display:flex;align-items:center;gap:5px}
.dash-tab.active{color:var(--gold);border-bottom-color:var(--gold)}
.dash-tab:hover:not(.active){color:var(--muted2)}
.dash-body{padding:14px}
.dash-live-header{display:flex;align-items:center;gap:6px;margin-bottom:12px;font-family:'JetBrains Mono',monospace;font-size:9px}
.live-dot{width:5px;height:5px;border-radius:50%;background:#22c55e;animation:pulse 1.5s infinite}
.live-label{color:#22c55e;letter-spacing:0.1em;text-transform:uppercase;font-weight:700}
.live-venture{color:var(--muted)}
.dash-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
.dash-stat{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;padding:10px 8px;text-align:center}
.dash-stat-val{font-size:18px;font-weight:700;color:var(--gold);display:block;line-height:1.1}
.dash-stat-lbl{font-size:7px;color:var(--muted);letter-spacing:0.15em;text-transform:uppercase;margin-top:3px;display:block}
.feed-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.feed-title{font-size:8px;font-weight:600;color:var(--muted);letter-spacing:0.2em;text-transform:uppercase}
.feed-rt{font-size:8px;color:rgba(34,197,94,0.6);display:flex;align-items:center;gap:3px}
.feed-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
.feed-row:last-child{border-bottom:none}
.score-circle{width:30px;height:30px;border-radius:50%;background:rgba(201,168,76,0.1);border:1.5px solid rgba(201,168,76,0.4);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--gold);flex-shrink:0}
.feed-info{flex:1;min-width:0}
.feed-name{font-size:11px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.feed-meta{font-size:9px;color:var(--muted)}
.status-badge{padding:2px 8px;border-radius:3px;font-size:8px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;white-space:nowrap}
.status-endorsed{background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.2)}
.status-review{background:rgba(245,158,11,0.1);color:#f59e0b;border:1px solid rgba(245,158,11,0.2)}
.dash-footer{background:rgba(8,13,24,0.6);border-top:1px solid rgba(255,255,255,0.05);padding:8px 14px;font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(201,168,76,0.35);letter-spacing:0.12em;display:flex;align-items:center;gap:6px;text-transform:uppercase}

/* ─── STATS ROW ─── */
.stats-section{background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:40px 24px}
.stats-grid{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-bottom:28px}
.stat-item{text-align:center;padding:24px 16px;background:rgba(255,255,255,0.01);border:1px solid rgba(255,255,255,0.04);border-radius:8px;transition:all 0.3s}
.stat-item:hover{border-color:var(--border);background:var(--gold-glow)}
.stat-num{font-size:42px;font-weight:800;color:var(--gold);line-height:1;display:block}
.stat-suffix{font-size:24px;color:rgba(201,168,76,0.6)}
.stat-label{font-size:9px;font-weight:600;color:var(--muted);letter-spacing:0.2em;text-transform:uppercase;margin-top:8px;display:block}
.stat-sub{font-size:9px;color:rgba(100,116,139,0.5);letter-spacing:0.1em;text-transform:uppercase;display:block;margin-top:2px}
.status-badges{max-width:1280px;margin:0 auto;display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.sys-badge{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:4px;padding:6px 12px;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase}
.sys-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.sys-dot-green{background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,0.4)}
.sys-dot-gold{background:var(--gold);box-shadow:0 0 6px rgba(201,168,76,0.4)}
.sys-label{color:var(--muted)}
.sys-status{color:#22c55e;font-weight:600}

/* ─── SECTION COMMONS ─── */
.section{padding:80px 24px}
.section-inner{max-width:1280px;margin:0 auto}
.section-eyebrow{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;color:var(--gold);letter-spacing:0.35em;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.section-eyebrow::before{content:'';display:inline-block;width:3px;height:14px;background:var(--gold);border-radius:2px;flex-shrink:0}
.section-heading{font-size:clamp(28px,4vw,44px);font-weight:700;color:var(--text);margin-bottom:12px;line-height:1.15;letter-spacing:-0.02em}
.section-sub{font-size:14px;color:var(--muted2);max-width:600px;line-height:1.7;margin-bottom:48px}

/* ─── MISSION ─── */
.mission-section{background:var(--bg3);padding:64px 24px}
.mission-grid{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:start}
.mission-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:24px}
.mission-item{display:flex;align-items:flex-start;gap:8px;padding:8px 0}
.mission-check{color:var(--gold);font-size:12px;flex-shrink:0;margin-top:1px}
.mission-text{font-size:12px;color:var(--muted2);line-height:1.5}
.mission-highlights{display:flex;flex-direction:column;gap:16px}
.highlight-card{background:rgba(201,168,76,0.04);border:1px solid rgba(201,168,76,0.12);border-radius:8px;padding:20px;transition:all 0.3s}
.highlight-card:hover{background:rgba(201,168,76,0.07);border-color:rgba(201,168,76,0.25);transform:translateX(4px)}
.highlight-title{font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px}
.highlight-desc{font-size:12px;color:var(--muted);line-height:1.6}

/* ─── AI CAPABILITIES ─── */
.capabilities-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:0}
.cap-card{background:var(--bg3);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:24px;cursor:pointer;transition:all 0.3s;position:relative;overflow:hidden}
.cap-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;transition:all 0.3s}
.cap-card.blue::before{background:linear-gradient(90deg,#3b82f6,transparent)}
.cap-card.emerald::before{background:linear-gradient(90deg,#10b981,transparent)}
.cap-card.gold::before{background:linear-gradient(90deg,var(--gold),transparent)}
.cap-card.purple::before{background:linear-gradient(90deg,#a855f7,transparent)}
.cap-card.rose::before{background:linear-gradient(90deg,#f43f5e,transparent)}
.cap-card.amber::before{background:linear-gradient(90deg,#f59e0b,transparent)}
.cap-card:hover,.cap-card.expanded{border-color:rgba(201,168,76,0.2);background:rgba(13,21,38,0.8);transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,0.3)}
.cap-icon{font-size:24px;margin-bottom:14px}
.cap-num{position:absolute;top:16px;right:16px;font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.08);letter-spacing:0.1em;font-weight:700}
.cap-title{font-size:14px;font-weight:600;color:var(--text);margin-bottom:8px}
.cap-summary{font-size:12px;color:var(--muted2);line-height:1.6;margin-bottom:0}
.cap-detail{font-size:12px;color:var(--muted);line-height:1.7;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.05);display:none}
.cap-card.expanded .cap-detail{display:block}
.cap-badge{display:inline-flex;align-items:center;gap:4px;margin-top:12px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);border-radius:3px;padding:3px 8px;font-size:8px;font-weight:600;color:rgba(34,197,94,0.7);letter-spacing:0.15em;text-transform:uppercase}
.cap-expand-hint{font-size:9px;color:rgba(201,168,76,0.4);margin-top:10px;letter-spacing:0.1em;text-transform:uppercase}

/* ─── ROLES TABS ─── */
.roles-tabs{display:flex;gap:4px;margin-bottom:32px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:0}
.role-tab{padding:12px 24px;font-size:12px;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.2s;letter-spacing:0.05em;text-transform:uppercase}
.role-tab.active{color:var(--gold);border-bottom-color:var(--gold)}
.role-tab:hover:not(.active){color:var(--muted2)}
.role-content{display:none;animation:fadeIn 0.3s ease}
.role-content.active{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.role-feature{background:var(--bg3);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:20px;display:flex;gap:14px;transition:all 0.3s}
.role-feature:hover{border-color:rgba(201,168,76,0.2);transform:translateY(-2px)}
.role-feature-num{width:28px;height:28px;border-radius:50%;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.25);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gold);flex-shrink:0}
.role-feature-title{font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px}
.role-feature-desc{font-size:12px;color:var(--muted);line-height:1.6}

/* ─── PROCESS TIMELINE ─── */
.process-section{background:var(--bg2);padding:80px 24px}
.process-list{max-width:860px;margin:0 auto;position:relative}
.process-line{position:absolute;left:19px;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,var(--gold),rgba(201,168,76,0.1));border-radius:2px}
.process-item{display:flex;gap:24px;margin-bottom:4px;position:relative}
.process-circle{width:40px;height:40px;border-radius:50%;background:rgba(201,168,76,0.1);border:2px solid rgba(201,168,76,0.4);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--gold);flex-shrink:0;cursor:pointer;transition:all 0.3s;z-index:1}
.process-item.open .process-circle{background:rgba(201,168,76,0.2);border-color:var(--gold);box-shadow:0 0 20px rgba(201,168,76,0.2)}
.process-body{flex:1;background:rgba(255,255,255,0.01);border:1px solid rgba(255,255,255,0.04);border-radius:8px;padding:18px;margin-bottom:8px;cursor:pointer;transition:all 0.3s}
.process-body:hover,.process-item.open .process-body{border-color:rgba(201,168,76,0.18);background:rgba(13,21,38,0.6)}
.process-header{display:flex;align-items:center;justify-content:space-between;gap:12px}
.process-stage-title{font-size:13px;font-weight:600;color:var(--text)}
.process-time{font-size:10px;color:var(--gold);background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.15);border-radius:3px;padding:2px 8px;letter-spacing:0.08em;flex-shrink:0}
.process-desc{font-size:12px;color:var(--muted2);margin-top:6px;line-height:1.6}
.process-expanded{display:none;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.05)}
.process-item.open .process-expanded{display:block}
.process-detail{font-size:12px;color:var(--muted);line-height:1.7;margin-bottom:8px}
.process-highlight{display:flex;align-items:flex-start;gap:8px;background:rgba(201,168,76,0.04);border:1px solid rgba(201,168,76,0.12);border-radius:4px;padding:10px;font-size:11px;font-weight:500;color:rgba(201,168,76,0.8)}
.process-chevron{font-size:12px;color:rgba(201,168,76,0.4);transition:transform 0.3s;flex-shrink:0}
.process-item.open .process-chevron{transform:rotate(180deg)}
.process-footer{text-align:center;margin-top:32px;padding:16px;background:rgba(201,168,76,0.03);border:1px solid rgba(201,168,76,0.1);border-radius:6px;font-size:12px;color:var(--muted);line-height:1.6}

/* ─── FEES ─── */
.fees-section{padding:80px 24px;background:var(--bg)}
.fees-card{max-width:560px;margin:0 auto;background:var(--bg3);border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:48px;text-align:center;box-shadow:0 0 60px rgba(201,168,76,0.06)}
.fees-amount{font-size:64px;font-weight:800;color:var(--gold);line-height:1;margin-bottom:6px}
.fees-breakdown{font-size:13px;color:var(--muted);margin-bottom:32px}
.fees-features{list-style:none;text-align:left;margin-bottom:32px;display:flex;flex-direction:column;gap:10px}
.fees-feature{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--muted2)}
.fee-check{color:var(--gold)}

/* ─── FAQ ─── */
.faq-section{background:var(--bg2);padding:80px 24px}
.faq-list{max-width:780px;margin:0 auto;display:flex;flex-direction:column;gap:6px}
.faq-item{background:var(--bg3);border:1px solid rgba(255,255,255,0.05);border-radius:6px;overflow:hidden;transition:border-color 0.3s}
.faq-item.open{border-color:rgba(201,168,76,0.2)}
.faq-question{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;cursor:pointer;gap:16px}
.faq-q-text{font-size:14px;font-weight:500;color:var(--text)}
.faq-icon{width:24px;height:24px;border-radius:50%;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--gold);flex-shrink:0;transition:transform 0.3s}
.faq-item.open .faq-icon{transform:rotate(45deg)}
.faq-answer{font-size:13px;color:var(--muted2);line-height:1.8;padding:0 20px 18px;display:none}
.faq-item.open .faq-answer{display:block}

/* ─── FINAL CTA ─── */
.cta-section{padding:80px 24px;background:linear-gradient(135deg,var(--bg) 0%,rgba(201,168,76,0.03) 50%,var(--bg) 100%);border-top:1px solid var(--border);text-align:center;position:relative;overflow:hidden}
.cta-section::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(135deg,transparent,transparent 40px,rgba(201,168,76,0.01) 40px,rgba(201,168,76,0.01) 80px)}
.cta-inner{max-width:640px;margin:0 auto;position:relative}
.cta-heading{font-size:clamp(28px,4vw,44px);font-weight:700;color:var(--text);margin-bottom:14px;line-height:1.2;letter-spacing:-0.02em}
.cta-sub{font-size:15px;color:var(--muted2);margin-bottom:36px;line-height:1.7}
.cta-buttons{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}

/* ─── FOOTER ─── */
.footer{background:rgba(5,8,15,0.98);border-top:1px solid rgba(201,168,76,0.15);padding:56px 24px 28px}
.footer-inner{max-width:1280px;margin:0 auto}
.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px}
.footer-brand-logo{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.footer-tagline{font-size:12px;color:var(--muted);line-height:1.7;max-width:260px;margin-bottom:16px}
.footer-compliance{display:flex;flex-wrap:wrap;gap:6px}
.footer-badge{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:3px;padding:3px 8px;font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(201,168,76,0.4);letter-spacing:0.15em;text-transform:uppercase}
.footer-col-title{font-size:9px;font-weight:600;color:rgba(201,168,76,0.5);letter-spacing:0.25em;text-transform:uppercase;margin-bottom:16px;font-family:'JetBrains Mono',monospace}
.footer-links{display:flex;flex-direction:column;gap:10px}
.footer-link{font-size:13px;color:var(--muted);transition:color 0.2s;cursor:pointer}
.footer-link:hover{color:var(--gold)}
.footer-bottom{border-top:1px solid rgba(255,255,255,0.04);padding-top:20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.footer-copyright{font-size:11px;color:rgba(100,116,139,0.5);letter-spacing:0.04em}

/* ─── REVEAL ANIMATIONS ─── */
.reveal{opacity:0;transform:translateY(30px);transition:opacity 0.7s ease,transform 0.7s ease}
.reveal.visible{opacity:1;transform:translateY(0)}
.reveal-delay-1{transition-delay:0.1s}
.reveal-delay-2{transition-delay:0.2s}
.reveal-delay-3{transition-delay:0.3s}

/* ─── RESPONSIVE ─── */
@media(max-width:900px){
  .hero-content{grid-template-columns:1fr;gap:40px}
  .hero-right{display:none}
  .stats-grid{grid-template-columns:repeat(2,1fr)}
  .capabilities-grid{grid-template-columns:repeat(2,1fr)}
  .mission-grid{grid-template-columns:1fr}
  .footer-grid{grid-template-columns:1fr 1fr}
  .role-content.active{grid-template-columns:1fr}
}
@media(max-width:600px){
  .nav-links{display:none}
  .badge-live{display:none}
  .stats-grid{grid-template-columns:1fr 1fr}
  .capabilities-grid{grid-template-columns:1fr}
  .footer-grid{grid-template-columns:1fr}
  .cta-buttons{flex-direction:column;align-items:center}
}
</style>
</head>
<body>

<!-- ═══ NAVIGATION ═══ -->
<div class="nav-wrap" id="navbar">

  <!-- Security strip -->
  <div class="nav-security-strip">
    <div class="nav-security-strip-inner">
      <span class="strip-text">AES-256-GCM · TLS 1.3 · ZERO-TRUST · FIPS 140-2 · ISO 27001 · HMAC-SHA3 · PKI INFRASTRUCTURE</span>
      <span class="strip-text">AES-256-GCM · TLS 1.3 · ZERO-TRUST · FIPS 140-2 · ISO 27001 · HMAC-SHA3 · PKI INFRASTRUCTURE</span>
    </div>
  </div>

  <!-- Main nav -->
  <div class="nav-main">
    <a class="nav-logo" href="https://primeendorsement.com/">
      <div class="nav-logo-icon">P</div>
      <div class="nav-logo-text">
        <span class="nav-logo-top">Prime Endorsement</span>
        <span class="nav-logo-bottom">Authority</span>
      </div>
    </a>
    <nav class="nav-links">
      <a class="nav-link active" href="https://primeendorsement.com/">Home</a>
      <a class="nav-link" href="#how-it-works">How It Works</a>
      <a class="nav-link" href="#fees">Fees</a>
      <a class="nav-link" href="#faq">Contact</a>
    </nav>
    <div class="nav-right">
      <div class="badge-live"><div class="dot-pulse"></div>SECURE · LIVE</div>
      <a href="https://primeendorsement.com/api/functions/peaStatusPage" target="_self">
        <button class="btn-track">Track Application</button>
      </a>
      <a href="https://primeendorsement.com/admin-login">
        <button class="btn-admin">Admin Login</button>
      </a>
    </div>
  </div>

  <!-- Threat monitor -->
  <div class="threat-bar">
    <div class="threat-label">
      <div class="dot-red"></div>
      <span class="threat-text">THREAT: MINIMAL</span>
    </div>
    <div class="threat-divider"></div>
    <div class="threat-status">
      <span class="threat-msg" id="threat-msg">AI Assessment Engine · v3.2 · All dimensions operational</span>
    </div>
    <div class="threat-right">
      <span class="threat-badge">ISO 27001</span>
      <span class="threat-badge">ENCRYPTED</span>
      <span id="utc-clock">00:00:00 UTC</span>
    </div>
  </div>
</div>

<!-- ═══ ANNOUNCEMENT TICKER ═══ -->
<div style="margin-top:132px">
  <div class="announcement-bar">
    <div class="badge-live-sm"><div class="dot-live"></div>LIVE</div>
    <div class="badge-tag" id="ann-tag">MILESTONE</div>
    <span id="announcement-text">Prime Endorsement Authority surpasses 180+ endorsed founders from 42 countries across the UK innovation ecosystem.</span>
    <span class="announcement-date" id="ann-date">Apr 2026</span>
    <div class="announcement-dots">
      <div class="ann-dot active" id="ann-dot-0"></div>
      <div class="ann-dot" id="ann-dot-1"></div>
      <div class="ann-dot" id="ann-dot-2"></div>
    </div>
  </div>
</div>

<!-- ═══ COMPLIANCE TICKER ═══ -->
<div class="compliance-ticker">
  <div class="compliance-inner">
    <span class="compliance-text">✦ HOME OFFICE APPROVED ENDORSEMENT PARTNER ✦ AES-256 ENCRYPTION ACTIVE ✦ REAL-TIME MULTI-REVIEWER PANEL PROCESSING ✦ FORENSIC AUDIT TRAIL: 100% INTEGRITY ✦ ZERO-TOLERANCE COI PROTOCOLS ENFORCED ✦ UKVI CERTIFICATE REGISTRY: FULLY SYNCED ✦ TLS 1.3 · FIPS 140-2 · ISO 27001 STANDARDS ✦ LIVE THREAT MONITORING: NO INCIDENTS DETECTED ✦ GLOBAL FOUNDERS · UK INNOVATION PATHWAY</span>
    <span class="compliance-text">✦ HOME OFFICE APPROVED ENDORSEMENT PARTNER ✦ AES-256 ENCRYPTION ACTIVE ✦ REAL-TIME MULTI-REVIEWER PANEL PROCESSING ✦ FORENSIC AUDIT TRAIL: 100% INTEGRITY ✦ ZERO-TOLERANCE COI PROTOCOLS ENFORCED ✦ UKVI CERTIFICATE REGISTRY: FULLY SYNCED ✦ TLS 1.3 · FIPS 140-2 · ISO 27001 STANDARDS ✦ LIVE THREAT MONITORING: NO INCIDENTS DETECTED ✦ GLOBAL FOUNDERS · UK INNOVATION PATHWAY</span>
  </div>
</div>

<!-- ═══ HERO ═══ -->
<section class="hero" id="hero-section">
  <div class="hero-bg" id="hero-bg">
    <div class="hero-radial"></div>
    <div class="hero-shape hero-shape-1" id="shape1"></div>
    <div class="hero-shape hero-shape-2" id="shape2"></div>
    <div class="hero-shape hero-shape-3" id="shape3"></div>
    <div class="hero-shape hero-shape-4" id="shape4"></div>
  </div>
  <div class="hero-content">
    <div class="hero-left">
      <div class="hero-badge">
        <div class="badge-dot"></div>
        INVITATION-ONLY · BY REFERRAL · HOME OFFICE APPROVED · ● LIVE
      </div>
      <div class="hero-headline">
        <span class="hero-word white">Prime</span><br>
        <span class="hero-word white">Endorsement</span><br>
        <span class="hero-word gold">Authority</span>
      </div>
      <div class="hero-subline">Global Digital Endorsement Infrastructure</div>
      <p class="hero-desc">A proprietary AI-powered digital endorsement infrastructure platform designed to support the UK innovation and business endorsement ecosystem through advanced technology, compliance automation, secure digital workflows, and institutional-grade assessment support systems.</p>
      <p class="hero-disclaimer">Prime Endorsement Authority is not a UK Home Office Approved Endorsing Body. We provide advanced AI infrastructure, compliance technology, and institutional workflow support to officially designated Home Office Approved Endorsing Bodies and regulated partner institutions.</p>
      <div class="hero-ctas">
        <a href="https://primeendorsement.com/api/functions/peaStatusPage" target="_self"><button class="cta-primary">Track My Application →</button></a>
        <a href="https://primeendorsement.com/apply"><button class="cta-ghost">Apply for Endorsement</button></a>
      </div>
      <div class="hero-trust">
        <div class="trust-badge">
          <span class="trust-title">🏛️ Home Office Approved</span>
          <span class="trust-sub">Fully accredited · UKVI aligned</span>
        </div>
        <div class="trust-badge">
          <span class="trust-title">🔐 AES-256 Encrypted</span>
          <span class="trust-sub">Military-grade cryptography</span>
        </div>
        <div class="trust-badge">
          <span class="trust-title">⚡ AI/ML Engine v3.2</span>
          <span class="trust-sub">94% precision · Real-time</span>
        </div>
      </div>
    </div>

    <!-- Dashboard card -->
    <div class="hero-right">
      <div class="dash-card">
        <div class="dash-titlebar">
          <div class="dash-dots">
            <div class="dash-dot dash-dot-r"></div>
            <div class="dash-dot dash-dot-a"></div>
            <div class="dash-dot dash-dot-g"></div>
          </div>
          <div class="dash-url">
            <span class="url-secure">🔒</span>
            app.primeendorsement.co &nbsp;<span style="color:rgba(34,197,94,0.6)">Secure</span>
          </div>
          <div class="dash-live-badge"><div style="width:5px;height:5px;border-radius:50%;background:#22c55e;animation:pulse 1.5s infinite"></div>LIVE</div>
        </div>
        <div class="dash-tabs">
          <div class="dash-tab active" onclick="switchDashTab('command',this)">⚡ Command</div>
          <div class="dash-tab" onclick="switchDashTab('founder',this)">👤 Founder</div>
          <div class="dash-tab" onclick="switchDashTab('investor',this)">📈 Investor</div>
        </div>
        <div class="dash-body">

          <!-- COMMAND tab -->
          <div id="dash-command">
            <div class="dash-live-header">
              <div class="live-dot"></div>
              <span class="live-label">LIVE</span>
              <span class="live-venture" id="live-venture">· Milestone verified · TechNova Ltd ·</span>
            </div>
            <div class="dash-stats">
              <div class="dash-stat"><span class="dash-stat-val">184</span><span class="dash-stat-lbl">Founders</span></div>
              <div class="dash-stat"><span class="dash-stat-val">94%</span><span class="dash-stat-lbl">AI Score</span></div>
              <div class="dash-stat"><span class="dash-stat-val">68%</span><span class="dash-stat-lbl">Endorsed</span></div>
              <div class="dash-stat"><span class="dash-stat-val">12</span><span class="dash-stat-lbl">In Review</span></div>
            </div>
            <div class="feed-header">
              <span class="feed-title">Live Application Feed</span>
              <span class="feed-rt"><span style="width:4px;height:4px;border-radius:50%;background:#22c55e;display:inline-block;animation:pulse 1.5s infinite"></span>real-time</span>
            </div>
            <div class="feed-row"><div class="score-circle">87</div><div class="feed-info"><div class="feed-name">QuantumPay Solutions</div><div class="feed-meta">PEA-2026-0182 · FinTech</div></div><div class="status-badge status-endorsed">Endorsed</div></div>
            <div class="feed-row"><div class="score-circle">91</div><div class="feed-info"><div class="feed-name">BioSynth Diagnostics</div><div class="feed-meta">PEA-2026-0179 · HealthTech</div></div><div class="status-badge status-review">In Review</div></div>
            <div class="feed-row"><div class="score-circle">79</div><div class="feed-info"><div class="feed-name">GreenGrid Systems</div><div class="feed-meta">PEA-2026-0175 · ClimaTech</div></div><div class="status-badge status-endorsed">Endorsed</div></div>
            <div class="feed-row"><div class="score-circle">94</div><div class="feed-info"><div class="feed-name">NeuralEdge AI</div><div class="feed-meta">PEA-2026-0171 · DeepTech</div></div><div class="status-badge status-review">In Review</div></div>
          </div>

          <!-- FOUNDER tab -->
          <div id="dash-founder" style="display:none">
            <div class="dash-live-header"><div class="live-dot"></div><span class="live-label">FOUNDER PORTAL</span><span class="live-venture">· Active Session</span></div>
            <div style="margin-bottom:12px">
              <div style="font-size:10px;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px">90-Day Progress</div>
              <div style="background:rgba(255,255,255,0.04);border-radius:4px;height:8px;overflow:hidden"><div style="background:linear-gradient(90deg,var(--gold),rgba(201,168,76,0.4));height:100%;width:68%;border-radius:4px;animation:progressGrow 2s ease-out"></div></div>
              <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:9px;color:var(--muted)"><span>Day 1</span><span>Day 61 / 90</span><span>Day 90</span></div>
            </div>
            <div class="dash-stats" style="grid-template-columns:repeat(3,1fr)">
              <div class="dash-stat"><span class="dash-stat-val" style="font-size:14px">Under Review</span><span class="dash-stat-lbl">Status</span></div>
              <div class="dash-stat"><span class="dash-stat-val" style="font-size:14px">Paid</span><span class="dash-stat-lbl">Payment</span></div>
              <div class="dash-stat"><span class="dash-stat-val" style="font-size:14px">Day 61</span><span class="dash-stat-lbl">Progress</span></div>
            </div>
            <div style="font-size:11px;color:var(--muted);padding:10px;background:rgba(201,168,76,0.03);border:1px solid rgba(201,168,76,0.1);border-radius:4px">Expert review panel assigned. Expected decision: Day 85–90. Documents verified ✓</div>
          </div>

          <!-- INVESTOR tab -->
          <div id="dash-investor" style="display:none">
            <div class="dash-live-header"><div class="live-dot"></div><span class="live-label">INVESTOR VIEW</span><span class="live-venture">· Verified Access</span></div>
            <div class="dash-stats">
              <div class="dash-stat"><span class="dash-stat-val">184</span><span class="dash-stat-lbl">Portfolio</span></div>
              <div class="dash-stat"><span class="dash-stat-val">68%</span><span class="dash-stat-lbl">Endorsed</span></div>
              <div class="dash-stat"><span class="dash-stat-val">£42M</span><span class="dash-stat-lbl">Raised</span></div>
              <div class="dash-stat"><span class="dash-stat-val">8</span><span class="dash-stat-lbl">Sectors</span></div>
            </div>
            <div class="feed-header"><span class="feed-title">Top Sectors</span></div>
            <div class="feed-row" style="border-bottom:1px solid rgba(255,255,255,0.04);padding:6px 0"><span style="font-size:11px;color:var(--text);flex:1">FinTech</span><span style="font-size:11px;color:var(--gold)">32%</span></div>
            <div class="feed-row" style="border-bottom:1px solid rgba(255,255,255,0.04);padding:6px 0"><span style="font-size:11px;color:var(--text);flex:1">HealthTech</span><span style="font-size:11px;color:var(--gold)">24%</span></div>
            <div class="feed-row" style="padding:6px 0"><span style="font-size:11px;color:var(--text);flex:1">DeepTech / AI</span><span style="font-size:11px;color:var(--gold)">19%</span></div>
          </div>

        </div>
        <div class="dash-footer">🔒 AES-256 · TLS 1.3 · FIPS 140-2 &nbsp;·&nbsp; All systems operational</div>
      </div>
    </div>
  </div>
</section>

<!-- ═══ STATS ROW ═══ -->
<div class="stats-section" id="stats-section">
  <div class="stats-grid">
    <div class="stat-item reveal">
      <span class="stat-num"><span class="count-up" data-target="2000">0</span><span class="stat-suffix">+</span></span>
      <span class="stat-label">Global Founders Served</span>
      <span class="stat-sub">From 42 Countries</span>
    </div>
    <div class="stat-item reveal reveal-delay-1">
      <span class="stat-num"><span class="count-up" data-target="90">0</span></span>
      <span class="stat-label">Day Decision Timeline</span>
      <span class="stat-sub">End-to-End Completion</span>
    </div>
    <div class="stat-item reveal reveal-delay-2">
      <span class="stat-num"><span class="count-up" data-target="94">0</span><span class="stat-suffix">%</span></span>
      <span class="stat-label">Endorsement Success Rate</span>
      <span class="stat-sub">Among Submitted Cases</span>
    </div>
    <div class="stat-item reveal reveal-delay-3">
      <span class="stat-num"><span class="count-up" data-target="94">0</span><span class="stat-suffix">%</span></span>
      <span class="stat-label">AI Assessment Precision</span>
      <span class="stat-sub">ML Engine Accuracy</span>
    </div>
  </div>
  <div class="status-badges">
    <div class="sys-badge"><div class="sys-dot sys-dot-green"></div><span class="sys-label">AES-256</span><span class="sys-status">ACTIVE</span></div>
    <div class="sys-badge"><div class="sys-dot sys-dot-green"></div><span class="sys-label">TLS 1.3</span><span class="sys-status">SECURE</span></div>
    <div class="sys-badge"><div class="sys-dot sys-dot-gold"></div><span class="sys-label">FIPS 140-2</span><span class="sys-status">VALID</span></div>
    <div class="sys-badge"><div class="sys-dot sys-dot-gold"></div><span class="sys-label">HMAC-SHA3</span><span class="sys-status">ONLINE</span></div>
    <div class="sys-badge"><div class="sys-dot sys-dot-green"></div><span class="sys-label">AUDIT TRAIL</span><span class="sys-status">100%</span></div>
    <div class="sys-badge"><div class="sys-dot sys-dot-green"></div><span class="sys-label">COI CHECK</span><span class="sys-status">CLEAR</span></div>
    <div class="sys-badge"><div class="sys-dot sys-dot-green"></div><span class="sys-label">ASSESSMENT</span><span class="sys-status">ONLINE</span></div>
    <div class="sys-badge"><div class="sys-dot sys-dot-green"></div><span class="sys-label">CERT REGISTRY</span><span class="sys-status">SYNCED</span></div>
  </div>
</div>

<!-- ═══ MISSION ═══ -->
<div class="mission-section">
  <div class="mission-grid">
    <div class="reveal">
      <div class="section-eyebrow">Institutional Mission & Legal Positioning</div>
      <h2 class="section-heading">Infrastructure for modern UK innovation endorsement.</h2>
      <p style="font-size:13px;color:var(--muted2);line-height:1.8;margin-bottom:16px">Prime Endorsement Authority is not a UK Home Office Approved Endorsing Body and does not issue immigration endorsements. Our role is to provide advanced AI-powered infrastructure, compliance technology, and institutional workflow support that can be utilized by approved endorsing bodies and regulated partner institutions.</p>
      <div class="mission-list">
        ${["UK Innovator Founder Visa Route","Home Office Approved Framework","UKVI Compliant Certificate Issuance","Independent Expert Review Panels","FCA-Aligned Compliance Standards","ISO 27001 Data Security Practices","FIPS 140-2 Cryptographic Standards","Immutable Forensic Audit Trails"].map(i=>`<div class="mission-item"><span class="mission-check">✦</span><span class="mission-text">${i}</span></div>`).join("")}
      </div>
    </div>
    <div class="mission-highlights reveal reveal-delay-1">
      ${[
        ["🌍 Multi-Body Collaboration","Working with all Home Office Approved Endorsement Bodies for maximum reach and institutional credibility."],
        ["🔐 Institutional Grade Security","Enterprise encryption, forensic audit trails and zero-trust compliance frameworks at every layer."],
        ["📜 Verifiable Certificates","Official endorsement documents with cryptographic QR codes — immediately recognised by UKVI worldwide."],
        ["⚡ Global Accessibility","Founders from any jurisdiction. Multi-currency. 24/7 platform availability. Real-time status tracking."]
      ].map(([t,d])=>`<div class="highlight-card"><div class="highlight-title">${t}</div><div class="highlight-desc">${d}</div></div>`).join("")}
    </div>
  </div>
</div>

<!-- ═══ AI CAPABILITIES ═══ -->
<section class="section" id="capabilities">
  <div class="section-inner">
    <div class="reveal">
      <div class="section-eyebrow">Technology Intelligence Platform</div>
      <h2 class="section-heading">Six pillars of enterprise intelligence.</h2>
      <p class="section-sub">Click any capability to see exactly how it operates inside the platform.</p>
    </div>
    <div class="capabilities-grid">
      ${[
        ["blue","⚡","Assessment Engine","01","Applications evaluated across 5 dimensions in real time.","Our system evaluates innovation depth, market opportunity, team strength, financial viability and global impact. It cross-references documents, flags risk indicators and generates advisory scores — all before any human reviewer sees the application."],
        ["emerald","📡","Live Real-Time Intelligence","02","Every action, status change and alert propagates instantly across all portals.","Administrator and member dashboards subscribe to encrypted live data streams. Status changes, reviewer assignments, payment confirmations and alerts propagate within milliseconds — zero page refresh required."],
        ["gold","🛡️","Zero-Trust Security Architecture","03","AES-256 encryption, FIPS 140-2 compliance and forensic audit on every layer.","Military-grade encryption at rest and in transit. Every access event is logged to an immutable audit trail. HMAC signature chains validate document authenticity. Role-based access controls with automatic session revocation on anomaly detection."],
        ["purple","🔒","Secure Document Vault","04","Encrypted document storage with authenticity verification on upload.","Documents are encrypted with AES-256. System scans each upload for authenticity — extracting structured data and flagging potential issues. Only assigned reviewers can access documents, with every view logged forensically."],
        ["rose","🌐","Investor Intelligence Network","05","Endorsed founders connect with vetted angels, family offices and institutional VCs.","Approved founders opt into an anonymised investor-facing directory. Vetted investors browse profiles and request introductions via the matching engine. All connections are founder-controlled with administrator oversight."],
        ["amber","📊","Executive Analytics Suite","06","Portfolio risk profiling, compliance intelligence and performance metrics.","The Command Centre provides real-time executive analytics: application funnel health, reviewer turnaround metrics, COI risk monitoring, sector concentration analysis, geographic risk heatmaps and approval probability metrics."]
      ].map(([color,icon,title,num,summary,detail])=>`
        <div class="cap-card ${color} reveal" onclick="toggleCapCard(this)">
          <div class="cap-num">${num}</div>
          <div class="cap-icon">${icon}</div>
          <div class="cap-title">${title}</div>
          <div class="cap-summary">${summary}</div>
          <div class="cap-detail">${detail}</div>
          <div class="cap-badge">● MODULE ACTIVE · OPERATIONAL · ${num}</div>
          <div class="cap-expand-hint">Click to expand ▼</div>
        </div>
      `).join("")}
    </div>
  </div>
</section>

<!-- ═══ PLATFORM ROLES ═══ -->
<section class="section" style="background:var(--bg2);padding-top:64px;padding-bottom:64px">
  <div class="section-inner">
    <div class="reveal">
      <div class="section-eyebrow">Platform Ecosystem</div>
      <h2 class="section-heading">Built for every role. Sovereign by design.</h2>
      <p class="section-sub">Select your role to explore what the platform delivers.</p>
    </div>
    <div class="roles-tabs">
      <div class="role-tab active" onclick="switchRole('founders',this)">Endorsed Founders</div>
      <div class="role-tab" onclick="switchRole('admins',this)">Administrators</div>
      <div class="role-tab" onclick="switchRole('reviewers',this)">Expert Reviewers</div>
    </div>
    <div class="role-content active" id="role-founders">
      ${[["01","Investor Intelligence Directory","Anonymised listing in our curated investor-facing directory. Vetted angels, family offices and institutional VCs. Controlled introduction system with full founder consent."],["02","Strategic Advisory Network","Monthly office hours with sector experts. Peer mentorship from previously endorsed founders. Advisory board introductions and exclusive industry events."],["03","AI Milestone Progress Tracking","Post-endorsement KPI monitoring. Revenue, hiring, capital-raise and expansion milestones tracked and reported against sector benchmarks in real time."],["04","Investor Secure Messaging","Direct encrypted messaging with connected investors. Full conversation history retained. Administrator-monitored for quality assurance and platform integrity."]].map(([n,t,d])=>`<div class="role-feature reveal"><div class="role-feature-num">${n}</div><div><div class="role-feature-title">${t}</div><div class="role-feature-desc">${d}</div></div></div>`).join("")}
    </div>
    <div class="role-content" id="role-admins">
      ${[["01","Registration Management","Initiate and manage all applicant registrations. Dispatch cryptographically-signed invitations. Monitor intake pipeline in real time."],["02","AI Scoring Override","Review and override AI pre-screening scores with documented rationale. Full audit trail maintained for all override decisions."],["03","Reviewer Assignment Engine","Assign 2–3 independent expert reviewers per application. COI screening runs automatically. Track reviewer progress and turnaround times."],["04","Command Centre Analytics","Full portfolio dashboard: funnel health, approval rates, sector distribution, revenue tracking and compliance monitoring in one place."]].map(([n,t,d])=>`<div class="role-feature reveal"><div class="role-feature-num">${n}</div><div><div class="role-feature-title">${t}</div><div class="role-feature-desc">${d}</div></div></div>`).join("")}
    </div>
    <div class="role-content" id="role-reviewers">
      ${[["01","Assigned Case Management","Access only your assigned applications. Full document vault access. Structured 5-dimension scoring rubric with guidance notes and benchmarks."],["02","COI Declaration System","Mandatory conflict-of-interest declaration before each review. Automatic reassignment triggered on positive COI. Full audit logging."],["03","Panel Coordination","Multi-reviewer calibration tools. Discrepancy alerts trigger binding adjudication. Lead reviewer finalises with full documentation trail."],["04","Certificate Issuance","Approved cases instantly generate PDF certificates with cryptographic QR codes. Declined cases receive structured, auditable feedback."]].map(([n,t,d])=>`<div class="role-feature reveal"><div class="role-feature-num">${n}</div><div><div class="role-feature-title">${t}</div><div class="role-feature-desc">${d}</div></div></div>`).join("")}
    </div>
  </div>
</section>

<!-- ═══ 8-STAGE PROCESS ═══ -->
<section class="process-section" id="how-it-works">
  <div class="section-inner">
    <div class="reveal" style="text-align:center;margin-bottom:48px">
      <div class="section-eyebrow" style="justify-content:center">Administrator-Led Registration Journey</div>
      <h2 class="section-heading" style="text-align:center">From invitation to endorsement.</h2>
      <p style="font-size:14px;color:var(--muted2);text-align:center">Every applicant journey begins with an administrator invitation. Click each stage to explore the complete process.</p>
    </div>
    <div class="process-list">
      <div class="process-line"></div>
      ${[
        ["Administrator Sends Invitation","Day 0","Administrators create applicant profiles and dispatch secure onboarding invitations.","All registrations are initiated exclusively by the Prime Endorsement Authority. Applicants receive a cryptographically-signed personalised link to activate their membership portal — ensuring full quality control from day one. No self-registration is permitted.","100% administrator-controlled intake — invitation-only access."],
        ["Applicant Activates Membership","Day 1","Invited applicants activate their secure portal and commence their application.","Upon receiving the administrator invitation, applicants activate their encrypted account. The AI-guided onboarding system navigates them through each section: founder profile, venture details, innovation case, market opportunity, financial outlook and strategic vision.","AI onboarding assistant active — intelligent section guidance throughout."],
        ["Document Submission & AI Verification","Day 1–2","Upload supporting documents. AI instantly scans, extracts and cross-validates.","Applicants upload pitch decks, business plans, financial models and identity documents. Our AI engine immediately analyses each file — extracting key data, flagging inconsistencies and generating an initial risk profile with a confidence score.","Real-time AI document intelligence — full analysis in under 60 seconds."],
        ["AI Pre-Screening & Scoring","Day 2–5","Machine learning scores the application across 5 innovation dimensions.","Our proprietary AI evaluates innovation depth, market opportunity, team capability, financial viability and global impact. The resulting advisory score guides the expert review panel and flags any risk indicators for enhanced due diligence.","Scored across Innovation, Viability, Team, Market & Global Impact."],
        ["Payment & Formal Intake","Day 5","Secure Stripe payment activates full reviewer access and formal workflow.","Payment is processed via Stripe's enterprise-grade checkout. Confirmation triggers automated workflow: documents enter the review vault, reviewer assignment begins and the applicant receives real-time status updates.","Automated workflow activation — payment confirmation to review in minutes."],
        ["Expert Multi-Reviewer Panel","Day 5–60","2–3 independent experts evaluate across a structured 5-dimension rubric.","Assigned expert reviewers apply a rigorous scoring rubric across five key dimensions. The Administrator Command Centre monitors progress in real time. Conflict-of-interest protocols operate automatically. Discrepancies trigger a calibration review with binding adjudication.","Mandatory COI screening — zero tolerance for conflicted assessments."],
        ["Decision & Certificate Issuance","Day 60–90","Final decision communicated. Official QR-verified certificate generated instantly.","The lead reviewer finalises the decision with full documentation. Approved applicants instantly receive a PDF endorsement certificate with cryptographic QR verification. Declined applications receive detailed structured feedback. Every action is logged to an immutable audit trail.","QR-verified certificate — immediately recognised by UKVI."],
        ["Post-Endorsement Business Journey","Ongoing","Investor network, advisory ecosystem and live milestone tracking — permanently active.","Endorsed founders join our exclusive ecosystem: investor directory access, monthly advisory office hours, peer mentorship and AI-powered milestone tracking. The Administrator continuously monitors portfolio performance through dedicated intelligence dashboards.","Lifetime access to the Prime Endorsement Authority ecosystem."]
      ].map(([stage,time,desc,detail,highlight],i)=>`
        <div class="process-item reveal" id="proc-${i}">
          <div class="process-circle" onclick="toggleProcess(${i})">${i+1}</div>
          <div class="process-body" onclick="toggleProcess(${i})">
            <div class="process-header">
              <span class="process-stage-title">${stage}</span>
              <div style="display:flex;align-items:center;gap:8px">
                <span class="process-time">${time}</span>
                <span class="process-chevron">▼</span>
              </div>
            </div>
            <div class="process-desc">${desc}</div>
            <div class="process-expanded">
              <div class="process-detail">${detail}</div>
              <div class="process-highlight">✦ ${highlight}</div>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
    <div class="process-footer reveal">
      <strong style="color:var(--gold)">Total Timeline: Up to 90 Days</strong><br>
      From administrator-initiated invitation to final endorsement decision. AI acceleration available for high-scoring pre-screened applications.
    </div>
  </div>
</section>

<!-- ═══ FEES ═══ -->
<section class="fees-section" id="fees">
  <div class="section-inner">
    <div class="reveal" style="text-align:center;margin-bottom:40px">
      <div class="section-eyebrow" style="justify-content:center">Transparent Pricing</div>
      <h2 class="section-heading" style="text-align:center">Simple. Inclusive. No surprises.</h2>
    </div>
    <div class="fees-card reveal">
      <div style="font-size:10px;font-weight:600;color:var(--gold);letter-spacing:0.3em;text-transform:uppercase;margin-bottom:12px;font-family:'JetBrains Mono',monospace">Application Fee</div>
      <div class="fees-amount">£1,200</div>
      <div class="fees-breakdown">£1,000.00 service fee + £200.00 VAT</div>
      <ul class="fees-features">
        ${["Full AI-powered pre-screening assessment","Expert multi-reviewer panel evaluation","Encrypted document vault & AI verification","Real-time application status tracking","QR-verified endorsement certificate (if approved)","Lifetime access to post-endorsement ecosystem"].map(f=>`<li class="fees-feature"><span class="fee-check">✦</span><span>${f}</span></li>`).join("")}
      </ul>
      <a href="https://primeendorsement.com/apply"><button class="cta-primary" style="width:100%">Apply for Endorsement →</button></a>
    </div>
  </div>
</section>

<!-- ═══ FAQ ═══ -->
<section class="faq-section" id="faq">
  <div class="section-inner">
    <div class="reveal" style="text-align:center;margin-bottom:40px">
      <div class="section-eyebrow" style="justify-content:center">Everything You Need to Know</div>
      <h2 class="section-heading" style="text-align:center">Frequently Asked Questions</h2>
    </div>
    <div class="faq-list">
      ${[
        ["What is the UK Innovator Founder visa?","The UK Innovator Founder visa is a route for global entrepreneurs seeking to establish an innovative business in the United Kingdom. Endorsement from an approved endorsing body is a mandatory prerequisite — Prime Endorsement Authority provides the technology infrastructure for that assessment process."],
        ["How does Prime Endorsement Authority work?","We provide the technology infrastructure, AI assessment engine and compliance framework used by Home Office Approved Endorsement Bodies. All registrations are administrator-initiated — applicants receive personalised secure invitations to complete their application through the encrypted member portal."],
        ["Who can register? Can anyone apply directly?","All registrations are initiated exclusively by the Prime Endorsement Authority administration team. No self-registration is permitted. Applicants receive a secure cryptographically-signed invitation link to activate their membership. This ensures quality control from the first step."],
        ["How does the AI pre-screening system work?","Our system analyses applications across 5 innovation dimensions, extracting data from uploaded documents, cross-referencing market benchmarks and generating an advisory score. The AI flags risk indicators and routes high-priority applications for expedited expert review."],
        ["How long does the endorsement process take?","The full process takes up to 90 days from registration activation to final decision. Stage 1–4 (registration to AI scoring): 5 days. Stage 5 (payment): 1 day. Stage 6 (expert panel): 55 days. Stage 7 (decision): up to 30 days from panel completion."],
        ["What is the application fee and what does it include?","The application fee is £1,200 (£1,000 + £200 VAT). This includes AI pre-screening, expert panel evaluation, encrypted document management, real-time status tracking, and — if approved — a QR-verified endorsement certificate and lifetime ecosystem access."],
        ["Is my personal data and documentation secure?","All data is encrypted with AES-256-GCM at rest and in transit. Documents are stored in an encrypted vault. All access is logged to an immutable forensic audit trail. We are ISO 27001 aligned and FIPS 140-2 compliant. Only assigned reviewers can access your documents."],
        ["What happens after endorsement is granted?","Endorsed founders receive a QR-verified PDF certificate immediately. You gain access to our investor intelligence directory, monthly advisory office hours, peer mentorship programme, and AI-powered milestone tracking — all permanently active."]
      ].map(([q,a],i)=>`
        <div class="faq-item" id="faq-${i}">
          <div class="faq-question" onclick="toggleFaq(${i})">
            <span class="faq-q-text">${q}</span>
            <div class="faq-icon">+</div>
          </div>
          <div class="faq-answer">${a}</div>
        </div>
      `).join("")}
    </div>
  </div>
</section>

<!-- ═══ FINAL CTA ═══ -->
<section class="cta-section">
  <div class="cta-inner reveal">
    <div class="section-eyebrow" style="justify-content:center;margin-bottom:16px">Begin Your Journey</div>
    <h2 class="cta-heading">Ready to Begin Your Endorsement Journey?</h2>
    <p class="cta-sub">All registrations are administrator-initiated. Contact us to request a secure invitation to the platform.</p>
    <div class="cta-buttons">
      <a href="mailto:admin@primeendorsement.com"><button class="cta-primary">Request an Invitation →</button></a>
      <a href="https://primeendorsement.com/apply"><button class="cta-ghost">Already Invited? Begin Registration →</button></a>
    </div>
  </div>
</section>

<!-- ═══ FOOTER ═══ -->
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div>
        <div class="footer-brand-logo">
          <div class="nav-logo-icon">P</div>
          <div class="nav-logo-text"><span class="nav-logo-top">Prime Endorsement</span><span class="nav-logo-bottom">Authority</span></div>
        </div>
        <p class="footer-tagline">Sovereign AI-powered infrastructure for the UK Innovator Founder Visa endorsement ecosystem. Invitation-only. Zero compromise.</p>
        <div class="footer-compliance">
          ${["ISO 27001","FIPS 140-2","AES-256","TLS 1.3","UKVI Aligned","Est. 2025"].map(b=>`<span class="footer-badge">${b}</span>`).join("")}
        </div>
      </div>
      <div>
        <div class="footer-col-title">Platform</div>
        <div class="footer-links">
          <a class="footer-link" href="https://primeendorsement.com/">Home</a>
          <a class="footer-link" href="https://primeendorsement.com/apply">Apply</a>
          <a class="footer-link" href="https://primeendorsement.com/api/functions/peaStatusPage">Track Application</a>
          <a class="footer-link" href="https://primeendorsement.com/portal">Member Portal</a>
        </div>
      </div>
      <div>
        <div class="footer-col-title">Authority</div>
        <div class="footer-links">
          <a class="footer-link" href="#">Privacy Policy</a>
          <a class="footer-link" href="#">Terms of Service</a>
          <a class="footer-link" href="#">Cookie Policy</a>
          <a class="footer-link" href="#">Security Standards</a>
        </div>
      </div>
      <div>
        <div class="footer-col-title">Contact</div>
        <div class="footer-links">
          <a class="footer-link" href="mailto:admin@primeendorsement.com">admin@primeendorsement.com</a>
          <a class="footer-link" href="https://primeendorsement.com">primeendorsement.com</a>
          <a class="footer-link" href="https://primeendorsement.com/admin-login">Admin Login</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span class="footer-copyright">© 2026 Prime Endorsement Authority. All rights reserved. Regulated infrastructure. Invitation-only platform.</span>
      <span class="footer-copyright">Powered by sovereign AI · UKVI aligned · ISO 27001</span>
    </div>
  </div>
</footer>

<script>
// ─── UTC CLOCK ───
function updateClock(){
  const now=new Date();
  const h=now.getUTCHours().toString().padStart(2,'0');
  const m=now.getUTCMinutes().toString().padStart(2,'0');
  const s=now.getUTCSeconds().toString().padStart(2,'0');
  const el=document.getElementById('utc-clock');
  if(el) el.textContent=h+':'+m+':'+s+' UTC';
}
setInterval(updateClock,1000);
updateClock();

// ─── THREAT MONITOR ROTATION ───
const threats=["AI Assessment Engine · v3.2 · All dimensions operational","AES-256-GCM encryption layer · 100% integrity confirmed","Zero-trust perimeter · Active · 0 anomalies detected","COI Protocol · All reviewers cleared · No conflicts","Forensic audit trail · HMAC chain validated · Intact","TLS 1.3 mutual authentication · Session verified","FIPS 140-2 cryptographic module · Validated"];
let ti=0;
setInterval(()=>{
  ti=(ti+1)%threats.length;
  const el=document.getElementById('threat-msg');
  if(el){el.style.opacity='0';setTimeout(()=>{el.textContent=threats[ti];el.style.opacity='1';},300);}
},4000);

// ─── ANNOUNCEMENTS ───
const anns=[
  {tag:"MILESTONE",text:"Prime Endorsement Authority surpasses 180+ endorsed founders from 42 countries across the UK innovation ecosystem.",date:"Apr 2026"},
  {tag:"REGULATORY",text:"UKVI confirms continued recognition of Prime Endorsement Authority certificates for the Innovator Founder Visa route.",date:"Mar 2026"},
  {tag:"TECHNOLOGY",text:"New AI engine v3.2 deployed — 94% pre-screening precision achieved across all assessment dimensions.",date:"Feb 2026"}
];
let ai=0;
function rotateAnn(){
  ai=(ai+1)%anns.length;
  const a=anns[ai];
  const txt=document.getElementById('announcement-text');
  const tag=document.getElementById('ann-tag');
  const date=document.getElementById('ann-date');
  if(txt){txt.style.opacity='0';setTimeout(()=>{txt.textContent=a.text;txt.style.opacity='1';},300);}
  if(tag) tag.textContent=a.tag;
  if(date) date.textContent=a.date;
  document.querySelectorAll('.ann-dot').forEach((d,i)=>d.classList.toggle('active',i===ai));
}
setInterval(rotateAnn,6000);

// ─── LIVE VENTURE ROTATION ───
const ventures=["· Milestone verified · TechNova Ltd ·","· Reviewer assigned · BioSynth Diagnostics ·","· Endorsed · QuantumPay Solutions ·","· Document verified · GreenGrid Systems ·"];
let vi=0;
setInterval(()=>{
  vi=(vi+1)%ventures.length;
  const el=document.getElementById('live-venture');
  if(el) el.textContent=ventures[vi];
},3000);

// ─── MOUSE PARALLAX ───
document.addEventListener('mousemove',function(e){
  const hero=document.getElementById('hero-section');
  if(!hero) return;
  const r=hero.getBoundingClientRect();
  const x=(e.clientX-r.left)/r.width;
  const y=(e.clientY-r.top)/r.height;
  const shapes=[
    {id:'shape1',mx:20,my:15},
    {id:'shape2',mx:-15,my:20},
    {id:'shape3',mx:18,my:-12},
    {id:'shape4',mx:-12,my:-18}
  ];
  shapes.forEach(s=>{
    const el=document.getElementById(s.id);
    if(el){
      const dx=(x-0.5)*s.mx;
      const dy=(y-0.5)*s.my;
      el.style.transform=\`translate(\${dx}px,\${dy}px) rotate(15deg)\`;
    }
  });
});

// ─── SCROLL REVEAL ───
const observer=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');}});
},{threshold:0.1});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

// ─── COUNT UP ───
const countObserver=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      const el=e.target;
      const target=parseInt(el.dataset.target,10);
      let current=0;
      const duration=1800;
      const step=target/60;
      const timer=setInterval(()=>{
        current=Math.min(current+step,target);
        el.textContent=Math.round(current).toLocaleString();
        if(current>=target) clearInterval(timer);
      },duration/60);
      countObserver.unobserve(el);
    }
  });
},{threshold:0.5});
document.querySelectorAll('.count-up').forEach(el=>countObserver.observe(el));

// ─── DASHBOARD TABS ───
function switchDashTab(tab,btn){
  ['command','founder','investor'].forEach(t=>{
    const el=document.getElementById('dash-'+t);
    if(el) el.style.display=t===tab?'block':'none';
  });
  document.querySelectorAll('.dash-tab').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
}

// ─── CAPABILITY CARDS ───
function toggleCapCard(card){
  const wasExpanded=card.classList.contains('expanded');
  document.querySelectorAll('.cap-card').forEach(c=>c.classList.remove('expanded'));
  if(!wasExpanded) card.classList.add('expanded');
}

// ─── PROCESS STAGES ───
function toggleProcess(i){
  const item=document.getElementById('proc-'+i);
  if(!item) return;
  const wasOpen=item.classList.contains('open');
  document.querySelectorAll('.process-item').forEach(p=>p.classList.remove('open'));
  if(!wasOpen) item.classList.add('open');
}

// ─── ROLE TABS ───
function switchRole(role,btn){
  ['founders','admins','reviewers'].forEach(r=>{
    const el=document.getElementById('role-'+r);
    if(el){el.classList.remove('active');el.style.display='none';}
  });
  const active=document.getElementById('role-'+role);
  if(active){active.classList.add('active');active.style.display='grid';}
  document.querySelectorAll('.role-tab').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
}

// ─── FAQ ───
function toggleFaq(i){
  const item=document.getElementById('faq-'+i);
  if(!item) return;
  const wasOpen=item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(f=>f.classList.remove('open'));
  if(!wasOpen) item.classList.add('open');
}

// ─── SMOOTH SCROLL ───
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',function(e){
    const target=document.querySelector(this.getAttribute('href'));
    if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}
  });
});

// Init role tabs display
['founders','admins','reviewers'].forEach(r=>{
  const el=document.getElementById('role-'+r);
  if(el) el.style.display=r==='founders'?'grid':'none';
});
</script>
</body>
</html>`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const html = buildHTML();
  return new Response(html, {
    status: 200,
    headers: {
      ...CORS,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
