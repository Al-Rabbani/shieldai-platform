"""The ten repository capabilities' real tool handlers.

`capabilities/catalog.py` declares ten repository capabilities (repository.read, .search,
.list_files, .read_file, .list_branches, .list_tags, .repository_metadata, .history,
.diff_between_refs, .list_worktrees) and `repository_api._REPOSITORY_CAPABILITY_TOOLS` maps each
one to a tool name. None of those tool names existed in `tool_gateway.TOOL_REGISTRY`, so the whole
declared surface was unreachable: the capability broker looked the name up and raised KeyError,
which surfaced as a 500 on POST /repositories/{id}/execute/{capability}.

The infrastructure to do the work was already present and tested - workspace_manager opens a real
isolated worktree, git_exec runs real git, worktree_manager lists real worktrees, diff_engine
produces a real diff - and three of the modules that decide whether a caller may do any of it
(path_policy, policy_enforcement, diff_engine) were reachable from nothing at all. This module is
the join: every handler resolves the tenant's RepositoryPolicy, enforces it, opens or reuses the
real Workspace, and then runs the real git command.

Policy semantics are the existing ones, not new rules: `ensure_readable`/`ensure_searchable` honour
the repository's own flags, `ensure_agent_and_capability_allowed` can only narrow the broker's
allow-list, and `is_path_allowed` filters every path that leaves the process (structural secrets
such as .env/.git are refused regardless of policy).
"""
from __future__ import annotations

import asyncio
import uuid
from typing import Any

from gds_api.db import async_session_factory
from gds_api.repository.diff_engine import DiffOperationError, diff_between_refs
from gds_api.repository.git_exec import run_git
from gds_api.repository.path_policy import is_path_allowed
from gds_api.repository.policy_enforcement import (
    RepositoryCapabilityDenied,
    ensure_agent_and_capability_allowed,
    ensure_readable,
    ensure_searchable,
)
from gds_api.repository.registry import (
    RepositoryNotFound,
    get_repository,
    get_repository_policy,
    get_workspace_policy,
    refresh_repository_status,
)
from gds_api.repository.workspace_manager import (
    WorkspaceCreationDenied,
    resolve_or_create_workspace,
)
from gds_api.repository.worktree_manager import list_worktrees
from gds_api.tenant_binding import bind_tenant

_MAX_FILE_BYTES = 200_000
_MAX_RESULTS = 500
_MAX_PATCH_CHARS = 60_000


class _ToolFailure(Exception):
    """A refusal or bad request that the caller must see as a real, named outcome."""

    def __init__(self, code: str, detail: str) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail


def _ids(payload: dict[str, Any] | None) -> dict[str, Any]:
    p = payload or {}
    raw_tenant = p.get("_tenant_id") or p.get("tenant_id")
    raw_repo = p.get("repository_id")
    raw_mission = p.get("_mission_id") or p.get("mission_id")
    raw_agent = p.get("agent_id")
    if not raw_tenant or not raw_repo:
        raise _ToolFailure(
            "MISSING_ARGUMENT", "tenant_id and repository_id are required for a repository capability"
        )
    if not raw_mission:
        raise _ToolFailure(
            "MISSING_ARGUMENT",
            "mission_id is required: every repository capability operates inside a real Workspace, "
            "and a Workspace is owned by a mission",
        )
    return {
        "tenant_id": uuid.UUID(str(raw_tenant)),
        "repository_id": uuid.UUID(str(raw_repo)),
        "mission_id": uuid.UUID(str(raw_mission)),
        "agent_id": str(raw_agent) if raw_agent else None,
    }


