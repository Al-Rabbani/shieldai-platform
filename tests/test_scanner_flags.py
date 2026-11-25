"""Scanner invocations must use flags the installed binaries actually accept.

Measured 25 Nov 2026: nuclei v3.11 removed -json (run exited 2, zero findings) and nikto has no json
format at all (csv/htm/msf+/nbe/txt/xml). Both made an assessment look clean when nothing had run.
"""
import pathlib

SRC = (pathlib.Path(__file__).resolve().parents[1] / "apps" / "api" / "gds_api"
       / "tool_gateway.py").read_text()


def test_nuclei_uses_the_jsonl_flag_not_the_removed_json_flag():
    assert '"-jsonl"' in SRC
    assert '"-u", target, "-json"]' not in SRC


def test_nikto_uses_a_real_format_and_parses_it():
    assert '"-Format", "xml"' in SRC
    assert '"-Format", "json"' not in SRC
    assert 'for item in root.iter("item")' in SRC


def test_an_unparsed_scan_is_never_reported_as_clean():
    assert 'result["parse_error"]' in SRC
