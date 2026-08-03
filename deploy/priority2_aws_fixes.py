#!/usr/bin/env python3
"""
Priority 2: AWS Cloud Security Fixes
Fixes: IAM password policy, CloudTrail, MFA enforcement, access key rotation
Requires: gds-security-scanner IAM user to have IAMFullAccess + AWSCloudTrailFullAccess + IAMUserChangePassword
If permissions are missing, the script will report exactly what to attach.
"""
import boto3, json, sys, os
from datetime import datetime

# Load AWS credentials from /opt/.env
env = {}
with open("/opt/.env") as f:
    for line in f:
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

AWS_ACCESS_KEY = env.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_KEY = env.get("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = env.get("AWS_REGION", "us-east-1")

print("=" * 60)
print("PRIORITY 2: AWS CLOUD SECURITY FIXES")
print("=" * 60)

# Initialize clients
try:
    iam = boto3.client("iam", aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY, region_name=AWS_REGION)
    cloudtrail = boto3.client("cloudtrail", aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY, region_name=AWS_REGION)
    sts = boto3.client("sts", aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY, region_name=AWS_REGION)
    account_id = sts.get_caller_identity()["Account"]
    print("  Account: %s" % account_id)
    print("  User: %s" % sts.get_caller_identity().get("Arn", "?"))
except Exception as e:
    print("  ❌ AWS connection failed: %s" % e)
    sys.exit(1)

results = {"fixed": [], "failed": [], "manual_required": []}

# ═══════════════════════════════════════════════════════════
# Fix 1: IAM Password Policy
# ═══════════════════════════════════════════════════════════
print("\n[1/4] Setting IAM Password Policy...")
try:
    iam.update_account_password_policy(
        MinimumPasswordLength=14,
        RequireSymbols=True,
        RequireNumbers=True,
        RequireUppercaseCharacters=True,
        RequireLowercaseCharacters=True,
        AllowUsersToChangePassword=True,
        PasswordReusePrevention=5,
        MaxPasswordAge=90,
        HardExpiry=False
    )
    print("  ✅ Password policy set: 14+ chars, all complexity, 90-day rotation, no reuse")
    results["fixed"].append("IAM password policy configured")
except Exception as e:
    error = str(e)
    if "AccessDenied" in error:
        print("  ❌ AccessDenied — need IAMFullAccess or iam:UpdateAccountPasswordPolicy")
        results["manual_required"].append("Attach IAMFullAccess to gds-security-scanner IAM user")
    else:
        print("  ❌ Failed: %s" % e)
        results["failed"].append("Password policy: %s" % e)

# ═══════════════════════════════════════════════════════════
# Fix 2: Enable CloudTrail
# ═══════════════════════════════════════════════════════════
print("\n[2/4] Enabling CloudTrail...")
try:
    # Check existing trails
    trails = cloudtrail.describe_trails()
    existing = [t["Name"] for t in trails.get("trailList", [])]
    
    if existing:
        print("  ℹ️  CloudTrail already enabled: %s" % ", ".join(existing))
        results["fixed"].append("CloudTrail already active: %s" % ", ".join(existing))
    else:
        # Create a trail — need an S3 bucket first
        # Try to create the trail with a default bucket name
        trail_name = "gds-cloudtrail"
        bucket_name = "gds-cloudtrail-%s" % account_id
        
        # Try creating the trail (will fail if bucket doesn't exist, but we'll try)
        try:
            cloudtrail.create_trail(
                Name=trail_name,
                S3BucketName=bucket_name,
                IncludeGlobalServiceEvents=True,
                IsMultiRegionTrail=True,
                EnableLogFileValidation=True
            )
            cloudtrail.start_logging(Name=trail_name)
            print("  ✅ CloudTrail created: %s (bucket: %s)" % (trail_name, bucket_name))
            results["fixed"].append("CloudTrail enabled: %s" % trail_name)
        except Exception as e:
            if "AccessDenied" in str(e):
                print("  ❌ AccessDenied — need AWSCloudTrailFullAccess + S3 permissions")
                results["manual_required"].append("Attach AWSCloudTrailFullAccess + AmazonS3FullAccess to gds-security-scanner")
            elif "InvalidS3BucketName" in str(e) or "S3" in str(e):
                print("  ⚠️ Need S3 bucket first. Create bucket '%s' then re-run." % bucket_name)
                results["manual_required"].append("Create S3 bucket '%s' for CloudTrail logs" % bucket_name)
            else:
                print("  ❌ Failed: %s" % e)
                results["failed"].append("CloudTrail: %s" % e)
except Exception as e:
    print("  ❌ Failed: %s" % e)
    results["failed"].append("CloudTrail check: %s" % e)

# ═══════════════════════════════════════════════════════════
# Fix 3: Check MFA status for all IAM users
# ═══════════════════════════════════════════════════════════
print("\n[3/4] Checking MFA status for IAM users...")
try:
    users = iam.list_users()
    for user in users.get("Users", []):
        username = user["UserName"]
        mfa = iam.list_mfa_devices(UserName=username)
        mfa_devices = mfa.get("MFADevices", [])
        
        if mfa_devices:
            print("  ✅ %s: MFA enabled (%d device(s))" % (username, len(mfa_devices)))
        else:
            print("  🔴 %s: NO MFA — needs manual enrollment" % username)
            results["manual_required"].append(
                "Enable MFA for user '%s': AWS Console → IAM → Users → %s → Security credentials → Assign MFA device" % (username, username)
            )
except Exception as e:
    if "AccessDenied" in str(e):
        print("  ❌ AccessDenied — need IAMFullAccess to list users")
        results["manual_required"].append("Attach IAMFullAccess to gds-security-scanner")
    else:
        print("  ❌ Failed: %s" % e)
        results["failed"].append("MFA check: %s" % e)

# ═══════════════════════════════════════════════════════════
# Fix 4: Check access key rotation
# ═══════════════════════════════════════════════════════════
print("\n[4/4] Checking access key age...")
try:
    users = iam.list_users()
    for user in users.get("Users", []):
        username = user["UserName"]
        keys = iam.list_access_keys(UserName=username)
        for key in keys.get("AccessKeyMetadata", []):
            key_id = key["AccessKeyId"]
            created = key["CreateDate"]
            age_days = (datetime.now(created.tzinfo) - created).days if hasattr(created, 'tzinfo') else 0
            
            if age_days > 90:
                print("  ⚠️ %s: Key %s is %d days old (>90) — rotate" % (username, key_id[-8:], age_days))
                results["manual_required"].append("Rotate access key %s for user '%s'" % (key_id[-8:], username))
            else:
                print("  ✅ %s: Key %s is %d days old" % (username, key_id[-8:], age_days))
except Exception as e:
    if "AccessDenied" in str(e):
        print("  ❌ AccessDenied — need IAMFullAccess")
    else:
        print("  ❌ Failed: %s" % e)

# ═══════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print("  Fixed: %d" % len(results["fixed"]))
for f in results["fixed"]:
    print("    ✅ %s" % f)
print("  Failed: %d" % len(results["failed"]))
for f in results["failed"]:
    print("    ❌ %s" % f)
print("  Manual required: %d" % len(results["manual_required"]))
for m in results["manual_required"]:
    print("    🔧 %s" % m)

if results["manual_required"]:
    print("\n" + "=" * 60)
    print("ACTION REQUIRED:")
    print("  1. AWS Console → IAM → Users → gds-security-scanner")
    print("  2. Add permissions → Attach policies directly")
    print("  3. Attach: IAMFullAccess, AWSCloudTrailFullAccess, AmazonS3FullAccess")
    print("  4. Re-run this script: python3 deploy/priority2_aws_fixes.py")
    print("=" * 60)
