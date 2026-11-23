import React, { useState } from "react";
import { Key, Plus, Trash2, Copy, Check, Globe, Webhook } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const apiKeys = [
  { id: 1, name: "Production API Key", permissions: "Read-Write", created: "2026-06-01", lastUsed: "2 minutes ago", expires: "Never" },
  { id: 2, name: "CI/CD Integration", permissions: "Read-only", created: "2026-05-15", lastUsed: "1 hour ago", expires: "2026-12-31" },
];

const webhooks = [
  { id: 1, url: "https://api.example.com/shieldai-events", events: ["finding.created", "finding.resolved"], active: true },
  { id: 2, url: "https://hooks.slack.com/services/...", events: ["scan.completed"], active: false },
];

export default function ApiSettingsPage() {
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreateKey = () => {
    const key = `sk_live_${Math.random().toString(36).substring(2, 24)}`;
    setGeneratedKey(key);
    setShowNewKey(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">API Settings</h1>
        <p className="text-slate-400">Manage API keys, webhooks, and rate limits</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">API Keys</CardTitle>
          <CardDescription>Authenticate API requests with secret keys</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-400">
              Base URL: <code className="bg-slate-800 px-2 py-1 rounded text-primary">https://api.shieldai.dev/v1</code>
            </div>
            <Button onClick={() => setShowNewKey(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </div>

          {showNewKey && (
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Key Name</label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production API Key"
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateKey}>Generate Key</Button>
                <Button variant="outline" onClick={() => setShowNewKey(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {generatedKey && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2">
              <div className="text-green-500 text-sm font-medium">Your API key (show only once):</div>
              <div className="flex gap-2">
                <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-white font-mono">{generatedKey}</code>
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="text-xs text-slate-400">Store this key securely. It won't be shown again.</div>
            </div>
          )}

          <div className="space-y-2">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-white font-medium">{key.name}</div>
                    <div className="text-slate-400 text-sm">
                      {key.permissions} • Created {key.created} • Last used {key.lastUsed}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{key.expires}</Badge>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Webhooks</CardTitle>
          <CardDescription>Receive real-time notifications for ShieldAI events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button>
            <Webhook className="w-4 h-4 mr-2" />
            Add Webhook
          </Button>

          <div className="space-y-2">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-primary" />
                    <code className="text-white text-sm">{webhook.url}</code>
                  </div>
                  <div className="text-slate-400 text-sm">
                    Events: {webhook.events.join(", ")}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Switch checked={webhook.active} />
                  <Button variant="ghost" size="icon">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Rate Limits</CardTitle>
          <CardDescription>API request limits based on your plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
            <div>
              <div className="text-white font-medium">Current Plan: Professional</div>
              <div className="text-slate-400 text-sm">500 requests per minute</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">127</div>
              <div className="text-slate-400 text-sm">requests this minute</div>
            </div>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-1/4 rounded-full" />
          </div>
          <div className="text-xs text-slate-400">
            Rate limit resets in 42 seconds
          </div>
        </CardContent>
      </Card>
    </div>
  );
}