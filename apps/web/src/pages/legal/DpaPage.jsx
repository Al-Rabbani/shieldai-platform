import React from "react";
import { FileText, ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DpaPage() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => window.history.back()} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
        
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <FileText className="w-12 h-12 text-[#C9A84C] mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">Data Processing Agreement (DPA)</h1>
              <div className="text-slate-400">Effective Date: June 16, 2026</div>
              <div className="text-slate-500 text-sm mt-2">GDPR Compliant • Standard Contractual Clauses Included</div>
            </div>

            <div className="space-y-6 text-slate-300">
              <section>
                <h2 className="text-xl font-bold text-white mb-3">1. Definitions</h2>
                <p className="text-slate-400">
                  <strong className="text-white">"Controller"</strong> means the customer entity that determines the purposes and means of processing personal data.<br />
                  <strong className="text-white">"Processor"</strong> means ShieldAI Ltd, which processes personal data on behalf of the Controller.<br />
                  <strong className="text-white">"GDPR"</strong> means Regulation (EU) 2016/679 (General Data Protection Regulation).<br />
                  <strong className="text-white">"Personal Data"</strong> means any information relating to an identified or identifiable natural person.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">2. Subject Matter and Duration</h2>
                <p className="text-slate-400">
                  This DPA governs the processing of Personal Data by Processor on behalf of Controller through the ShieldAI security platform. The duration of processing is for the term of the service agreement between the parties.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">3. Nature and Purpose of Processing</h2>
                <p className="text-slate-400">
                  Processor processes Personal Data solely for the purpose of providing security scanning, threat detection, compliance monitoring, and related security services as described in the service agreement. Processing includes:
                </p>
                <ul className="space-y-2 text-slate-400 list-disc list-inside mt-2">
                  <li>Security vulnerability scanning and analysis</li>
                  <li>Threat intelligence correlation</li>
                  <li>Compliance assessment and reporting</li>
                  <li>Security incident detection and response</li>
                  <li>Platform administration and support</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">4. Types of Personal Data</h2>
                <p className="text-slate-400">
                  Processor may process the following categories of Personal Data:
                </p>
                <ul className="space-y-2 text-slate-400 list-disc list-inside mt-2">
                  <li>User account information (name, email, organization, role)</li>
                  <li>Technical identifiers (IP addresses, device information)</li>
                  <li>Code repository metadata (author names, commit emails)</li>
                  <li>Security findings and vulnerability data</li>
                  <li>Usage analytics and audit logs</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">5. Processor Obligations</h2>
                <p className="text-slate-400 mb-3">Processor shall:</p>
                <ul className="space-y-2 text-slate-400 list-disc list-inside">
                  <li>Process Personal Data only on documented instructions from Controller</li>
                  <li>Ensure confidentiality commitments from personnel accessing Personal Data</li>
                  <li>Implement appropriate technical and organizational security measures</li>
                  <li>Assist Controller in responding to data subject rights requests</li>
                  <li>Notify Controller of personal data breaches without undue delay</li>
                  <li>Delete or return Personal Data upon termination of services</li>
                  <li>Maintain records of processing activities</li>
                  <li>Submit to audits and inspections by Controller</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">6. Subprocessors</h2>
                <p className="text-slate-400">
                  Controller authorizes Processor to engage the following subprocessors:
                </p>
                <ul className="space-y-2 text-slate-400 list-disc list-inside mt-2">
                  <li>Base44 (Platform Infrastructure)</li>
                  <li>Amazon Web Services (Cloud Hosting)</li>
                  <li>OpenAI (AI/LLM Processing)</li>
                  <li>Socket.dev (Supply Chain Security)</li>
                  <li>GitHub Inc. (Code Repository Integration)</li>
                </ul>
                <p className="text-slate-400 mt-3">
                  Processor shall notify Controller of any changes to subprocessors and provide an opportunity to object.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">7. International Data Transfers</h2>
                <p className="text-slate-400">
                  Where Personal Data is transferred from the EEA to third countries, Processor shall ensure appropriate safeguards are in place, including EU Standard Contractual Clauses (SCCs) and adequacy decisions where applicable. Controller may choose data residency in EU (Frankfurt), US (Virginia), or APAC (Singapore).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">8. Data Security</h2>
                <p className="text-slate-400">
                  Processor implements industry-standard security measures including:
                </p>
                <ul className="space-y-2 text-slate-400 list-disc list-inside mt-2">
                  <li>Encryption at rest (AES-256) and in transit (TLS 1.3)</li>
                  <li>Access controls and authentication mechanisms</li>
                  <li>Regular security assessments and penetration testing</li>
                  <li>Employee security training and background checks</li>
                  <li>Incident response and business continuity procedures</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">9. Data Subject Rights</h2>
                <p className="text-slate-400">
                  Processor shall assist Controller in fulfilling its obligations to respond to data subject rights requests under GDPR (access, rectification, erasure, restriction, portability, objection).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">10. Data Retention and Deletion</h2>
                <p className="text-slate-400">
                  Processor shall retain Personal Data only for as long as necessary to provide the services. Upon termination, Processor shall delete or return all Personal Data within 30 days, unless required by law to retain.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">11. Audit Rights</h2>
                <p className="text-slate-400">
                  Controller may audit Processor's compliance with this DPA upon reasonable notice, not more than once per year, unless triggered by a security incident.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">12. Liability and Indemnification</h2>
                <p className="text-slate-400">
                  Each party's liability under this DPA shall be subject to the limitations set forth in the service agreement, except for breaches of data protection obligations which may result in unlimited liability for direct damages.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3">13. Governing Law</h2>
                <p className="text-slate-400">
                  This DPA shall be governed by the laws of England and Wales, subject to the mandatory provisions of the GDPR.
                </p>
              </section>

              <div className="pt-6 border-t border-slate-800">
                <p className="text-slate-400 text-sm">
                  For questions about this DPA, contact: <span className="text-[#C9A84C]">privacy@shieldai.dev</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}