"""Exhaustive counter/staff search over isolated SimPy evaluations."""

from __future__ import annotations

from itertools import product
from typing import Any
from uuid import uuid4

from pydantic import ValidationError

from app.schemas import OptimizationRunRequest
from app.optimization.engine import evaluate_configuration
from app.optimization.objective import (
    DEFAULT_RESOURCE_PENALTY_WEIGHT,
    DEFAULT_RISK_WEIGHTS,
    DEFAULT_UTILIZATION_THRESHOLD,
    calculate_objective_components,
    find_pareto_frontier,
)


def generate_search_space(request: OptimizationRunRequest) -> list[dict[str, Any]]:
    shared = {
        "customers": request.customers,
        "arrival_rate": request.arrival_rate,
        "avg_service_time": request.avg_service_time,
        "duration": request.duration,
        "transaction_type": request.transaction_type,
        "priority": request.priority,
    }
    return [
        {**shared, "counters": counters, "staff": staff, "random_seed": request.base_seed}
        for counters, staff in product(
            range(request.min_counters, request.max_counters + 1),
            range(request.min_staff, request.max_staff + 1),
        )
    ]


def _percentage_improvement(baseline: float, recommended: float) -> float | None:
    if baseline <= 0:
        return None
    return round((baseline - recommended) / baseline * 100.0, 3)


def _recommendation_reasons(
    best: dict[str, Any],
    comparator: dict[str, Any] | None,
    utilization_threshold: float,
    resource_penalty_weight: float,
) -> list[str]:
    reasons = [f"Lowest objective score ({best['objective_score']:.3f}) among successfully evaluated configurations."]
    actual = best["aggregate"]
    if comparator is not None:
        other = comparator["aggregate"]
        for metric, label in (("average_waiting_time", "Mean waiting time"), ("queue_length", "Mean queue")):
            value = actual[metric]["mean"]
            compared = other[metric]["mean"]
            if value < compared:
                reasons.append(f"{label} was lower than {comparator['configuration']['counters']}C / {comparator['configuration']['staff']}S ({value:.3f} vs {compared:.3f}).")
        throughput = actual["throughput"]["mean"]
        comparator_throughput = other["throughput"]["mean"]
        if throughput > comparator_throughput:
            reasons.append(f"Mean throughput was higher ({throughput:.3f} vs {comparator_throughput:.3f}).")
        resources = best["configuration"]["counters"] + best["configuration"]["staff"]
        other_resources = comparator["configuration"]["counters"] + comparator["configuration"]["staff"]
        if resources < other_resources:
            reasons.append(f"Used fewer total resources ({resources} vs {other_resources}).")
    if actual["counter_utilization"]["mean"] <= utilization_threshold and actual["staff_utilization"]["mean"] <= utilization_threshold:
        reasons.append(f"Mean counter and staff utilization stayed at or below the {utilization_threshold:.1f}% prototype threshold.")
    reasons.append(f"The resource-waste term is {resource_penalty_weight:g} × total resources / maximum candidate resources; it is a small prototype preference, not an industry standard.")
    return reasons


def _baseline_comparison(baseline: dict[str, Any] | None, best: dict[str, Any] | None) -> dict[str, Any] | None:
    if baseline is None or baseline.get("status") != "SUCCESS" or best is None:
        return None
    base_metrics = baseline["aggregate"]
    best_metrics = best["aggregate"]
    base_config = baseline["configuration"]
    best_config = best["configuration"]
    base_resources = base_config["counters"] + base_config["staff"]
    best_resources = best_config["counters"] + best_config["staff"]
    return {
        "waiting_improvement_percent": _percentage_improvement(base_metrics["average_waiting_time"]["mean"], best_metrics["average_waiting_time"]["mean"]),
        "queue_improvement_percent": _percentage_improvement(base_metrics["queue_length"]["mean"], best_metrics["queue_length"]["mean"]),
        "throughput_difference": round(best_metrics["throughput"]["mean"] - base_metrics["throughput"]["mean"], 3),
        "counter_utilization_difference": round(best_metrics["counter_utilization"]["mean"] - base_metrics["counter_utilization"]["mean"], 3),
        "staff_utilization_difference": round(best_metrics["staff_utilization"]["mean"] - base_metrics["staff_utilization"]["mean"], 3),
        "risk_change": {"baseline": baseline["operational_risk"], "recommended": best["operational_risk"]},
        "resource_difference": best_resources - base_resources,
    }


