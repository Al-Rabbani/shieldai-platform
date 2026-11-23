import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Mail, MessageSquare, Phone, CheckCircle, X } from "lucide-react";
import { CARD, BORDER, CYAN, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

export default function GDSNotificationPreferencesPage() {
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => base44.entities.NotificationPreference.filter({}).catch(() => []),
    refetchInterval: 60000,
  });

  const userPrefs = preferences?.[0] || {
    email_enabled: true,
    slack_enabled: false,
    pagerduty_enabled: false,
    sms_enabled: false,
    severity_filter: ['critical', 'high']
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Notification Preferences" }]} />

      <div className="flex items-start gap-3 mb-6">
        <Bell className="w-6 h-6" style={{ color: CYAN }} />
        <div>
          <h1 className="text-2xl font-black text-white">Notification Preferences</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Configure how you receive alerts and updates</p>
        </div>
      </div>

      <Card className="p-6 max-w-2xl">
        <h3 className="text-sm font-bold text-white mb-4">Notification Channels</h3>
        <div className="space-y-4">
          {[
            { key: 'email_enabled', icon: Mail, label: 'Email Notifications', desc: 'Receive alerts via email' },
            { key: 'slack_enabled', icon: MessageSquare, label: 'Slack Notifications', desc: 'Post alerts to Slack channels' },
            { key: 'pagerduty_enabled', icon: Bell, label: 'PagerDuty', desc: 'Critical alerts to PagerDuty' },
            { key: 'sms_enabled', icon: Phone, label: 'SMS Alerts', desc: 'Text messages for critical issues' },
          ].map(({ key, icon: Icon, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                  <Icon className="w-5 h-5" style={{ color: CYAN }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{label}</p>
                  <p className="text-[10px]" style={{ color: MUTED }}>{desc}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={userPrefs[key]} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-bold text-white mt-6 mb-4">Severity Filter</h3>
        <div className="flex gap-2 flex-wrap">
          {['critical', 'high', 'medium', 'low', 'info'].map(sev => (
            <button
              key={sev}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                userPrefs.severity_filter?.includes(sev)
                  ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-400'
                  : 'bg-white/5 border-border text-muted'
              }`}
              style={{ border: `1px solid ${userPrefs.severity_filter?.includes(sev) ? CYAN + "40" : BORDER}` }}
            >
              {sev.toUpperCase()}
            </button>
          ))}
        </div>

        <h3 className="text-sm font-bold text-white mt-6 mb-4">Quiet Hours</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-white block mb-2">Start Time</label>
            <input
              type="time"
              defaultValue={userPrefs.quiet_hours_start || '22:00'}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-white block mb-2">End Time</label>
            <input
              type="time"
              defaultValue={userPrefs.quiet_hours_end || '08:00'}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
        </div>

        <button className="w-full mt-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <CheckCircle className="w-4 h-4" />
          Save Preferences
        </button>
      </Card>
    </div>
  );
}