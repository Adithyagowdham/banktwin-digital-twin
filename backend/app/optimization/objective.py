"""Transparent prototype objective and two-dimensional Pareto analysis."""

from __future__ import annotations

from typing import Any

DEFAULT_RISK_WEIGHTS = {"LOW": 0.0, "MEDIUM": 0.25, "HIGH": 0.75, "CRITICAL": 1.5}
DEFAULT_UTILIZATION_THRESHOLD = 90.0
DEFAULT_RESOURCE_PENALTY_WEIGHT = 0.15
RISK_ORDER = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}


def utilization_penalty(utilization: float, threshold: float = DEFAULT_UTILIZATION_THRESHOLD) -> float:
    """Return a linear 0..1 stress penalty above the configured threshold."""
    return min(1.0, max(0.0, (utilization - threshold) / (100.0 - threshold)))


def calculate_objective_components(
    result: dict[str, Any],
    max_waiting_time: float,
    max_queue_length: float,
    max_resources: int,
    risk_weights: dict[str, float] | None = None,
    utilization_threshold: float = DEFAULT_UTILIZATION_THRESHOLD,
    resource_penalty_weight: float = DEFAULT_RESOURCE_PENALTY_WEIGHT,
) -> dict[str, float]:
    """Score = normalized wait + normalized queue + risk + utilization stress + small resource cost."""
    weights = risk_weights or DEFAULT_RISK_WEIGHTS
    aggregate = result["aggregate"]
    waiting_score = aggregate["average_waiting_time"]["mean"] / max_waiting_time if max_waiting_time > 0 else 0.0
    queue_score = aggregate["queue_length"]["mean"] / max_queue_length if max_queue_length > 0 else 0.0
    risk_score = weights[result["operational_risk"]]
    counter_score = utilization_penalty(aggregate["counter_utilization"]["mean"], utilization_threshold)
    staff_score = utilization_penalty(aggregate["staff_utilization"]["mean"], utilization_threshold)
    resource_count = int(result["configuration"]["counters"]) + int(result["configuration"]["staff"])
    resource_score = resource_penalty_weight * resource_count / max_resources if max_resources > 0 else 0.0
    return {
        "waiting_time": round(waiting_score, 6),
        "queue_length": round(queue_score, 6),
        "risk": float(risk_score),
        "counter_overutilization": round(counter_score, 6),
        "staff_overutilization": round(staff_score, 6),
        "resource_waste": round(resource_score, 6),
        "total": round(waiting_score + queue_score + risk_score + counter_score + staff_score + resource_score, 6),
    }


def find_pareto_frontier(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep results not dominated on mean waiting time and total resource count."""
    successful = [result for result in results if result.get("status") == "SUCCESS"]
    frontier = []
    for candidate in successful:
        candidate_resources = candidate["configuration"]["counters"] + candidate["configuration"]["staff"]
        candidate_wait = candidate["aggregate"]["average_waiting_time"]["mean"]
        dominated = any(
            other is not candidate
            and other["configuration"]["counters"] + other["configuration"]["staff"] <= candidate_resources
            and other["aggregate"]["average_waiting_time"]["mean"] <= candidate_wait
            and (
                other["configuration"]["counters"] + other["configuration"]["staff"] < candidate_resources
                or other["aggregate"]["average_waiting_time"]["mean"] < candidate_wait
            )
            for other in successful
        )
        if not dominated:
            frontier.append(candidate)
    return sorted(frontier, key=lambda result: (result["configuration"]["counters"] + result["configuration"]["staff"], result["aggregate"]["average_waiting_time"]["mean"]))
