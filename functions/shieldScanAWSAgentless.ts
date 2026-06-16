// ShieldAI — AWS Agentless Scanner v1 (Stage 9)
// Uses STS AssumeRole — customer creates a read-only cross-account role once,
// ShieldAI assumes it on every scan. ZERO long-term credentials stored.
// Matches Wiz/Orca agentless model — reads cloud config via AWS APIs, no agent installed.
// CloudFormation template auto-generated for one-click role setup.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ShieldAI's own AWS Account ID (used in trust policy)
// In production this would be ShieldAI's real account — using placeholder
const SHIELDAI_AWS_ACCOUNT = Deno.env.get("SHIELDAI_AWS_ACCOUNT_ID") || "123456789012";
const SHIELDAI_EXTERNAL_ID = Deno.env.get("SHIELDAI_EXTERNAL_ID") || "shieldai-scan-2026";

const CLOUDFORMATION_TEMPLATE = `
AWSTemplateFormatVersion: '2010-09-09'
Description: 'ShieldAI Read-Only Security Scanner Role — agentless cloud security scanning'

Parameters:
  ShieldAIAccountId:
    Type: String
    Default: '${SHIELDAI_AWS_ACCOUNT}'
    Description: ShieldAI AWS Account ID (do not change)
  ExternalId:
    Type: String
    Default: '${SHIELDAI_EXTERNAL_ID}'
    Description: External ID for role assumption (do not change)

Resources:
  ShieldAIScannerRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: ShieldAIReadOnlyScanner
      Description: Read-only role for ShieldAI agentless security scanning
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::\${ShieldAIAccountId}:root'
            Action: sts:AssumeRole
            Condition:
              StringEquals:
                sts:ExternalId: !Ref ExternalId
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/SecurityAudit
        - arn:aws:iam::aws:policy/ReadOnlyAccess
      Tags:
        - Key: CreatedBy
          Value: ShieldAI
        - Key: Purpose
          Value: SecurityScanning

Outputs:
  RoleArn:
    Description: ARN of the ShieldAI scanner role — paste this into ShieldAI
    Value: !GetAtt ShieldAIScannerRole.Arn
    Export:
      Name: ShieldAIScannerRoleArn
`;

