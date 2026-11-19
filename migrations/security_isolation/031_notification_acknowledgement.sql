-- A notification nobody acknowledges is a log entry, not a page.
--
-- Measured 19 Nov 2026: 183 notifications, 183 unread, and nothing re-raised any of them. The platform could
-- tell a human something had gone wrong, once, and never again. These columns are what turn a message into a
-- page: whether an answer is required, who gave it, how many times it has been re-raised, and how far up the
-- ladder it has climbed.
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS severity text,
    ADD COLUMN IF NOT EXISTS requires_ack boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
    ADD COLUMN IF NOT EXISTS acknowledged_by uuid REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS notify_count integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_notified_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_delivery text;

-- The pager's own query: what is still unanswered and still climbable.
CREATE INDEX IF NOT EXISTS idx_notifications_paging
    ON notifications (requires_ack, acknowledged_at, escalation_level)
    WHERE requires_ack = true;

COMMENT ON COLUMN notifications.requires_ack IS
    'True means a human must acknowledge this or it escalates. False means it is informational.';
COMMENT ON COLUMN notifications.escalation_level IS
    'Rungs climbed: 0 initial delivery, 1 after 5 min, 2 after 15 min, 3 after 60 min then marked unanswered.';
