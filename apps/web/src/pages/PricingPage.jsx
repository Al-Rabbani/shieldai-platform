import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, ChevronDown, ChevronUp, Shield } from "lucide-react";

const GOLD = "#C9A84C";

const FEATURES = [
  { section: "Code Security", rows: [
    { label: "Repositories", free: "10", pro: "200", ent: "Unlimited" },
    { label: "SAST", free: "Basic", pro: "✅", ent: "✅" },
    { label: "SCA (Dependencies)", free: "✅", pro: "✅", ent: "✅" },
    { label: "Secrets Detection", free: "❌", pro: "✅", ent: "✅" },
    { label: "IaC Scanning", free: "❌", pro: "✅", ent: "✅" },
    { label: "Reachability Analysis", free: "❌", pro: "✅", ent: "✅" },
    { label: "Breaking Changes Analysis", free: "❌", pro: "❌", ent: "✅" },
    { label: "AI AutoFix PRs", free: "10/mo", pro: "400/mo", ent: "Unlimited" },
  ]},
  { section: "Cloud Security", rows: [
    { label: "Cloud Accounts", free: "2", pro: "10", ent: "Unlimited" },
    { label: "CSPM", free: "❌", pro: "✅", ent: "✅" },
    { label: "CIEM", free: "❌", pro: "✅", ent: "✅" },
    { label: "DSPM", free: "❌", pro: "✅", ent: "✅" },
    { label: "Security Graph", free: "❌", pro: "✅", ent: "✅" },
    { label: "Attack Paths", free: "❌", pro: "✅", ent: "✅" },
    { label: "Hardened Images", free: "❌", pro: "❌", ent: "✅" },
  ]},
  { section: "Attack Surface", rows: [
    { label: "Domains (DAST)", free: "1", pro: "10", ent: "Unlimited" },
    { label: "Pentest Jobs/month", free: "❌", pro: "5", ent: "Unlimited" },
    { label: "API Fuzzing", free: "❌", pro: "✅", ent: "✅" },
    { label: "Pentest-on-Deploy", free: "❌", pro: "❌", ent: "✅" },
    { label: "Red Team Simulations", free: "❌", pro: "❌", ent: "✅" },
  ]},
  { section: "AI Security", rows: [
    { label: "AI-SPM", free: "❌", pro: "✅", ent: "✅" },
    { label: "MCP Governance", free: "❌", pro: "✅", ent: "✅" },
    { label: "LLM Monitoring", free: "❌", pro: "✅", ent: "✅" },
    { label: "Prompt Injection Detection", free: "❌", pro: "✅", ent: "✅" },
  ]},
  { section: "Governance", rows: [
    { label: "Compliance Frameworks", free: "❌", pro: "SOC2, ISO, PCI", ent: "All + NIS2/DORA/CRA" },
    { label: "Regulatory Intelligence", free: "❌", pro: "❌", ent: "✅" },
    { label: "Financial Risk Quantification", free: "❌", pro: "❌", ent: "✅" },
    { label: "Compliance Evidence Auto-Collection", free: "❌", pro: "❌", ent: "✅" },
    { label: "Threat Hunting", free: "❌", pro: "❌", ent: "✅" },
  ]},
  { section: "Integrations", rows: [
    { label: "GitHub / GitLab / Bitbucket", free: "✅", pro: "✅", ent: "✅" },
    { label: "Slack + Jira + Linear", free: "❌", pro: "✅", ent: "✅" },
    { label: "PagerDuty + Webhook", free: "❌", pro: "✅", ent: "✅" },
    { label: "MSSP Multi-Tenant", free: "❌", pro: "❌", ent: "✅" },
    { label: "On-Prem Broker", free: "❌", pro: "❌", ent: "✅" },
    { label: "SSO / SAML", free: "❌", pro: "❌", ent: "✅" },
  ]},
  { section: "Support", rows: [
    { label: "Community Support", free: "✅", pro: "✅", ent: "✅" },
    { label: "Email Support", free: "❌", pro: "✅", ent: "✅" },
    { label: "Dedicated Slack Channel", free: "❌", pro: "❌", ent: "✅" },
    { label: "SLA", free: "❌", pro: "❌", ent: "99.9%" },
    { label: "Custom Data Residency", free: "❌", pro: "❌", ent: "EU / US / APAC" },
  ]},
];

