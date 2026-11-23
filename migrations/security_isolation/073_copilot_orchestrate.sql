-- Item 44: running a multi-agent mission from the chat is a distinct capability from asking a question.
--
-- A single-agent question costs cents and touches read-only tools; an orchestrated mission plans across agents, spends
-- roughly $0.07 measured, and can be asked to write if the caller sets allow_writes. It gets its own permission so the
-- two cannot be granted or revoked together by accident.
UPDATE roles
SET permissions = permissions || '["copilot:orchestrate"]'::jsonb
WHERE name = 'platform_owner'
  AND NOT (permissions @> '["copilot:orchestrate"]'::jsonb);

-- admin already holds "*", which satisfies every gate. analyst is deliberately left without this permission: it spends
-- money and can be asked to write.
