"""API and discrete-event simulation tests."""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas import SimulationConfig
from app.simulation.engine import run_simulation

client = TestClient(app)
SAMPLE_CONFIG = {
    "customers": 50,
    "arrival_rate": 5,
    "counters": 4,
    "staff": 5,
    "avg_service_time": 5,
    "duration": 60,
    "transaction_type": "Deposit",
    "priority": "Normal",
    "random_seed": 42,
}


def test_health_endpoint() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "banktwin-backend"}


def test_simulation_config_validation() -> None:
    config = SimulationConfig.model_validate(SAMPLE_CONFIG)
    assert config.customers == 50
    with pytest.raises(ValidationError):
        SimulationConfig.model_validate({**SAMPLE_CONFIG, "customers": 0})
    with pytest.raises(ValidationError):
        SimulationConfig.model_validate({**SAMPLE_CONFIG, "arrival_rate": -1})


def test_simulation_runs_with_calculated_metrics() -> None:
    result = run_simulation(SimulationConfig.model_validate(SAMPLE_CONFIG))
    assert result["customers_arrived"] > 0
    assert result["customers_served"] > 0
    assert result["customers_served"] <= result["customers_arrived"]
    assert len(result["customers"]) == result["customers_arrived"]
    assert all(customer["waiting_time"] is None or customer["waiting_time"] >= 0 for customer in result["customers"])
    assert all(customer["service_time"] is None or customer["service_time"] > 0 for customer in result["customers"])
    assert result["throughput"] >= 0
    assert 0 <= result["counter_utilization"] <= 100
    assert 0 <= result["staff_utilization"] <= 100
    assert result["operational_risk"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert result["simulation_duration"] == SAMPLE_CONFIG["duration"]


def test_simulation_api_and_status_reset() -> None:
    assert client.get("/api/simulation/status").json() == {
        "running": False,
        "last_simulation_available": False,
    }
    response = client.post("/api/simulation/run", json=SAMPLE_CONFIG)
    assert response.status_code == 200
    assert response.json()["customers_served"] > 0
    assert client.get("/api/simulation/status").json()["last_simulation_available"] is True
    assert client.post("/api/simulation/reset").json() == {"reset": True}
    assert client.get("/api/simulation/status").json()["last_simulation_available"] is False


def test_priority_and_transaction_type_are_normalized() -> None:
    config = SimulationConfig.model_validate(
        {**SAMPLE_CONFIG, "transaction_type": " deposit ", "priority": "priority"}
    )
    assert config.transaction_type == "Deposit"
    assert config.priority == "Priority"


def test_cors_allows_frontend_origin() -> None:
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:3001",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3001"
