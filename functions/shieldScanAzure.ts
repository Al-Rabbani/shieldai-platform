// ShieldAI — Azure Cloud Security Scanner (Phase 2, Step 2.3)
// Scans real Azure subscriptions for misconfigurations using Azure REST APIs
// Uses: Azure App Registration (client_id, client_secret, tenant_id, subscription_id)

Deno.serve(async (req) => {
  const { client_id, client_secret, tenant_id, subscription_id, scan_services = ["iam","storage","network","security_center"] } = await req.json().catch(() => ({}));

  if (!client_id || !client_secret || !tenant_id || !subscription_id) {
    return Response.json({ error: "client_id, client_secret, tenant_id, and subscription_id are required" }, { status: 400 });
  }

  // Get Azure OAuth token
  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id,
      client_secret,
      scope: "https://management.azure.com/.default",
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return Response.json({ error: "Failed to authenticate with Azure: " + (tokenData.error_description || JSON.stringify(tokenData)) }, { status: 401 });
  }

  const token = tokenData.access_token;
  const AZ = async (path: string) => {
    const res = await fetch(`https://management.azure.com${path}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    return res.json();
  };

  const findings: any[] = [];

  const addFinding = (service: string, title: string, severity: string, resource: string, description: string, remediation: string, cis_control?: string) => {
    findings.push({ type:"cloud_misconfiguration", service, title, severity, resource, description, remediation, cis_control:cis_control||null, status:"open", detected_at:new Date().toISOString(), provider:"azure", subscription:subscription_id });
  };

  // ── SECURITY CENTER / DEFENDER
  if (scan_services.includes("security_center")) {
    const secureScore = await AZ(`/subscriptions/${subscription_id}/providers/Microsoft.Security/secureScores/ascScore?api-version=2020-01-01`);
    if (secureScore.properties?.score?.current !== undefined) {
      const score = secureScore.properties.score.current;
      const max = secureScore.properties.score.max;
      const pct = Math.round((score / max) * 100);
      if (pct < 70) {
        addFinding("Security Center", `Microsoft Defender Secure Score is ${pct}% (${Math.round(score)}/${Math.round(max)})`, pct < 40 ? "critical" : "high",
          `/subscriptions/${subscription_id}`,
          `Your Microsoft Defender for Cloud Secure Score is ${pct}%. This indicates significant security misconfigurations across your Azure resources.`,
          "Review and remediate recommendations in Microsoft Defender for Cloud: https://portal.azure.com/#view/Microsoft_Azure_Security/SecurityMenuBlade/~/5",
          "CIS Azure 1.x"
        );
      }
    }

    // Check Defender plans
    const defenderPlans = await AZ(`/subscriptions/${subscription_id}/providers/Microsoft.Security/pricings?api-version=2022-03-01`);
    for (const plan of (defenderPlans.value || [])) {
      if (plan.properties?.pricingTier === "Free") {
        addFinding("Security Center", `Microsoft Defender not enabled for ${plan.name}`, "high",
          `/subscriptions/${subscription_id}/providers/Microsoft.Security/pricings/${plan.name}`,
          `Microsoft Defender for ${plan.name} is using the Free tier. Enhanced threat detection is not active.`,
          `Enable Defender for ${plan.name} via Azure Portal → Microsoft Defender for Cloud → Environment settings`,
          "CIS Azure 2.1"
        );
      }
    }
  }

  // ── IAM / RBAC SCANNING
  if (scan_services.includes("iam")) {
    const roleAssignments = await AZ(`/subscriptions/${subscription_id}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01&$filter=atScope()`);

    let ownerCount = 0;
    for (const ra of (roleAssignments.value || [])) {
      if (ra.properties?.roleDefinitionId?.endsWith("8e3af657-a8ff-443c-a75c-2fe8c4bcb635")) { // Owner role
        ownerCount++;
      }
    }
    if (ownerCount > 3) {
      addFinding("IAM", `${ownerCount} Owner role assignments at subscription level`, "high",
        `/subscriptions/${subscription_id}`,
        `There are ${ownerCount} Owner role assignments at the subscription level. The Owner role grants full access to all Azure resources.`,
        "Reduce the number of subscription Owners to a maximum of 3. Use more specific roles (Contributor, Reader) where full ownership is not required.",
        "CIS Azure 1.22"
      );
    }

    // Check for guest users with high permissions
    const graphToken = await fetch(`https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type:"client_credentials", client_id, client_secret, scope:"https://graph.microsoft.com/.default" }),
    }).then(r => r.json()).catch(() => ({}));

    if (graphToken.access_token) {
      const guestUsers = await fetch("https://graph.microsoft.com/v1.0/users?$filter=userType eq 'Guest'&$select=displayName,mail,userType", {
        headers: { Authorization: `Bearer ${graphToken.access_token}` }
      }).then(r => r.json()).catch(() => ({ value: [] }));

      if ((guestUsers.value || []).length > 0) {
        addFinding("IAM", `${guestUsers.value.length} guest user(s) in Azure AD`, "medium",
          `/tenants/${tenant_id}`,
          `There are ${guestUsers.value.length} external guest users in your Azure AD tenant. Guest accounts can be a security risk if not regularly reviewed.`,
          "Review and remove unnecessary guest accounts. Implement an access review process: Azure AD → Identity Governance → Access Reviews",
          "CIS Azure 1.5"
        );
      }
    }
  }

  // ── STORAGE SCANNING
  if (scan_services.includes("storage")) {
    const storageAccounts = await AZ(`/subscriptions/${subscription_id}/providers/Microsoft.Storage/storageAccounts?api-version=2023-01-01`);

    for (const sa of (storageAccounts.value || []).slice(0, 20)) {
      const props = sa.properties || {};

      // Check for public blob access
      if (props.allowBlobPublicAccess === true) {
        addFinding("Storage", `Storage account '${sa.name}' allows public blob access`, "critical",
          sa.id,
          `Storage account '${sa.name}' has allowBlobPublicAccess enabled. Containers can be made publicly accessible.`,
          `Disable public blob access: az storage account update --name ${sa.name} --resource-group <rg> --allow-blob-public-access false`,
          "CIS Azure 3.7"
        );
      }

      // Check for HTTPS only
      if (!props.supportsHttpsTrafficOnly) {
        addFinding("Storage", `Storage account '${sa.name}' allows HTTP traffic`, "high",
          sa.id,
          "HTTP traffic (unencrypted) is allowed to this storage account.",
          `Enforce HTTPS: az storage account update --name ${sa.name} --resource-group <rg> --https-only true`,
          "CIS Azure 3.1"
        );
      }

      // Check TLS version
      if (props.minimumTlsVersion === "TLS1_0" || props.minimumTlsVersion === "TLS1_1") {
        addFinding("Storage", `Storage account '${sa.name}' uses weak TLS (${props.minimumTlsVersion})`, "high",
          sa.id,
          `Minimum TLS version is ${props.minimumTlsVersion}. TLS 1.0 and 1.1 have known vulnerabilities.`,
          `Set minimum TLS to 1.2: az storage account update --name ${sa.name} --resource-group <rg> --min-tls-version TLS1_2`,
          "CIS Azure 3.2"
        );
      }
    }
  }

  // ── NETWORK SCANNING
  if (scan_services.includes("network")) {
    const nsgs = await AZ(`/subscriptions/${subscription_id}/providers/Microsoft.Network/networkSecurityGroups?api-version=2023-05-01`);

    for (const nsg of (nsgs.value || []).slice(0, 20)) {
      const rules = [...(nsg.properties?.securityRules || []), ...(nsg.properties?.defaultSecurityRules || [])];

      for (const rule of rules) {
        if (rule.properties?.access !== "Allow") continue;
        if (rule.properties?.direction !== "Inbound") continue;
        const src = rule.properties?.sourceAddressPrefix;
        if (src !== "*" && src !== "0.0.0.0/0" && src !== "Internet") continue;

        const port = rule.properties?.destinationPortRange;

        if (port === "22" || port === "22-22") {
          addFinding("Network", `NSG '${nsg.name}' allows SSH from internet`, "critical",
            nsg.id,
            `Network Security Group '${nsg.name}' has an inbound rule allowing SSH (port 22) from the internet.`,
            "Restrict SSH access to specific trusted IP ranges or use Azure Bastion for secure SSH access.",
            "CIS Azure 6.2"
          );
        }
        if (port === "3389" || port === "3389-3389") {
          addFinding("Network", `NSG '${nsg.name}' allows RDP from internet`, "critical",
            nsg.id,
            `Network Security Group '${nsg.name}' has an inbound rule allowing RDP (port 3389) from the internet.`,
            "Restrict RDP access to specific trusted IP ranges or use Azure Bastion.",
            "CIS Azure 6.3"
          );
        }
        if (port === "*") {
          addFinding("Network", `NSG '${nsg.name}' allows ALL ports from internet`, "critical",
            nsg.id,
            `Network Security Group '${nsg.name}' has an inbound rule allowing all traffic from the internet. This is a critical misconfiguration.`,
            "Remove or restrict this rule immediately. Define specific allowed ports and protocols.",
            "CIS Azure 6.1"
          );
        }
      }
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

  return Response.json({ success:true, provider:"azure", subscription:subscription_id, scanned_at:new Date().toISOString(), findings, summary });
});
