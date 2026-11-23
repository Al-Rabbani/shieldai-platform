import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { 
  Webhook, Shield, Copy, Check, Trash2, Edit, Plus, 
  AlertTriangle, Code2, ChevronRight, Clock, Server
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EVENTS = [
  { id: "new_finding", label: "New finding" },
  { id: "resolved", label: "Finding resolved" },
  { id: "ignored", label: "Finding ignored" },
  { id: "autofix_pr", label: "AutoFix PR created" },
  { id: "pentest_completed", label: "Pentest completed" },
  { id: "attack_wave", label: "Attack wave detected" },
  { id: "new_cve", label: "New CVE affects you" },
  { id: "container_scan", label: "Container scan complete" },
];

const VERIFICATION_CODE = {
  nodejs: `const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

// Usage
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-shieldai-signature'];
  const payload = JSON.stringify(req.body);
  const timestamp = req.headers['x-shieldai-timestamp'];
  
  // Reject replay attacks (older than 30 seconds)
  if (Date.now() - parseInt(timestamp) > 30000) {
    return res.status(401).json({ error: 'Replay attack detected' });
  }
  
  if (!verifyWebhookSignature(payload, signature, process.env.SHIELD_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
  console.log('Verified webhook:', req.body);
  res.status(200).json({ received: true });
});`,
  python: `import hmac
import hashlib
import time
from flask import Flask, request, abort

app = Flask(__name__)

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-ShieldAI-Signature')
    timestamp = request.headers.get('X-ShieldAI-Timestamp')
    payload = request.get_data(as_text=True)
    
    # Reject replay attacks (older than 30 seconds)
    if time.time() - int(timestamp) > 30:
        abort(401)
    
    if not verify_signature(payload, signature, app.config['SHIELD_WEBHOOK_SECRET']):
        abort(401)
    
    # Process webhook
    data = request.json
    print(f"Verified webhook: {data}")
    return {'received': True}`,
  go: `package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "net/http"
    "strconv"
    "time"
)

func verifySignature(payload, signature, secret string) bool {
    h := hmac.New(sha256.New, []byte(secret))
    h.Write([]byte(payload))
    expected := hex.EncodeToString(h.Sum(nil))
    return hmac.Equal([]byte(signature), []byte(expected))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    signature := r.Header.Get("X-ShieldAI-Signature")
    timestamp := r.Header.Get("X-ShieldAI-Timestamp")
    
    // Reject replay attacks (older than 30 seconds)
    ts, err := strconv.ParseInt(timestamp, 10, 64)
    if err != nil || time.Now().Unix()-ts > 30 {
        http.Error(w, "Replay attack detected", http.StatusUnauthorized)
        return
    }
    
    // Read payload
    payload, _ := io.ReadAll(r.Body)
    
    if !verifySignature(string(payload), signature, os.Getenv("SHIELD_WEBHOOK_SECRET")) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }
    
    // Process webhook
    w.WriteHeader(http.StatusOK)
}`,
};

export default function WebhooksPage() {
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState(null);
  const [copied, setCopied] = useState(false);
  const [webhooks, setWebhooks] = useState([
    { id: 1, url: "https://hooks.slack.com/services/XXX", events: ["new_finding", "resolved"], status: "active", lastTriggered: "2min ago", failures: 0 },
    { id: 2, url: "https://splunk.corp.com/webhook", events: ["all_events"], status: "active", lastTriggered: "1h ago", failures: 0 },
  ]);
  const [secrets, setSecrets] = useState([
    { id: "whsec_1", created: "2026-05-01", lastUsed: "2min ago" },
  ]);

  const generateSecret = () => {
    const secret = "whsec_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setGeneratedSecret(secret);
    setShowSecretModal(true);
  };

  const copySecret = () => {
    navigator.clipboard.writeText(generatedSecret);
    setCopied(true);
    toast.success("Secret copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "#030712" }}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Webhook className="w-5 h-5 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Platform Webhooks</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Send ShieldAI events to any external endpoint — SIEM, Splunk, PagerDuty, Slack, or your own systems.
        </p>
      </div>

      {/* Security Info */}
      <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(59,130,246,0.3)" }}>
        <div className="flex items-start gap-3 mb-4">
          <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-white mb-2">Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              ShieldAI signs every webhook with HMAC-SHA256. Every payload includes a <code className="text-emerald-400 bg-black/30 px-1 rounded">dispatched_at</code> timestamp — reject anything older than 30 seconds to prevent replay attacks.
              Fixed source IP: <code className="text-emerald-400 bg-black/30 px-1 rounded font-mono">52.18.113.172</code> — whitelist this in your firewall.
            </p>
          </div>
        </div>
      </div>

      {/* Webhook Secret */}
      <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Webhook Secret</h3>
            <p className="text-xs text-slate-500">Generate a secret to sign your webhooks. Store it securely — it's only shown once.</p>
          </div>
          <Button size="sm" onClick={generateSecret} className="h-8 text-xs">
            <Plus className="w-3 h-3 mr-1.5" /> Generate Secret
          </Button>
        </div>

        <div className="space-y-3">
          {secrets.map((secret) => (
            <div key={secret.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.3)" }}>
              <div className="flex items-center gap-3">
                <code className="text-xs font-mono text-emerald-400">{secret.id}</code>
                <div className="text-xs text-slate-500">
                  Created: {secret.created} · Last used: {secret.lastUsed}
                </div>
              </div>
              <button className="text-red-400 hover:underline text-xs">Revoke</button>
            </div>
          ))}
        </div>
      </div>

      {/* Registered Webhooks */}
      <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Registered Webhooks</h3>
            <p className="text-xs text-slate-500">Configure endpoints to receive ShieldAI events.</p>
          </div>
          <Dialog open={showAddWebhook} onOpenChange={setShowAddWebhook}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs">
                <Plus className="w-3 h-3 mr-1.5" /> Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Webhook</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Endpoint URL</label>
                  <Input placeholder="https://your-server.com/webhook" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Events</label>
                  <div className="grid grid-cols-2 gap-2">
                    {EVENTS.map((event) => (
                      <label key={event.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800" />
                        {event.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Select Secret</label>
                  <select className="w-full h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm">
                    <option>whsec_1</option>
                  </select>
                </div>
                <Button className="w-full">Save Webhook</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="p-4 rounded-lg" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.3)" }}>
              <div className="flex items-center justify-between mb-2">
                <code className="text-xs text-emerald-400">{wh.url}</code>
                <div className="flex items-center gap-2">
                  <button className="text-slate-400 hover:text-white"><Edit className="w-3 h-3" /></button>
                  <button className="text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Events: {wh.events.length}</span>
                <Badge className="text-[10px]" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                  ✓ Active
                </Badge>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {wh.lastTriggered}</span>
                <span>{wh.failures} failures</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification Code */}
      <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Code2 className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-white">Verification Code</h3>
        </div>

        <Tabs defaultValue="nodejs">
          <TabsList className="bg-[#0f172a] border border-slate-800 mb-4">
            <TabsTrigger value="nodejs" className="text-xs">Node.js</TabsTrigger>
            <TabsTrigger value="python" className="text-xs">Python</TabsTrigger>
            <TabsTrigger value="go" className="text-xs">Go</TabsTrigger>
          </TabsList>

          {Object.entries(VERIFICATION_CODE).map(([lang, code]) => (
            <TabsContent key={lang} value={lang} className="mt-0">
              <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-4 rounded-lg overflow-x-auto border border-slate-800">
                {code}
              </pre>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Quick Links */}
      <div className="pt-4 flex items-center gap-3 flex-wrap" style={{ borderTop: "1px solid rgba(30,58,95,0.3)" }}>
        <span className="text-[10px] text-slate-600 font-mono">RELATED:</span>
        <Link to="/settings" className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white transition-all font-mono" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          ← Settings
        </Link>
        <Link to="/integrations" className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white transition-all font-mono" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          🔌 Integrations
        </Link>
        <Link to="/guides" className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white transition-all font-mono" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          📖 Workflows
        </Link>
      </div>

      {/* Secret Modal */}
      <Dialog open={showSecretModal} onOpenChange={setShowSecretModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Webhook Secret Generated</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400">
                  <strong>Copy this secret now.</strong> It will only be shown once. Store it in your secrets manager — never commit it to code.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <code className="text-xs font-mono text-emerald-400 break-all">{generatedSecret}</code>
            </div>

            <Button onClick={copySecret} className="w-full">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>

            <Button variant="outline" onClick={() => setShowSecretModal(false)} className="w-full border-slate-700">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}