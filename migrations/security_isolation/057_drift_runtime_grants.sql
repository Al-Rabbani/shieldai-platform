-- Item 9 (migration 057): the new stores were created but the application role could not touch them.
--
-- Measured: drift_scan.py failed with "permission denied for table config_baselines" on its very first SELECT. Migration
-- 056 created the tables and forced RLS on them but granted nothing, so every read and write from the API role would
-- have failed the same way. Grants are stated here rather than assumed from ownership.

GRANT SELECT, INSERT, UPDATE, DELETE ON config_baselines, configuration_drift, runtime_posture, drift_alert_configs TO gds;
GRANT SELECT ON config_baselines, configuration_drift, runtime_posture, drift_alert_configs TO gds_runtime;
