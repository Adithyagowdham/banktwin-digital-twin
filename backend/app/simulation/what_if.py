"""Independent stochastic scenario runs and transparent prototype scoring."""

from __future__ import annotations

from collections import Counter
from statistics import fmean
from typing import Any

from pydantic import ValidationError

from app.schemas import SimulationConfig
from app.simulation.engine import run_simulation

RISK_PENALTIES = {"LOW": 0.0, "MEDIUM": 0.25, "HIGH": 0.6, "CRITICAL": 1.0}
UTILIZATION_STRESS_THRESHOLD = 90.0
RISK_ORDER = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
AGGREGATE_METRICS = (
    "customers_arrived",
    "customers_served",
    "average_waiting_time",
    "queue_length",
    "throughput",
    "counter_utilization",
    "staff_utilization",
    "average_service_time",
)


def aggregate_runs(runs: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    """Calculate actual mean/minimum/maximum from returned SimPy run metrics."""
    return {
        metric: {
            "mean": round(fmean(float(run[metric]) for run in runs), 3),
            "min": round(min(float(run[metric]) for run in runs), 3),
            "max": round(max(float(run[metric]) for run in runs), 3),
        }
        for metric in AGGREGATE_METRICS
    }


def utilization_penalty(utilization: float, threshold: float = UTILIZATION_STRESS_THRESHOLD) -> float:
    """Prototype stress penalty is 0 through 90%, then linear to 1 at 100%."""
    return utilization_penalty_at_threshold(utilization, threshold)


def utilization_penalty_at_threshold(utilization: float, threshold: float) -> float:
    """Prototype stress penalty is zero through threshold, then linear to 1 at 100%."""
    return min(1.0, max(0.0, (utilization - threshold) / (100.0 - threshold)))


def score_scenario(
    waiting_time: float,
    queue_length: float,
    risk: str,
    counter_utilization: float,
    staff_utilization: float,
    max_waiting_time: float,
    max_queue_length: float,
    risk_penalties: dict[str, float] | None = None,
    utilization_threshold: float = UTILIZATION_STRESS_THRESHOLD,
) -> dict[str, float]:
    """Score = normalized wait + normalized queue + risk + two resource-stress penalties."""
    waiting_component = waiting_time / max_waiting_time if max_waiting_time > 0 else 0.0
    queue_component = queue_length / max_queue_length if max_queue_length > 0 else 0.0
    risk_component = (risk_penalties or RISK_PENALTIES)[risk]
    counter_component = utilization_penalty(counter_utilization, utilization_threshold)
    staff_component = utilization_penalty(staff_utilization, utilization_threshold)
    return {
        "waiting_time": round(waiting_component, 6),
        "queue_length": round(queue_component, 6),
        "risk": risk_component,
        "counter_utilization": round(counter_component, 6),
        "staff_utilization": round(staff_component, 6),
        "total": round(waiting_component + queue_component + risk_component + counter_component + staff_component, 6),
    }


def recommend_configuration(
    scenarios: list[dict[str, Any]],
    risk_penalties: dict[str, float] | None = None,
    utilization_threshold: float = UTILIZATION_STRESS_THRESHOLD,
) -> dict[str, Any] | None:
    """Rank successful scenarios using their observed aggregate SimPy results."""
    successful = [scenario for scenario in scenarios if scenario.get("status") == "SUCCESS"]
    if not successful:
        return None

    max_wait = max(scenario["aggregate"]["average_waiting_time"]["mean"] for scenario in successful)
    max_queue = max(scenario["aggregate"]["queue_length"]["mean"] for scenario in successful)
    scored = []
    for scenario in successful:
        aggregate = scenario["aggregate"]
        score = score_scenario(
            aggregate["average_waiting_time"]["mean"],
            aggregate["queue_length"]["mean"],
            scenario["operational_risk"],
            aggregate["counter_utilization"]["mean"],
            aggregate["staff_utilization"]["mean"],
            max_wait,
            max_queue,
            risk_penalties,
            utilization_threshold,
        )
        scored.append((score["total"], scenario, score))

    scored.sort(key=lambda item: (item[0], item[1]["name"]))
    _, selected, selected_score = scored[0]
    explanations = [f"Lowest prototype decision score ({selected_score['total']:.3f}) among successful scenarios."]
    if len(scored) > 1:
        _, alternative, _ = scored[1]
        compared = alternative["aggregate"]
        actual = selected["aggregate"]
        for metric, label, relation in (
            ("average_waiting_time", "Average waiting time", "lower"),
            ("queue_length", "Queue length", "lower"),
            ("throughput", "Throughput", "higher"),
        ):
            chosen_value = actual[metric]["mean"]
            alternative_value = compared[metric]["mean"]
            if (relation == "lower" and chosen_value < alternative_value) or (relation == "higher" and chosen_value > alternative_value):
                explanations.append(f"{label} was {relation} than {alternative['name']} ({chosen_value:.3f} vs {alternative_value:.3f}).")
        if actual["counter_utilization"]["mean"] <= utilization_threshold and actual["staff_utilization"]["mean"] <= utilization_threshold:
            explanations.append(f"Mean counter and staff utilization stayed at or below the {utilization_threshold:.0f}% prototype threshold.")
        if RISK_ORDER[selected["operational_risk"]] < RISK_ORDER[alternative["operational_risk"]]:
            explanations.append(f"Observed risk was lower than {alternative['name']} ({selected['operational_risk']} vs {alternative['operational_risk']}).")
    else:
        explanations.append("Only one successful scenario was available for comparison.")

    return {
        "scenario": selected["name"],
        "score": selected_score["total"],
        "components": selected_score,
        "compared_with": scored[1][1]["name"] if len(scored) > 1 else None,
        "explanation": explanations,
    }


def run_what_if(
    scenarios: list[dict[str, Any]],
    number_of_runs: int = 1,
    base_seed: int | None = None,
    risk_penalties: dict[str, float] | None = None,
    utilization_threshold: float = UTILIZATION_STRESS_THRESHOLD,
) -> dict[str, Any]:
    effective_risk_penalties = dict(RISK_PENALTIES)
    if risk_penalties is not None:
        if set(risk_penalties) != set(RISK_PENALTIES) or any(value < 0 for value in risk_penalties.values()):
            raise ValueError("Risk penalties must define non-negative values for LOW, MEDIUM, HIGH, and CRITICAL.")
        effective_risk_penalties = {risk: float(risk_penalties[risk]) for risk in RISK_PENALTIES}
    if not 0 < utilization_threshold < 100:
        raise ValueError("Utilization stress threshold must be greater than 0 and less than 100.")

    results: list[dict[str, Any]] = []
    for scenario in scenarios:
        name = str(scenario.get("name", "Custom"))
        try:
            config = SimulationConfig.model_validate(scenario.get("config", {}))
            scenario_seed = base_seed if base_seed is not None else config.random_seed
            run_results: list[dict[str, Any]] = []
            for run_index in range(number_of_runs):
                seed = scenario_seed + run_index if scenario_seed is not None else None
                run_config = config.model_copy(update={"random_seed": seed})
                result = run_simulation(run_config)
                run_results.append({
                    "run": run_index + 1,
                    "seed": seed,
                    "customers_arrived": result["customers_arrived"],
                    "customers_served": result["customers_served"],
                    **{metric: result[metric] for metric in AGGREGATE_METRICS},
                    "operational_risk": result["operational_risk"],
                })
            risk_counts = Counter(run["operational_risk"] for run in run_results)
            worst_risk = max(risk_counts, key=lambda risk: RISK_ORDER[risk])
            results.append({
                "name": name,
                "status": "SUCCESS",
                "configuration": config.model_dump(),
                "run_count": len(run_results),
                "runs": run_results,
                "aggregate": aggregate_runs(run_results),
                "operational_risk": worst_risk,
                "risk_counts": {risk: int(risk_counts.get(risk, 0)) for risk in RISK_PENALTIES},
            })
        except (ValidationError, ValueError) as exc:
            results.append({"name": name, "status": "FAILED", "error": str(exc), "run_count": 0, "runs": []})
        except Exception as exc:  # Keep other scenarios when an engine run fails.
            results.append({"name": name, "status": "FAILED", "error": str(exc), "run_count": 0, "runs": []})

    return {
        "number_of_runs": number_of_runs,
        "base_seed": base_seed,
        "scenarios": results,
        "recommendation": recommend_configuration(results, effective_risk_penalties, utilization_threshold),
        "scoring": {
            "label": "PROTOTYPE DECISION SCORE",
            "formula": "normalized mean waiting time + normalized mean queue length + risk penalty + counter utilization penalty + staff utilization penalty",
            "risk_penalties": effective_risk_penalties,
            "utilization_threshold": utilization_threshold,
            "note": "Prototype weights and threshold are configurable heuristics, not scientifically validated standards.",
        },
    }
