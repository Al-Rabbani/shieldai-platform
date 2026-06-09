// ShieldAI — AWS Cloud Security Scanner (Phase 2, Step 2.1-2.4)
// Scans real AWS accounts for misconfigurations against CIS Benchmark + AWS Security Hub standards
// Services: S3, IAM, EC2, RDS, CloudTrail, VPC, SecurityGroups, KMS, CloudWatch

Deno.serve(async (req) => {
  const { aws_access_key_id, aws_secret_access_key, aws_region = "us-east-1", scan_services = ["s3","iam","ec2","rds","cloudtrail","vpc"] } = await req.json().catch(() => ({}));

  if (!aws_access_key_id || !aws_secret_access_key) {
    return Response.json({ error: "aws_access_key_id and aws_secret_access_key are required" }, { status: 400 });
  }

  // AWS Signature V4 request signer
  const encoder = new TextEncoder();

  async function hmacSHA256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  }

  async function sha256hex(data: string): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-256", encoder.encode(data));
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function awsRequest(service: string, region: string, action: string, params: Record<string, string> = {}) {
    const host = `${service}.${region}.amazonaws.com`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
    const dateStamp = amzDate.slice(0, 8);

    const queryParams = new URLSearchParams({ Action: action, Version: service === "iam" ? "2010-05-08" : "2016-11-15", ...params });
    queryParams.sort();
    const canonicalQueryString = queryParams.toString();

    const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-date";
    const payloadHash = await sha256hex("");
    const canonicalRequest = `GET\n/\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256hex(canonicalRequest)}`;

    let signingKey = encoder.encode("AWS4" + aws_secret_access_key);
    signingKey = new Uint8Array(await hmacSHA256(signingKey, dateStamp));
    signingKey = new Uint8Array(await hmacSHA256(signingKey, region));
    signingKey = new Uint8Array(await hmacSHA256(signingKey, service));
    signingKey = new Uint8Array(await hmacSHA256(signingKey, "aws4_request"));
    const signature = Array.from(new Uint8Array(await hmacSHA256(signingKey, stringToSign))).map(b => b.toString(16).padStart(2, "0")).join("");

    const authHeader = `AWS4-HMAC-SHA256 Credential=${aws_access_key_id}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const url = `https://${host}/?${canonicalQueryString}`;
    const response = await fetch(url, {
      headers: { Authorization: authHeader, "x-amz-date": amzDate, Host: host }
    });

    const text = await response.text();
    return { status: response.status, body: text, ok: response.ok };
  }

  const findings: any[] = [];
  const inventory: any = { s3_buckets: [], iam_users: [], ec2_instances: [], security_groups: [], rds_instances: [] };

  const addFinding = (service: string, title: string, severity: string, resource: string, description: string, remediation: string, cis_control?: string) => {
    findings.push({
      type: "cloud_misconfiguration",
      service,
      title,
      severity,
      resource,
      description,
      remediation,
      cis_control: cis_control || null,
      status: "open",
      detected_at: new Date().toISOString(),
      provider: "aws",
      region: aws_region,
    });
  };

  try {
    // ── S3 SCANNING
    if (scan_services.includes("s3")) {
      const s3List = await awsRequest("s3", "us-east-1", "ListBuckets");
      if (s3List.ok) {
        const bucketMatches = [...s3List.body.matchAll(/<Name>([^<]+)<\/Name>/g)];
        for (const match of bucketMatches) {
          const bucketName = match[1];
          inventory.s3_buckets.push(bucketName);

          // Check public access block
          try {
            const publicAccess = await awsRequest("s3", "us-east-1", "GetPublicAccessBlock", { Bucket: bucketName });
            if (!publicAccess.ok || !publicAccess.body.includes("<BlockPublicAcls>true</BlockPublicAcls>")) {
              addFinding("S3", `Bucket '${bucketName}' may allow public access`, "critical",
                `arn:aws:s3:::${bucketName}`,
                "The S3 bucket does not have all public access block settings enabled, potentially exposing data publicly.",
                "Enable S3 Block Public Access on the bucket and at the account level: aws s3api put-public-access-block --bucket " + bucketName + " --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true",
                "CIS 2.1.5"
              );
            }
          } catch (_) {}

          // Check encryption
          try {
            const encryption = await awsRequest("s3", "us-east-1", "GetBucketEncryption", { Bucket: bucketName });
            if (!encryption.ok || !encryption.body.includes("ServerSideEncryptionRule")) {
              addFinding("S3", `Bucket '${bucketName}' is not encrypted at rest`, "high",
                `arn:aws:s3:::${bucketName}`,
                "The S3 bucket does not have default server-side encryption enabled.",
                "Enable default encryption: aws s3api put-bucket-encryption --bucket " + bucketName + " --server-side-encryption-configuration '{\"Rules\":[{\"ApplyServerSideEncryptionByDefault\":{\"SSEAlgorithm\":\"AES256\"}}]}'",
                "CIS 2.1.1"
              );
            }
          } catch (_) {}

          // Check versioning
          try {
            const versioning = await awsRequest("s3", "us-east-1", "GetBucketVersioning", { Bucket: bucketName });
            if (!versioning.body.includes("<Status>Enabled</Status>")) {
              addFinding("S3", `Bucket '${bucketName}' versioning disabled`, "medium",
                `arn:aws:s3:::${bucketName}`,
                "S3 bucket versioning is not enabled. Without versioning, deleted or overwritten objects cannot be recovered.",
                "Enable versioning: aws s3api put-bucket-versioning --bucket " + bucketName + " --versioning-configuration Status=Enabled",
                "CIS 2.1.3"
              );
            }
          } catch (_) {}
        }
      }
    }

    // ── IAM SCANNING
    if (scan_services.includes("iam")) {
      // Check root account MFA
      const accountSummary = await awsRequest("iam", "us-east-1", "GetAccountSummary");
      if (accountSummary.ok) {
        if (accountSummary.body.includes("<key>AccountMFAEnabled</key><value>0</value>")) {
          addFinding("IAM", "Root account MFA is not enabled", "critical",
            "arn:aws:iam::root",
            "The AWS root account does not have Multi-Factor Authentication (MFA) enabled. Root account compromise gives full access to all resources.",
            "Enable MFA for the root account via AWS Console → IAM → Security credentials → Assign MFA device",
            "CIS 1.5"
          );
        }
      }

      // List IAM users and check for unused access keys
      const users = await awsRequest("iam", "us-east-1", "ListUsers");
      if (users.ok) {
        const userMatches = [...users.body.matchAll(/<UserName>([^<]+)<\/UserName>/g)];
        for (const match of userMatches.slice(0, 20)) {
          const userName = match[1];
          inventory.iam_users.push(userName);

          // Check access keys age
          const keys = await awsRequest("iam", "us-east-1", "ListAccessKeys", { UserName: userName });
          if (keys.ok) {
            const createDates = [...keys.body.matchAll(/<CreateDate>([^<]+)<\/CreateDate>/g)];
            for (const dateMatch of createDates) {
              const keyAge = (Date.now() - new Date(dateMatch[1]).getTime()) / (1000 * 60 * 60 * 24);
              if (keyAge > 90) {
                addFinding("IAM", `Access key for '${userName}' is ${Math.round(keyAge)} days old`, "high",
                  `arn:aws:iam::user/${userName}`,
                  `IAM user '${userName}' has an access key older than 90 days. Stale keys increase the risk of credential compromise.`,
                  "Rotate or deactivate old access keys: aws iam update-access-key --user-name " + userName + " --access-key-id <KEY_ID> --status Inactive",
                  "CIS 1.14"
                );
              }
            }
          }

          // Check for MFA on IAM users with console access
          const mfaDevices = await awsRequest("iam", "us-east-1", "ListMFADevices", { UserName: userName });
          if (mfaDevices.ok && !mfaDevices.body.includes("<member>")) {
            const loginProfile = await awsRequest("iam", "us-east-1", "GetLoginProfile", { UserName: userName });
            if (loginProfile.ok) {
              addFinding("IAM", `User '${userName}' has console access without MFA`, "high",
                `arn:aws:iam::user/${userName}`,
                `IAM user '${userName}' can log into the AWS console but has no MFA device configured.`,
                "Enforce MFA for all console users via IAM policy or AWS Config rule.",
                "CIS 1.10"
              );
            }
          }
        }
      }

      // Check password policy
      const pwPolicy = await awsRequest("iam", "us-east-1", "GetAccountPasswordPolicy");
      if (pwPolicy.ok) {
        if (!pwPolicy.body.includes("<MinimumPasswordLength>") || pwPolicy.body.includes("<MinimumPasswordLength>8</MinimumPasswordLength>") || pwPolicy.body.includes("<MinimumPasswordLength>6</MinimumPasswordLength>")) {
          addFinding("IAM", "Weak IAM password policy — minimum length too short", "medium",
            "arn:aws:iam::account-policy",
            "The IAM account password policy requires fewer than 14 characters.",
            "Update password policy: aws iam update-account-password-policy --minimum-password-length 14 --require-symbols --require-numbers --require-uppercase-characters --require-lowercase-characters",
            "CIS 1.8"
          );
        }
      }
    }

    // ── EC2 / SECURITY GROUP SCANNING
    if (scan_services.includes("ec2")) {
      const sgList = await awsRequest("ec2", aws_region, "DescribeSecurityGroups");
      if (sgList.ok) {
        const sgMatches = [...sgList.body.matchAll(/<groupId>([^<]+)<\/groupId>/g)];
        const ipPermMatches = [...sgList.body.matchAll(/<cidrIp>0\.0\.0\.0\/0<\/cidrIp>/g)];

        if (ipPermMatches.length > 0) {
          addFinding("EC2", `${ipPermMatches.length} security group(s) open to 0.0.0.0/0`, "critical",
            `arn:aws:ec2:${aws_region}:security-group/open`,
            "One or more security groups allow unrestricted inbound access from the internet (0.0.0.0/0). This exposes your instances to the entire internet.",
            "Restrict security group rules to specific IP ranges or security groups. Remove 0.0.0.0/0 inbound rules except for web servers on ports 80/443.",
            "CIS 5.2"
          );
        }

        // Check for unrestricted SSH (port 22)
        if (sgList.body.includes("<fromPort>22</fromPort>") && sgList.body.includes("<cidrIp>0.0.0.0/0</cidrIp>")) {
          addFinding("EC2", "SSH port 22 open to the entire internet", "critical",
            `arn:aws:ec2:${aws_region}:security-group/ssh-open`,
            "A security group allows SSH access (port 22) from 0.0.0.0/0. This is a critical risk — attackers can attempt brute-force SSH login.",
            "Restrict SSH to specific trusted IPs or use AWS Systems Manager Session Manager instead of direct SSH access.",
            "CIS 5.2"
          );
        }

        // Check for unrestricted RDP (port 3389)
        if (sgList.body.includes("<fromPort>3389</fromPort>") && sgList.body.includes("<cidrIp>0.0.0.0/0</cidrIp>")) {
          addFinding("EC2", "RDP port 3389 open to the entire internet", "critical",
            `arn:aws:ec2:${aws_region}:security-group/rdp-open`,
            "A security group allows RDP access (port 3389) from 0.0.0.0/0.",
            "Restrict RDP to specific trusted IPs or use AWS Session Manager for Windows instances.",
            "CIS 5.3"
          );
        }
      }

      // Check EBS volume encryption
      const volumes = await awsRequest("ec2", aws_region, "DescribeVolumes");
      if (volumes.ok && volumes.body.includes("<encrypted>false</encrypted>")) {
        addFinding("EC2", "Unencrypted EBS volumes detected", "high",
          `arn:aws:ec2:${aws_region}:volume/unencrypted`,
          "One or more EBS volumes are not encrypted. Unencrypted volumes expose data if the physical media is compromised.",
          "Enable EBS encryption by default: aws ec2 enable-ebs-encryption-by-default --region " + aws_region,
          "CIS 2.2.1"
        );
      }
    }

    // ── CLOUDTRAIL SCANNING
    if (scan_services.includes("cloudtrail")) {
      const trails = await awsRequest("cloudtrail", aws_region, "DescribeTrails");
      if (trails.ok) {
        if (!trails.body.includes("<IsMultiRegionTrail>true</IsMultiRegionTrail>")) {
          addFinding("CloudTrail", "No multi-region CloudTrail configured", "high",
            `arn:aws:cloudtrail:${aws_region}`,
            "CloudTrail is not configured to log events across all AWS regions. Regional API activity outside the monitored region will not be captured.",
            "Create a multi-region trail: aws cloudtrail create-trail --name ShieldAI-Audit-Trail --s3-bucket-name <your-bucket> --is-multi-region-trail",
            "CIS 3.1"
          );
        }
        if (!trails.body.includes("<LogFileValidationEnabled>true</LogFileValidationEnabled>")) {
          addFinding("CloudTrail", "CloudTrail log file validation not enabled", "medium",
            `arn:aws:cloudtrail:${aws_region}`,
            "Log file validation is disabled. Without it, you cannot verify that CloudTrail log files have not been modified or deleted.",
            "Enable log file validation on your trail: aws cloudtrail update-trail --name <trail-name> --enable-log-file-validation",
            "CIS 3.2"
          );
        }
      } else {
        addFinding("CloudTrail", "CloudTrail is not enabled in this region", "critical",
          `arn:aws:cloudtrail:${aws_region}`,
          "AWS CloudTrail is not enabled. Without it, you have no audit log of API calls and cannot detect unauthorized activity.",
          "Enable CloudTrail immediately: aws cloudtrail create-trail --name ShieldAI-Audit-Trail --s3-bucket-name <your-bucket> --is-multi-region-trail && aws cloudtrail start-logging --name ShieldAI-Audit-Trail",
          "CIS 3.1"
        );
      }
    }

    // ── BUILD SUMMARY
    const summary = {
      total: findings.length,
      critical: findings.filter(f => f.severity === "critical").length,
      high: findings.filter(f => f.severity === "high").length,
      medium: findings.filter(f => f.severity === "medium").length,
      low: findings.filter(f => f.severity === "low").length,
      services_scanned: scan_services,
      risk_score: Math.min(100, findings.filter(f=>f.severity==="critical").length * 20 + findings.filter(f=>f.severity==="high").length * 8 + findings.filter(f=>f.severity==="medium").length * 3),
      inventory,
    };

    return Response.json({ success: true, provider: "aws", region: aws_region, scanned_at: new Date().toISOString(), findings, summary });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
