import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Plus, Trash2, Zap, Slack, ToggleLeft, ToggleRight, Save, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const TRIGGER_FIELDS = [
  { id: "new_critical_vuln", label: "New Critical Vulnerability", description: "Fires when a critical vuln is created" },
  { id: "sla_breach", label: "SLA Breach Detected", description: "Fires when a finding exceeds SLA deadline" },
  { id: "new_threat_intel", label: "New Threat Intel (Critical)", description: "Fires on new critical threat feed entry" },
  { id: "risk_score_above", label: "Global Risk Score Above Threshold", description: "Fires when risk score exceeds value" },
  { id: "new_pentest_critical", label: "Pentest Critical Finding", description: "Fires when a pentest finds a critical issue" },
  { id: "dark_web_event", label: "Dark Web Event Detected", description: "Fires on new dark web exposure" },
  { id: "ioc_malicious", label: "Malicious IOC Detected", description: "Fires when an IOC is flagged as malicious" },
  { id: "unassigned_critical", label: "Critical Finding Unassigned > Xh", label2: "Hours threshold", description: "Fires if critical finding stays unassigned" },
];

const DEFAULT_RULES = [
  { id: "r1", name: "Critical Vuln Alert", trigger: "new_critical_vuln", threshold: null, channel: "#security-alerts", enabled: true },
  { id: "r2", name: "SLA Breach Warning", trigger: "sla_breach", threshold: null, channel: "#security-alerts", enabled: true },
];

function RuleRow({ rule, onChange, onDelete, onTest }) {
  return (
    <div className={`p-4 rounded-xl border transition-all ${rule.enabled ? "border-[#1F2937] bg-[#111827]" : "border-[#1F2937]/50 bg-[#111827]/50 opacity-60"}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <Input value={rule.name} onChange={e => onChange({ ...rule, name: e.target.value })}
              className="h-8 text-sm font-semibold bg-transparent border-transparent hover:border-[#374151] focus:border-[#6366F1] text-white w-48 px-2"
              placeholder="Rule name…" />
            <button onClick={() => onChange({ ...rule, enabled: !rule.enabled })}>
              {rule.enabled
                ? <ToggleRight className="w-6 h-6 text-[#6366F1]" />
                : <ToggleLeft className="w-6 h-6 text-slate-600" />}
            </button>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <Label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Trigger Event</Label>
              <select value={rule.trigger} onChange={e => onChange({ ...rule, trigger: e.target.value })}
                className="h-8 text-xs rounded-lg px-2 bg-[#1F2937] border border-[#374151] text-white">
                {TRIGGER_FIELDS.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            {["risk_score_above", "unassigned_critical"].includes(rule.trigger) && (
              <div>
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Threshold</Label>
                <Input value={rule.threshold || ""} onChange={e => onChange({ ...rule, threshold: e.target.value })}
                  placeholder="e.g. 75" type="number"
                  className="h-8 text-xs w-24 bg-[#1F2937] border-[#374151]" />
              </div>
            )}

            <div>
              <Label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Slack Channel</Label>
              <Input value={rule.channel} onChange={e => onChange({ ...rule, channel: e.target.value })}
                placeholder="#channel-name"
                className="h-8 text-xs w-40 bg-[#1F2937] border-[#374151]" />
            </div>
          </div>

          <div className="text-[10px] text-slate-600">
            {TRIGGER_FIELDS.find(t => t.id === rule.trigger)?.description}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs border-[#374151] text-slate-400"
            onClick={() => onTest(rule)}>
            <TestTube className="w-3 h-3 mr-1" /> Test
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-400"
            onClick={() => onDelete(rule.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationRulesPage() {
  const [rules, setRules] = useState(DEFAULT_RULES);
  const { toast } = useToast();

  const addRule = () => {
    setRules(prev => [...prev, {
      id: "r_" + Date.now(),
      name: "New Alert Rule",
      trigger: "new_critical_vuln",
      threshold: null,
      channel: "#security-alerts",
      enabled: true,
    }]);
  };

  const updateRule = (updated) => {
    setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const deleteRule = (id) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const testRule = async (rule) => {
    try {
      await base44.functions.invoke("shieldSlackCriticalAlert", {
        title: `[TEST] ${rule.name}`,
        severity: "critical",
        asset_name: "Test Asset",
        channel: rule.channel,
        description: `This is a test alert triggered from Notification Rules for rule: "${rule.name}"`,
      });
      toast({ title: "Test alert sent!", description: `Sent to ${rule.channel} via Slackbot.` });
    } catch (e) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    }
  };

  const saveRules = () => {
    localStorage.setItem("shield_notification_rules", JSON.stringify(rules));
    toast({ title: "Rules saved", description: `${rules.length} notification rules saved.` });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#6366F1]" /> Notification Rules
          </h1>
          <p className="text-sm text-slate-400 mt-1">Define custom Slack alert triggers for security events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-[#374151] text-slate-300" onClick={addRule}>
            <Plus className="w-4 h-4 mr-2" /> Add Rule
          </Button>
          <Button className="bg-[#6366F1] hover:bg-[#5558e3] text-white" onClick={saveRules}>
            <Save className="w-4 h-4 mr-2" /> Save All Rules
          </Button>
        </div>
      </div>

      {/* Slack status */}
      <div className="rounded-xl p-4 bg-[#111827] border border-[#1F2937] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#4A154B] flex items-center justify-center">
          <Slack className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Slackbot Connected</div>
          <div className="text-xs text-slate-400">Alerts delivered via your connected ShieldAI Slackbot</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-semibold">Active</span>
        </div>
      </div>

      <div className="space-y-3">
        {rules.map(rule => (
          <RuleRow key={rule.id} rule={rule} onChange={updateRule} onDelete={deleteRule} onTest={testRule} />
        ))}
        {rules.length === 0 && (
          <div className="p-10 text-center text-slate-500 border border-dashed border-[#1F2937] rounded-xl">
            No rules defined. Click "Add Rule" to get started.
          </div>
        )}
      </div>

      <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
        <strong>Note:</strong> Automated event-based triggers require integration credits to run on schedule. Currently, use the "Test" button to send manual alerts. Credits reset 2026-06-20.
      </div>
    </div>
  );
}