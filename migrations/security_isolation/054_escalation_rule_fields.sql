-- 054: the escalation panel edits a notification target that the store had nowhere to keep.
--
-- Measured 22 November 2026: EscalationSettingsPage.jsx and EscalationRuleForm.jsx write rule_name,
-- severity_threshold, min_risk_score, slack_channel_id, slack_channel_name, engineer_ids, team_names and
-- is_active. siem_correlation_rules held name, description, rule_type, conditions, time_window_seconds,
-- threshold, severity, mitre_technique, is_active, fire_count, last_fired. The four notification fields and
-- the CVSS floor were accepted by the form, dropped by the API, and lost on save with no error - silent data
-- loss, which is worse than a refusal.
--
-- origin separates the ten rows the platform wrote from PREBUILT_RULES (seed_default_rules, all created in the
-- same second at 19:37:07, fire_count 0, last_fired null) from any rule a person creates. The panel listed the
-- seeded ten with no distinction, which reads as a tenant configuration that nobody made.

ALTER TABLE siem_correlation_rules
    ADD COLUMN IF NOT EXISTS min_risk_score numeric(4, 1),
    ADD COLUMN IF NOT EXISTS slack_channel_id varchar(64),
    ADD COLUMN IF NOT EXISTS slack_channel_name varchar(200),
    ADD COLUMN IF NOT EXISTS engineer_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS team_names jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS origin varchar(16) NOT NULL DEFAULT 'tenant';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'siem_correlation_rules_origin_check'
    ) THEN
        ALTER TABLE siem_correlation_rules
            ADD CONSTRAINT siem_correlation_rules_origin_check
            CHECK (origin IN ('seeded', 'tenant'));
    END IF;
END
$$;

-- Backfill by name against PREBUILT_RULES. Exact rather than inferred: a name match plus never-fired is the
-- only signature the ten seeded rows have, and no write route existed that could have edited them.
UPDATE siem_correlation_rules
   SET origin = 'seeded'
 WHERE name IN (
        'Brute Force Attempt',
        'Impossible Travel',
        'Port Scan Activity',
        'Potential Data Exfiltration',
        'Lateral Movement via RDP/SMB',
        'C2 Malware Beaconing Pattern',
        'Privilege Escalation - Admin Group Member Added',
        'MITRE T1078: Valid Accounts - Admin Login from New Location',
        'MITRE T1110: Brute Force Success',
        'MITRE T1059: Command Execution via Suspicious Parent'
   )
   AND fire_count = 0
   AND last_fired IS NULL;
