"""Database identity parsing. Legacy bridge IDs belong to a separate store."""
import uuid


def parse_database_uuid(value: object, *, record_type: str) -> uuid.UUID:
    """Parse an existing database ID; never mint, truncate or map an external ID.

    Error messages intentionally omit caller values because workflow failure
    histories may be visible to operators beyond the originating tenant.
    """
    if isinstance(value, uuid.UUID):
        return value
    if isinstance(value, str):
        try:
            return uuid.UUID(value)
        except ValueError:
            pass
    raise ValueError(f"A database UUID is required for {record_type}") from None
