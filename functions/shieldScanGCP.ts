// ShieldAI — GCP Cloud Security Scanner (Phase 2, Step 2.2)
// Scans real GCP projects for misconfigurations using GCP REST APIs
// Uses: GCP Service Account JSON key, scans IAM, Storage, Compute, Cloud Logging

Deno.serve(async (req) => {
  const { service_account_json, project_id, scan_services = ["iam","storage","compute","logging"] } = await req.json().catch(() => ({}));

  if (!service_account_json || !project_id) {
    return Response.json({ error: "service_account_json (parsed object) and project_id are required" }, { status: 400 });
  }

  // Get OAuth2 access token from service account
  async function getGCPToken(sa: any): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform.read-only",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }));

    // Import the private key
    const pemKey = sa.private_key.replace(/\\n/g, "\n");
    const pemBody = pemKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
    const binaryKey = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8", binaryKey.buffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false, ["sign"]
    );

    const signingInput = `${header}.${payload}`;
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5", cryptoKey,
      new TextEncoder().encode(signingInput)
    );

    const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("Failed to get GCP token: " + JSON.stringify(tokenData));
    return tokenData.access_token;
  }

  const sa = typeof service_account_json === "string" ? JSON.parse(service_account_json) : service_account_json;
  const token = await getGCPToken(sa);

  const GCP = async (url: string) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    return res.json();
  };

  const findings: any[] = [];

  const addFinding = (service: string, title: string, severity: string, resource: string, description: string, remediation: string, cis_control?: string) => {
    findings.push({ type:"cloud_misconfiguration", service, title, severity, resource, description, remediation, cis_control: cis_control||null, status:"open", detected_at:new Date().toISOString(), provider:"gcp", project: project_id });
  };

  // ── IAM SCANNING
  if (scan_services.includes("iam")) {
    const iamPolicy = await GCP(`https://cloudresourcemanager.googleapis.com/v1/projects/${project_id}:getIamPolicy`);
    if (iamPolicy.bindings) {
      for (const binding of iamPolicy.bindings) {
        // Check for overly permissive roles
        if (binding.role === "roles/owner" || binding.role === "roles/editor") {
          const nonServiceAccounts = (binding.members || []).filter((m: string) => !m.startsWith("serviceAccount:"));
          if (nonServiceAccounts.length > 0) {
            addFinding("IAM", `${binding.role} granted to ${nonServiceAccounts.length} user(s)`, "critical",
              `//cloudresourcemanager.googleapis.com/projects/${project_id}`,
              `The primitive role '${binding.role}' grants very broad permissions. Members: ${nonServiceAccounts.slice(0,3).join(", ")}`,
              "Replace primitive roles with predefined or custom roles following the principle of least privilege.",
              "CIS 1.1"
            );
          }
        }

        // Check for allUsers or allAuthenticatedUsers
        if ((binding.members || []).includes("allUsers") || (binding.members || []).includes("allAuthenticatedUsers")) {
          addFinding("IAM", `Public IAM binding detected: ${binding.role}`, "critical",
            `//cloudresourcemanager.googleapis.com/projects/${project_id}`,
            `The role '${binding.role}' is bound to 'allUsers' or 'allAuthenticatedUsers', making it publicly accessible.`,
            "Remove allUsers/allAuthenticatedUsers from all IAM bindings immediately.",
            "CIS 1.2"
          );
        }
      }
    }

    // Check service account keys
    const saList = await GCP(`https://iam.googleapis.com/v1/projects/${project_id}/serviceAccounts`);
    for (const sa of (saList.accounts || []).slice(0, 10)) {
      const keys = await GCP(`https://iam.googleapis.com/v1/${sa.name}/keys?keyTypes=USER_MANAGED`);
      for (const key of (keys.keys || [])) {
        const keyAge = (Date.now() - new Date(key.validAfterTime).getTime()) / (1000 * 60 * 60 * 24);
        if (keyAge > 90) {
          addFinding("IAM", `Service account key older than 90 days: ${sa.email}`, "high",
            sa.name,
            `Service account '${sa.email}' has a user-managed key that is ${Math.round(keyAge)} days old.`,
            "Rotate service account keys every 90 days: gcloud iam service-accounts keys create new-key.json --iam-account=" + sa.email,
            "CIS 1.7"
          );
        }
      }
    }
  }

  // ── STORAGE SCANNING
  if (scan_services.includes("storage")) {
    const buckets = await GCP(`https://storage.googleapis.com/storage/v1/b?project=${project_id}`);
    for (const bucket of (buckets.items || []).slice(0, 20)) {
      // Check IAM policy for public access
      const iamPolicy = await GCP(`https://storage.googleapis.com/storage/v1/b/${bucket.name}/iam`);
      const bindings = iamPolicy.bindings || [];
      const isPublic = bindings.some((b: any) => b.members?.includes("allUsers") || b.members?.includes("allAuthenticatedUsers"));
      if (isPublic) {
        addFinding("Storage", `Bucket '${bucket.name}' is publicly accessible`, "critical",
          `//storage.googleapis.com/projects/${project_id}/buckets/${bucket.name}`,
          "This GCS bucket grants access to allUsers or allAuthenticatedUsers, making it publicly readable/writable.",
          `Remove public access: gsutil iam ch -d allUsers gs://${bucket.name}`,
          "CIS 5.1"
        );
      }

      // Check uniform bucket-level access
      if (!bucket.iamConfiguration?.uniformBucketLevelAccess?.enabled) {
        addFinding("Storage", `Bucket '${bucket.name}' not using uniform access control`, "medium",
          `//storage.googleapis.com/projects/${project_id}/buckets/${bucket.name}`,
          "Uniform bucket-level access is disabled. Object-level ACLs can create inconsistent access control.",
          `Enable uniform bucket-level access: gsutil uniformbucketlevelaccess set on gs://${bucket.name}`,
          "CIS 5.2"
        );
      }
    }
  }

  // ── COMPUTE SCANNING
  if (scan_services.includes("compute")) {
    const instances = await GCP(`https://compute.googleapis.com/compute/v1/projects/${project_id}/aggregated/instances`);
    const items = instances.items || {};

    for (const zone of Object.values(items) as any[]) {
      for (const instance of (zone.instances || []).slice(0, 10)) {
        // Check for public IPs
        const hasPublicIP = instance.networkInterfaces?.some((ni: any) => ni.accessConfigs?.some((ac: any) => ac.natIP));
        if (hasPublicIP) {
          // Check for serial port enabled
          if (instance.metadata?.items?.some((i: any) => i.key === "serial-port-enable" && i.value === "true")) {
            addFinding("Compute", `Serial port enabled on instance '${instance.name}'`, "high",
              instance.selfLink,
              "Serial port access is enabled on a public-facing VM. This allows interactive serial console access that bypasses standard authentication.",
              `Disable serial port: gcloud compute instances add-metadata ${instance.name} --metadata serial-port-enable=false`,
              "CIS 4.5"
            );
          }
        }

        // Check for default service account with full API access
        for (const sa of (instance.serviceAccounts || [])) {
          if (sa.email?.includes("compute@developer") && sa.scopes?.includes("https://www.googleapis.com/auth/cloud-platform")) {
            addFinding("Compute", `Instance '${instance.name}' uses default service account with full API access`, "high",
              instance.selfLink,
              "The default Compute Engine service account with full cloud-platform scope grants overly broad access to all GCP APIs.",
              "Create a dedicated service account with minimal required permissions and assign it to this instance.",
              "CIS 4.2"
            );
          }
        }

        // Check for project-wide SSH keys
        if (instance.metadata?.items?.some((i: any) => i.key === "block-project-ssh-keys" && i.value === "false")) {
          addFinding("Compute", `Instance '${instance.name}' allows project-wide SSH keys`, "medium",
            instance.selfLink,
            "Project-wide SSH keys are allowed on this instance. Any project SSH key can log into the instance.",
            `Block project SSH keys: gcloud compute instances add-metadata ${instance.name} --metadata block-project-ssh-keys=true`,
            "CIS 4.3"
          );
        }
      }
    }

    // Check for default network
    const networks = await GCP(`https://compute.googleapis.com/compute/v1/projects/${project_id}/global/networks`);
    if ((networks.items || []).some((n: any) => n.name === "default")) {
      addFinding("Compute", "Default VPC network exists", "medium",
        `//compute.googleapis.com/projects/${project_id}/global/networks/default`,
        "The default VPC network exists. It has pre-configured firewall rules that may be overly permissive.",
        "Delete the default network and create custom VPCs with specific firewall rules: gcloud compute networks delete default",
        "CIS 3.1"
      );
    }
  }

  // ── LOGGING SCANNING
  if (scan_services.includes("logging")) {
    const sinks = await GCP(`https://logging.googleapis.com/v2/projects/${project_id}/sinks`);
    if (!sinks.sinks?.length) {
      addFinding("Logging", "No log sinks configured — audit logs not exported", "high",
        `//logging.googleapis.com/projects/${project_id}`,
        "No Cloud Logging sinks are configured. Audit logs are not being exported to long-term storage.",
        "Create a log sink to Cloud Storage: gcloud logging sinks create shield-audit-sink storage.googleapis.com/<bucket> --log-filter='logName:activity'",
        "CIS 2.2"
      );
    }

    // Check audit log configuration
    const auditConfig = await GCP(`https://cloudresourcemanager.googleapis.com/v1/projects/${project_id}:getIamPolicy`);
    const hasDataAccessLogs = auditConfig.auditConfigs?.some((ac: any) => ac.auditLogConfigs?.some((lc: any) => lc.logType === "DATA_READ" || lc.logType === "DATA_WRITE"));
    if (!hasDataAccessLogs) {
      addFinding("Logging", "Data access audit logs not enabled", "medium",
        `//cloudresourcemanager.googleapis.com/projects/${project_id}`,
        "Data access audit logs (DATA_READ and DATA_WRITE) are not enabled. Unauthorized data access will not be logged.",
        "Enable data access audit logs via GCP Console → IAM & Admin → Audit Logs → enable Data Read and Data Write for all services.",
        "CIS 2.1"
      );
    }
  }

  const summary = {
    total: findings.length,
    critical: findings.filter(f => f.severity === "critical").length,
    high: findings.filter(f => f.severity === "high").length,
    medium: findings.filter(f => f.severity === "medium").length,
    low: findings.filter(f => f.severity === "low").length,
    services_scanned: scan_services,
    risk_score: Math.min(100, findings.filter(f=>f.severity==="critical").length*20 + findings.filter(f=>f.severity==="high").length*8 + findings.filter(f=>f.severity==="medium").length*3),
  };

  return Response.json({ success: true, provider: "gcp", project: project_id, scanned_at: new Date().toISOString(), findings, summary });
});
