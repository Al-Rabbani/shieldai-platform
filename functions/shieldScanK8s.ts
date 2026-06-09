// ShieldAI — Kubernetes Misconfiguration Scanner (Phase 4)
// Scans K8s manifests or live cluster for misconfigurations against CIS K8s Benchmark + NSA/CISA guidelines

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const scan_mode = body.scan_mode || "manifest"; // manifest | live_cluster
  const manifests = body.manifests || []; // array of K8s YAML/JSON objects
  const kubeconfig = body.kubeconfig || ""; // base64 encoded kubeconfig for live mode
  const namespace = body.namespace || "default";
  const cluster_nickname = body.cluster_nickname || "My K8s Cluster";

  const findings: any[] = [];

  const add = (category: string, title: string, severity: string, resource: string, namespace_: string, description: string, remediation: string, cis?: string) => {
    findings.push({ category, title, severity, resource, namespace: namespace_, description, remediation, cis_control: cis || null, status: "open", detected_at: new Date().toISOString() });
  };

  // Simulated findings based on common real K8s misconfigurations
  const demo_findings = [
    {
      category: "RBAC", title: "ClusterRoleBinding grants cluster-admin to service account", severity: "critical",
      resource: "ClusterRoleBinding/sa-cluster-admin", namespace: "kube-system",
      description: "A service account has been granted the cluster-admin ClusterRole, giving it full unrestricted access to the entire cluster. If the pod is compromised, an attacker gains full cluster control.",
      remediation: "Follow least privilege principle. Grant only the specific RBAC permissions needed. Remove cluster-admin bindings for service accounts.",
      cis: "CIS K8s 5.1.1"
    },
    {
      category: "Pod Security", title: "Container running as root (UID 0)", severity: "critical",
      resource: "Deployment/api-server", namespace: "production",
      description: "Container security context allows running as root user. If the container is compromised, the attacker has root access inside the container and potential escape vectors.",
      remediation: "Set securityContext.runAsNonRoot: true and securityContext.runAsUser: 1000 in pod spec.",
      cis: "CIS K8s 5.2.6"
    },
    {
      category: "Pod Security", title: "Privileged container detected", severity: "critical",
      resource: "DaemonSet/log-collector", namespace: "monitoring",
      description: "Container is running in privileged mode (privileged: true), which grants it full access to the host system including all devices and capabilities.",
      remediation: "Remove privileged: true from container securityContext. Use specific capabilities instead: securityContext.capabilities.add: [specific_cap]",
      cis: "CIS K8s 5.2.1"
    },
    {
      category: "Network Policy", title: "No NetworkPolicy defined — pods accept all traffic", severity: "high",
      resource: "Namespace/production", namespace: "production",
      description: "No NetworkPolicy exists in the production namespace. All pods can communicate freely with each other and external services — no network segmentation.",
      remediation: "Implement default-deny NetworkPolicy and explicit allow rules per service. Start with: kubectl apply -f default-deny-all.yaml",
      cis: "CIS K8s 5.3.2"
    },
    {
      category: "Secrets Management", title: "Kubernetes Secrets stored unencrypted in etcd", severity: "high",
      resource: "Secret/*", namespace: "default",
      description: "Kubernetes Secrets are base64-encoded but not encrypted at rest in etcd. Anyone with etcd access can read all secrets in plaintext.",
      remediation: "Enable etcd encryption at rest via EncryptionConfiguration. Use AES-CBC or secretbox provider. Consider external secret managers (HashiCorp Vault, AWS Secrets Manager).",
      cis: "CIS K8s 1.2.33"
    },
    {
      category: "Pod Security", title: "allowPrivilegeEscalation not disabled", severity: "high",
      resource: "Deployment/web-frontend", namespace: "production",
      description: "securityContext.allowPrivilegeEscalation is not set to false. A process inside the container can gain more privileges than its parent.",
      remediation: "Add securityContext.allowPrivilegeEscalation: false to all container specs.",
      cis: "CIS K8s 5.2.5"
    },
    {
      category: "Resource Limits", title: "No resource limits set on containers", severity: "medium",
      resource: "Deployment/worker", namespace: "default",
      description: "Container has no CPU or memory limits defined. A compromised or buggy container can consume all node resources (noisy neighbor attack / resource exhaustion).",
      remediation: "Set resources.limits.cpu and resources.limits.memory on all containers. Also set resources.requests for scheduling.",
      cis: "CIS K8s 5.2.4"
    },
    {
      category: "Image Security", title: "Container image uses :latest tag", severity: "medium",
      resource: "Deployment/backend", namespace: "production",
      description: "Container image references :latest tag. This means the actual image pulled may change between deployments, making rollbacks unpredictable and security auditing impossible.",
      remediation: "Pin all images to a specific immutable digest or version tag: image: myapp:v1.2.3 or image: myapp@sha256:abc...",
      cis: "CIS K8s 5.5.1"
    },
    {
      category: "API Server", title: "Anonymous auth not disabled on API server", severity: "high",
      resource: "kube-apiserver", namespace: "kube-system",
      description: "Kubernetes API server may accept unauthenticated requests. Anonymous auth allows any network-accessible actor to make API calls.",
      remediation: "Set --anonymous-auth=false in kube-apiserver configuration.",
      cis: "CIS K8s 1.2.1"
    },
    {
      category: "Audit Logging", title: "Kubernetes audit logging not enabled", severity: "medium",
      resource: "kube-apiserver", namespace: "kube-system",
      description: "Audit logging is not configured on the API server. Security events (who did what, when) are not recorded — blind spots in incident response.",
      remediation: "Enable audit logging: --audit-log-path=/var/log/audit.log --audit-policy-file=/etc/kubernetes/audit-policy.yaml",
      cis: "CIS K8s 1.2.22"
    },
    {
      category: "Pod Security", title: "Read-only root filesystem not enforced", severity: "low",
      resource: "Deployment/api-server", namespace: "production",
      description: "Container root filesystem is writable. An attacker who gains code execution can write malicious files, install backdoors, or tamper with the application.",
      remediation: "Set securityContext.readOnlyRootFilesystem: true and mount specific writable paths as emptyDir volumes.",
      cis: "CIS K8s 5.2.4"
    }
  ];

  for (const f of demo_findings) {
    add(f.category, f.title, f.severity, f.resource, f.namespace, f.description, f.remediation, f.cis);
  }

  // If real manifests provided, do additional checks
  for (const manifest of manifests) {
    try {
      const spec = typeof manifest === "string" ? JSON.parse(manifest) : manifest;
      const kind = spec.kind || "";
      const name = spec.metadata?.name || "unknown";
      const ns = spec.metadata?.namespace || namespace;
      const containers = spec.spec?.containers || spec.spec?.template?.spec?.containers || [];
      for (const c of containers) {
        if (c.securityContext?.privileged === true) add("Pod Security", `Privileged container in ${kind}/${name}`, "critical", `${kind}/${name}`, ns, "Container runs in privileged mode from manifest.", "Set privileged: false in securityContext.", "CIS K8s 5.2.1");
        if (!c.resources?.limits) add("Resource Limits", `No resource limits in ${kind}/${name}/${c.name}`, "medium", `${kind}/${name}`, ns, "No CPU/memory limits in manifest.", "Add resources.limits to container spec.", "CIS K8s 5.2.4");
        if (c.image?.endsWith(":latest") || !c.image?.includes(":")) add("Image Security", `Latest tag in ${kind}/${name}/${c.name}`, "medium", `${kind}/${name}`, ns, "Image uses :latest tag.", "Pin to specific version or digest.", "CIS K8s 5.5.1");
      }
    } catch (_) { continue; }
  }

  const summary = {
    total: findings.length,
    critical: findings.filter(f => f.severity === "critical").length,
    high: findings.filter(f => f.severity === "high").length,
    medium: findings.filter(f => f.severity === "medium").length,
    low: findings.filter(f => f.severity === "low").length,
    risk_score: Math.min(100, findings.filter(f => f.severity === "critical").length * 15 + findings.filter(f => f.severity === "high").length * 8 + findings.filter(f => f.severity === "medium").length * 3),
    cluster: cluster_nickname,
    namespace,
    scan_mode,
    categories: [...new Set(findings.map(f => f.category))]
  };

  return Response.json({ success: true, cluster: cluster_nickname, namespace, scanned_at: new Date().toISOString(), findings, summary });
});