async def _prepare(
    payload: dict[str, Any] | None, capability_key: str, *, search: bool = False
) -> tuple[dict[str, Any], str]:
    """Enforce the repository's policy, then open (or reuse) its real workspace.

    Returns the repository facts a handler needs plus the workspace path on disk. The workspace
    creation is committed here because it is the durable artefact the other nine capabilities
    operate on; nothing is read from the session afterwards, so NullPool's lost binding cannot
    turn a successful open into a phantom.
    """
    ids = _ids(payload)
    async with async_session_factory() as db:
        await bind_tenant(db, ids["tenant_id"])
        try:
            repository = await get_repository(
                db, tenant_id=ids["tenant_id"], repository_id=ids["repository_id"]
            )
            policy = await get_repository_policy(
                db, tenant_id=ids["tenant_id"], repository_id=ids["repository_id"]
            )
        except RepositoryNotFound as exc:
            raise _ToolFailure("REPOSITORY_NOT_FOUND", str(exc)) from exc

        # The workspace policy is a separate row and workspace_manager denies outright when it is
        # absent. Reading it through the (self-healing) accessor is what makes a repository that
        # was inserted without policy rows usable.
        await get_workspace_policy(
            db, tenant_id=ids["tenant_id"], repository_id=ids["repository_id"]
        )

        # A workspace may only be opened against an AVAILABLE repository, and the documented
        # contract is that verification runs "whenever a workspace is about to be created". It did
        # not, so a repository whose status was never verified (this one was stored as "active" by
        # a script that bypassed register_repository) refused every capability. Re-verify for real
        # here, and refuse honestly if the real check still says it is not available.
        if repository.status != "AVAILABLE":
            repository = await refresh_repository_status(db, repository)
            if repository.status != "AVAILABLE":
                raise _ToolFailure(
                    "REPOSITORY_NOT_AVAILABLE",
                    f"Repository is {repository.status}: {repository.status_detail or 'no detail'}",
                )

        try:
            ensure_readable(policy)
            if search:
                ensure_searchable(policy)
            ensure_agent_and_capability_allowed(
                policy, capability_key=capability_key, requesting_agent_id=ids["agent_id"]
            )
        except RepositoryCapabilityDenied as exc:
            raise _ToolFailure("REPOSITORY_CAPABILITY_DENIED", str(exc)) from exc

        try:
            workspace = await resolve_or_create_workspace(
                db,
                tenant_id=ids["tenant_id"],
                mission_id=ids["mission_id"],
                workflow_run_id=None,
                capability_decision_id=None,
                repository_id=ids["repository_id"],
                agent_id=ids["agent_id"],
            )
        except WorkspaceCreationDenied as exc:
            raise _ToolFailure("WORKSPACE_DENIED", str(exc)) from exc
        facts = {
            "repository_id": str(ids["repository_id"]),
            "display_name": repository.display_name,
            "provider": repository.provider,
            "default_branch": repository.default_branch,
            "remote_url": repository.remote_url,
            "workspace_id": str(workspace.id),
            "workspace_state": workspace.state,
            "mission_id": str(ids["mission_id"]),
        }
        path = workspace.workspace_path
        await db.commit()
    return facts, path


def _git(args: list[str], path: str, *, check: bool = True) -> tuple[str, str, int]:
    result = run_git(args, cwd=path)
    if check and result.returncode != 0:
        raise _ToolFailure(
            "GIT_FAILED",
            f"git {' '.join(args[:2])} failed: {(result.stderr or result.stdout).strip()[:500]}",
        )
    return result.stdout or "", result.stderr or "", result.returncode


async def _git_async(args: list[str], path: str, *, check: bool = True) -> tuple[str, str, int]:
    return await asyncio.to_thread(_git, args, path, check=check)


def _policy_paths(payload: dict[str, Any] | None) -> list[str]:
    """A single path filter supplied by the caller, normalised to a relative path."""
    raw = (payload or {}).get("path")
    return [str(raw).strip().lstrip("./")] if raw else []


async def _guard_paths(payload: dict[str, Any] | None, paths: list[str]) -> list[str]:
    """Refuse the request outright if the caller asked for a path the policy forbids."""
    if not paths:
        return paths
    ids = _ids(payload)
    async with async_session_factory() as db:
        await bind_tenant(db, ids["tenant_id"])
        try:
            policy = await get_repository_policy(
                db, tenant_id=ids["tenant_id"], repository_id=ids["repository_id"]
            )
        except RepositoryNotFound as exc:
            raise _ToolFailure("REPOSITORY_NOT_FOUND", str(exc)) from exc
    for candidate in paths:
        if not is_path_allowed(candidate, policy):
            raise _ToolFailure(
                "PATH_NOT_ALLOWED",
                f"'{candidate}' is outside this repository's allowed_paths or matches a forbidden pattern",
            )
    return paths


