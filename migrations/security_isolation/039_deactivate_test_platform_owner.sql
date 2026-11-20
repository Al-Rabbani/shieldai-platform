-- Deactivate the leftover test account that still holds platform_owner.
--
-- test_1785545020@test.com (user 8bdce20f-b0d4-4d9c-b420-28f435259540, tenant 764efb10 "Test User") was created on
-- 1 Aug 2026 and has stayed active since, holding platform_owner: the role that carries manage, suppress and
-- accept-risk across cloud findings. A live privileged account nobody owns is a standing risk in GDS's own posture.
--
-- Deactivated, not deleted. Its two audit_events rows stay readable, so the history of what it did remains intact,
-- and reactivation is one UPDATE if it turns out something needs it. security.py refuses a deactivated user at
-- login ("User is deactivated"), and every request reloads the role from the row, so this takes effect immediately
-- without waiting for a token to expire.

UPDATE users
SET is_active = false
WHERE id = '8bdce20f-b0d4-4d9c-b420-28f435259540'
  AND email = 'test_1785545020@test.com'
  AND is_active IS TRUE;
