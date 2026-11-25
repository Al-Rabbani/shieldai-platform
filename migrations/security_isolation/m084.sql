-- The stage row must remember which mission it ran under, so an approved stage can be resumed on the same
-- mission (and therefore consume the approval a human already granted) instead of starting a new one.
ALTER TABLE warfare_campaign_stages ADD COLUMN IF NOT EXISTS mission_id text;
CREATE INDEX IF NOT EXISTS idx_warfare_stages_mission ON warfare_campaign_stages(mission_id);
