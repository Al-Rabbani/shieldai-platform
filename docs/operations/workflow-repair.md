# Repairing missions that never got a workflow

`gds_api/reconciliation.py` reports a `MISSING_WORKFLOW` finding for any mission with no
`workflow_runs` row. It deliberately never auto-repairs them, and it points here for the manual
procedure. This document is that procedure.

## Why the reconciler will not fix these itself

A `WorkflowRun` row carries `temporal_workflow_id` and `temporal_run_id`, which only Temporal can
issue. Writing one by hand to make a finding disappear would invent workflow progress that never
happened, and the row would then claim a real execution exists where none does. So the finding is
information, and the decision is a human one.

## Decide from evidence, never from the row alone

Check all four of these before touching anything:

1. `select count(*) from mission_tasks where mission_id = '<id>';` - did any work get recorded?
2. `select * from workflow_runs where mission_id = '<id>';` - is there really no run row?
3. Temporal, for the deterministic ids this platform uses: `mission-<id>` for a direct mission and
   `conversation-turn-<id>` for a chat mission. `describe()` returning `NOT FOUND` means Temporal has
   no such execution.
4. `POST /workflows/reconcile` with `{"dry_run": true}` - the platform's own verdict, tenant-wide.

Then apply the rule below. The controlling question is not "how old is the row" but "did the work
happen".

## The rule

**Mission status is terminal (`completed`, `failed`, `cancelled`)**

Informational only. Take no action and write no `WorkflowRun`. Missions created before
`start_mission_workflow` existed predate `workflow_runs` entirely, so a completed mission with no run
row is normal history, not drift. At the time of writing, three of the tenant's twelve missions are in
this class.

**Mission status is non-terminal (`planning`, `running`, `awaiting_approval`)**

- If the Temporal execution **exists and is open**: do not touch the row. The mission is alive and
  the missing `WorkflowRun` is a separate bookkeeping defect; escalate it as one.
- If the Temporal execution **does not exist**: nothing ever started durably. Close the mission as
  `cancelled` - never `completed`, which would claim work that never happened, and never `failed`,
  which would claim an attempt that never ran. Set `completed_at`, and write one audit event
  (`mission.cancelled_orphan`) naming the evidence, the actor and the authorisation. Leave `report`
  NULL: there is no report, because no work was done.

## Worked example (2026-11-17)

Mission `6e3a474c-2554-43f0-83f8-da95c11b5c69`, objective "Temporal wiring verification: check
platform health and report the count of open findings", created 2026-10-13 12:03 UTC, stuck in
`planning` for five weeks.

Evidence: `mission_tasks` 0 rows, `workflow_runs` 0 rows, Temporal `NOT FOUND` for both
`mission-6e3a474c-...` and `conversation-turn-6e3a474c-...` with zero workflows running in the
namespace, and the reconciler reporting `MISSING_WORKFLOW`.

Disposition: closed as `cancelled` at 02:31 UTC with audit event `mission.cancelled_orphan`. The
mission was the first proof of the Temporal wiring on 13 October, created while the Anthropic key on
the host was truncated so no real reasoning call could succeed; the engine has since been proven
end-to-end by dozens of real missions, so re-running this one would repeat work already established.

## What not to do

- Do not fabricate a `WorkflowRun` row, a `temporal_workflow_id` or a `temporal_run_id`.
- Do not mark a never-run mission `completed` to clear the queue.
- Do not delete the mission row. Its audit trail is the record of what did and did not happen.
- Do not close a `running` mission on age alone. Silence in `mission_tasks` is a reason to look, not
  a verdict.