def run_optimization(request: OptimizationRunRequest) -> dict[str, Any]:
    configurations = generate_search_space(request)
    results: list[dict[str, Any]] = []
    for configuration in configurations:
        try:
            results.append(evaluate_configuration(configuration, request.runs, request.base_seed))
        except (ValidationError, ValueError) as exc:
            results.append({"status": "FAILED", "configuration": {key: value for key, value in configuration.items() if key != "random_seed"}, "error": str(exc), "run_count": 0, "runs": []})
        except Exception as exc:
            results.append({"status": "FAILED", "configuration": {key: value for key, value in configuration.items() if key != "random_seed"}, "error": str(exc), "run_count": 0, "runs": []})

    successful = [result for result in results if result["status"] == "SUCCESS"]
    max_waiting = max((result["aggregate"]["average_waiting_time"]["mean"] for result in successful), default=0.0)
    max_queue = max((result["aggregate"]["queue_length"]["mean"] for result in successful), default=0.0)
    max_resources = request.max_counters + request.max_staff
    for result in successful:
        components = calculate_objective_components(
            result,
            max_waiting,
            max_queue,
            max_resources,
            request.risk_weights,
            request.utilization_threshold,
            request.resource_penalty_weight,
        )
        result["objective_components"] = components
        result["objective_score"] = components["total"]

    successful.sort(key=lambda result: (result["objective_score"], result["configuration"]["counters"] + result["configuration"]["staff"], result["configuration"]["counters"], result["configuration"]["staff"]))
    for rank, result in enumerate(successful, start=1):
        result["rank"] = rank
    failed = [result for result in results if result["status"] == "FAILED"]
    for result in failed:
        result["rank"] = None
        result["objective_score"] = None
    ordered_results = [*successful, *failed]
    best = successful[0] if successful else None

    baseline_result = None
    if request.baseline is not None:
        try:
            baseline_result = evaluate_configuration(request.baseline.model_dump(), request.runs, request.base_seed)
        except (ValidationError, ValueError) as exc:
            baseline_result = {"status": "FAILED", "error": str(exc)}
        except Exception as exc:
            baseline_result = {"status": "FAILED", "error": str(exc)}

    comparator = successful[1] if len(successful) > 1 else None
    reasons = _recommendation_reasons(best, comparator, request.utilization_threshold, request.resource_penalty_weight) if best else []
    recommendation = None
    best_configuration = None
    if best:
        config = best["configuration"]
        aggregate = best["aggregate"]
        best_configuration = {
            "counters": config["counters"],
            "staff": config["staff"],
            "resources": config["counters"] + config["staff"],
            "objective_score": best["objective_score"],
            "average_waiting_time": aggregate["average_waiting_time"]["mean"],
            "queue_length": aggregate["queue_length"]["mean"],
            "throughput": aggregate["throughput"]["mean"],
            "counter_utilization": aggregate["counter_utilization"]["mean"],
            "staff_utilization": aggregate["staff_utilization"]["mean"],
            "operational_risk": best["operational_risk"],
        }
        recommendation = {
            "title": f"{config['counters']}C / {config['staff']}S",
            "objective_score": best["objective_score"],
            "explanation": reasons,
        }

    pareto = find_pareto_frontier(successful)
    return {
        "optimization_id": uuid4().hex[:12],
        "configurations_tested": len(ordered_results),
        "configurations_successful": len(successful),
        "configurations_failed": len(failed),
        "search_space_size": len(configurations),
        "number_of_runs": request.runs,
        "base_seed": request.base_seed,
        "best_configuration": best_configuration,
        "objective_score": best["objective_score"] if best else None,
        "recommendation": recommendation,
        "results": ordered_results,
        "pareto_frontier": [
            {
                "counters": result["configuration"]["counters"],
                "staff": result["configuration"]["staff"],
                "resources": result["configuration"]["counters"] + result["configuration"]["staff"],
                "average_waiting_time": result["aggregate"]["average_waiting_time"]["mean"],
                "objective_score": result["objective_score"],
                "rank": result["rank"],
            }
            for result in pareto
        ],
        "baseline": baseline_result,
        "baseline_comparison": _baseline_comparison(baseline_result, best),
        "objective_methodology": {
            "formula": "normalized mean waiting time + normalized mean queue length + risk weight + counter overutilization penalty + staff overutilization penalty + resource penalty",
            "normalization": "Waiting and queue means are divided by the largest successful candidate mean; zero maxima contribute zero.",
            "risk_weights": request.risk_weights,
            "utilization_threshold": request.utilization_threshold,
            "resource_penalty_weight": request.resource_penalty_weight,
            "resource_penalty_formula": "resource penalty weight × (counters + staff) / maximum possible resources in this search",
            "note": "Prototype weights and thresholds require institutional calibration and are not validated industry standards.",
        },
    }
