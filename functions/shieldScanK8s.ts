// ShieldAI — PRODUCTION Real Kubernetes Security Scanner v2
// REAL engine: Scans real K8s manifests (YAML/JSON) + live cluster via kubectl proxy/kubeconfig
// CIS Kubernetes Benchmark + NSA/CISA Kubernetes Hardening Guide
// Zero simulation — every finding comes from real manifest analysis or real cluster API

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });

  const body = await req.json().catch(() => ({}));
  const {
    scan_mode = "manifest",       // manifest | api_server
    manifests = [],               // array of K8s YAML objects (parsed JSON)
    cluster_api_url,              // e.g. https://my-cluster.example.com:6443
    cluster_token,                // Service account bearer token
    cluster_nickname = "My Cluster",
    namespace = "default",
  } = body;

  const findings: any[] = [];
  const scannedResources: string[] = [];
  const scanId = `k8s_${Date.now()}`;

  const add = (category: string, title: string, severity: string, resource: string,
    ns: string, description: string, remediation: string, cis?: string) => {
    findings.push({
      id: `${scanId}_${findings.length}`,
      category, title, severity, resource, namespace: ns,
      description, remediation,
      cis_control: cis || null,
      status: "open",
      detected_at: new Date().toISOString(),
    });
  };

  // ── MANIFEST ANALYSIS ENGINE — real static analysis of K8s YAML objects
  const analyzeManifest = (spec: any) => {
    const kind = spec.kind || "";
    const name = spec.metadata?.name || "unknown";
    const ns = spec.metadata?.namespace || namespace;
    const resourceRef = `${kind}/${name}`;
    scannedResources.push(resourceRef);

    const podSpec = spec.spec?.template?.spec || spec.spec || {};
    const containers: any[] = [
      ...(podSpec.containers || []),
      ...(podSpec.initContainers || []),
    ];

    // ── POD SECURITY CHECKS
    for (const container of containers) {
      const sc = container.securityContext || {};
      const cRef = `${resourceRef}/containers/${container.name || "?"}`;

      // Privileged container
      if (sc.privileged === true) {
        add("Pod Security", `Privileged container: ${container.name}`, "critical",
          cRef, ns,
          `Container '${container.name}' in ${resourceRef} runs with privileged: true. This grants full access to the host kernel and all devices — equivalent to root on the node.`,
          "Remove privileged: true. Use specific Linux capabilities instead:\nsecurityContext:\n  capabilities:\n    add: [NET_BIND_SERVICE]",
          "CIS K8s 5.2.1");
      }

      // Running as root
      if (sc.runAsNonRoot === false || (sc.runAsUser === 0)) {
        add("Pod Security", `Container runs as root: ${container.name}`, "critical",
          cRef, ns,
          `Container '${container.name}' explicitly runs as root (UID 0). If compromised, attacker has root inside container with container escape vectors.`,
          "Set securityContext.runAsNonRoot: true and securityContext.runAsUser: 1000",
          "CIS K8s 5.2.6");
      } else if (!sc.runAsNonRoot && sc.runAsUser === undefined) {
        add("Pod Security", `Container missing runAsNonRoot: ${container.name}`, "high",
          cRef, ns,
          `Container '${container.name}' does not explicitly set runAsNonRoot. Default behavior allows root execution.`,
          "Add: securityContext:\n  runAsNonRoot: true\n  runAsUser: 1000",
          "CIS K8s 5.2.6");
      }

      // Privilege escalation
      if (sc.allowPrivilegeEscalation !== false) {
        add("Pod Security", `allowPrivilegeEscalation not disabled: ${container.name}`, "high",
          cRef, ns,
          `Container '${container.name}' does not set allowPrivilegeEscalation: false. A process can gain more privileges than its parent via setuid binaries.`,
          "Add: securityContext:\n  allowPrivilegeEscalation: false",
          "CIS K8s 5.2.5");
      }

      // Read-only root filesystem
      if (!sc.readOnlyRootFilesystem) {
        add("Pod Security", `Writable root filesystem: ${container.name}`, "medium",
          cRef, ns,
          `Container '${container.name}' has a writable root filesystem. Attackers with code execution can install backdoors or modify application files.`,
          "Add: securityContext:\n  readOnlyRootFilesystem: true\nMount writable paths as emptyDir volumes.",
          "CIS K8s 5.2.4");
      }

      // Capabilities
      if (sc.capabilities?.add?.some((cap: string) =>
        ["SYS_ADMIN", "NET_ADMIN", "SYS_PTRACE", "SYS_MODULE", "ALL"].includes(cap))) {
        const dangCaps = sc.capabilities.add.filter((c: string) =>
          ["SYS_ADMIN", "NET_ADMIN", "SYS_PTRACE", "SYS_MODULE", "ALL"].includes(c));
        add("Pod Security", `Dangerous Linux capabilities: ${dangCaps.join(", ")}`, "critical",
          cRef, ns,
          `Container '${container.name}' adds dangerous capabilities: ${dangCaps.join(", ")}. SYS_ADMIN alone is nearly equivalent to full root.`,
          "Remove dangerous capabilities. Use only the minimum required:\ncapabilities:\n  drop: [ALL]\n  add: [NET_BIND_SERVICE]",
          "CIS K8s 5.2.8");
      }

      // No resource limits
      if (!container.resources?.limits?.cpu || !container.resources?.limits?.memory) {
        add("Resource Management", `No resource limits: ${container.name}`, "medium",
          cRef, ns,
          `Container '${container.name}' has no CPU/memory limits. A compromised or buggy container can exhaust all node resources.`,
          "Set resource limits:\nresources:\n  limits:\n    cpu: 500m\n    memory: 512Mi\n  requests:\n    cpu: 100m\n    memory: 128Mi",
          "CIS K8s 5.2.4");
      }

      // Latest image tag
      const image = container.image || "";
      if (image.endsWith(":latest") || (!image.includes(":") && !image.includes("@"))) {
        add("Image Security", `Mutable image tag :latest: ${container.name}`, "medium",
          cRef, ns,
          `Container '${container.name}' uses image '${image}'. The :latest tag is mutable — the image can change between deployments without notice.`,
          "Pin to a specific immutable tag or digest:\nimage: myapp:v1.2.3\n# or\nimage: myapp@sha256:abc123...",
          "CWE K8s 5.5.1");
      }
    }

    // ── POD-LEVEL SECURITY CONTEXT
    const podSc = podSpec.securityContext || {};
    if (!podSc.seccompProfile && !podSpec.securityContext?.seccompProfile) {
      add("Pod Security", `No seccomp profile: ${resourceRef}`, "medium",
        resourceRef, ns,
        `${resourceRef} does not define a seccomp profile. Seccomp filters system calls reducing the attack surface if container is compromised.`,
        "Add:\nsecurityContext:\n  seccompProfile:\n    type: RuntimeDefault",
        "CIS K8s 5.7.2");
    }

    // Host namespaces
    if (podSpec.hostNetwork === true) {
      add("Network Security", `hostNetwork: true on ${resourceRef}`, "critical",
        resourceRef, ns,
        `${resourceRef} uses the host network namespace. Pods can sniff all network traffic on the node and bind to arbitrary host ports.`,
        "Remove hostNetwork: true unless absolutely required (e.g. network infrastructure pods).",
        "CIS K8s 5.2.4");
    }
    if (podSpec.hostPID === true) {
      add("Pod Security", `hostPID: true on ${resourceRef}`, "critical",
        resourceRef, ns,
        `${resourceRef} uses the host PID namespace. Pods can see and signal all processes on the node.`,
        "Remove hostPID: true. It is rarely required for application workloads.",
        "CIS K8s 5.2.2");
    }
    if (podSpec.hostIPC === true) {
      add("Pod Security", `hostIPC: true on ${resourceRef}`, "critical",
        resourceRef, ns,
        `${resourceRef} uses the host IPC namespace. Pods can access all IPC resources on the node.`,
        "Remove hostIPC: true.",
        "CIS K8s 5.2.3");
    }

    // ── SERVICE ACCOUNT CHECKS
    if (podSpec.serviceAccountName === "default" || !podSpec.automountServiceAccountToken === false) {
      add("RBAC", `Auto-mounted service account token: ${resourceRef}`, "medium",
        resourceRef, ns,
        `${resourceRef} mounts the default service account token. Any code executing in the pod can use this token to call the K8s API.`,
        "Add: automountServiceAccountToken: false\nOr create a dedicated service account with minimal permissions.",
        "CIS K8s 5.1.6");
    }

    // ── DEPLOYMENT-SPECIFIC CHECKS
    if (kind === "Deployment" || kind === "StatefulSet" || kind === "DaemonSet") {
      const replicas = spec.spec?.replicas || 1;
      if (kind === "Deployment" && replicas < 2) {
        add("Availability", `Single replica deployment: ${name}`, "low",
          resourceRef, ns,
          `Deployment '${name}' has only ${replicas} replica(s). A single pod failure causes downtime.`,
          "Set replicas: 2+ and configure a PodDisruptionBudget.",
          "K8s Best Practice");
      }

      // Rolling update strategy
      const strategy = spec.spec?.strategy?.type;
      if (kind === "Deployment" && strategy === "Recreate") {
        add("Availability", `Recreate strategy causes downtime: ${name}`, "low",
          resourceRef, ns,
          `Deployment '${name}' uses Recreate strategy which causes downtime during updates.`,
          "Switch to RollingUpdate strategy for zero-downtime deployments.",
          "K8s Best Practice");
      }
    }

    // ── RBAC CHECKS
    if (kind === "ClusterRoleBinding" || kind === "RoleBinding") {
      const roleRef = spec.roleRef?.name || "";
      const subjects = spec.subjects || [];
      if (roleRef === "cluster-admin") {
        add("RBAC", `cluster-admin binding: ${name}`, "critical",
          resourceRef, ns,
          `${kind} '${name}' grants cluster-admin to: ${subjects.map((s: any) => `${s.kind}/${s.name}`).join(", ")}. cluster-admin has unrestricted access to the entire cluster.`,
          "Replace cluster-admin with least-privilege roles. Audit all ClusterRoleBindings regularly.",
          "CIS K8s 5.1.1");
      }
      // Service accounts with admin roles
      for (const subject of subjects) {
        if (subject.kind === "ServiceAccount" && ["admin", "edit"].includes(roleRef)) {
          add("RBAC", `Service account with admin role: ${subject.name}`, "high",
            resourceRef, ns,
            `Service account '${subject.name}' has '${roleRef}' role. Compromised pods using this SA have broad cluster access.`,
            "Apply least privilege. Create role with only required verbs on required resources.",
            "CIS K8s 5.1.2");
        }
      }
    }

    // ── NETWORK POLICY CHECK (for Namespace objects)
    if (kind === "Namespace") {
      // Just flag — we'll check for missing NetworkPolicy separately
      add("Network Security", `Review NetworkPolicy for namespace: ${name}`, "info",
        resourceRef, name,
        `Namespace '${name}' detected. Ensure a default-deny NetworkPolicy is applied.`,
        "Apply default deny NetworkPolicy:\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: default-deny-all\nspec:\n  podSelector: {}\n  policyTypes: [Ingress, Egress]",
        "CIS K8s 5.3.2");
    }

    // ── SECRET CHECKS
    if (kind === "Secret") {
      const secretType = spec.type || "Opaque";
      add("Secrets Management", `Plain K8s Secret (not encrypted): ${name}`, "high",
        resourceRef, ns,
        `Secret '${name}' (type: ${secretType}) is stored in etcd base64-encoded but NOT encrypted at rest by default. Anyone with etcd access can read all secrets.`,
        "Enable etcd encryption at rest via EncryptionConfiguration. Use external secrets manager (HashiCorp Vault, AWS Secrets Manager, Sealed Secrets).",
        "CIS K8s 1.2.33");
    }

    // ── CONFIGMAP WITH SENSITIVE DATA
    if (kind === "ConfigMap") {
      const dataKeys = Object.keys(spec.data || {});
      const sensitiveKeys = dataKeys.filter(k =>
        /password|secret|key|token|credential|api.key|private/i.test(k));
      if (sensitiveKeys.length > 0) {
        add("Secrets Management", `Sensitive data in ConfigMap: ${name}`, "high",
          resourceRef, ns,
          `ConfigMap '${name}' contains keys that appear to be sensitive: ${sensitiveKeys.join(", ")}. ConfigMaps are not encrypted and are accessible to anyone who can read the namespace.`,
          "Move sensitive values to K8s Secrets or an external secrets manager. ConfigMaps should only store non-sensitive configuration.",
          "CIS K8s Best Practice");
      }
    }

    // ── INGRESS CHECKS
    if (kind === "Ingress") {
      const rules = spec.spec?.rules || [];
      const tls = spec.spec?.tls || [];
      const tlsHosts = tls.flatMap((t: any) => t.hosts || []);
      for (const rule of rules) {
        if (rule.host && !tlsHosts.includes(rule.host)) {
          add("Network Security", `Ingress without TLS: ${rule.host}`, "high",
            resourceRef, ns,
            `Ingress rule for host '${rule.host}' has no TLS configuration. Traffic to this host travels unencrypted.`,
            "Add TLS configuration to the Ingress:\ntls:\n- hosts: [" + rule.host + "]\n  secretName: " + name + "-tls",
            "CIS K8s Best Practice");
        }
      }
    }
  };

  // ── PROCESS ALL MANIFESTS
  for (const manifest of manifests) {
    try {
      const spec = typeof manifest === "string" ? JSON.parse(manifest) : manifest;
      if (spec.items) {
        // Handle List objects
        for (const item of spec.items) analyzeManifest(item);
      } else {
        analyzeManifest(spec);
      }
    } catch (_) { continue; }
  }

  // ── LIVE CLUSTER SCAN via K8s API (if cluster_api_url + token provided)
  if (scan_mode === "api_server" && cluster_api_url && cluster_token) {
    const k8sHeaders = {
      Authorization: `Bearer ${cluster_token}`,
      Accept: "application/json",
    };
    const k8sFetch = async (path: string) => {
      const r = await fetch(`${cluster_api_url}${path}`, {
        headers: k8sHeaders,
        // Note: In production you'd verify the cluster's CA cert
      }).catch(() => null);
      if (!r || !r.ok) return null;
      return r.json();
    };

    // Fetch deployments
    const deployments = await k8sFetch(`/apis/apps/v1/namespaces/${namespace}/deployments`);
    if (deployments?.items) {
      for (const dep of deployments.items) {
        analyzeManifest(dep);
      }
    }

    // Fetch pods
    const pods = await k8sFetch(`/api/v1/namespaces/${namespace}/pods`);
    if (pods?.items) {
      for (const pod of pods.items.slice(0, 20)) {
        analyzeManifest(pod);
      }
    }

    // Fetch secrets
    const secrets = await k8sFetch(`/api/v1/namespaces/${namespace}/secrets`);
    if (secrets?.items) {
      for (const secret of secrets.items.slice(0, 20)) {
        analyzeManifest(secret);
      }
    }

    // Fetch ClusterRoleBindings
    const crbList = await k8sFetch(`/apis/rbac.authorization.k8s.io/v1/clusterrolebindings`);
    if (crbList?.items) {
      for (const crb of crbList.items) {
        analyzeManifest(crb);
      }
    }

    // Fetch NetworkPolicies — check if default-deny exists
    const netpols = await k8sFetch(`/apis/networking.k8s.io/v1/namespaces/${namespace}/networkpolicies`);
    const hasDefaultDeny = (netpols?.items || []).some((np: any) =>
      Object.keys(np.spec?.podSelector || {}).length === 0 &&
      (np.spec?.policyTypes || []).includes("Ingress")
    );
    if (!hasDefaultDeny) {
      add("Network Security", `No default-deny NetworkPolicy in namespace: ${namespace}`, "high",
        `Namespace/${namespace}`, namespace,
        `Namespace '${namespace}' has no default-deny NetworkPolicy. All pods can communicate freely with each other and external services.`,
        "Apply a default-deny NetworkPolicy:\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: default-deny-all\n  namespace: " + namespace + "\nspec:\n  podSelector: {}\n  policyTypes: [Ingress, Egress]",
        "CIS K8s 5.3.2");
    }
  }

  // ── CROSS-MANIFEST CHECKS (requires multiple manifests to detect)
  if (manifests.length > 0) {
    const allKinds = manifests.map((m: any) => (typeof m === "string" ? JSON.parse(m) : m).kind);

    // Check for missing NetworkPolicy
    if (!allKinds.includes("NetworkPolicy")) {
      add("Network Security", "No NetworkPolicy defined — pods accept all ingress traffic", "high",
        `Namespace/${namespace}`, namespace,
        "No NetworkPolicy resources found in the provided manifests. All pods accept traffic from anywhere in the cluster.",
        "Add a default-deny NetworkPolicy and explicit allow rules per service.",
        "CIS K8s 5.3.2");
    }

    // Check for missing PodDisruptionBudget
    if (allKinds.includes("Deployment") && !allKinds.includes("PodDisruptionBudget")) {
      add("Availability", "No PodDisruptionBudget defined", "low",
        "PodDisruptionBudget", namespace,
        "No PodDisruptionBudget found. Node drain operations could take down all replicas simultaneously.",
        "Create a PodDisruptionBudget:\napiVersion: policy/v1\nkind: PodDisruptionBudget\nspec:\n  minAvailable: 1\n  selector:\n    matchLabels:\n      app: yourapp",
        "K8s Best Practice");
    }
  }

  // ── SUMMARY
  const summary = {
    scan_id: scanId,
    cluster_nickname,
    namespace,
    scan_mode,
    resources_scanned: scannedResources.length,
    total_findings: findings.length,
    critical: findings.filter(f => f.severity === "critical").length,
    high: findings.filter(f => f.severity === "high").length,
    medium: findings.filter(f => f.severity === "medium").length,
    low: findings.filter(f => f.severity === "low").length,
    info: findings.filter(f => f.severity === "info").length,
    risk_score: Math.min(100,
      findings.filter(f => f.severity === "critical").length * 15 +
      findings.filter(f => f.severity === "high").length * 8 +
      findings.filter(f => f.severity === "medium").length * 3 +
      findings.filter(f => f.severity === "low").length
    ),
    categories_found: [...new Set(findings.map(f => f.category))],
    data_sources: scan_mode === "api_server"
      ? ["Kubernetes API Server", "CIS K8s Benchmark", "NSA/CISA K8s Hardening Guide"]
      : ["K8s Manifest Static Analysis", "CIS K8s Benchmark", "NSA/CISA K8s Hardening Guide"],
    scanned_at: new Date().toISOString(),
  };

  return Response.json({ success: true, ...summary, findings }, {
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  });
});
