-- 018: the runtime roles need explicit privileges on the new heartbeat table.
-- Measured 18 Nov 2026: after 017 created agent_heartbeats, both ingest and fleet status returned 500
-- with asyncpg InsufficientPrivilege "permission denied for table agent_heartbeats". Creating a table
-- as postgres does not grant the API role anything, and the API connects as gds (worker as gds too).
GRANT SELECT, INSERT ON agent_heartbeats TO gds;
GRANT SELECT, INSERT ON agent_heartbeats TO gds_runtime;
