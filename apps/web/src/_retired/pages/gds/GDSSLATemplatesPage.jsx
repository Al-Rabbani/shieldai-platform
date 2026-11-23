import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, Plus, Trash2, Edit, CheckCircle, AlertCircle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, PAGE_BG, EmptyState
} from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function GDSSLATemplatesPage() {
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["sla-templates"],
    queryFn: () => base44.entities.SLATemplate.list("-created_date").catch(() => []),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SLATemplate.create(data),
    onSuccess: () => {
      qc.invalidateQueries(["sla-templates"]);
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SLATemplate.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(["sla-templates"]);
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SLATemplate.delete(id),
    onSuccess: () => qc.invalidateQueries(["sla-templates"]),
  });

  const applyAllMutation = useMutation({
    mutationFn: () => base44.functions.invoke('gdsApplySLATemplates', {}),
    onSuccess: () => {
      qc.invalidateQueries(["findings"]);
    },
  });

  const handleSave = (formData) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Delete this SLA template?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleApplyAll = () => {
    if (confirm('Apply SLA templates to all existing findings without due dates?')) {
      applyAllMutation.mutate();
    }
  };

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "SLA Templates" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
            <Clock className="w-6 h-6" style={{ color: CYAN }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">SLA Templates</h1>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>Automated resolution deadlines based on risk scores</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleApplyAll}
            disabled={applyAllMutation.isPending}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
          >
            Apply to Existing
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: CYAN, color: "#020817" }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }}>
              <DialogHeader>
                <DialogTitle style={{ color: TEXT }}>
                  {editingTemplate ? 'Edit SLA Template' : 'Create SLA Template'}
                </DialogTitle>
              </DialogHeader>
              <SLAForm
                template={editingTemplate}
                onSave={handleSave}
                onCancel={() => {
                  setIsDialogOpen(false);
                  setEditingTemplate(null);
                }}
                isPending={createMutation.isPending || updateMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No SLA templates configured"
          description="Create templates to automatically set resolution deadlines for findings based on risk scores"
          actionLabel="Create Template"
        />
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template.id} className="p-5" glow>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-bold text-white">{template.template_name}</h3>
                    <span
                      className="text-[9px] font-black px-2 py-0.5 rounded uppercase"
                      style={{
                        background: template.criticality === 'critical' ? `${DANGER}15` :
                          template.criticality === 'high' ? `${HIGH}15` :
                            template.criticality === 'medium' ? `${MEDIUM}15` : `${LOW}15`,
                        color: template.criticality === 'critical' ? DANGER :
                          template.criticality === 'high' ? HIGH :
                            template.criticality === 'medium' ? MEDIUM : LOW,
                        border: `1px solid ${template.criticality === 'critical' ? DANGER + '30' :
                          template.criticality === 'high' ? HIGH + '30' :
                            template.criticality === 'medium' ? MEDIUM + '30' : LOW + '30'}`
                      }}
                    >
                      {template.criticality}
                    </span>
                    {template.is_default && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>
                        Default
                      </span>
                    )}
                    {!template.is_active && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(100,116,139,0.15)", color: MUTED, border: `1px solid ${MUTED}30` }}>
                        Inactive
                      </span>
                    )}
                  </div>

                  <p className="text-xs mb-3" style={{ color: MUTED }}>{template.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="text-center p-2 rounded-lg" style={{ background: "rgba(0,212,255,0.04)" }}>
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Risk Range</p>
                      <p className="text-sm font-black font-mono" style={{ color: CYAN }}>{template.risk_score_min}-{template.risk_score_max}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: "rgba(0,255,136,0.04)" }}>
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Resolution</p>
                      <p className="text-sm font-black font-mono" style={{ color: LOW }}>{template.resolution_hours}h</p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,140,0,0.04)" }}>
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Escalation</p>
                      <p className="text-sm font-black font-mono" style={{ color: HIGH }}>{template.escalation_hours}h</p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,59,59,0.04)" }}>
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Auto-Assign</p>
                      <p className="text-sm font-black font-mono" style={{ color: DANGER }}>{template.auto_assign_role || 'Manual'}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: "rgba(100,116,139,0.04)" }}>
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Channels</p>
                      <p className="text-xs font-bold" style={{ color: MUTED }}>{(template.notification_channels || []).join(', ') || 'Email'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="p-2 hover:bg-white/5"
                    style={{ color: CYAN }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="p-2 hover:bg-white/5"
                    style={{ color: DANGER }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SLAForm({ template, onSave, onCancel, isPending }) {
  const [formData, setFormData] = useState({
    template_name: template?.template_name || '',
    description: template?.description || '',
    criticality: template?.criticality || 'medium',
    risk_score_min: template?.risk_score_min || 0,
    risk_score_max: template?.risk_score_max || 100,
    resolution_hours: template?.resolution_hours || 24,
    escalation_hours: template?.escalation_hours || 8,
    auto_assign_role: template?.auto_assign_role || '',
    notification_channels: template?.notification_channels || ['email'],
    is_active: template?.is_active ?? true,
    is_default: template?.is_default || false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label style={{ color: TEXT }}>Template Name</Label>
          <Input
            value={formData.template_name}
            onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
            placeholder="e.g., Critical Vulnerabilities"
            required
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>

        <div>
          <Label style={{ color: TEXT }}>Criticality Level</Label>
          <Select value={formData.criticality} onValueChange={(v) => setFormData({ ...formData, criticality: v })}>
            <SelectTrigger style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label style={{ color: TEXT }}>Description</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="When does this template apply?"
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label style={{ color: TEXT }}>Min Risk Score</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.risk_score_min}
            onChange={(e) => setFormData({ ...formData, risk_score_min: parseInt(e.target.value) })}
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>
        <div>
          <Label style={{ color: TEXT }}>Max Risk Score</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.risk_score_max}
            onChange={(e) => setFormData({ ...formData, risk_score_max: parseInt(e.target.value) })}
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label style={{ color: TEXT }}>Resolution Time (hours)</Label>
          <Input
            type="number"
            min="1"
            value={formData.resolution_hours}
            onChange={(e) => setFormData({ ...formData, resolution_hours: parseInt(e.target.value) })}
            required
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>
        <div>
          <Label style={{ color: TEXT }}>Escalation Time (hours)</Label>
          <Input
            type="number"
            min="1"
            value={formData.escalation_hours}
            onChange={(e) => setFormData({ ...formData, escalation_hours: parseInt(e.target.value) })}
            required
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>
      </div>

      <div>
        <Label style={{ color: TEXT }}>Auto-Assign Role (optional)</Label>
        <Input
          value={formData.auto_assign_role}
          onChange={(e) => setFormData({ ...formData, auto_assign_role: e.target.value })}
          placeholder="e.g., security-engineer"
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.is_active}
            onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
          />
          <Label style={{ color: TEXT }}>Active</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.is_default}
            onCheckedChange={(v) => setFormData({ ...formData, is_default: v })}
          />
          <Label style={{ color: TEXT }}>Default Template</Label>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-xl text-xs font-bold"
          style={{ background: CYAN, color: "#020817" }}
        >
          {isPending ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="ghost"
          className="px-4 py-2 rounded-xl text-xs font-bold"
          style={{ color: MUTED }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}