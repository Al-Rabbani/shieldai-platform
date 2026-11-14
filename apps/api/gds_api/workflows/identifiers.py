"""Validate workflow identifiers without retrying permanently invalid input."""
import uuid
from temporalio.exceptions import ApplicationError


def parse_mission_id(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        raise ApplicationError(
            "Mission identifier must be a valid UUID",
            type="InvalidMissionId",
            non_retryable=True,
        ) from None
