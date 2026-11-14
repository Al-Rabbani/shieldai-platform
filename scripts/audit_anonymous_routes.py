
"""Read-only anonymous GET access audit for a GDS deployment."""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import urllib.error
import urllib.request

PUBLIC_GET_PATHS = frozenset({"/bridge/health", "/billing/plans"})

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--output")
    arguments = parser.parse_args()
    base = arguments.base_url.rstrip("/")
    with urllib.request.urlopen(base + "/openapi.json", timeout=10) as response:
        schema = json.load(response)
    paths = [path for path, methods in schema["paths"].items()
             if "get" in methods and "{" not in path and not path.startswith("/health")]
    def check(path):
        try:
            with urllib.request.urlopen(base + path, timeout=5) as response:
                return {"path": path, "status": response.status}
        except urllib.error.HTTPError as error:
            return {"path": path, "status": error.code}
        except Exception as error:
            return {"path": path, "error": type(error).__name__}
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(check, paths))
    unexpected = [row for row in results if row["path"] not in PUBLIC_GET_PATHS and row.get("status") not in (401, 403)]
    report = {
        "scope": "Anonymous GET routes without path parameters; no authenticated tenant or write-path certification",
        "checked": len(results),
        "statuses": dict(Counter(str(row.get("status", row.get("error"))) for row in results)),
        "public_allowlist": sorted(PUBLIC_GET_PATHS),
        "unexpected": unexpected,
        "results": results,
    }
    if arguments.output:
        Path(arguments.output).write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: value for key, value in report.items() if key != "results"}, indent=2))
    raise SystemExit(1 if unexpected else 0)

if __name__ == "__main__":
    main()
