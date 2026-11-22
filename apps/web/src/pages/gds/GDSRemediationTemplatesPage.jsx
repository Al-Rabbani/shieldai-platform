import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BookOpen, Plus, Trash2, Edit, Copy, Code, Link, Clock, CheckCircle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, PAGE_BG, EmptyState
} from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import ReactMarkdown from "react-markdown";

export default function GDSRemediationTemplatesPage() {
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["remediation-templates"],
    queryFn: () => base44.entities.RemediationTemplate.list("-created_date").catch(() => []),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RemediationTemplate.create(data),
    onSuccess: () => {
      qc.invalidateQueries(["remediation-templates"]);
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RemediationTemplate.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(["remediation-templates"]);
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RemediationTemplate.delete(id),
    onSuccess: () => qc.invalidateQueries(["remediation-templates"]),
  });

  const handleSave = (formData) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Delete this remediation template?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Remediation Templates" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
            <BookOpen className="w-6 h-6" style={{ color: CYAN }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Remediation Templates</h1>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>Pre-written fix instructions for common vulnerabilities</p>
          </div>
        </div>

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
          <DialogContent className="max-w-4xl" style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }}>
            <DialogHeader>
              <DialogTitle style={{ color: TEXT }}>
                {editingTemplate ? 'Edit Template' : 'Create Remediation Template'}
              </DialogTitle>
            </DialogHeader>
            <RemediationForm
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

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No remediation templates"
          description="Create templates to provide standard fix instructions for common vulnerabilities"
          actionLabel="Create Template"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {templates.filter(t => t.is_active).map((template) => (
            <Card key={template.id} className="p-5" glow>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-bold text-white">{template.template_name}</h3>
                    {template.severity && (
                      <span
                        className="text-[9px] font-black px-2 py-0.5 rounded uppercase"
                        style={{
                          background: template.severity === 'critical' ? `${DANGER}15` :
                            template.severity === 'high' ? `${HIGH}15` :
                              template.severity === 'medium' ? `${MEDIUM}15` : `${LOW}15`,
                          color: template.severity === 'critical' ? DANGER :
                            template.severity === 'high' ? HIGH :
                              template.severity === 'medium' ? MEDIUM : LOW,
                          border: `1px solid ${template.severity === 'critical' ? DANGER + '30' :
                            template.severity === 'high' ? HIGH + '30' :
                              template.severity === 'medium' ? MEDIUM + '30' : LOW + '30'}`
                        }}
                      >
                        {template.severity}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mb-3" style={{ color: MUTED }}>{template.description}</p>
                  
                  <div className="flex items-center gap-4 text-[10px] mb-3">
                    <span className="flex items-center gap-1" style={{ color: MUTED }}>
                      <BookOpen className="w-3 h-3" />
                      {template.vulnerability_type || "General"}
                    </span>
                    <span className="flex items-center gap-1" style={{ color: MUTED }}>
                      <Clock className="w-3 h-3" />
                      {template.estimated_effort || "Unspecified"}
                    </span>
                    <span className="flex items-center gap-1" style={{ color: CYAN }}>
                      <CheckCircle className="w-3 h-3" />
                      Used {template.usage_count || 0} times
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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

              <div className="p-3 rounded-lg" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Quick Preview</p>
                <div className="text-xs" style={{ color: TEXT }}>
                  <ReactMarkdown className="prose prose-sm max-w-none">
                    {template.remediation_steps?.slice(0, 200) + '...'}
                  </ReactMarkdown>
                </div>
              </div>

              {(template.references || []).length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {template.references.slice(0, 3).map((ref, i) => (
                    <a
                      key={i}
                      href={ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] flex items-center gap-1 hover:underline"
                      style={{ color: CYAN }}
                    >
                      <Link className="w-3 h-3" />
                      Reference {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RemediationForm({ template, onSave, onCancel, isPending }) {
  const [formData, setFormData] = useState({
    template_name: template?.template_name || '',
    description: template?.description || '',
    vulnerability_type: template?.vulnerability_type || '',
    severity: template?.severity || 'medium',
    remediation_steps: template?.remediation_steps || '',
    code_example: template?.code_example || '',
    references: template?.references || [],
    estimated_effort: template?.estimated_effort || '1-4 hours',
    testing_guidance: template?.testing_guidance || '',
    is_active: template?.is_active ?? true,
  });

  const [refInput, setRefInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const addReference = () => {
    if (refInput.trim()) {
      setFormData({ ...formData, references: [...(formData.references || []), refInput.trim()] });
      setRefInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label style={{ color: TEXT }}>Template Name</Label>
          <Input
            value={formData.template_name}
            onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
            placeholder="e.g., SQL Injection Fix"
            required
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>

        <div>
          <Label style={{ color: TEXT }}>Vulnerability Type</Label>
          <Input
            value={formData.vulnerability_type}
            onChange={(e) => setFormData({ ...formData, vulnerability_type: e.target.value })}
            placeholder="e.g., SQL Injection, XSS, CVE-2024-1234"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>
      </div>

      <div>
        <Label style={{ color: TEXT }}>Description</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="When to use this template"
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label style={{ color: TEXT }}>Severity</Label>
          <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}>
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

        <div>
          <Label style={{ color: TEXT }}>Estimated Effort</Label>
          <Select value={formData.estimated_effort} onValueChange={(v) => setFormData({ ...formData, estimated_effort: v })}>
            <SelectTrigger style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <SelectItem value="< 1 hour">&lt; 1 hour</SelectItem>
              <SelectItem value="1-4 hours">1-4 hours</SelectItem>
              <SelectItem value="4-8 hours">4-8 hours</SelectItem>
              <SelectItem value="1-2 days">1-2 days</SelectItem>
              <SelectItem value="> 2 days">&gt; 2 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label style={{ color: TEXT }}>Remediation Steps (Markdown)</Label>
        <Textarea
          value={formData.remediation_steps}
          onChange={(e) => setFormData({ ...formData, remediation_steps: e.target.value })}
          placeholder="## Steps to Fix&#10;1. Update the dependency&#10;2. Apply the patch&#10;3. Test the changes"
          rows={6}
          required
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, fontFamily: 'monospace' }}
        />
      </div>

      <div>
        <Label style={{ color: TEXT }}>Code Example (Optional)</Label>
        <Textarea
          value={formData.code_example}
          onChange={(e) => setFormData({ ...formData, code_example: e.target.value })}
          placeholder="// Example patch code here"
          rows={4}
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, fontFamily: 'monospace' }}
        />
      </div>

      <div>
        <Label style={{ color: TEXT }}>Testing Guidance</Label>
        <Textarea
          value={formData.testing_guidance}
          onChange={(e) => setFormData({ ...formData, testing_guidance: e.target.value })}
          placeholder="How to verify the fix works"
          rows={3}
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
        />
      </div>

      <div>
        <Label style={{ color: TEXT }}>References (URLs)</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={refInput}
            onChange={(e) => setRefInput(e.target.value)}
            placeholder="https://..."
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addReference())}
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
          <Button type="button" onClick={addReference} style={{ background: CYAN, color: "#020817" }}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(formData.references || []).map((ref, i) => (
            <span key={i} className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(0,212,255,0.1)", color: CYAN, border: `1px solid ${CYAN}30` }}>
              {ref}
              <button type="button" onClick={() => setFormData({ ...formData, references: formData.references.filter((_, idx) => idx !== i) })} className="ml-2 hover:text-white">×</button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
        />
        <Label style={{ color: TEXT }}>Active</Label>
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