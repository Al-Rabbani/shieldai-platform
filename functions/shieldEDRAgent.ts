// ShieldAI — EDR Agent Backend v1
// Architecture: Rustinel (ETW+eBPF+ESF) + osquery + ShieldAI correlation layer

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-ShieldAI-Token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (!action) return Response.json({ error: "action required. Actions: enroll | telemetry | alerts | install_script | status | policy" }, { status: 400, headers: cors });

    if (action === "enroll") {
      const { device_name, os, username, team, api_key } = body;
      if (!device_name || !os || !api_key) {
        return Response.json({ error: "device_name, os, and api_key required" }, { status: 400, headers: cors });
      }
      const device_id = `dev_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const enrollment_token = `agt_${crypto.randomUUID().replace(/-/g, "")}`;
      const agent = await base44.entities.DeviceAgent.create({
        device_id, device_name, os,
        username: username || "unknown",
        team: team || "default",
        registration_token: enrollment_token,
        status: "active",
        last_scan: new Date().toISOString(),
        packages_monitored: 0, blocked_packages: 0, risky_packages: 0, risk_score: 0,
        ecosystems: os === "windows" ? ["npm", "pip", "nuget"] : ["npm", "pip", "gem"],
        agent_version: "1.0.0",
        registered_at: new Date().toISOString(),
      });
      await base44.entities.AuditLog.create({
        actor_type: "system", action: "DEVICE_ENROLLED",
        resource_type: "DeviceAgent", resource_id: device_id, resource_name: device_name,
        details: `EDR agent enrolled: ${device_name} (${os}) user=${username}`,
        severity: "info", outcome: "success",
      });
      return Response.json({
        success: true, device_id, enrollment_token, agent_id: agent.id,
        config: { reporting_interval_seconds: 60, telemetry_endpoint: req.url, policy: getDefaultPolicy() },
        message: "Device enrolled. Deploy the agent using the install_script action.",
      }, { headers: cors });
    }

    if (action === "install_script") {
      const { platform = "linux", api_key = "YOUR_API_KEY", org_name = "your-org" } = body;
      const endpoint = req.url;
      return Response.json({
        platform,
        script: generateInstallScript(platform, api_key, org_name, endpoint),
        one_liner: getOneLiner(platform, api_key, endpoint),
        requirements: {
          linux: "Linux kernel 5.8+ with BTF support, root access",
          windows: "Windows 10/11 or Server 2016+, elevated PowerShell",
          macos: "macOS 11+ (Big Sur), root, user approval for System Extension",
        },
      }, { headers: cors });
    }

    if (action === "telemetry") {
      const { device_id, events = [] } = body;
      if (!device_id || !Array.isArray(events)) {
        return Response.json({ error: "device_id and events[] required" }, { status: 400, headers: cors });
      }
      let threats = 0;
      for (const event of events) {
        const isAlert = event["event.kind"] === "alert" || event.kind === "alert";
        if (isAlert) {
          await base44.entities.RuntimeThreat.create({
            app_id: device_id,
            app_name: event.host?.hostname || device_id,
            threat_type: event["rule.category"] || "behavioral_anomaly",
            severity: mapSeverity(event["rule.level"] || event.severity),
            status: "open", action_taken: "detected",
            source_ip: event["source.ip"] || null,
            endpoint: event["process.executable"] || null,
            method: event["event.action"] || null,
            payload_snippet: (event["rule.name"] || event.message || "").slice(0, 200),
            rule_id: event["rule.uuid"] || null,
            rule_name: event["rule.name"] || null,
            detected_at: event["@timestamp"] || new Date().toISOString(),
          });
          threats++;
        }
      }
      const devices = await base44.entities.DeviceAgent.filter({ device_id });
      if (devices.length > 0) {
        await base44.entities.DeviceAgent.update(devices[0].id, { last_scan: new Date().toISOString(), status: "active" });
      }
      return Response.json({ success: true, events_received: events.length, threats_detected: threats }, { headers: cors });
    }

    if (action === "alerts") {
      const { device_id, limit = 50 } = body;
      const threats = await base44.entities.RuntimeThreat.filter({ app_id: device_id });
      return Response.json({ alerts: threats.slice(0, limit), total: threats.length }, { headers: cors });
    }

    if (action === "policy") {
      return Response.json({ policy: getDefaultPolicy() }, { headers: cors });
    }

    if (action === "status") {
      const agents = await base44.entities.DeviceAgent.list();
      const now = Date.now();
      return Response.json({
        devices: agents.map((a: any) => ({
          device_id: a.device_id, device_name: a.device_name, os: a.os,
          status: a.status, last_seen: a.last_scan,
          stale: (now - new Date(a.last_scan || 0).getTime()) > 300000,
        })),
      }, { headers: cors });
    }

    return Response.json({ error: "Unknown action" }, { status: 400, headers: cors });

  } catch (err: any) {
    console.error("[shieldEDRAgent]", err.message);
    return Response.json({ error: "Internal error", message: err.message, request_id: crypto.randomUUID() }, { status: 500, headers: cors });
  }
});

function mapSeverity(level: string): string {
  const m: Record<string, string> = { critical:"critical", high:"high", medium:"medium", low:"low", informational:"low" };
  return m[(level||"").toLowerCase()] || "medium";
}

function getDefaultPolicy() {
  return {
    version: "1.0",
    detection: { sigma_enabled: true, yara_enabled: true, ioc_enabled: true },
    response: { mode: "alert_only", auto_kill_process: false, auto_isolate_network: false },
    telemetry: { process: true, network: true, file: true, dns: true, registry: true, powershell: true },
    reporting: { interval_seconds: 60, batch_size: 100 },
    exclusions: {
      paths: ["/usr/bin", "/usr/sbin", "/bin", "/sbin", "/lib"],
      processes: ["systemd", "sshd", "cron", "rsyslog"],
    },
  };
}

function getOneLiner(platform: string, apiKey: string, endpoint: string): string {
  if (platform === "linux") {
    return `curl -fsSL '${endpoint}' -X POST -H 'Content-Type: application/json' -d '{"action":"install_script","platform":"linux","api_key":"${apiKey}"}' | jq -r .script | sudo bash`;
  }
  if (platform === "windows") {
    return `irm '${endpoint}' -Method POST -Body '{"action":"install_script","platform":"windows","api_key":"${apiKey}"}' -ContentType 'application/json' | Select -Expand script | iex`;
  }
  return `curl -fsSL '${endpoint}' -X POST -H 'Content-Type: application/json' -d '{"action":"install_script","platform":"macos","api_key":"${apiKey}"}' | jq -r .script | sudo bash`;
}

function generateInstallScript(platform: string, apiKey: string, org: string, endpoint: string): string {
  if (platform === "linux") {
    return [
      "#!/bin/bash",
      "# ShieldAI EDR Agent — Linux Installer (Rustinel eBPF engine)",
      "# Requirements: Linux kernel 5.8+, BTF enabled, root access",
      "set -e",
      `SHIELDAI_API_KEY="${apiKey}"`,
      `SHIELDAI_ORG="${org}"`,
      `SHIELDAI_ENDPOINT="${endpoint}"`,
      'SHIELDAI_VERSION="1.1.3"',
      "",
      "echo '🛡️  ShieldAI EDR Agent Installer (Linux / eBPF)'",
      "",
      "# Check root",
      'if [ "$EUID" -ne 0 ]; then echo "❌ Run as root: sudo bash install.sh"; exit 1; fi',
      "",
      "# Check kernel version (5.8+ required for eBPF with BTF)",
      "KERNEL=$(uname -r)",
      "KMAJ=$(echo $KERNEL | cut -d. -f1)",
      "KMIN=$(echo $KERNEL | cut -d. -f2)",
      'if [ "$KMAJ" -lt 5 ] || ([ "$KMAJ" -eq 5 ] && [ "$KMIN" -lt 8 ]); then',
      '  echo "❌ Kernel $KERNEL too old — need 5.8+"; exit 1',
      "fi",
      'echo "✅ Kernel $KERNEL — eBPF supported"',
      "",
      "# Detect architecture",
      "ARCH=$(uname -m)",
      '[ "$ARCH" = "x86_64" ] && RARCH="x86_64" || RARCH="aarch64"',
      "",
      "# Create directories",
      "mkdir -p /opt/shieldai-edr/{bin,rules/sigma,rules/yara,rules/ioc,logs,config}",
      "",
      "# Download Rustinel EDR engine (Apache 2.0 licensed)",
      'echo "📦 Downloading ShieldAI EDR engine..."',
      'curl -fsSL "https://github.com/Karib0u/rustinel/releases/download/v${SHIELDAI_VERSION}/rustinel-linux-${RARCH}" -o /opt/shieldai-edr/bin/rustinel',
      "chmod +x /opt/shieldai-edr/bin/rustinel",
      "",
      "# Write config",
      "HOSTNAME=$(hostname)",
      "cat > /opt/shieldai-edr/config/config.toml << TOML",
      "[agent]",
      "device_name = \"$HOSTNAME\"",
      "org = \"$SHIELDAI_ORG\"",
      "api_key = \"$SHIELDAI_API_KEY\"",
      "reporting_endpoint = \"$SHIELDAI_ENDPOINT\"",
      "reporting_interval_seconds = 60",
      "",
      "[sensor]",
      "ebpf = true",
      "process = true",
      "network = true",
      "file = true",
      "dns = true",
      "",
      "[output]",
      "format = \"ecs_ndjson\"",
      "local_path = \"/opt/shieldai-edr/logs/alerts.json\"",
      "remote_endpoint = \"$SHIELDAI_ENDPOINT\"",
      "TOML",
      "",
      "# Install as systemd service",
      "cat > /etc/systemd/system/shieldai-edr.service << SERVICE",
      "[Unit]",
      "Description=ShieldAI EDR Agent",
      "After=network.target",
      "[Service]",
      "Type=simple",
      "Restart=always",
      "RestartSec=30",
      "ExecStart=/opt/shieldai-edr/bin/rustinel run --config /opt/shieldai-edr/config/config.toml",
      "[Install]",
      "WantedBy=multi-user.target",
      "SERVICE",
      "",
      "systemctl daemon-reload",
      "systemctl enable shieldai-edr",
      "systemctl start shieldai-edr",
      "",
      "# Enroll with ShieldAI backend",
      'echo "🔐 Enrolling device with ShieldAI..."',
      "OS_VERSION=$(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"' || echo 'Linux')",
      "curl -s -X POST \"$SHIELDAI_ENDPOINT\" \\",
      "  -H 'Content-Type: application/json' \\",
      "  -d \"{\\\"action\\\":\\\"enroll\\\",\\\"device_name\\\":\\\"$HOSTNAME\\\",\\\"os\\\":\\\"linux\\\",\\\"os_version\\\":\\\"$OS_VERSION\\\",\\\"username\\\":\\\"$(whoami)\\\",\\\"api_key\\\":\\\"$SHIELDAI_API_KEY\\\"}\"",
      "",
      'echo ""',
      'echo "✅ ShieldAI EDR Agent installed and running!"',
      'echo "   Telemetry: eBPF process + network + file + DNS monitoring"',
      'echo "   Detection: Sigma rules + YARA + IOC matching"',
      'echo "   Status:    systemctl status shieldai-edr"',
      'echo "   Logs:      journalctl -u shieldai-edr -f"',
      'echo "   Alerts:    /opt/shieldai-edr/logs/alerts.json"',
      'echo "   Dashboard: https://app.shieldai.dev/edr"',
    ].join("\n");
  }

  if (platform === "windows") {
    return [
      "# ShieldAI EDR Agent — Windows Installer (PowerShell, run as Administrator)",
      "# Requirements: Windows 10/11 or Server 2016+, ETW telemetry",
      "# Monitors: Process, Network, File, Registry, DNS, PowerShell, WMI events",
      "",
      `$ApiKey = "${apiKey}"`,
      `$Org = "${org}"`,
      `$Endpoint = "${endpoint}"`,
      '$Version = "1.1.3"',
      '$InstallDir = "C:\\Program Files\\ShieldAI\\EDR"',
      "",
      'Write-Host "🛡️  ShieldAI EDR Agent Installer (Windows / ETW)" -ForegroundColor Cyan',
      "",
      "# Admin check",
      "if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {",
      '  Write-Error "❌ Must run as Administrator"; exit 1',
      "}",
      "",
      "New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null",
      "New-Item -ItemType Directory -Force -Path \"$InstallDir\\logs\" | Out-Null",
      "New-Item -ItemType Directory -Force -Path \"$InstallDir\\config\" | Out-Null",
      "",
      'Write-Host "📦 Downloading ShieldAI EDR engine..." -ForegroundColor Yellow',
      "Invoke-WebRequest -Uri \"https://github.com/Karib0u/rustinel/releases/download/v$Version/rustinel-windows-x86_64.exe\" -OutFile \"$InstallDir\\rustinel.exe\" -UseBasicParsing",
      'Write-Host "✅ Agent binary downloaded" -ForegroundColor Green',
      "",
      "# Write config",
      '@"',
      "[agent]",
      "device_name = `"$env:COMPUTERNAME`"",
      "org = `"$Org`"",
      "api_key = `"$ApiKey`"",
      "reporting_endpoint = `"$Endpoint`"",
      "reporting_interval_seconds = 60",
      "",
      "[sensor]",
      "etw = true",
      "process = true",
      "network = true",
      "file = true",
      "registry = true",
      "dns = true",
      "powershell = true",
      "wmi = true",
      "",
      "[output]",
      "format = `"ecs_ndjson`"",
      "local_path = `"$InstallDir\\logs\\alerts.json`"",
      "remote_endpoint = `"$Endpoint`"",
      '"@ | Set-Content "$InstallDir\\config\\config.toml"',
      "",
      "# Install as Windows Service",
      "New-Service -Name 'ShieldAIEDR' -DisplayName 'ShieldAI EDR Agent' -Description 'ShieldAI Endpoint Detection — ETW telemetry + Sigma/YARA detection' -BinaryPathName \"`\"$InstallDir\\rustinel.exe`\" run --config `\"$InstallDir\\config\\config.toml`\"\" -StartupType Automatic -ErrorAction SilentlyContinue",
      "Start-Service -Name 'ShieldAIEDR'",
      "",
      "# Enroll",
      'Write-Host "🔐 Enrolling with ShieldAI..." -ForegroundColor Yellow',
      "$body = @{ action='enroll'; device_name=$env:COMPUTERNAME; os='windows'; os_version=[System.Environment]::OSVersion.VersionString; username=$env:USERNAME; api_key=$ApiKey } | ConvertTo-Json",
      "Invoke-RestMethod -Uri $Endpoint -Method POST -Body $body -ContentType 'application/json' | Out-Null",
      "",
      'Write-Host "✅ ShieldAI EDR Agent installed!" -ForegroundColor Green',
      'Write-Host "   Telemetry: ETW Process+Network+File+Registry+DNS+PowerShell+WMI"',
      'Write-Host "   Service:   Get-Service ShieldAIEDR"',
      'Write-Host "   Alerts:    $InstallDir\\logs\\alerts.json"',
      'Write-Host "   Dashboard: https://app.shieldai.dev/edr"',
    ].join("\n");
  }

  // macOS
  return [
    "#!/bin/bash",
    "# ShieldAI EDR Agent — macOS Installer (Experimental)",
    "# Requirements: macOS 11+ Big Sur, root, user approval for System Extension",
    "# Telemetry: ESF (Endpoint Security Framework) + /dev/bpf",
    "set -e",
    `SHIELDAI_API_KEY="${apiKey}"`,
    `SHIELDAI_ORG="${org}"`,
    `SHIELDAI_ENDPOINT="${endpoint}"`,
    'SHIELDAI_VERSION="1.1.3"',
    "",
    "echo '🛡️  ShieldAI EDR Agent Installer (macOS / ESF) — Experimental'",
    "",
    'if [ "$EUID" -ne 0 ]; then echo "❌ Run as root: sudo bash install.sh"; exit 1; fi',
    "",
    "OS_VER=$(sw_vers -productVersion)",
    "OS_MAJ=$(echo $OS_VER | cut -d. -f1)",
    'if [ "$OS_MAJ" -lt 11 ]; then echo "❌ macOS 11+ required (current: $OS_VER)"; exit 1; fi',
    'echo "✅ macOS $OS_VER — ESF telemetry supported"',
    "",
    "ARCH=$(uname -m)",
    '[ "$ARCH" = "arm64" ] && RARCH="aarch64" || RARCH="x86_64"',
    "",
    "mkdir -p /opt/shieldai-edr/{bin,rules,logs,config}",
    'echo "📦 Downloading ShieldAI EDR engine..."',
    'curl -fsSL "https://github.com/Karib0u/rustinel/releases/download/v${SHIELDAI_VERSION}/rustinel-macos-${RARCH}" -o /opt/shieldai-edr/bin/rustinel',
    "chmod +x /opt/shieldai-edr/bin/rustinel",
    "",
    "# launchd plist",
    "cat > /Library/LaunchDaemons/dev.shieldai.edr.plist << 'PLIST'",
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">",
    "<plist version=\"1.0\"><dict>",
    "  <key>Label</key><string>dev.shieldai.edr</string>",
    "  <key>ProgramArguments</key><array>",
    "    <string>/opt/shieldai-edr/bin/rustinel</string><string>run</string>",
    "    <string>--config</string><string>/opt/shieldai-edr/config/config.toml</string>",
    "  </array>",
    "  <key>RunAtLoad</key><true/>",
    "  <key>KeepAlive</key><true/>",
    "</dict></plist>",
    "PLIST",
    "",
    "launchctl load /Library/LaunchDaemons/dev.shieldai.edr.plist",
    "",
    "# Enroll",
    "HOSTNAME=$(hostname)",
    "curl -s -X POST \"$SHIELDAI_ENDPOINT\" -H 'Content-Type: application/json' \\",
    "  -d \"{\\\"action\\\":\\\"enroll\\\",\\\"device_name\\\":\\\"$HOSTNAME\\\",\\\"os\\\":\\\"macos\\\",\\\"os_version\\\":\\\"$OS_VER\\\",\\\"api_key\\\":\\\"$SHIELDAI_API_KEY\\\"}\"",
    "",
    'echo ""',
    'echo "✅ ShieldAI EDR installed on macOS!"',
    'echo "   ⚠️  Approve System Extension: System Settings → Privacy & Security → Security"',
    'echo "   Alerts:    /opt/shieldai-edr/logs/alerts.json"',
    'echo "   Dashboard: https://app.shieldai.dev/edr"',
  ].join("\n");
}