// ── AWS STS AssumeRole
async function assumeRole(roleArn: string, externalId: string): Promise<{
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
} | null> {
  // Build STS AssumeRole request with AWS Signature V4
  const shieldKeyId  = Deno.env.get("AWS_ACCESS_KEY_ID") || "";
  const shieldSecret = Deno.env.get("AWS_SECRET_ACCESS_KEY") || "";

  if (!shieldKeyId || !shieldSecret) {
    console.warn("[AgentlessAWS] ShieldAI AWS credentials not configured — cannot assume role");
    return null;
  }

  const encoder = new TextEncoder();

  async function hmacSHA256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
    const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return crypto.subtle.sign("HMAC", k, encoder.encode(data));
  }

  async function sha256hex(data: string): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-256", encoder.encode(data));
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  const region = "us-east-1";
  const service = "sts";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const sessionName = `ShieldAI-Scan-${Date.now()}`;

  const params = new URLSearchParams({
    Action: "AssumeRole",
    RoleArn: roleArn,
    RoleSessionName: sessionName,
    ExternalId: externalId,
    DurationSeconds: "3600",
    Version: "2011-06-15",
  });
  params.sort();

  const host = `sts.amazonaws.com`;
  const canonicalQueryString = params.toString();
  const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-date";
  const payloadHash = await sha256hex("");
  const canonicalRequest = `GET\n/\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256hex(canonicalRequest)}`;

  let signingKey = encoder.encode("AWS4" + shieldSecret);
  signingKey = new Uint8Array(await hmacSHA256(signingKey, dateStamp));
  signingKey = new Uint8Array(await hmacSHA256(signingKey, region));
  signingKey = new Uint8Array(await hmacSHA256(signingKey, service));
  signingKey = new Uint8Array(await hmacSHA256(signingKey, "aws4_request"));
  const signature = Array.from(new Uint8Array(await hmacSHA256(signingKey, stringToSign))).map(b => b.toString(16).padStart(2, "0")).join("");
  const authHeader = `AWS4-HMAC-SHA256 Credential=${shieldKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const res = await fetch(`https://sts.amazonaws.com/?${canonicalQueryString}`, {
      headers: { Authorization: authHeader, "x-amz-date": amzDate, Host: host },
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[AgentlessAWS] AssumeRole failed:", text.slice(0, 300));
      return null;
    }
    // Parse XML response
    const keyId  = text.match(/<AccessKeyId>([^<]+)<\/AccessKeyId>/)?.[1];
    const secret = text.match(/<SecretAccessKey>([^<]+)<\/SecretAccessKey>/)?.[1];
    const token  = text.match(/<SessionToken>([^<]+)<\/SessionToken>/)?.[1];
    if (!keyId || !secret || !token) return null;
    return { accessKeyId: keyId, secretAccessKey: secret, sessionToken: token };
  } catch (e: any) {
    console.error("[AgentlessAWS] AssumeRole exception:", e.message);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const body = await req.json().catch(() => ({}));
  const {
    action = "scan",
    role_arn,
    account_id,
    regions = ["us-east-1", "eu-west-1"],
    scan_services = ["s3", "iam", "ec2", "rds", "cloudtrail", "vpc"],
    external_id = SHIELDAI_EXTERNAL_ID,
  } = body;

  // ── ACTION: get_setup_instructions — returns everything needed to onboard
  if (action === "get_setup_instructions") {
    const cfQuickCreate = `https://console.aws.amazon.com/cloudformation/home#/stacks/create/review?templateURL=https://shieldai-public.s3.amazonaws.com/cfn/scanner-role.yaml&stackName=ShieldAIScanner&param_ShieldAIAccountId=${SHIELDAI_AWS_ACCOUNT}&param_ExternalId=${SHIELDAI_EXTERNAL_ID}`;

    return new Response(JSON.stringify({
      success: true,
      setup_mode: "agentless_role_assumption",
      shieldai_account_id: SHIELDAI_AWS_ACCOUNT,
      external_id: SHIELDAI_EXTERNAL_ID,
      instructions: [
        "1. Click 'Deploy to AWS' to create the read-only IAM role (takes 60 seconds)",
        "2. After stack completes, copy the 'RoleArn' from CloudFormation Outputs",
        "3. Paste the Role ARN into ShieldAI — no credentials needed",
        "4. ShieldAI will assume the role on each scan — zero long-term credentials stored",
      ],
      cloudformation_template: CLOUDFORMATION_TEMPLATE.trim(),
      cloudformation_quick_create_url: cfQuickCreate,
      manual_role_policy: {
        trust_policy: {
          Version: "2012-10-17",
          Statement: [{
            Effect: "Allow",
            Principal: { AWS: `arn:aws:iam::${SHIELDAI_AWS_ACCOUNT}:root` },
            Action: "sts:AssumeRole",
            Condition: { StringEquals: { "sts:ExternalId": SHIELDAI_EXTERNAL_ID } },
          }],
        },
        permissions: ["SecurityAudit (AWS managed)", "ReadOnlyAccess (AWS managed)"],
        role_name_suggestion: "ShieldAIReadOnlyScanner",
      },
      why_this_is_secure: [
        "ShieldAI never stores your AWS access keys",
        "The role can only be assumed by ShieldAI's account ID",
        "The ExternalId prevents confused deputy attacks",
        "SecurityAudit + ReadOnlyAccess = zero write permissions",
        "Session tokens expire after 1 hour automatically",
        "You can revoke access instantly by deleting the IAM role",
      ],
    }), { headers: CORS });
  }

  // ── ACTION: validate_role — test that a role ARN can be assumed
  if (action === "validate_role") {
    if (!role_arn) {
      return new Response(JSON.stringify({ error: "role_arn required" }), { status: 400, headers: CORS });
    }

    const creds = await assumeRole(role_arn, external_id);
    if (!creds) {
      return new Response(JSON.stringify({
        success: false,
        error: "Could not assume role. Check: (1) Role ARN is correct, (2) Trust policy allows ShieldAI account, (3) External ID matches",
        shieldai_account_id: SHIELDAI_AWS_ACCOUNT,
        expected_external_id: SHIELDAI_EXTERNAL_ID,
      }), { headers: CORS });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "✅ Role assumed successfully — ShieldAI can scan your AWS account agentlessly",
      role_arn,
      session_expires_in: "1 hour",
      permissions: ["SecurityAudit", "ReadOnlyAccess"],
    }), { headers: CORS });
  }

  // ── ACTION: scan — full agentless scan using assumed role
  if (action === "scan") {
    if (!role_arn) {
      return new Response(JSON.stringify({
        error: "role_arn required for agentless scan",
        help: "Call with action=get_setup_instructions to get the CloudFormation template",
      }), { status: 400, headers: CORS });
    }

    const creds = await assumeRole(role_arn, external_id);
    if (!creds) {
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to assume role. Use action=validate_role to diagnose.",
      }), { headers: CORS });
    }

    // Delegate to shieldScanAWS with temporary credentials
    // The assumed role credentials are short-lived — expire in 1 hour
    const APP_BASE = `https://app.base44.com/api/apps/${Deno.env.get("BASE44_APP_ID") || ""}`;
    const SVC_TOK  = Deno.env.get("BASE44_SERVICE_TOKEN") || "";

    try {
      const scanRes = await fetch(`${APP_BASE}/functions/shieldScanAWS`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SVC_TOK}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          aws_access_key_id: creds.accessKeyId,
          aws_secret_access_key: creds.secretAccessKey,
          aws_session_token: creds.sessionToken,
          aws_region: regions[0] || "us-east-1",
          scan_services,
          scan_mode: "agentless",
          role_arn,
          account_id,
        }),
        signal: AbortSignal.timeout(120000),
      });

      const scanResult = await scanRes.json().catch(() => ({ success: false }));
      return new Response(JSON.stringify({
        success: true,
        scan_mode: "agentless",
        role_arn,
        credentials_type: "temporary_sts_session",
        credentials_stored: false,
        ...scanResult,
      }), { headers: CORS });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: `Scan failed: ${e.message}` }), { headers: CORS });
    }
  }

  return new Response(JSON.stringify({ error: "Unknown action. Use: get_setup_instructions | validate_role | scan" }), { status: 400, headers: CORS });
});
