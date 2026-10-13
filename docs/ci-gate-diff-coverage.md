# CI gate text-diff coverage hardening

Part of issue #12, based on main 45f56e13aeba062cf4b19f13430335c46e247d9b.

The gate now validates each text hunk's declared old/new line counts before
producing a verdict. Binary markers, combined/unknown formats, extra content,
truncated hunks, header-only diffs and invalid UTF-8 return integration_error.
Added content starting with extra plus signs is scanned as content rather than
mistaken for a file header. Deletion-only, mode changes and rename-only diffs
retain explicit file coverage without inventing added content.

This is an intentional fail-closed behavior change. A binary-bearing commit
may stop receiving a passing gate verdict until a supported binary scanner or
explicit separately reviewed coverage policy exists. Do not convert this
integration_error into a security pass or AutoFix trigger.

Fifteen persisted offline backend contracts are added to the CI workflow,
alongside sixteen existing client tests. They load actual functions and
validators without starting production services; HTTP and database operations
are mocked. They are not a replacement for FastAPI/DB integration tests.

Co-Pilot review and deployment checks: run both test suites under Python 3.11,
compile ci_gate.py, verify a normal text commit passes with real credentials,
verify a deletion-only commit reports file coverage, and exercise synthetic
binary/truncated diffs in an isolated test (never add real secrets to Git).
Verify unsupported coverage returns status integration_error and AutoFix stays
skipped. Preserve the current release and roll back this file if legitimate
GitHub diff formats are incorrectly rejected; report the specific format.

Still outside this PR: repository/tenant asset identity, public-token identity
semantics, full-tree/history/binary scanning, Temporal, TLS and repository
visibility. Issue #12 stays open for those remaining items. No VPS changes or
automatic merge/deployment were performed by Codex in this work.
