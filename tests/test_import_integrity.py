"""Every intra-package import must resolve to a real module.

This exists because deleting billing/models.py and billing/service.py looked safe: main.py is
the only module that mentions `gds_api.billing`, and billing/router.py reaches its helpers with
`from .service import ...` and `from .models import Subscription`. A grep for "billing.service"
missed the relative form, the module was deleted, and main.py's `except ImportError` swallowed
the failure - so all seven billing routes silently disappeared from a deployment that reported
healthy.

The test needs no database, no env and no imports from gds_api: it parses the source tree and
resolves relative and absolute intra-package imports statically, so it fails in CI the moment a
file someone still imports is removed.
"""
from __future__ import annotations

import ast
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "apps/api/gds_api"


def module_files() -> dict[str, Path]:
    files: dict[str, Path] = {}
    for path in ROOT.rglob("*.py"):
        parts = list(path.relative_to(ROOT).with_suffix("").parts)
        if parts[-1] == "__init__":
            parts = parts[:-1]
        files[".".join(["gds_api"] + parts)] = path
    return files


class ImportIntegrityTests(unittest.TestCase):
    def test_every_intra_package_import_resolves(self):
        files = module_files()
        missing: list[str] = []
        for mod, path in files.items():
            try:
                tree = ast.parse(path.read_text())
            except SyntaxError as exc:  # a file that cannot parse cannot import either
                missing.append(f"{path}: SyntaxError {exc}")
                continue
            for node in ast.walk(tree):
                if isinstance(node, ast.ImportFrom):
                    if node.level == 0:
                        base = node.module or ""
                        candidates = [base] + [f"{base}.{a.name}" for a in node.names] if base else []
                        for cand in candidates:
                            if cand.startswith("gds_api") and cand not in files:
                                # a package attribute (e.g. `from gds_api import evidence`) is
                                # fine only if the submodule or the package itself exists
                                if cand.rsplit(".", 1)[0] not in files:
                                    missing.append(f"{mod}: from {cand} import ...")
                    else:
                        pkg = mod if path.name == "__init__.py" else mod.rsplit(".", 1)[0]
                        bits = pkg.split(".")
                        up = node.level - 1
                        if up:
                            bits = bits[: len(bits) - up] if up < len(bits) else bits
                        base = ".".join(bits)
                        target = f"{base}.{node.module}" if node.module else base
                        for cand in [target] + [f"{target}.{a.name}" for a in node.names]:
                            if cand in files or cand.rsplit(".", 1)[0] in files:
                                continue
                            missing.append(f"{mod}: from {'.' * node.level}{node.module or ''} import ... -> {cand}")
                elif isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name.startswith("gds_api") and alias.name not in files:
                            missing.append(f"{mod}: import {alias.name}")
        self.assertEqual(missing, [], "unresolved intra-package imports:\n" + "\n".join(sorted(set(missing))))

    def test_router_modules_referenced_by_main_exist(self):
        main_src = (ROOT / "main.py").read_text()
        files = module_files()
        tree = ast.parse(main_src)
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                if node.module.startswith("gds_api") and node.module not in files:
                    self.fail(f"main.py imports {node.module}, which does not exist")


if __name__ == "__main__":
    unittest.main()