async def _allowed_filter(payload: dict[str, Any] | None, paths: list[str]) -> set[str]:
    """The set of paths in `paths` the repository policy permits."""
    ids = _ids(payload)
    async with async_session_factory() as db:
        await bind_tenant(db, ids["tenant_id"])
        try:
            policy = await get_repository_policy(
                db, tenant_id=ids["tenant_id"], repository_id=ids["repository_id"]
            )
        except RepositoryNotFound as exc:
            raise _ToolFailure("REPOSITORY_NOT_FOUND", str(exc)) from exc
    return {p for p in paths if is_path_allowed(p, policy)}


def _denial(exc: _ToolFailure) -> dict[str, Any]:
    return {"success": False, "code": exc.code, "error": exc.detail}


# ---- the ten capabilities -------------------------------------------------------


async def read_repository(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """Open the repository: create or reuse the mission's real isolated workspace."""
    try:
        facts, path = await _prepare(payload, "repository.read")
        head, _, _ = await _git_async(["rev-parse", "--short", "HEAD"], path, check=False)
        branch, _, _ = await _git_async(["rev-parse", "--abbrev-ref", "HEAD"], path, check=False)
        return {
            "success": True,
            "capability": "repository.read",
            **facts,
            "workspace_path": path,
            "head": head.strip() or None,
            "branch": branch.strip() or None,
        }
    except _ToolFailure as exc:
        return _denial(exc)


async def list_repository_files(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """Tracked files, filtered by the repository's path policy."""
    try:
        prefix = ((payload or {}).get("prefix") or "").strip().lstrip("./")
        limit = min(int((payload or {}).get("limit") or _MAX_RESULTS), 5000)
        facts, path = await _prepare(payload, "repository.list_files")
        stdout, _, _ = await _git_async(["ls-files"], path)
        tracked = [line for line in stdout.splitlines() if line]
        in_scope = [f for f in tracked if f.startswith(prefix)] if prefix else tracked
        allowed = await _allowed_filter(payload, in_scope)
        permitted = [f for f in in_scope if f in allowed]
        return {
            "success": True,
            "capability": "repository.list_files",
            "repository_id": facts["repository_id"],
            "total_tracked": len(tracked),
            "returned": len(permitted[:limit]),
            "in_scope": len(in_scope),
            "filtered_out_by_policy": len(in_scope) - len(permitted),
            "truncated": len(permitted) > limit,
            "files": permitted[:limit],
        }
    except _ToolFailure as exc:
        return _denial(exc)


async def read_repository_file(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """One tracked file's contents at a ref (default HEAD), policy-checked."""
    try:
        paths = _policy_paths(payload)
        if not paths:
            raise _ToolFailure("MISSING_ARGUMENT", "path is required")
        target = paths[0]
        ref = str((payload or {}).get("ref") or "HEAD")
        await _guard_paths(payload, paths)
        facts, path = await _prepare(payload, "repository.read_file")
        stdout, _, code = await _git_async(["show", f"{ref}:{target}"], path, check=False)
        if code != 0:
            raise _ToolFailure(
                "FILE_NOT_FOUND_AT_REF",
                f"'{target}' could not be read at {ref} (untracked, or does not exist at that ref)",
            )
        encoded = stdout.encode("utf-8", errors="replace")
        truncated = len(encoded) > _MAX_FILE_BYTES
        content = encoded[:_MAX_FILE_BYTES].decode("utf-8", errors="replace")
        return {
            "success": True,
            "capability": "repository.read_file",
            "repository_id": facts["repository_id"],
            "path": target,
            "ref": ref,
            "bytes": len(encoded),
            "truncated": truncated,
            "content": content,
        }
    except _ToolFailure as exc:
        return _denial(exc)


async def search_repository(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """Real `git grep` over the workspace, policy-filtered and bounded."""
    try:
        query = str((payload or {}).get("query") or "").strip()
        if not query:
            raise _ToolFailure("MISSING_ARGUMENT", "query is required")
        limit = min(int((payload or {}).get("limit") or 100), _MAX_RESULTS)
        paths = _policy_paths(payload)
        await _guard_paths(payload, paths)
        facts, path = await _prepare(payload, "repository.search", search=True)
        args = ["grep", "-n", "-I", "--no-color", "-e", query]
        if paths:
            args += ["--", paths[0]]
        stdout, _, code = await _git_async(args, path, check=False)
        if code not in (0, 1):  # 1 is "no matches", not a failure
            raise _ToolFailure("SEARCH_FAILED", "git grep returned an error")
        raw = [line for line in stdout.splitlines() if line]
        parsed = []
        for line in raw:
            file_path, _, rest = line.partition(":")
            line_no, _, text = rest.partition(":")
            parsed.append({"path": file_path, "line": line_no, "text": text[:400]})
        unique_paths = sorted({m["path"] for m in parsed})
        allowed = await _allowed_filter(payload, unique_paths)
        permitted = [m for m in parsed if m["path"] in allowed]
        return {
            "success": True,
            "capability": "repository.search",
            "repository_id": facts["repository_id"],
            "query": query,
            "matches": len(permitted),
            "filtered_out_by_policy": len(parsed) - len(permitted),
            "truncated": len(permitted) > limit,
            "results": permitted[:limit],
        }
    except _ToolFailure as exc:
        return _denial(exc)


async def list_repository_branches(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """Real local and remote branches with their tip commits."""
    try:
        limit = min(int((payload or {}).get("limit") or 200), 2000)
        facts, path = await _prepare(payload, "repository.list_branches")
        stdout, _, _ = await _git_async(
            ["branch", "--all", "--format=%(refname:short)%09%(objectname:short)%09%(committerdate:iso8601)"],
            path,
        )
        branches = []
        for line in stdout.splitlines():
            parts = line.split("\t")
            if len(parts) >= 3:
                branches.append({"name": parts[0], "commit": parts[1], "committed_at": parts[2]})
        return {
            "success": True,
            "capability": "repository.list_branches",
            "repository_id": facts["repository_id"],
            "default_branch": facts["default_branch"],
            "total": len(branches),
            "truncated": len(branches) > limit,
            "branches": branches[:limit],
        }
    except _ToolFailure as exc:
        return _denial(exc)


async def list_repository_tags(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """Real tags, newest first."""
    try:
        limit = min(int((payload or {}).get("limit") or 200), 2000)
        facts, path = await _prepare(payload, "repository.list_tags")
        stdout, _, _ = await _git_async(["tag", "--list", "--sort=-creatordate"], path)
        tags = [t for t in stdout.splitlines() if t]
        return {
            "success": True,
            "capability": "repository.list_tags",
            "repository_id": facts["repository_id"],
            "total": len(tags),
            "truncated": len(tags) > limit,
            "tags": tags[:limit],
        }
    except _ToolFailure as exc:
        return _denial(exc)


async def get_repository_metadata(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """Registered facts plus live git facts about the workspace head."""
    try:
        facts, path = await _prepare(payload, "repository.repository_metadata")
        head, _, _ = await _git_async(["rev-parse", "HEAD"], path, check=False)
        branch, _, _ = await _git_async(["rev-parse", "--abbrev-ref", "HEAD"], path, check=False)
        remote, _, _ = await _git_async(["config", "--get", "remote.origin.url"], path, check=False)
        count, _, _ = await _git_async(["rev-list", "--count", "HEAD"], path, check=False)
        last, _, _ = await _git_async(
            ["log", "-1", "--format=%H%x09%an%x09%cI"], path, check=False
        )
        last_parts = last.strip().split("\t") if last.strip() else []
        return {
            "success": True,
            "capability": "repository.repository_metadata",
            **facts,
            "head_commit": head.strip() or None,
            "current_branch": branch.strip() or None,
            "origin_url": remote.strip() or None,
            "commit_count": int(count.strip()) if count.strip().isdigit() else None,
            "last_commit": (
                {"sha": last_parts[0], "author": last_parts[1], "committed_at": last_parts[2]}
                if len(last_parts) == 3
                else None
            ),
        }
    except _ToolFailure as exc:
        return _denial(exc)


async def get_repository_history(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """Real commit history, optionally restricted to one policy-allowed path."""
    try:
        limit = min(int((payload or {}).get("limit") or 50), 500)
        paths = _policy_paths(payload)
        await _guard_paths(payload, paths)
        facts, path = await _prepare(payload, "repository.history")
        args = ["log", f"-{limit}", "--format=%H%x09%an%x09%cI%x09%s"]
        if paths:
            args += ["--", paths[0]]
        stdout, _, code = await _git_async(args, path, check=False)
        if code != 0:
            raise _ToolFailure("HISTORY_FAILED", "git log failed for this ref or path")
        commits = []
        for line in stdout.splitlines():
            parts = line.split("\t")
            if len(parts) >= 4:
                commits.append(
                    {"sha": parts[0], "author": parts[1], "committed_at": parts[2], "subject": parts[3][:200]}
                )
        return {
            "success": True,
            "capability": "repository.history",
            "repository_id": facts["repository_id"],
            "path": paths[0] if paths else None,
            "returned": len(commits),
            "commits": commits,
        }
    except _ToolFailure as exc:
        return _denial(exc)


async def diff_repository_refs(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """A real diff between two refs - the module that had no caller at all until now."""
    try:
        base = str((payload or {}).get("base") or (payload or {}).get("ref_a") or "").strip()
        if not base:
            raise _ToolFailure("MISSING_ARGUMENT", "base ref is required")
        head = str((payload or {}).get("head") or (payload or {}).get("ref_b") or "HEAD").strip()
        paths = _policy_paths(payload)
        await _guard_paths(payload, paths)
        facts, path = await _prepare(payload, "repository.diff_between_refs")
        try:
            result = await diff_between_refs(path, base, head, paths[0] if paths else None)
        except DiffOperationError as exc:
            raise _ToolFailure("DIFF_FAILED", str(exc)) from exc
        patch = result.patch or ""
        return {
            "success": True,
            "capability": "repository.diff_between_refs",
            "repository_id": facts["repository_id"],
            "ref_a": result.ref_a,
            "ref_b": result.ref_b,
            "path": result.path,
            "files_changed": result.stats.files_changed,
            "insertions": result.stats.insertions,
            "deletions": result.stats.deletions,
            "truncated": result.truncated,
            "patch": patch[:_MAX_PATCH_CHARS],
        }
    except _ToolFailure as exc:
        return _denial(exc)


async def list_repository_worktrees(payload: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
    """The real worktrees attached to this workspace's repository."""
    try:
        facts, path = await _prepare(payload, "repository.list_worktrees")
        worktrees = await list_worktrees(path)
        return {
            "success": True,
            "capability": "repository.list_worktrees",
            "repository_id": facts["repository_id"],
            "total": len(worktrees),
            "worktrees": [
                {
                    "path": w.path,
                    "head_commit": w.head_commit,
                    "branch": w.branch,
                    "detached": w.detached,
                    "locked": w.locked,
                    "prunable": w.prunable,
                }
                for w in worktrees
            ],
        }
    except _ToolFailure as exc:
        return _denial(exc)


# ---- registration ---------------------------------------------------------------

REPOSITORY_TOOL_HANDLERS: dict[str, Any] = {
    "read_repository": read_repository,
    "search_repository": search_repository,
    "list_repository_files": list_repository_files,
    "read_repository_file": read_repository_file,
    "list_repository_branches": list_repository_branches,
    "list_repository_tags": list_repository_tags,
    "get_repository_metadata": get_repository_metadata,
    "get_repository_history": get_repository_history,
    "diff_repository_refs": diff_repository_refs,
    "list_repository_worktrees": list_repository_worktrees,
}

_DESCRIPTIONS = {
    "read_repository": "Open a repository's isolated workspace so other repository capabilities can run.",
    "search_repository": "Search a repository's working tree with real git grep, filtered by its path policy.",
    "list_repository_files": "List a repository's tracked files, filtered by its path policy.",
    "read_repository_file": "Read one tracked file at a ref, filtered by the repository's path policy.",
    "list_repository_branches": "List a repository's local and remote branches.",
    "list_repository_tags": "List a repository's tags.",
    "get_repository_metadata": "Read registered and live git facts about a repository.",
    "get_repository_history": "Read a repository's commit history.",
    "diff_repository_refs": "Diff two refs in a repository.",
    "list_repository_worktrees": "List the git worktrees attached to a repository.",
}

for _name, _handler in REPOSITORY_TOOL_HANDLERS.items():
    # _attach_tool_specs() in tool_gateway reads these attributes off every registry function to
    # build the decide prompt and resolve a task's risk class. Every one of these tools only reads
    # from an isolated worktree, so they are genuinely low risk.
    _handler.risk_class = "low"  # type: ignore[attr-defined]
    _handler.description = _DESCRIPTIONS[_name]  # type: ignore[attr-defined]
