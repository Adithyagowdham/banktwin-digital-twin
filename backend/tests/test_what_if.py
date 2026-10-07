"""Tests for isolated stochastic what-if simulation runs."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.schemas import SimulationConfig
from app.simulation.engine import run_simulation
from app.simulation.what_if import (
    RISK_PENALTIES,
    aggregate_runs,
    recommend_configuration,
    run_what_if,
    score_scenario,
    utilization_penalty,
)

client = TestClient(app)
BASE_CONFIG = {
    "customers": 60,
    "arrival_rate": 5,
    "counters": 4,
    "staff": 5,
    "avg_service_time": 5,
    "duration": 60,
    "transaction_type": "Deposit",
    "priority": "Normal",
    "random_seed": 42,
}


def _scenario(name: str, **overrides: object) -> dict[str, object]:
    return {"name": name, "config": {**BASE_CONFIG, **overrides}}


def _scored_scenario(name: str, wait: float, queue: float, risk: str, counter: float, staff: float, throughput: float) -> dict[str, object]:
    return {
        "name": name,
        "status": "SUCCESS",
        "operational_risk": risk,
        "aggregate": {
            "average_waiting_time": {"mean": wait},
            "queue_length": {"mean": queue},
            "counter_utilization": {"mean": counter},
            "staff_utilization": {"mean": staff},
            "throughput": {"mean": throughput},
        },
    }


def test_single_scenario_uses_actual_simpy_result() -> None:
    expected = run_simulation(SimulationConfig.model_validate(BASE_CONFIG))
    response = run_what_if([_scenario("Scenario A")], number_of_runs=1, base_seed=42)
    scenario = response["scenarios"][0]
    run = scenario["runs"][0]
    assert scenario["status"] == "SUCCESS"
    assert run["seed"] == 42
    assert run["customers_arrived"] == expected["customers_arrived"]
    assert run["customers_served"] == expected["customers_served"]
    assert run["average_waiting_time"] == expected["average_waiting_time"]
    assert run["throughput"] == expected["throughput"]
    assert scenario["aggregate"]["queue_length"]["mean"] == expected["queue_length"]


def test_multiple_scenarios_and_api_endpoint() -> None:
    response = client.post("/api/what-if/run", json={
        "scenarios": [_scenario("Scenario A"), _scenario("Scenario B", counters=5, staff=5), _scenario("Scenario C", counters=6, staff=6)],
        "number_of_runs": 1,
        "base_seed": 42,
    })
    assert response.status_code == 200
    result = response.json()
    assert [scenario["name"] for scenario in result["scenarios"]] == ["Scenario A", "Scenario B", "Scenario C"]
    assert all(scenario["status"] == "SUCCESS" for scenario in result["scenarios"])
    assert all("operational_risk" in scenario for scenario in result["scenarios"])
    assert result["recommendation"]["scenario"] in {"Scenario A", "Scenario B", "Scenario C"}


def test_multiple_runs_use_incrementing_deterministic_seeds() -> None:
    response = run_what_if([_scenario("Scenario A")], number_of_runs=5, base_seed=42)
    scenario = response["scenarios"][0]
    assert scenario["run_count"] == 5
    assert [run["seed"] for run in scenario["runs"]] == [42, 43, 44, 45, 46]
    assert scenario["aggregate"]["average_waiting_time"]["min"] <= scenario["aggregate"]["average_waiting_time"]["mean"]
    assert scenario["aggregate"]["average_waiting_time"]["mean"] <= scenario["aggregate"]["average_waiting_time"]["max"]


def test_ten_runs_are_supported_by_the_endpoint() -> None:
    response = client.post("/api/what-if/run", json={"scenarios": [_scenario("Scenario A")], "number_of_runs": 10, "base_seed": 42})
    assert response.status_code == 200
    scenario = response.json()["scenarios"][0]
    assert scenario["run_count"] == 10
    assert [run["seed"] for run in scenario["runs"]] == list(range(42, 52))


def test_same_seed_reproduces_and_different_seed_changes_stochastic_metrics() -> None:
    config = _scenario("Stress", customers=100, arrival_rate=5, counters=1, staff=1, avg_service_time=7, duration=120)
    first = run_what_if([config], number_of_runs=5, base_seed=42)
    repeated = run_what_if([config], number_of_runs=5, base_seed=42)
    changed_seed = run_what_if([config], number_of_runs=5, base_seed=43)
    assert first == repeated
    assert first["scenarios"][0]["runs"] != changed_seed["scenarios"][0]["runs"]


def test_aggregation_calculates_mean_minimum_and_maximum() -> None:
    runs = [
        {"customers_arrived": 10, "customers_served": 8, "average_waiting_time": 1, "queue_length": 4, "throughput": 2, "counter_utilization": 70, "staff_utilization": 65, "average_service_time": 5},
        {"customers_arrived": 20, "customers_served": 15, "average_waiting_time": 3, "queue_length": 8, "throughput": 4, "counter_utilization": 90, "staff_utilization": 85, "average_service_time": 7},
    ]
    aggregated = aggregate_runs(runs)
    assert aggregated["average_waiting_time"] == {"mean": 2.0, "min": 1.0, "max": 3.0}
    assert aggregated["queue_length"] == {"mean": 6.0, "min": 4.0, "max": 8.0}
    assert aggregated["throughput"] == {"mean": 3.0, "min": 2.0, "max": 4.0}
    assert aggregated["customers_arrived"] == {"mean": 15.0, "min": 10.0, "max": 20.0}


def test_recommendation_uses_actual_metrics_and_transparent_score() -> None:
    scenarios = [
        _scored_scenario("Scenario A", 8, 12, "HIGH", 92, 88, 1.2),
        _scored_scenario("Scenario B", 3, 4, "LOW", 78, 74, 1.5),
    ]
    recommendation = recommend_configuration(scenarios)
    assert recommendation is not None
    assert recommendation["scenario"] == "Scenario B"
    assert recommendation["components"]["total"] == recommendation["score"]
    assert any("Average waiting time was lower" in reason for reason in recommendation["explanation"])
    assert any("Queue length was lower" in reason for reason in recommendation["explanation"])
    assert any("Throughput was higher" in reason for reason in recommendation["explanation"])


def test_prototype_risk_penalties_are_applied() -> None:
    assert RISK_PENALTIES == {"LOW": 0.0, "MEDIUM": 0.25, "HIGH": 0.6, "CRITICAL": 1.0}
    components = score_scenario(5, 5, "CRITICAL", 90, 90, 10, 10)
    assert components["risk"] == 1.0
    assert components["total"] == 2.0
    customized = score_scenario(5, 5, "HIGH", 85, 75, 10, 10, utilization_threshold=80)
    assert customized["counter_utilization"] == 0.25
    assert customized["risk"] == RISK_PENALTIES["HIGH"]


def test_utilization_stress_penalty_uses_configurable_prototype_threshold() -> None:
    assert utilization_penalty(89) == 0
    assert utilization_penalty(90) == 0
    assert utilization_penalty(95) == 0.5
    assert utilization_penalty(100) == 1
    assert utilization_penalty(110) == 1
    assert utilization_penalty(85, threshold=80) == 0.25


def test_custom_scoring_settings_are_returned_and_used() -> None:
    risk_penalties = {"LOW": 0, "MEDIUM": 0.1, "HIGH": 0.4, "CRITICAL": 0.8}
    result = run_what_if([_scenario("Scenario A")], risk_penalties=risk_penalties, utilization_threshold=80)
    assert result["scoring"]["risk_penalties"] == risk_penalties
    assert result["scoring"]["utilization_threshold"] == 80


def test_invalid_scenario_fails_without_discarding_successful_scenario() -> None:
    result = run_what_if([
        _scenario("Invalid", customers=0),
        _scenario("Valid"),
    ])
    assert result["scenarios"][0]["status"] == "FAILED"
    assert "customers" in result["scenarios"][0]["error"]
    assert result["scenarios"][1]["status"] == "SUCCESS"
    assert result["recommendation"]["scenario"] == "Valid"


def test_what_if_keeps_main_simulation_state_and_endpoint_working() -> None:
    assert client.post("/api/simulation/reset").json() == {"reset": True}
    main_response = client.post("/api/simulation/run", json=BASE_CONFIG)
    assert main_response.status_code == 200
    main_result = main_response.json()
    assert client.get("/api/simulation/status").json()["last_simulation_available"] is True

    what_if_response = client.post("/api/what-if/run", json={"scenarios": [_scenario("Scenario B", counters=5, staff=5)], "base_seed": 42})
    assert what_if_response.status_code == 200
    assert what_if_response.json()["scenarios"][0]["status"] == "SUCCESS"
    assert client.get("/api/simulation/status").json()["last_simulation_available"] is True

    still_main = client.post("/api/simulation/run", json=BASE_CONFIG)
    assert still_main.status_code == 200
    assert still_main.json() == main_result
    assert client.post("/api/simulation/reset").json() == {"reset": True}


def test_invalid_run_count_is_rejected() -> None:
    response = client.post("/api/what-if/run", json={"scenarios": [_scenario("Scenario A")], "number_of_runs": 3})
    assert response.status_code == 422
