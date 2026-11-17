"""Repository hygiene: the patch debris that accumulated must not come back.

Every item this test forbids was found in the tree on 17 November 2026 and had to be removed by
hand: committed bytecode, .bak copies of modules, a patches/ archive of hotfix files, two
tarballs of "gap fixes", and one-off fix_*/phase5_* scripts whose only purpose was to apply a
change that should have been made in the source. None of them was referenced by anything, and
each one made the repo look like it had more moving parts than it does.
"""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", "venv", ".venv", "node_modules", "__pycache__", ".agents",
             "incoming_files", "dist", "build", ".pytest_cache"}

FORBIDDEN_SUFFIXES = (".bak", ".orig", ".rej", ".pyc", ".pyo")
FORBIDDEN_NAMES = ("mission_state.json.bak",)
FORBIDDEN_DIR_NAMES = {"patches"}
ONE_OFF_SCRIPT = ("fix_", "phase5_", "diag_", "debug_")


def walk():
    for path in ROOT.rglob("*"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        yield path


class RepositoryHygieneTests(unittest.TestCase):
    def test_no_backup_or_compiled_artifacts(self):
        offenders = [str(p.relative_to(ROOT)) for p in walk()
                     if p.is_file() and (p.name.endswith(FORBIDDEN_SUFFIXES)
                                         or p.name in FORBIDDEN_NAMES)]
        self.assertEqual(offenders, [], f"backup/compiled artefacts present: {offenders[:10]}")

    def test_no_patch_archive_directory(self):
        offenders = [str(p.relative_to(ROOT)) for p in walk()
                     if p.is_dir() and p.name in FORBIDDEN_DIR_NAMES]
        self.assertEqual(offenders, [], f"patch archive present: {offenders}")

    def test_no_one_off_fix_scripts(self):
        api = ROOT / "apps/api"
        offenders = [p.name for p in api.glob("*.py")
                     if p.name.startswith(ONE_OFF_SCRIPT)]
        self.assertEqual(offenders, [], f"one-off scripts present: {offenders}")

    def test_no_patch_tarballs(self):
        offenders = [str(p.relative_to(ROOT)) for p in walk()
                     if p.is_file() and p.suffixes[-2:] in ([".tar", ".gz"], [".tar", ".xz"])]
        self.assertEqual(offenders, [], f"patch archives present: {offenders}")


if __name__ == "__main__":
    unittest.main()
