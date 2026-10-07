"""Tests for exhaustive resource optimization using the existing SimPy engine."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.optimization.engine import aggregate_simulation_runs, evaluate_configuration
from app.optimization.objective import (
    DEFAULT_RISK_WEIGHTS,
    calculate_objective_components,
    find_pareto_frontier,
    utilization_penalty,
)
from app.optimization.service import _baseline_comparison, generate_search_space, run_optimization
from app.schemas import OptimizationRunRequest, SimulationConfig
from app.simulation.engine import run_simulation

client = TestClient(app)
BASE_INPUT = {
    "customers": 40,
    "arrival_rate": 4,
    "avg_service_time": 4,
    "duration": 45,
    "transaction_type": "Deposit",
    "priority": "Normal",
    "min_counters": 2,
    "max_counters": 2,
    "min_staff": 2,
    "max_staff": 2,
    "runs": 1,
    "base_seed": 42,
}


def _candidate(name: str, resources: int, waiting: float, rank: int) -> dict[str, object]:
    return {
        "name": name,
        "status": "SUCCESS",
        "rank": rank,
        "configuration": {"counters": resources // 2, "staff": resources - resources // 2},
        "aggregate": {"average_waiting_time": {"mean": waiting}},
    }


def test_search_space_generates_every_counter_staff_pair() -> None:
    request = OptimizationRunRequest.model_validate({**BASE_INPUT, "max_counters": 4, "max_staff": 3})
    search_space = generate_search_space(request)
    assert len(search_space) == 6
    assert {(item["counters"], item["staff"]) for item in search_space} == {
        (2, 2), (2, 3), (3, 2), (3, 3), (4, 2), (4, 3),
    }


def test_optimization_request_validates_positive_parameters_and_ranges() -> None:
    with pytest.raises(ValidationError, match="min_counters must be less than or equal"):
        OptimizationRunRequest.model_validate({**BASE_INPUT, "min_counters": 4, "max_counters": 2})
    with pytest.raises(ValidationError, match="min_staff must be less than or equal"):
        OptimizationRunRequest.model_validate({**BASE_INPUT, "min_staff": 4, "max_staff": 2})
    with pytest.raises(ValidationError):
        OptimizationRunRequest.model_validate({**BASE_INPUT, "customers": 0})
    with pytest.raises(ValidationError):
        OptimizationRunRequest.model_validate({**BASE_INPUT, "runs": 0})


def test_single_configuration_evaluation_matches_direct_simpy_run() -> None:
    configuration = {"customers": 40, "arrival_rate": 4, "avg_service_time": 4, "duration": 45, "transaction_type": "Deposit", "priority": "Normal", "counters": 2, "staff": 2}
    evaluation = evaluate_configuration(configuration, runs=1, base_seed=42)
    expected = run_simulation(SimulationConfig.model_validate({**configuration, "random_seed": 42}))
    assert evaluation["status"] == "SUCCESS"
    assert evaluation["runs"][0]["average_waiting_time"] == expected["average_waiting_time"]
    assert evaluation["runs"][0]["queue_length"] == expected["queue_length"]
    assert evaluation["aggregate"]["throughput"]["mean"] == expected["throughput"]


def test_multi_configuration_evaluation_and_best_score_selection() -> None:
    request = OptimizationRunRequest.model_validate({**BASE_INPUT, "max_counters": 3, "max_staff": 3})
    result = run_optimization(request)
    assert result["configurations_tested"] == 4
    assert result["configurations_successful"] == 4
    assert result["best_configuration"] is not None
    successful = result["results"]
    assert [item["objective_score"] for item in successful] == sorted(item["objective_score"] for item in successful)
    assert result["best_configuration"]["objective_score"] == successful[0]["objective_score"]
    assert result["objective_score"] == successful[0]["objective_score"]


def test_multiple_runs_use_incrementing_seeds_and_aggregate_metrics() -> None:
    configuration = {"customers": 40, "arrival_rate": 4, "avg_service_time": 4, "duration": 45, "transaction_type": "Deposit", "priority": "Normal", "counters": 2, "staff": 2}
    evaluation = evaluate_configuration(configuration, runs=3, base_seed=42)
    assert [run["seed"] for run in evaluation["runs"]] == [42, 43, 44]
    assert evaluation["aggregate"]["average_waiting_time"]["min"] <= evaluation["aggregate"]["average_waiting_time"]["mean"] <= evaluation["aggregate"]["average_waiting_time"]["max"]


def test_mean_min_max_aggregation() -> None:
    runs = [
        {"average_waiting_time": 1, "queue_length": 2, "throughput": 3, "counter_utilization": 40, "staff_utilization": 50, "average_service_time": 4, "customers_arrived": 8, "customers_served": 6},
        {"average_waiting_time": 5, "queue_length": 6, "throughput": 7, "counter_utilization": 80, "staff_utilization": 70, "average_service_time": 8, "customers_arrived": 10, "customers_served": 9},
    ]
    aggregate = aggregate_simulation_runs(runs)
    assert aggregate["average_waiting_time"] == {"mean": 3.0, "min": 1.0, "max": 5.0}
    assert aggregate["queue_length"] == {"mean": 4.0, "min": 2.0, "max": 6.0}
    assert aggregate["throughput"] == {"mean": 5.0, "min": 3.0, "max": 7.0}


def test_objective_normalizes_wait_queue_and_adds_risk_utilization_resource_costs() -> None:
    candidate = {
        "configuration": {"counters": 2, "staff": 2},
        "operational_risk": "HIGH",
        "aggregate": {
            "average_waiting_time": {"mean": 5},
            "queue_length": {"mean": 4},
            "counter_utilization": {"mean": 95},
            "staff_utilization": {"mean": 90},
        },
    }
    score = calculate_objective_components(candidate, 10, 8, 8)
    assert score["waiting_time"] == 0.5
    assert score["queue_length"] == 0.5
    assert score["risk"] == DEFAULT_RISK_WEIGHTS["HIGH"] == 0.75
    assert score["counter_overutilization"] == 0.5
    assert score["staff_overutilization"] == 0
    assert score["resource_waste"] == pytest.approx(0.075)
    assert score["total"] == pytest.approx(2.325)


def test_risk_utilization_and_resource_penalties() -> None:
    assert DEFAULT_RISK_WEIGHTS == {"LOW": 0.0, "MEDIUM": 0.25, "HIGH": 0.75, "CRITICAL": 1.5}
    assert utilization_penalty(89) == 0
    assert utilization_penalty(90) == 0
    assert utilization_penalty(95) == 0.5
    assert utilization_penalty(100) == 1
    low_resources = {
        "configuration": {"counters": 2, "staff": 2},
        "operational_risk": "LOW",
        "aggregate": {"average_waiting_time": {"mean": 0}, "queue_length": {"mean": 0}, "counter_utilization": {"mean": 0}, "staff_utilization": {"mean": 0}},
    }
    high_resources = {**low_resources, "configuration": {"counters": 4, "staff": 4}}
    low_score = calculate_objective_components(low_resources, 0, 0, 8)
    high_score = calculate_objective_components(high_resources, 0, 0, 8)
    assert low_score["resource_waste"] < high_score["resource_waste"]


def test_pareto_frontier_excludes_dominated_configurations() -> None:
    results = [
        _candidate("A", 4, 10, 1),
        _candidate("B", 6, 8, 2),
        _candidate("C", 8, 12, 3),
        _candidate("D", 8, 6, 4),
    ]
    frontier = find_pareto_frontier(results)
    assert {result["name"] for result in frontier} == {"A", "B", "D"}


def test_baseline_comparison_uses_deltas_and_returns_na_for_zero_denominator() -> None:
    baseline = {
        "status": "SUCCESS",
        "configuration": {"counters": 4, "staff": 5},
        "operational_risk": "HIGH",
        "aggregate": {
            "average_waiting_time": {"mean": 10}, "queue_length": {"mean": 4}, "throughput": {"mean": 2},
            "counter_utilization": {"mean": 92}, "staff_utilization": {"mean": 82},
        },
    }
    best = {
        "configuration": {"counters": 5, "staff": 5},
        "operational_risk": "MEDIUM",
        "aggregate": {
            "average_waiting_time": {"mean": 7}, "queue_length": {"mean": 2}, "throughput": {"mean": 2.5},
            "counter_utilization": {"mean": 84}, "staff_utilization": {"mean": 84},
        },
    }
    comparison = _baseline_comparison(baseline, best)
    assert comparison["waiting_improvement_percent"] == 30
    assert comparison["queue_improvement_percent"] == 50
    assert comparison["throughput_difference"] == 0.5
    assert comparison["resource_difference"] == 1
    baseline["aggregate"]["queue_length"]["mean"] = 0
    assert _baseline_comparison(baseline, best)["queue_improvement_percent"] is None


def test_invalid_search_range_is_rejected_by_api() -> None:
    response = client.post("/api/optimization/run", json={**BASE_INPUT, "min_counters": 4, "max_counters": 2})
    assert response.status_code == 422


def test_repeated_optimization_is_reproducible() -> None:
    payload = {**BASE_INPUT, "runs": 2}
    first = client.post("/api/optimization/run", json=payload).json()
    second = client.post("/api/optimization/run", json=payload).json()
    assert first["results"] == second["results"]
    assert first["best_configuration"] == second["best_configuration"]
    assert first["objective_score"] == second["objective_score"]


def test_simulation_and_what_if_endpoints_still_work_and_are_not_overwritten() -> None:
    main_config = {"customers": 40, "arrival_rate": 4, "counters": 2, "staff": 2, "avg_service_time": 4, "duration": 45, "transaction_type": "Deposit", "priority": "Normal", "random_seed": 42}
    client.post("/api/simulation/reset")
    original = client.post("/api/simulation/run", json=main_config)
    assert original.status_code == 200
    assert client.get("/api/simulation/status").json()["last_simulation_available"] is True

    optimized = client.post("/api/optimization/run", json=BASE_INPUT)
    assert optimized.status_code == 200
    what_if = client.post("/api/what-if/run", json={"scenarios": [{"name": "Scenario A", "config": main_config}], "number_of_runs": 1, "base_seed": 42})
    assert what_if.status_code == 200
    assert client.get("/api/simulation/status").json()["last_simulation_available"] is True
    assert client.post("/api/simulation/run", json=main_config).json() == original.json()
    client.post("/api/simulation/reset")
