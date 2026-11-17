"""Response-model guards for cloud job output.

Found live on 17 Nov 2026: POST /cloud/discovery-jobs returned 500 for a discovery that had actually
succeeded (144 assets). CloudDiscoveryJobOut declares errors/warnings/discovery_categories/regions as
required lists while the columns are nullable Text/JSON, so a NULL serialised to None and failed
validation - the caller was told the start failed when the work was done.
"""
from __future__ import annotations


def test_job_serialiser_treats_null_list_columns_as_empty():
    from gds_api.cloud_api import _as_list

    assert _as_list(None) == []
    assert _as_list(["a"]) == ["a"]
    assert _as_list("not-a-list") == []
    assert _as_list(()) == []


def test_job_serialiser_actually_uses_the_coercion():
    import inspect

    from gds_api.cloud_api import _discovery_job_to_out

    source = inspect.getsource(_discovery_job_to_out)
    for field in ("errors", "warnings", "discovery_categories", "regions"):
        assert f"{field}=_as_list(job.{field})" in source, f"{field} is not coerced"