const FAQS = [
  { q: "Can I try Enterprise features?", a: "Yes — we offer a 14-day full Enterprise trial on request. Contact sales to get started." },
  { q: "What counts as a repository?", a: "Any connected GitHub, GitLab, or Bitbucket repository. Monorepos count as one repository." },
  { q: "Is there a startup discount?", a: "Yes — 30% off for companies less than 2 years old with less than $1M ARR. Contact us with proof." },
  { q: "Where is my data stored?", a: "Your choice — EU (Ireland), US (Virginia), or APAC (Singapore). Data never leaves your chosen region." },
  { q: "Can I cancel anytime?", a: "Yes — no long-term contracts on Pro. Cancel anytime, no questions asked." },
  { q: "Do you offer MSSP reseller pricing?", a: "Yes — we have a dedicated MSSP programme with volume discounts and multi-tenant management. Contact sales." },
];

function CellVal({ v }) {
  if (v === "✅") return <span className="text-green-400 text-lg">✅</span>;
  if (v === "❌") return <span className="text-slate-600 text-lg">❌</span>;
  return <span className="text-xs text-slate-400">{v}</span>;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const proPrice = annual ? 249 : 299;

  return (
    <div className="min-h-screen font-body" style={{ background: "#0A0E1A", color: "#F9FAFB" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.5s ease both}`}</style>

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b" style={{ background: "rgba(10,14,26,0.95)", borderColor: "#1a2235" }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            <Shield className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="font-black text-white">ShieldAI</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/docs" className="text-sm text-slate-400 hover:text-white">Docs</Link>
          <Link to="/login" className="text-sm text-slate-400 hover:text-white">Sign In</Link>
          <Link to="/register" className="px-4 py-2 rounded-lg text-sm font-bold text-black" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Start Free</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="fu text-center mb-12">
          <h1 className="text-5xl font-black text-white mb-4">Simple, transparent pricing</h1>
          <p className="text-slate-400 text-lg mb-6">No hidden fees. No per-scanner pricing. One platform, one price.</p>
          <div className="inline-flex items-center gap-3 p-1 rounded-xl border" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <button onClick={() => setAnnual(false)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!annual ? "text-black" : "text-slate-400"}`}
              style={!annual ? { background: GOLD } : {}}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${annual ? "text-black" : "text-slate-400"}`}
              style={annual ? { background: GOLD } : {}}>
              Annual
              {annual && <span className="text-[10px] font-black bg-black/20 px-1.5 py-0.5 rounded-full">2 months free</span>}
            </button>
          </div>
          <div className="mt-3 text-sm" style={{ color: GOLD }}>
            <a href="#" className="hover:underline">Startup? Get 30% off →</a>
          </div>
        </div>

        {/* Plans */}
        <div className="fu grid grid-cols-1 md:grid-cols-3 gap-6 mb-16" style={{ animationDelay: "100ms" }}>
          {[
            {
              plan: "Free", price: "$0", period: "/forever", color: "#6b7280",
              sub: "For developers and curious minds",
              cta: "Start Free — No Credit Card", ctaLink: "/register", ctaStyle: { border: "1px solid #374151", color: "#9CA3AF" },
              features: ["10 repositories", "2 cloud accounts", "1 domain (DAST)", "Basic SAST + SCA", "10 AI AutoFixes/month", "Community support"],
            },
            {
              plan: "Pro", price: `$${proPrice}`, period: "/month", color: GOLD, popular: true,
              sub: "For growing security teams",
              cta: "Start Pro Free", ctaLink: "/register", ctaStyle: { background: `linear-gradient(135deg,${GOLD},#a8873e)`, color: "#000" },
              features: ["200 repositories", "10 cloud accounts", "10 domains", "Full SAST + SCA + Secrets + IaC", "CSPM + CIEM + DSPM", "Security Graph + Attack Paths", "AI-SPM + MCP Governance", "Pentest (5/month)", "SOC2 / ISO27001 / PCI-DSS", "Slack + Jira + Linear", "400 AI AutoFixes/month", "Email support"],
            },
            {
              plan: "Enterprise", price: "Custom", period: "", color: "#8b5cf6",
              sub: "For organizations that demand the best",
              cta: "Talk to Sales", ctaLink: "/onboarding", ctaStyle: { border: "1px solid #8b5cf660", color: "#8b5cf6" },
              features: ["Unlimited repos + cloud accounts", "MSSP multi-tenant mode", "Unlimited pentests", "Pentest-on-Deploy", "Regulatory Intelligence (NIS2/DORA/CRA)", "Financial Risk Quantification", "Threat Hunting Console", "Hardened Container Images", "Compliance Evidence Auto-Collection", "Custom Rules Engine (unlimited)", "On-Prem Broker", "Dedicated Slack support", "99.9% SLA", "SSO/SAML + Advanced RBAC", "Custom data residency"],
            },
          ].map(p => (
            <div key={p.plan} className="rounded-2xl p-6 border relative transition-all hover:scale-[1.02]"
              style={{ background: "#111827", borderColor: p.popular ? GOLD + "60" : "#1F2937", boxShadow: p.popular ? `0 0 40px ${GOLD}15` : "none" }}>
              {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black text-black" style={{ background: GOLD }}>MOST POPULAR</div>}
              <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: p.color }}>{p.plan}</div>
              <div className="text-4xl font-black mb-0.5" style={{ color: p.popular ? GOLD : "white" }}>{p.price}</div>
              <div className="text-xs text-slate-500 mb-2">{p.period}</div>
              <p className="text-xs text-slate-400 mb-5 border-b pb-4" style={{ borderColor: "#1F2937" }}>{p.sub}</p>
              <ul className="space-y-2 mb-6">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-400">
                    <Check className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: p.color }} />{f}
                  </li>
                ))}
              </ul>
              <Link to={p.ctaLink} className="block w-full py-3 rounded-xl text-sm font-bold text-center transition-all hover:scale-105" style={p.ctaStyle}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Feature Table */}
        <div className="fu mb-16" style={{ animationDelay: "200ms" }}>
          <h2 className="text-2xl font-black text-white mb-6 text-center">Complete feature comparison</h2>
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#1F2937" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#0d1220" }}>
                  <th className="px-4 py-4 text-left text-slate-400 font-semibold w-1/2">Feature</th>
                  {["Free", "Pro", "Enterprise"].map((h, i) => (
                    <th key={h} className="px-4 py-4 text-center font-bold" style={{ color: i === 1 ? GOLD : "#9CA3AF" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map(section => (
                  <React.Fragment key={section.section}>
                    <tr style={{ background: "#0d1220" }}>
                      <td colSpan={4} className="px-4 py-2 text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>{section.section}</td>
                    </tr>
                    {section.rows.map((row, i) => (
                      <tr key={row.label} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: "#1F2937", background: i % 2 === 0 ? "#111827" : "#0a0f1a" }}>
                        <td className="px-4 py-3 text-slate-300 text-xs">{row.label}</td>
                        <td className="px-4 py-3 text-center"><CellVal v={row.free} /></td>
                        <td className="px-4 py-3 text-center"><CellVal v={row.pro} /></td>
                        <td className="px-4 py-3 text-center"><CellVal v={row.ent} /></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="fu max-w-2xl mx-auto" style={{ animationDelay: "300ms" }}>
          <h2 className="text-2xl font-black text-white mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
                <button className="w-full flex items-center justify-between px-5 py-4 text-left" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="text-sm font-semibold text-white">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>
                {openFaq === i && <div className="px-5 pb-4 text-sm text-slate-400">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}