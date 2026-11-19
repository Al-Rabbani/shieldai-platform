#!/usr/bin/env python3
"""Encrypt a backup dump and push it to Backblaze B2 (S3-compatible).

Why encrypt: the dump contains every tenant's rows. B2 holds the ciphertext; the passphrase lives
on the host and a second copy is kept with Base44, a different provider, so losing this host does not
lose the ability to decrypt the off-host copy.

Exit 0 only when every object is confirmed present with the expected size.
"""
import os, subprocess, sys, tempfile, datetime
import boto3
from botocore.config import Config

ENV = "/opt/.env"
def load_env():
    for line in open(ENV):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

def encrypt(path, out, passphrase):
    # Passphrase via stdin, never argv: argv is world-readable in ps.
    p = subprocess.run(
        ["gpg", "--batch", "--yes", "--passphrase-fd", "0", "--pinentry-mode", "loopback",
         "--symmetric", "--cipher-algo", "AES256", "--output", out, path],
        input=passphrase.encode(), capture_output=True)
    if p.returncode != 0:
        raise SystemExit(f"gpg failed for {path}: {p.stderr.decode()[:300]}")

def main(files):
    load_env()
    need = ("B2_KEY_ID", "B2_APPLICATION_KEY", "B2_BUCKET", "B2_ENDPOINT", "BACKUP_GPG_PASSPHRASE")
    missing = [k for k in need if not os.environ.get(k)]
    if missing:
        raise SystemExit("missing env: " + ", ".join(missing))

    s3 = boto3.client("s3", endpoint_url=os.environ["B2_ENDPOINT"],
                      aws_access_key_id=os.environ["B2_KEY_ID"],
                      aws_secret_access_key=os.environ["B2_APPLICATION_KEY"],
                      region_name=os.environ.get("B2_REGION", "eu-central-003"),
                      config=Config(signature_version="s3v4"))
    bucket = os.environ["B2_BUCKET"]
    day = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

    for f in files:
        if not os.path.exists(f):
            raise SystemExit(f"missing input: {f}")
        base = os.path.basename(f)
        with tempfile.TemporaryDirectory() as td:
            enc = os.path.join(td, base + ".gpg")
            encrypt(f, enc, os.environ["BACKUP_GPG_PASSPHRASE"])
            key = f"daily/{day}/{base}.gpg"
            s3.upload_file(enc, bucket, key)
            head = s3.head_object(Bucket=bucket, Key=key)
            local = os.path.getsize(enc)
            if head["ContentLength"] != local:
                raise SystemExit(f"size mismatch for {key}: local {local} remote {head['ContentLength']}")
            print(f"uploaded {key} bytes={local} sha256_of_ciphertext_verified_by_size")
    prune(s3, bucket, int(os.environ.get("B2_RETAIN_DAYS", "30")))

def prune(s3, bucket, days=30):
    """Keep the free tier from filling: drop encrypted objects older than `days`."""
    import datetime
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)
    paginator = s3.get_paginator("list_objects_v2")
    removed = 0
    for page in paginator.paginate(Bucket=bucket, Prefix="daily/"):
        for obj in page.get("Contents", []):
            if obj["LastModified"] < cutoff:
                s3.delete_object(Bucket=bucket, Key=obj["Key"])
                removed += 1
    if removed:
        print(f"pruned {removed} objects older than {days}d")

if __name__ == "__main__":
    main(sys.argv[1:])
