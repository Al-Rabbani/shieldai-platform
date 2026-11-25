#!/bin/bash
# Grant one account a temporary window to enrol its second factor.
#
# WHY THIS EXISTS: roles.requires_mfa is true for every role and every existing account carries an enrolment
# deadline. When the deadline passes, login refuses that account with 403 mfa_enrolment_required and there is no
# other way in, so an operator who misses the deadline is locked out of the platform that would let them fix it.
#
# USAGE: mfa-break-glass.sh <email> [hours]      (hours defaults to 1, capped at 24)
# The grant and its audit row are ONE transaction: if the audit row cannot be written, the window is not granted.
# A privilege grant nobody can trace is worse than a lockout, so this script fails closed.
set -uo pipefail
EMAIL="${1:-}"; HOURS="${2:-1}"
if [ -z "$EMAIL" ]; then echo "usage: $0 <email> [hours]" >&2; exit 2; fi
case "$HOURS" in ''|*[!0-9]*) echo "hours must be a whole number" >&2; exit 2;; esac
[ "$HOURS" -ge 1 ] && [ "$HOURS" -le 24 ] || { echo "hours must be between 1 and 24" >&2; exit 2; }

psql_t() { sudo -u postgres psql -d gds_os -tA -c "$1"; }

STATE=$(psql_t "SELECT mfa_enabled::text || '|' || coalesce(mfa_enrolment_deadline::text,'NULL') || '|' || tenant_id::text || '|' || id::text FROM users WHERE email = '$EMAIL'" | head -1)
if [ -z "$STATE" ]; then echo "no account with email $EMAIL" >&2; exit 1; fi
IFS='|' read -r ENABLED DEADLINE TENANT USERID <<< "$STATE"
if [ "$ENABLED" = "true" ]; then echo "$EMAIL has already enrolled a factor; no window is needed."; exit 0; fi
echo "before: enrolled=$ENABLED deadline=$DEADLINE"

SQL=$(mktemp)
chmod 644 "$SQL"
cat > "$SQL" <<SQL
\set ON_ERROR_STOP on
BEGIN;
UPDATE users SET mfa_enrolment_deadline = now() + interval '${HOURS} hours' WHERE id = '${USERID}';
INSERT INTO audit_events (id, tenant_id, user_id, action, detail, created_at)
VALUES (gen_random_uuid(), '${TENANT}', '${USERID}', 'auth.mfa.break_glass_window',
        jsonb_build_object('email','${EMAIL}','hours',${HOURS},'previous_deadline','${DEADLINE}',
                           'granted_by','mfa-break-glass.sh'), now());
COMMIT;
SQL
if ! sudo -u postgres psql -d gds_os -q -v ON_ERROR_STOP=1 -f "$SQL"; then
  echo "FAILED: the window was not granted (the transaction rolled back)." >&2; rm -f "$SQL"; exit 1
fi
rm -f "$SQL"
echo "after:  deadline=$(psql_t "SELECT mfa_enrolment_deadline::text FROM users WHERE id = '$USERID'" | head -1)  (window of ${HOURS}h, recorded in audit_events)"
echo "The account must enrol at /settings/mfa before that time or login refuses it again."
