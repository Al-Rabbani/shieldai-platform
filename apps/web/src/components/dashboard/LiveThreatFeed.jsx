import React, { useState, useEffect } from "react";
import { AlertTriangle, Shield, Globe, Zap } from "lucide-react";

const MOCK_EVENTS = [
  { id: 1, type: "sql_injection", severity: "critical", message: "SQL injection blocked from 91.23.45.67 (Russia)", time: "2 min ago", ip: "91.23.45.67", country: "Russia" },
  { id: 2, type: "brute_force", severity: "high", message: "Brute force attempt on /api/login — 12.3K requests blocked", time: "5 min ago", count: "12.3K" },
  { id: 3, type: "cve_published", severity: "medium", message: "New CVE published matching your deps: CVE-2026-4471", time: "18 min ago", cve: "CVE-2026-4471" },
  { id: 4, type: "bot_blocked", severity: "low", message: "Malicious bot blocked from 185.220.101.42 (Germany)", time: "23 min ago", ip: "185.220.101.42" },
  { id: 5, type: "ddos_mitigated", severity: "high", message: "DDoS attack mitigated — 2.4M req/min peak", time: "1 hour ago", peak: "2.4M" },
  { id: 6, type: "supply_chain", severity: "critical", message: "Malicious npm package detected: event-stream@3.3.7", time: "2 hours ago", package: "event-stream" },
  { id: 7, type: "zero_day", severity: "critical", message: "Zero-day exploit detected in the wild: CVE-2026-9999", time: "3 hours ago", cve: "CVE-2026-9999" },
  { id: 8, type: "credential_stuffing", severity: "high", message: "Credential stuffing attack from 47.2K IPs blocked", time: "4 hours ago", ips: "47.2K" },
  { id: 9, type: "api_abuse", severity: "medium", message: "API rate limit exceeded by client app-mobile-ios", time: "5 hours ago", client: "app-mobile-ios" },
  { id: 10, type: "data_exfil", severity: "critical", message: "Potential data exfiltration attempt blocked — 500MB upload", time: "6 hours ago", size: "500MB" },
];

const SEVERITY_COLORS = {
  critical: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", text: "#ef4444", icon: AlertTriangle },
  high: { bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", text: "#f97316", icon: Zap },
  medium: { bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)", text: "#eab308", icon: Globe },
  low: { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)", text: "#3b82f6", icon: Shield },
};

export default function LiveThreatFeed() {
  const [events, setEvents] = useState(MOCK_EVENTS);

  // Auto-refresh simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // In production, this would fetch from API
      // For demo, just shuffle slightly
      setEvents(prev => [...prev].sort(() => Math.random() - 0.5));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {events.map(event => {
        const config = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.medium;
        const Icon = config.icon;
        
        return (
          <div
            key={event.id}
            className="p-3 rounded-lg border transition-all hover:scale-[1.02] cursor-pointer"
            style={{ background: config.bg, borderColor: config.border }}
          >
            <div className="flex items-start gap-3">
              <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: config.text }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{event.message}</p>
                <p className="text-[10px] text-slate-500 mt-1">{event.time}</p>
              </div>
              {event.severity === "critical" && (
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
          </div>
        );
      })}
      <div className="pt-2 text-center">
        <button className="text-xs text-blue-400 hover:underline">View all threats →</button>
      </div>
    </div>
  );
}