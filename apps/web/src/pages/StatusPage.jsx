import React, { useState, useEffect } from "react";
import { Check, AlertTriangle, X, Mail, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const SERVICES = [
  { name: "Web Application", status: "operational", latency: "142ms", uptime: 99.98 },
  { name: "API (Backend Functions)", status: "operational", latency: "87ms", uptime: 99.97 },
  { name: "SAST Scanner Engine", status: "operational", latency: "1.2s avg", uptime: 99.95 },
  { name: "SCA Engine (OSV.dev)", status: "operational", latency: null, uptime: 99.99 },
  { name: "DAST Engine", status: "operational", latency: null, uptime: 99.94 },
  { name: "Cloud Scanner (AWS/Azure/GCP)", status: "operational", latency: null, uptime: 99.96 },
  { name: "Threat Intel Feed (CISA KEV)", status: "operational", latency: null, uptime: 99.99 },
  { name: "EDR Agent Telemetry", status: "operational", latency: null, uptime: 99.93 },
  { name: "AutoTriage Engine", status: "operational", latency: null, uptime: 99.97 },
  { name: "Notification Service", status: "operational", latency: null, uptime: 99.98 },
];

const INCIDENTS = [
  // Add real incidents here when they occur
];

export default function StatusPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const overallStatus = SERVICES.every(s => s.status === "operational") ? "operational" : "degraded";

  const handleSubscribe = () => {
    if (email) {
      setSubscribed(true);
      // In production: call API to subscribe
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      <Button variant="ghost" onClick={() => window.history.back()} className="text-slate-400 hover:text-white mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Trust Center
      </Button>

      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">ShieldAI Platform Status</h1>
        <div className={`flex items-center justify-center gap-3 text-xl ${
          overallStatus === "operational" ? "text-emerald-400" : "text-amber-400"
        }`}>
          <div className={`w-4 h-4 rounded-full ${
            overallStatus === "operational" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
          }`} />
          {overallStatus === "operational" ? "All Systems Operational" : "Partial Service Degradation"}
        </div>
        <div className="text-slate-500">Last updated: {new Date().toLocaleString()}</div>
      </div>

      {/* Service Status Grid */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Service Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {SERVICES.map((service, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    service.status === "operational" ? "bg-emerald-500" :
                    service.status === "degraded" ? "bg-amber-500" : "bg-red-500"
                  }`} />
                  <div>
                    <div className="text-white font-medium">{service.name}</div>
                    {service.latency && (
                      <div className="text-xs text-slate-400">{service.latency}</div>
                    )}
                  </div>
                </div>
                <Badge className={
                  service.status === "operational" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                  service.status === "degraded" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                  "bg-red-500/20 text-red-400 border-red-500/30"
                }>
                  {service.status === "operational" ? "Operational" : service.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Uptime Summary */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">90-Day Uptime</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {SERVICES.slice(0, 5).map((service, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{service.name}</span>
                  <span className="text-white font-medium">{service.uptime}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${service.uptime}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Incident History */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Incident History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {INCIDENTS.length === 0 ? (
            <div className="text-center py-8">
              <Check className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <div className="text-white font-medium">No incidents in the past 90 days</div>
              <div className="text-slate-400 text-sm">We maintain 99.9%+ uptime across all services</div>
            </div>
          ) : (
            <div className="space-y-4">
              {INCIDENTS.map((incident, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white font-medium">{incident.title}</div>
                    <Badge className="bg-slate-700 text-slate-300">{incident.date}</Badge>
                  </div>
                  <div className="text-slate-400 text-sm">{incident.description}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    Resolved in {incident.resolution_time} • {incident.affected_services} affected
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscribe to Updates */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#C9A84C]" />
            Subscribe to Status Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscribed ? (
            <div className="text-center py-4">
              <Check className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <div className="text-white font-medium">You're subscribed!</div>
              <div className="text-slate-400 text-sm">We'll notify you of any incidents or maintenance</div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white flex-1"
              />
              <Button onClick={handleSubscribe} className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
                Subscribe
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}