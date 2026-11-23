import React from "react";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TermsPage() {
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
              <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
              <div className="text-slate-400">Effective Date: June 16, 2026</div>
            </div>

            <div className="space-y-6 text-slate-300">
              <section>
                <h2 className="text-xl font-bold text-white mb-3">1. Agreement to Terms</h2>
                <p className="text-slate-400">
                  By accessing or using ShieldAI's security platform and services, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access or use our services.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">2. Description of Service</h2>
                <p className="text-slate-400">
                  ShieldAI provides a comprehensive security platform including but not limited to: code security scanning (SAST, SCA, secrets detection), cloud security posture management, threat intelligence, endpoint detection and response (EDR), compliance automation, and AI-powered security operations.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">3. Acceptable Use</h2>
                <p className="text-slate-400 mb-3">You agree not to:</p>
                <ul className="space-y-2 text-slate-400 list-disc list-inside">
                  <li>Use the service for any illegal purpose or in violation of any laws</li>
                  <li>Attempt to gain unauthorized access to the service or other users' accounts</li>
                  <li>Interfere with or disrupt the service or servers</li>
                  <li>Reverse engineer, decompile, or disassemble the service</li>
                  <li>Use the service to scan or test systems you do not own or have explicit permission to test</li>
                  <li>Share your account credentials or allow unauthorized access</li>
                  <li>Resell or redistribute the service without written permission</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">4. User Accounts</h2>
                <p className="text-slate-400">
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">5. Intellectual Property</h2>
                <p className="text-slate-400">
                  ShieldAI retains all rights, title, and interest in and to the service, including all software, technology, and content. You retain ownership of your data (code, configurations, findings) scanned through the service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">6. Service Level Agreement (SLA)</h2>
                <p className="text-slate-400 mb-3">
                  We commit to 99.9% uptime for paid plans. If we fail to meet this commitment, you may be eligible for service credits as follows:
                </p>
                <ul className="space-y-2 text-slate-400 list-disc list-inside">
                  <li>99.0% - 99.9% uptime: 10% monthly credit</li>
                  <li>95.0% - 98.9% uptime: 25% monthly credit</li>
                  <li>Below 95% uptime: 50% monthly credit</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">7. Limitation of Liability</h2>
                <p className="text-slate-400">
                  ShieldAI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses. Our total liability shall not exceed the amount you paid in the 12 months preceding the claim.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">8. Indemnification</h2>
                <p className="text-slate-400">
                  You agree to indemnify and hold harmless ShieldAI from any claims, damages, losses, liabilities, and expenses arising from your use of the service, your violation of these terms, or your infringement of any third-party rights.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">9. Termination</h2>
                <p className="text-slate-400">
                  We may terminate or suspend your account and access to the service immediately, without prior notice, for conduct that we believe violates these terms or is harmful to other users, us, or third parties, or for any other reason at our sole discretion.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">10. Governing Law</h2>
                <p className="text-slate-400">
                  These terms shall be governed by and construed in accordance with the laws of England and Wales, without regard to its conflict of law provisions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">11. Changes to Terms</h2>
                <p className="text-slate-400">
                  We reserve the right to modify these terms at any time. We will provide notice of significant changes at least 30 days before they become effective. Continued use of the service after changes constitutes acceptance of the new terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">12. Contact Information</h2>
                <p className="text-slate-400">
                  For questions about these Terms of Service, please contact us at:
                </p>
                <p className="text-[#C9A84C] mt-2">
                  Email: legal@shieldai.dev<br />
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