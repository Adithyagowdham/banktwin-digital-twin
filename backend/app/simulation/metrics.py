"""Metric aggregation and transparent rule-based operational risk."""

from collections.abc import Iterable

# Thresholds are isolated here so a later risk classifier can replace the rules.
RISK_THRESHOLDS = {
    "medium": {"queue_length": 3, "waiting_time": 5.0, "utilization": 70.0},
    "high": {"queue_length": 8, "waiting_time": 10.0, "utilization": 85.0},
    "critical": {"queue_length": 15, "waiting_time": 20.0, "utilization": 95.0},
}

RISK_LEVELS = ("LOW", "MEDIUM", "HIGH", "CRITICAL")


def average(values: Iterable[float]) -> float:
    """Return the arithmetic mean, or zero when there are no observations."""
    samples = list(values)
    return sum(samples) / len(samples) if samples else 0.0


def calculate_throughput(completed_transactions: int, simulation_duration: float) -> float:
    """Completed transactions per simulation time unit."""
    if simulation_duration <= 0:
        return 0.0
    return completed_transactions / simulation_duration


def calculate_utilization(total_busy_time: float, resource_count: int, simulation_duration: float) -> float:
    """Aggregate busy time as a percentage of resource-time available."""
    available_time = resource_count * simulation_duration
    if available_time <= 0:
        return 0.0
    return min(100.0, max(0.0, total_busy_time / available_time * 100.0))


def calculate_operational_risk(
    queue_length: int,
    average_waiting_time: float,
    counter_utilization: float,
    staff_utilization: float,
) -> str:
    """Assign the highest level whose deterministic threshold is exceeded."""
    observations = {
        "queue_length": queue_length,
        "waiting_time": average_waiting_time,
        "utilization": max(counter_utilization, staff_utilization),
    }
    for level in ("critical", "high", "medium"):
        thresholds = RISK_THRESHOLDS[level]
        if any(observations[key] >= threshold for key, threshold in thresholds.items()):
            return level.upper()
    return "LOW"
