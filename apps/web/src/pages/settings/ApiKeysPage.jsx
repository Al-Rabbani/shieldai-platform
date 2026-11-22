import React, { useState } from "react";
import { Key, Plus, Copy, Check, Trash2, Eye, EyeOff, Shield, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

export default function ApiKeysPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    permissions: "read",
    expires_at: "",
    description: "",
  });

  const queryClient = useQueryClient();

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      try {
        return await base44.entities.ApiKey.list("-created_date");
      } catch {
        return [];
      }
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: async (data) => {
      // Generate a real API key
      const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
      const fullKey = `sk_live_${randomPart}`;
      const keyPrefix = fullKey.slice(0, 12);
      
      // Simple hash (in production, use proper SHA-256)
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(fullKey);
      const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const payload = {
        name: data.name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        permissions: data.permissions,
        expires_at: data.expires_at || null,
        description: data.description,
        is_active: true,
        created_by: "current_user",
      };

      await base44.entities.ApiKey.create(payload);
      
      return { fullKey, keyPrefix };
    },
    onSuccess: ({ fullKey, keyPrefix }) => {
      queryClient.invalidateQueries(["api-keys"]);
      setGeneratedKey(fullKey);
      setShowKeyModal(true);
      setFormData({ name: "", permissions: "read", expires_at: "", description: "" });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.ApiKey.update(id, { is_active: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["api-keys"]);
      toast.success("API key revoked");
    },
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createKeyMutation.mutate(formData);
  };

  const getPermissionColor = (perms) => {
    switch (perms) {
      case "admin": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "read_write": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-green-500/20 text-green-400 border-green-500/30";
    }
  };

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Key className="w-6 h-6 text-amber-500" />
              API Keys
            </h1>
            <p className="text-slate-400 text-sm mt-1">Manage API keys for programmatic access</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-amber-500 hover:bg-amber-600 text-black">
            <Plus className="w-4 h-4 mr-2" />
            Create API Key
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
              <div className="text-sm text-slate-400">
                <p className="text-white font-medium mb-1">Security Best Practices</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>API keys are shown only once — save them securely</li>
                  <li>Use read-only keys for monitoring, read_write for modifications</li>
                  <li>Set expiration dates for temporary access</li>
                  <li>Revoke keys immediately if compromised</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys Table */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white text-sm">Active API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-slate-400 text-sm">Loading API keys...</div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-12">
                <Key className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No API keys yet</p>
                <p className="text-slate-500 text-sm mt-1">Create your first API key to enable programmatic access</p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map(key => (
                  <div
                    key={key.id}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${key.is_active ? "bg-green-500" : "bg-red-500"}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{key.name}</span>
                          <Badge className={getPermissionColor(key.permissions)}>{key.permissions}</Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          <span className="font-mono">{key.key_prefix}••••••••••••</span>
                          {key.expires_at && (
                            <span className="ml-3">
                              Expires: {new Date(key.expires_at).toLocaleDateString()}
                            </span>
                          )}
                          {key.last_used_at && (
                            <span className="ml-3">
                              Last used: {new Date(key.last_used_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-white"
                        onClick={() => revokeKeyMutation.mutate(key.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Key Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-white">Create New API Key</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Key Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Production Monitoring"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Permissions</label>
                <select
                  value={formData.permissions}
                  onChange={(e) => setFormData({ ...formData, permissions: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                >
                  <option value="read">Read Only</option>
                  <option value="read_write">Read & Write</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Expiration (Optional)</label>
                <Input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="border-slate-700 text-slate-300">
                  Cancel
                </Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
                  Generate Key
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Show Generated Key Modal */}
        <Dialog open={showKeyModal} onOpenChange={setShowKeyModal}>
          <DialogContent className="bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Save Your API Key
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-400">
                This is the only time your API key will be shown. Copy it and store it securely — it cannot be recovered later.
              </p>
              <div className="relative">
                <code className="block p-3 bg-slate-950 border border-slate-800 rounded text-sm text-green-400 font-mono break-all">
                  {generatedKey}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 text-slate-400 hover:text-white"
                  onClick={() => copyToClipboard(generatedKey)}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Button onClick={() => setShowKeyModal(false)} className="w-full bg-amber-500 hover:bg-amber-600 text-black">
                I've Saved This Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
}