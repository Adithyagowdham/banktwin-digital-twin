"""Evaluate resource configurations through the existing SimPy engine."""

from __future__ import annotations

from collections import Counter
from statistics import fmean
from typing import Any

from app.schemas import SimulationConfig
from app.simulation.engine import run_simulation

METRICS = (
    "average_waiting_time",
    "queue_length",
    "throughput",
    "counter_utilization",
    "staff_utilization",
    "average_service_time",
    "customers_arrived",
    "customers_served",
)
RISK_ORDER = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}


def aggregate_simulation_runs(runs: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    return {
        metric: {
            "mean": round(fmean(float(run[metric]) for run in runs), 3),
            "min": round(min(float(run[metric]) for run in runs), 3),
            "max": round(max(float(run[metric]) for run in runs), 3),
        }
        for metric in METRICS
    }


def evaluate_configuration(
    configuration: dict[str, Any],
    runs: int,
    base_seed: int,
) -> dict[str, Any]:
    validated = SimulationConfig.model_validate(configuration)
    raw_runs = []
    for run_index in range(runs):
        seed = base_seed + run_index
        result = run_simulation(validated.model_copy(update={"random_seed": seed}))
        raw_runs.append({
            "run": run_index + 1,
            "seed": seed,
            **{metric: result[metric] for metric in METRICS},
            "operational_risk": result["operational_risk"],
        })

    risk_counts = Counter(run["operational_risk"] for run in raw_runs)
    worst_risk = max(risk_counts, key=lambda risk: RISK_ORDER[risk])
    return {
        "status": "SUCCESS",
        "configuration": validated.model_dump(exclude={"random_seed"}),
        "run_count": len(raw_runs),
        "runs": raw_runs,
        "aggregate": aggregate_simulation_runs(raw_runs),
        "operational_risk": worst_risk,
        "risk_counts": {risk: int(risk_counts.get(risk, 0)) for risk in RISK_ORDER},
    }
