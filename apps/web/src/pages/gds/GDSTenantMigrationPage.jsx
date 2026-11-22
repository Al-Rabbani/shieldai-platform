import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowRightLeft, CheckCircle, AlertTriangle, XCircle, Loader, Shield, Database, Settings } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { toast } from "sonner";

export default function GDSTenantMigrationPage() {
  const qc = useQueryClient();
  const [sourceTenant, setSourceTenant] = useState("");
  const [targetTenant, setTargetTenant] = useState("");
  const [migrationResult, setMigrationResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => base44.entities.Tenant.filter({}).catch(() => []),
  });

  const { data: sourceUsage } = useQuery({
    queryKey: ["tenant-usage", sourceTenant],
    queryFn: () => sourceTenant ? base44.entities.TenantResourceUsage.filter({ tenant_id: sourceTenant }).then(r => {
      const latest = r.reduce((latest, current) => new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest, r[0] || {});
      return latest;
    }).catch(() => ({})) : Promise.resolve({}),
    enabled: !!sourceTenant,
  });

  const { data: targetUsage } = useQuery({
    queryKey: ["tenant-usage", targetTenant],
    queryFn: () => targetTenant ? base44.entities.TenantResourceUsage.filter({ tenant_id: targetTenant }).then(r => {
      const latest = r.reduce((latest, current) => new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest, r[0] || {});
      return latest;
    }).catch(() => ({})) : Promise.resolve({}),
    enabled: !!targetTenant,
  });

  const validateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsTenantMigration", { action: "migrate", ...data, validate_only: true }),
    onSuccess: (response) => {
      setValidationResult(response.data);
      if (response.data.validation_passed) {
        toast.success("Validation passed - ready to migrate");
      } else {
        toast.error(`Validation failed: ${response.data.errors?.length || 0} issues`);
      }
    },
  });

  const migrateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsTenantMigration", { action: "migrate", ...data, validate_only: false }),
    onMutate: () => setIsRunning(true),
    onSuccess: (response) => {
      setMigrationResult(response.data);
      setIsRunning(false);
      if (response.data.success) {
        toast.success("Migration completed successfully");
        qc.invalidateQueries(["tenants"]);
      } else {
        toast.error(`Migration failed: ${response.data.error}`);
      }
    },
    onError: (error) => {
      setIsRunning(false);
      toast.error(`Migration error: ${error.message}`);
    },
  });

  const runValidation = () => {
    if (!sourceTenant || !targetTenant) {
      toast.error("Select both source and target tenants");
      return;
    }
    validateMutation.mutate({ source_tenant_id: sourceTenant, target_tenant_id: targetTenant });
  };

  const runMigration = () => {
    if (!validationResult?.validation_passed) {
      toast.error("Fix validation errors before migrating");
      return;
    }
    migrateMutation.mutate({ source_tenant_id: sourceTenant, target_tenant_id: targetTenant });
  };

  const availableTenants = tenants?.filter(t => t.status === 'active') || [];

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Tenant Migration" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <ArrowRightLeft className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Tenant Migration Tool</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Move compute resources and security policies between tenants</p>
          </div>
        </div>
      </div>

      {/* Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Database className="w-4 h-4" style={{ color: CYAN }} />
            Source Tenant
          </h3>
          <select value={sourceTenant} onChange={(e) => setSourceTenant(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-3" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">Select source...</option>
            {availableTenants.map(t => (
              <option key={t.tenant_id} value={t.tenant_id}>{t.name} ({t.plan})</option>
            ))}
          </select>
          {sourceUsage && Object.keys(sourceUsage).length > 0 && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span style={{ color: MUTED }}>Compute:</span><span style={{ color: TEXT }}>{sourceUsage.compute_units_used || 0}</span></div>
              <div className="flex justify-between"><span style={{ color: MUTED }}>Storage:</span><span style={{ color: TEXT }}>{Math.round(sourceUsage.storage_mb_used || 0)} MB</span></div>
              <div className="flex justify-between"><span style={{ color: MUTED }}>API Calls:</span><span style={{ color: TEXT }}>{sourceUsage.api_calls || 0}</span></div>
            </div>
          )}
        </Card>

        <div className="flex items-center justify-center">
          <ArrowRightLeft className="w-8 h-8" style={{ color: MUTED }} />
        </div>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Database className="w-4 h-4" style={{ color: LOW }} />
            Target Tenant
          </h3>
          <select value={targetTenant} onChange={(e) => setTargetTenant(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-3" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">Select target...</option>
            {availableTenants.filter(t => t.tenant_id !== sourceTenant).map(t => (
              <option key={t.tenant_id} value={t.tenant_id}>{t.name} ({t.plan})</option>
            ))}
          </select>
          {targetUsage && Object.keys(targetUsage).length > 0 && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span style={{ color: MUTED }}>Compute:</span><span style={{ color: TEXT }}>{targetUsage.compute_units_used || 0}</span></div>
              <div className="flex justify-between"><span style={{ color: MUTED }}>Storage:</span><span style={{ color: TEXT }}>{Math.round(targetUsage.storage_mb_used || 0)} MB</span></div>
              <div className="flex justify-between"><span style={{ color: MUTED }}>API Calls:</span><span style={{ color: TEXT }}>{targetUsage.api_calls || 0}</span></div>
            </div>
          )}
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={runValidation} disabled={!sourceTenant || !targetTenant || validateMutation.isPending} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          {validateMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Validate Migration
        </button>
        <button onClick={runMigration} disabled={!validationResult?.validation_passed || isRunning} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50" style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>
          {isRunning ? <Loader className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
          Run Migration
        </button>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <Card className={`p-5 border-2 ${validationResult.validation_passed ? 'border-green-400/30' : 'border-red-400/30'}`}>
          <div className="flex items-center gap-3 mb-4">
            {validationResult.validation_passed ? <CheckCircle className="w-5 h-5" style={{ color: LOW }} /> : <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />}
            <h3 className="text-sm font-bold text-white">Validation Results</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {validationResult.validations?.map((v, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {v.status === 'pass' ? <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: DANGER }} />}
                <span style={{ color: TEXT }}>{v.check}</span>
                {v.detail && <span style={{ color: MUTED }}>({v.detail})</span>}
              </div>
            ))}
          </div>
          {validationResult.errors?.length > 0 && (
            <div className="mt-4 p-3 rounded bg-red-400/10 border border-red-400/30">
              <p className="text-xs font-bold mb-2" style={{ color: DANGER }}>Blocking Issues:</p>
              {validationResult.errors.map((e, i) => (
                <p key={i} className="text-xs" style={{ color: DANGER }}>• {e}</p>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Migration Progress */}
      {migrationResult && (
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            {migrationResult.success ? <CheckCircle className="w-5 h-5" style={{ color: LOW }} /> : <XCircle className="w-5 h-5" style={{ color: DANGER }} />}
            <h3 className="text-sm font-bold text-white">{migrationResult.success ? 'Migration Completed' : 'Migration Failed'}</h3>
          </div>
          {migrationResult.steps && migrationResult.steps.length > 0 && (
            <div className="space-y-2">
              {migrationResult.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.status === 'completed' ? 'bg-green-400' : step.status === 'running' ? 'bg-blue-400' : 'bg-red-400'}`}>
                    {step.status === 'completed' ? '✓' : step.status === 'running' ? '⟳' : '✗'}
                  </div>
                  <span style={{ color: step.status === 'completed' ? LOW : step.status === 'running' ? CYAN : DANGER }}>
                    {step.name.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
          {!migrationResult.success && migrationResult.error && (
            <div className="mt-4 p-3 rounded bg-red-400/10 border border-red-400/30">
              <p className="text-xs text-red-400 font-mono">{migrationResult.error}</p>
            </div>
          )}
        </Card>
      )}

      {/* What Gets Migrated */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4" style={{ color: CYAN }} />
          Migration Scope
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Shield, label: "Security Policies", desc: "All active policies and rules" },
            { icon: Database, label: "Resource Configs", desc: "MFA, SSO, retention settings" },
            { icon: Settings, label: "Feature Flags", desc: "Enabled features and rollouts" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}` }}>
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: CYAN }} />
              <div>
                <p className="text-xs font-bold text-white">{label}</p>
                <p className="text-[9px]" style={{ color: MUTED }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}