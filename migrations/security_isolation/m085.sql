-- A notification that cannot say where to act is a log line with a red dot on it.
--
-- MEASURED 26 Nov 2026: the notification centre renders notification.action_url as a Link and the bell navigates to it,
-- but the table had no such column, so every alert the platform raised led nowhere. The reminder that tells a decider an
-- approval is waiting arrived with no way to reach the approval.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url text;
