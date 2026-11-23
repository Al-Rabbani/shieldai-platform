-- 075: a role may REQUIRE a second factor, and an unenrolled account has a dated deadline
--
-- MEASURED BEFORE THIS MIGRATION (23 Nov 2026): the platform has had a complete, two-step TOTP enrolment
-- (GET /auth/mfa/status, POST /auth/mfa/enrol, POST /auth/mfa/confirm, POST /auth/mfa/disable), login already
-- refuses a password-only sign-in for an enrolled account (401 mfa_required) and honours recovery codes, and
-- /settings/mfa is routed and wired to those routes. None of it was REQUIRED: 0 of 5 accounts had enrolled, so
-- every login on this platform was a password. The mechanism was never the gap; the policy was.
--
-- WHY A DEADLINE AND NOT AN IMMEDIATE REFUSAL: the only account that can administer this platform would be
-- refused at its next login, and enrolment itself requires a session. Turning the requirement on for existing
-- accounts with a dated grace window is how this is done without locking the operator out of the product he
-- owns. New accounts get no deadline and are refused immediately: the requirement applies from creation.
--
-- Break-glass, stated deliberately: if the operator loses the authenticator AND the recovery codes, an
-- administrator with shell access can clear the requirement for one account with
--   UPDATE users SET mfa_enrolment_deadline = now() + interval '1 hour' WHERE email = '...';
-- and the account is refused again when that hour passes. The recovery codes are the intended path.

BEGIN;

ALTER TABLE roles ADD COLUMN IF NOT EXISTS requires_mfa boolean NOT NULL DEFAULT false;

ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enrolment_deadline timestamptz;

-- Existing accounts: 72 hours from now. 26 Nov 2026.
UPDATE users
   SET mfa_enrolment_deadline = now() + interval '72 hours'
 WHERE mfa_enrolment_deadline IS NULL
   AND mfa_enabled = false;

-- Every role on this platform gates privileged action, so every role requires a second factor.
UPDATE roles SET requires_mfa = true WHERE requires_mfa = false;

COMMIT;
