import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plug, Plus, Save } from "lucide-react";
import { CARD, BORDER, CYAN, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

export default function GDSRegisterConnectorPage() {
  const [formData, setFormData] = useState({
    connector_name: "",
    connector_type: "api",
    provider: "",
    description: "",
    base_url: "",
    auth_method: "api_key"
  });

  const registerMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsConnectorHub", { action: 'register', ...data }),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await registerMutation.mutateAsync(formData);
    setFormData({ connector_name: "", connector_type: "api", provider: "", description: "", base_url: "", auth_method: "api_key" });
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Register Connector" }]} />

      <div className="flex items-start gap-3 mb-6">
        <Plug className="w-6 h-6" style={{ color: CYAN }} />
        <div>
          <h1 className="text-2xl font-black text-white">Register New Connector</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Configure integration with external services</p>
        </div>
      </div>

      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-white block mb-2">Connector Name</label>
            <input
              required
              value={formData.connector_name}
              onChange={(e) => setFormData({ ...formData, connector_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              placeholder="e.g., Slack Alerts"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-white block mb-2">Connector Type</label>
              <select
                value={formData.connector_type}
                onChange={(e) => setFormData({ ...formData, connector_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              >
                <option value="api">API</option>
                <option value="webhook">Webhook</option>
                <option value="oauth">OAuth</option>
                <option value="database">Database</option>
                <option value="cloud_provider">Cloud Provider</option>
                <option value="siem">SIEM</option>
                <option value="ticketing">Ticketing</option>
                <option value="communication">Communication</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-white block mb-2">Provider</label>
              <input
                required
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                placeholder="e.g., Slack, Jira"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-white block mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              placeholder="Brief description of the connector's purpose"
              rows={3}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-white block mb-2">Base URL</label>
            <input
              value={formData.base_url}
              onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              placeholder="https://api.example.com"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-white block mb-2">Authentication Method</label>
            <select
              value={formData.auth_method}
              onChange={(e) => setFormData({ ...formData, auth_method: e.target.value })}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            >
              <option value="api_key">API Key</option>
              <option value="oauth2">OAuth 2.0</option>
              <option value="basic">Basic Auth</option>
              <option value="bearer">Bearer Token</option>
              <option value="mtls">mTLS</option>
              <option value="none">None</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
            style={{
              background: registerMutation.isPending ? "rgba(255,255,255,0.1)" : `${CYAN}15`,
              border: `1px solid ${CYAN}40`,
              color: registerMutation.isPending ? MUTED : CYAN
            }}
          >
            {registerMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: CYAN }} />
                Registering...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Register Connector
              </>
            )}
          </button>
        </form>
      </Card>
    </div>
  );
}