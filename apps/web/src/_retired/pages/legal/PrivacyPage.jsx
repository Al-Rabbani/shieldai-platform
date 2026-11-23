import React from "react";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => window.history.back()} className="text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <FileText className="w-12 h-12 text-[#C9A84C] mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
              <div className="text-slate-400">Effective Date: June 16, 2026</div>
            </div>

            <div className="space-y-6 text-slate-300">
              <section>
                <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
                <p className="text-slate-400">
                  ShieldAI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our security platform services.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">2. Information We Collect</h2>
                <div className="space-y-3 text-slate-400">
                  <p><strong className="text-white">Account Information:</strong> Email address, name, organization, role</p>
                  <p><strong className="text-white">Technical Data:</strong> IP addresses, browser type, device information, usage patterns</p>
                  <p><strong className="text-white">Security Scan Data:</strong> Code repositories, cloud configurations, vulnerability findings, threat intelligence</p>
                  <p><strong className="text-white">Integration Data:</strong> Information from connected third-party services (GitHub, GitLab, AWS, Azure, GCP, Slack, etc.)</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">3. How We Use Your Information</h2>
                <ul className="space-y-2 text-slate-400 list-disc list-inside">
                  <li>Provide, maintain, and improve our security platform</li>
                  <li>Process security scans and generate reports</li>
                  <li>Send security alerts and notifications</li>
                  <li>Respond to your inquiries and provide support</li>
                  <li>Monitor and analyze usage patterns and trends</li>
                  <li>Detect and prevent fraud, security incidents, and unauthorized access</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">4. Data Sharing and Disclosure</h2>
                <p className="text-slate-400 mb-3">
                  We do not sell your personal information. We may share your information with:
                </p>
                <ul className="space-y-2 text-slate-400 list-disc list-inside">
                  <li><strong className="text-white">Service Providers:</strong> Third-party vendors who perform services on our behalf (hosting, analytics, customer support)</li>
                  <li><strong className="text-white">Security Partners:</strong> Vulnerability databases (OSV.dev, NVD, CISA KEV) for threat intelligence</li>
                  <li><strong className="text-white">Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                  <li><strong className="text-white">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">5. Data Retention</h2>
                <p className="text-slate-400">
                  We retain scan results and security findings for 12 months. Upon account closure, all data is deleted within 30 days. You may request earlier deletion at any time.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">6. Data Security</h2>
                <p className="text-slate-400">
                  We implement industry-standard security measures including encryption at rest (AES-256) and in transit (TLS 1.3), access controls, regular security assessments, and employee training.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">7. Your Rights</h2>
                <p className="text-slate-400 mb-3">Depending on your location, you may have the following rights:</p>
                <ul className="space-y-2 text-slate-400 list-disc list-inside">
                  <li>Access and receive a copy of your personal data</li>
                  <li>Correct inaccurate or incomplete data</li>
                  <li>Delete your personal data</li>
                  <li>Object to or restrict certain processing</li>
                  <li>Data portability</li>
                  <li>Withdraw consent (where processing is based on consent)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">8. International Data Transfers</h2>
                <p className="text-slate-400">
                  We offer data residency options in EU (Frankfurt), US (Virginia), and APAC (Singapore). Data transfers are protected through standard contractual clauses and adequacy decisions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">9. Children's Privacy</h2>
                <p className="text-slate-400">
                  Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">10. Changes to This Policy</h2>
                <p className="text-slate-400">
                  We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on our website and updating the "Effective Date."
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">11. Contact Us</h2>
                <p className="text-slate-400">
                  For questions about this Privacy Policy or our data practices, please contact us at:
                </p>
                <p className="text-[#C9A84C] mt-2">
                  Email: privacy@shieldai.dev<br />
                  Address: ShieldAI Ltd, London, United Kingdom
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}