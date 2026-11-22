import React from "react";
import { Shield, Lock, FileText, Check, AlertTriangle, ExternalLink, Download, Globe, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CERTIFICATIONS = [
  { name: "SOC 2 Type II", status: "In Progress", expected: "Q4 2026", color: "amber", desc: "We are currently undergoing SOC 2 Type II audit. Report available to enterprise customers under NDA." },
  { name: "ISO 27001", status: "In Progress", expected: "Q1 2027", color: "amber", desc: "Information security management system certification in progress." },
  { name: "GDPR Compliant", status: "Compliant", expected: null, color: "green", desc: "We are GDPR compliant as a data processor. DPA available on request." },
  { name: "PCI-DSS", status: "Not Applicable", expected: null, color: "grey", desc: "We do not process cardholder data directly." },
];

const SUBPROCESSORS = [
  { name: "Base44", role: "Platform Infrastructure", link: "#" },
  { name: "AWS", role: "Cloud Hosting", link: "https://aws.amazon.com/security/" },
  { name: "OpenAI", role: "AI/LLM Processing", link: "https://openai.com/security" },
  { name: "Socket.dev", role: "Supply Chain Security", link: "https://socket.dev/security" },
  { name: "GitHub", role: "Code Repository", link: "https://github.com/security" },
];

const STATUS_SERVICES = [
  { name: "Web Application", status: "operational", latency: "142ms" },
  { name: "API (Backend Functions)", status: "operational", latency: "87ms" },
  { name: "SAST Scanner Engine", status: "operational", latency: "1.2s avg" },
  { name: "SCA Engine (OSV.dev)", status: "operational", latency: null },
  { name: "DAST Engine", status: "operational", latency: null },
  { name: "Cloud Scanner", status: "operational", latency: null },
  { name: "Threat Intel Feed", status: "operational", latency: null },
  { name: "EDR Telemetry", status: "operational", latency: null },
];

export default function TrustPage() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
          <Shield className="w-10 h-10 text-[#C9A84C]" />
          ShieldAI Trust Center
        </h1>
        <p className="text-slate-400 text-lg max-w-3xl mx-auto">
          We protect our customers' data with the same rigor we expect from our platform.
        </p>
        <div className="text-sm text-slate-500">Last updated: June 16, 2026</div>
      </div>

      {/* Section 1: Certifications */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#C9A84C]" />
            Security Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {CERTIFICATIONS.map((cert, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-medium">{cert.name}</div>
                  <Badge className={
                    cert.color === "green" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                    cert.color === "amber" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                    "bg-slate-700 text-slate-400 border-slate-600"
                  }>
                    {cert.status}
                  </Badge>
                </div>
                <div className="text-xs text-slate-400 mb-2">{cert.desc}</div>
                {cert.expected && (
                  <div className="text-xs text-amber-400">Expected: {cert.expected}</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Data & Privacy */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#C9A84C]" />
            Data & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
              <div className="text-white font-medium mb-1 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#C9A84C]" />
                Data Residency
              </div>
              <div className="text-sm text-slate-400">Your data stays in your chosen region — EU (Frankfurt), US (Virginia), APAC (Singapore)</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
              <div className="text-white font-medium mb-1 flex items-center gap-2">
                <Key className="w-4 h-4 text-[#C9A84C]" />
                Encryption
              </div>
              <div className="text-sm text-slate-400">All data encrypted at rest (AES-256) and in transit (TLS 1.3). Keys managed per-tenant.</div>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
            <div className="text-white font-medium mb-2">Subprocessors</div>
            <div className="flex flex-wrap gap-2">
              {SUBPROCESSORS.map((sp, idx) => (
                <a key={idx} href={sp.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#C9A84C]">
                  {sp.name} ({sp.role}) <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
          <Button className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
            <Download className="w-4 h-4 mr-2" />
            Download Data Processing Agreement (DPA)
          </Button>
        </CardContent>
      </Card>

      {/* Section 3: Vulnerability Disclosure */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#C9A84C]" />
            Vulnerability Disclosure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400 text-sm">
            Found a security vulnerability in ShieldAI? We want to hear from you.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
              <div className="text-white font-medium mb-2">In Scope</div>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• ShieldAI web application</li>
                <li>• API endpoints</li>
                <li>• Backend functions</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
              <div className="text-white font-medium mb-2">Process</div>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>1. Report to security@shieldai.dev</li>
                <li>2. Acknowledge within 24h</li>
                <li>3. Fix within 30 days</li>
                <li>4. Credit in changelog</li>
              </ul>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" className="border-slate-700 text-slate-300">
              <Download className="w-4 h-4 mr-2" />
              Download PGP Key
            </Button>
            <a href="mailto:security@shieldai.dev" className="text-[#C9A84C] hover:underline text-sm">
              security@shieldai.dev
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Platform Status */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-500" />
            Platform Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-medium">All Systems Operational</span>
            <span className="text-slate-500 text-sm ml-auto">Uptime this month: 99.97%</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_SERVICES.map((service, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-white text-sm">{service.name}</span>
                </div>
                {service.latency && (
                  <span className="text-slate-400 text-xs">{service.latency}</span>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full border-slate-700 text-slate-300" onClick={() => window.location.href = "/status"}>
            <ExternalLink className="w-4 h-4 mr-2" />
            View Full Status Page
          </Button>
        </CardContent>
      </Card>

      {/* Section 5: Security Practices */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">How We Build ShieldAI Securely</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "All ShieldAI code is scanned with our own SAST + SCA engines daily",
            "Our infrastructure is scanned with our own CSPM — current score shown live",
            "We run our own Zen Firewall SDK on the ShieldAI API",
            "Our own supply chain is monitored with SafeChain",
            "All engineers use our EDR agent on their dev machines",
          ].map((practice, idx) => (
            <div key={idx} className="flex items-center gap-3 text-slate-400 text-sm">
              <Check className="w-4 h-4 text-emerald-500" />
              {practice}
            </div>
          ))}
          <Button variant="outline" className="mt-4 border-slate-700 text-slate-300">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Our Live Security Dashboard
          </Button>
        </CardContent>
      </Card>

      {/* Section 6: Legal Documents */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#C9A84C]" />
            Legal Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[
              { name: "Privacy Policy", link: "/legal/privacy" },
              { name: "Terms of Service", link: "/legal/terms" },
              { name: "Data Processing Agreement", link: "/legal/dpa" },
              { name: "Cookie Policy", link: "/legal/cookies" },
            ].map((doc, idx) => (
              <a
                key={idx}
                href={doc.link}
                className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 hover:border-[#C9A84C] transition-colors text-center"
              >
                <FileText className="w-6 h-6 text-[#C9A84C] mx-auto mb-2" />
                <div className="text-white text-sm">{doc.name}</div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}