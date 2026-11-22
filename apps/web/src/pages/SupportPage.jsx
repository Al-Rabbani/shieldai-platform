import React, { useState } from "react";
import { MessageSquare, Mail, Ticket, Phone, Book, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const helpCards = [
  { title: "Getting Started", icon: Book, description: "Setup guides and quickstart tutorials", link: "/docs/getting-started" },
  { title: "Connecting Integrations", icon: Ticket, description: "GitHub, GitLab, Jira, Slack setup", link: "/docs/integrations" },
  { title: "Understanding Findings", icon: Ticket, description: "Severity levels, triage, remediation", link: "/docs/findings" },
  { title: "Billing & Plans", icon: Ticket, description: "Pricing, invoices, payment methods", link: "/settings/billing" },
];

const responseSLAs = {
  Starter: { channels: ["Email"], response: "72h", critical: "N/A" },
  Professional: { channels: ["Email", "Chat"], response: "24h", critical: "4h" },
  Enterprise: { channels: ["Priority Email", "Chat", "Slack"], response: "4h", critical: "1h" },
  Sovereign: { channels: ["Dedicated Engineer", "Hotline"], response: "30min", critical: "15min" },
};

export default function SupportPage() {
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("");
  const [ticketSeverity, setTicketSeverity] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");

  const handleSubmitTicket = () => {
    console.log("Submit ticket:", { ticketSubject, ticketCategory, ticketSeverity, ticketDescription });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Support Center</h1>
        <p className="text-slate-400">Get help with ShieldAI — documentation, chat, email, and tickets</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search our help documentation..."
          className="pl-10 bg-slate-800 border-slate-700 h-12 text-lg"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {helpCards.map((card) => (
          <Card key={card.title} className="border-slate-800 bg-slate-900/50 hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <card.icon className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-white">{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Contact Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-800/50">
              <MessageSquare className="w-6 h-6 text-primary mt-1" />
              <div>
                <div className="text-white font-medium">Live Chat</div>
                <div className="text-slate-400 text-sm">Chat with our team — available for Starter+</div>
                <Button className="mt-2" size="sm">Start Chat</Button>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-800/50">
              <Mail className="w-6 h-6 text-primary mt-1" />
              <div>
                <div className="text-white font-medium">Email Support</div>
                <div className="text-slate-400 text-sm">support@shieldai.dev</div>
                <div className="text-slate-500 text-xs mt-1">Response time varies by plan</div>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-800/50">
              <Phone className="w-6 h-6 text-primary mt-1" />
              <div>
                <div className="text-white font-medium">Emergency Hotline</div>
                <div className="text-slate-400 text-sm">Enterprise only — +44 20 1234 5678</div>
                <div className="text-slate-500 text-xs mt-1">Critical issues only, 24/7</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Submit a Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Subject</label>
              <Input
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="Brief description of your issue"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Category</label>
                <Select value={ticketCategory} onValueChange={setTicketCategory}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="technical">Technical Issue</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Severity</label>
                <Select value={ticketSeverity} onValueChange={setTicketSeverity}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Description</label>
              <Textarea
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                placeholder="Detailed description of your issue..."
                rows={4}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <Button onClick={handleSubmitTicket} className="w-full">Submit Ticket</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Response SLAs by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 text-slate-400 font-medium">Plan</th>
                  <th className="text-left py-3 text-slate-400 font-medium">Channels</th>
                  <th className="text-left py-3 text-slate-400 font-medium">Standard Response</th>
                  <th className="text-left py-3 text-slate-400 font-medium">Critical Response</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(responseSLAs).map(([plan, sla]) => (
                  <tr key={plan} className="border-b border-slate-800/50">
                    <td className="py-3 text-white font-medium">{plan}</td>
                    <td className="py-3 text-slate-400">{sla.channels.join(", ")}</td>
                    <td className="py-3 text-slate-400">{sla.response}</td>
                    <td className="py-3 text-slate-400">{sla.critical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}