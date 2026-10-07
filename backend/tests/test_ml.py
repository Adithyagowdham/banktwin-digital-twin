"""Tests for the BANKTWIN ML regression and classification pipelines."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.ml.classification import clear_classification_model, predict_risk, train_classification_model
from app.ml.evaluation import calculate_classification_metrics, calculate_regression_metrics, compute_binary_high_risk_stats
from app.ml.features import validate_no_target_leakage, validate_required_features
from app.ml.regression import clear_regression_model, predict_waiting_time, train_regression_model
from app.main import app
from app.ml.service import ml_service

client = TestClient(app)


def _build_regression_rows() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for index in range(120):
        arrival_rate = 5 + (index % 9)
        queue_length = 2 + (index % 7)
        active_counters = 2 + (index % 4)
        counter_utilization = 50 + (index % 25)
        staff_available = 3 + (index % 5)
        staff_utilization = 45 + (index % 40)
        avg_service_time = 4 + (index % 6)
        current_workload = 15 + (index % 20)
        transaction_type = ["Deposit", "Withdrawal", "Loan Service", "General Inquiry"][index % 4]
        priority = ["Normal", "Priority"][index % 2]
        wait = max(1.0, round((queue_length * 0.7) + (arrival_rate * 0.5) + (100 - counter_utilization) / 12 + ((index % 3) * 0.6), 2))
        rows.append(
            {
                "Arrival_Rate": arrival_rate,
                "Queue_Length": queue_length,
                "Active_Counters": active_counters,
                "Counter_Utilization": counter_utilization,
                "Staff_Available": staff_available,
                "Staff_Utilization": staff_utilization,
                "Avg_Service_Time": avg_service_time,
                "Transaction_Type": transaction_type,
                "Priority": priority,
                "Current_Workload": current_workload,
                "Waiting_Time": wait,
            }
        )
    return rows


def _build_classification_rows() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    risks = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    for index in range(200):
        queue_length = 2 + (index % 12)
        waiting_time = 1 + (index % 15)
        arrival_rate = 4 + (index % 10)
        staff_available = 2 + (index % 5)
        counter_utilization = 35 + (index % 40)
        staff_utilization = 45 + (index % 45)
        service_time = 3 + (index % 7)
        current_workload = 10 + (index % 30)
        risk = risks[index % len(risks)]
        rows.append(
            {
                "Queue_Length": queue_length,
                "Waiting_Time": waiting_time,
                "Arrival_Rate": arrival_rate,
                "Staff_Available": staff_available,
                "Counter_Utilization": counter_utilization,
                "Staff_Utilization": staff_utilization,
                "Service_Time": service_time,
                "Current_Workload": current_workload,
                "Risk_Level": risk,
            }
        )
    return rows


def test_regression_training_returns_metrics() -> None:
    result = train_regression_model(_build_regression_rows())
    assert result["status"] == "TRAINED"
    assert result["sample_count"] >= 20
    assert result["train_count"] > 0
    assert result["test_count"] > 0
    assert "Waiting_Time" not in result["features"]
    assert "Arrival_Rate" in result["features"]
    assert hasattr(result["model"], "predict")
    assert result["metrics"]["mae"] >= 0
    assert result["metrics"]["rmse"] >= 0
    assert result["metrics"]["r2"] <= 1.0


def test_regression_prediction_requires_trained_model() -> None:
    future_rows = _build_regression_rows()
    train_regression_model(future_rows)
    prediction = predict_waiting_time(
        {
            "Arrival_Rate": 8,
            "Queue_Length": 6,
            "Active_Counters": 3,
            "Counter_Utilization": 72,
            "Staff_Available": 4,
            "Staff_Utilization": 67,
            "Avg_Service_Time": 6,
            "Transaction_Type": "Deposit",
            "Priority": "Normal",
            "Current_Workload": 24,
        }
    )
    assert isinstance(prediction["predicted_waiting_time"], (int, float))
    assert prediction["predicted_waiting_time"] >= 0


def test_regression_metrics_are_calculated_from_actual_predictions() -> None:
    rows = _build_regression_rows()
    result = train_regression_model(rows)
    metrics = result["metrics"]
    assert set(metrics) >= {"mae", "rmse", "r2"}
    assert metrics["mae"] > 0
    assert metrics["rmse"] > 0
    assert metrics["r2"] < 1.0


def test_classification_training_returns_model_and_metrics() -> None:
    result = train_classification_model(_build_classification_rows())
    assert result["status"] == "TRAINED"
    assert result["sample_count"] >= 20
    assert result["train_count"] > 0
    assert result["test_count"] > 0
    assert set(result["metrics"]) >= {"accuracy", "precision", "recall", "f1"}
    assert result["metrics"]["accuracy"] >= 0
    assert result["metrics"]["precision"] >= 0
    assert result["metrics"]["recall"] >= 0
    assert result["metrics"]["f1"] >= 0
    assert len(result["confusion_matrix"]) == 4
    assert all(len(row) == 4 for row in result["confusion_matrix"])


def test_classification_prediction_uses_actual_model() -> None:
    train_classification_model(_build_classification_rows())
    prediction = predict_risk(
        {
            "Queue_Length": 8,
            "Waiting_Time": 9,
            "Arrival_Rate": 10,
            "Staff_Available": 4,
            "Counter_Utilization": 78,
            "Staff_Utilization": 70,
            "Service_Time": 7,
            "Current_Workload": 33,
        }
    )
    assert prediction["predicted_risk"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


def test_binary_high_risk_statistics_are_computed() -> None:
    matrix = [[40, 4, 0, 0], [3, 30, 2, 0], [0, 1, 20, 4], [0, 0, 5, 20]]
    stats = compute_binary_high_risk_stats(matrix)
    assert stats == {"TP": 49, "TN": 77, "FP": 2, "FN": 1}


def test_model_not_trained_error_is_clear() -> None:
    clear_regression_model()
    with pytest.raises(ValueError, match="MODEL_NOT_TRAINED"):
        predict_waiting_time(
            {
                "Arrival_Rate": 8,
                "Queue_Length": 6,
                "Active_Counters": 3,
                "Counter_Utilization": 72,
                "Staff_Available": 4,
                "Staff_Utilization": 67,
                "Avg_Service_Time": 6,
                "Transaction_Type": "Deposit",
                "Priority": "Normal",
                "Current_Workload": 24,
            }
        )


def test_missing_feature_validation_reports_the_missing_field() -> None:
    with pytest.raises(ValueError, match="Arrival_Rate"):
        validate_required_features({"Queue_Length": 5})


def test_invalid_risk_labels_are_excluded_from_classifier_training() -> None:
    rows = _build_classification_rows()
    rows[0]["Risk_Level"] = "INVALID"
    rows[1]["Risk_Level"] = "UNKNOWN"
    result = train_classification_model(rows)
    assert result["status"] == "TRAINED"
    assert result["invalid_labels_excluded"] >= 2


def test_classifier_training_rejects_all_invalid_labels() -> None:
    with pytest.raises(ValueError, match="No valid Risk_Level"):
        train_classification_model([
            {"Queue_Length": 5, "Waiting_Time": 4, "Arrival_Rate": 8, "Staff_Available": 3, "Counter_Utilization": 65, "Staff_Utilization": 60, "Service_Time": 5, "Current_Workload": 20, "Risk_Level": "INVALID"}
        ])


def test_regression_metrics_match_held_out_predictions() -> None:
    metrics = calculate_regression_metrics([1, 2, 3], [1, 4, 2])
    assert metrics["mae"] == pytest.approx(1.0)
    assert metrics["rmse"] == pytest.approx((5 / 3) ** 0.5)
    assert metrics["r2"] == pytest.approx(-1.5)


def test_classification_metrics_use_weighted_average() -> None:
    metrics = calculate_classification_metrics(
        ["LOW", "LOW", "HIGH", "CRITICAL"],
        ["LOW", "HIGH", "HIGH", "MEDIUM"],
        ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    )
    assert metrics["accuracy"] == pytest.approx(0.5)
    assert metrics["precision"] == pytest.approx(0.625)
    assert metrics["recall"] == pytest.approx(0.5)
    assert metrics["f1"] == pytest.approx(0.5)
    assert len(metrics["confusion_matrix"]) == 4
    assert all(len(row) == 4 for row in metrics["confusion_matrix"])


def test_feature_importance_uses_transformed_feature_names() -> None:
    result = train_regression_model(_build_regression_rows())
    importance = result["feature_importance"]
    assert importance
    assert all(isinstance(item["feature"], str) for item in importance)
    assert any(item["feature"].startswith("Transaction_Type = ") for item in importance)
    assert importance == sorted(importance, key=lambda item: item["importance"], reverse=True)
    assert sum(item["importance"] for item in importance) == pytest.approx(1.0)


def test_target_leakage_is_rejected() -> None:
    with pytest.raises(ValueError, match="Target leakage detected: Waiting_Time"):
        validate_no_target_leakage(["Queue_Length", "Waiting_Time"], "Waiting_Time")
    with pytest.raises(ValueError, match="Target leakage detected: Risk_Level"):
        validate_no_target_leakage(["Queue_Length", "Risk_Level"], "Risk_Level")


def test_training_entry_points_fail_on_target_leakage(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.ml.regression.REGRESSION_INPUT_FEATURES", ["Queue_Length", "Waiting_Time"])
    with pytest.raises(ValueError, match="Target leakage detected: Waiting_Time"):
        train_regression_model(_build_regression_rows())

    monkeypatch.setattr("app.ml.classification.CLASSIFICATION_INPUT_FEATURES", ["Queue_Length", "Risk_Level"])
    with pytest.raises(ValueError, match="Target leakage detected: Risk_Level"):
        train_classification_model(_build_classification_rows())


def test_class_distribution_is_from_training_partition() -> None:
    result = train_classification_model(_build_classification_rows())
    assert result["class_distribution"] == {"LOW": 40, "MEDIUM": 40, "HIGH": 40, "CRITICAL": 40}
    assert result["class_imbalance_warning"] is False
    assert result["train_count"] == sum(result["class_distribution"].values())
    assert result["test_size"] == 0.2
    assert result["random_state"] == 42


def test_severely_underrepresented_risk_class_warns_without_resampling() -> None:
    rows = _build_classification_rows()[:100]
    labels = ["LOW"] * 90 + ["MEDIUM"] * 5 + ["HIGH"] * 3 + ["CRITICAL"] * 2
    for row, label in zip(rows, labels):
        row["Risk_Level"] = label
    result = train_classification_model(rows)
    assert result["class_imbalance_warning"] is True
    assert result["class_distribution"]["CRITICAL"] < result["train_count"] * 0.1


def test_ml_status_and_evaluation_endpoint_reset_state() -> None:
    ml_service.reset()
    try:
        status = client.get("/api/ml/status")
        evaluation = client.get("/api/ml/evaluation")
        assert status.status_code == 200
        assert status.json()["regression_model_status"] == "NOT_TRAINED"
        assert status.json()["risk_model_status"] == "NOT_TRAINED"
        assert evaluation.status_code == 200
        assert evaluation.json()["regression"] is None
        assert evaluation.json()["classification"] is None

        ml_service.train_regression(_build_regression_rows(), {"name": "regression.csv", "source": "USER UPLOADED", "total_rows": 120})
        ml_service.train_classification(_build_classification_rows(), {"name": "risk.csv", "source": "SYNTHETIC / SIMULATED DATA", "total_rows": 200})
        trained = client.get("/api/ml/evaluation").json()
        assert trained["regression"]["metrics"]["mae"] >= 0
        assert trained["regression"]["dataset"] == {"name": "regression.csv", "source": "USER UPLOADED", "total_rows": 120}
        assert trained["classification"]["metrics"]["accuracy"] >= 0
        assert trained["classification"]["confusion_matrix"]
        assert trained["classification"]["feature_importance"]
        assert trained["classification"]["class_distribution"]
        assert client.post("/api/ml/reset").json() == {"reset": True}
        reset_state = client.get("/api/ml/evaluation").json()
        assert reset_state["regression"] is None
        assert reset_state["classification"] is None
        assert reset_state["status"]["training_status"] == "NOT_TRAINED"
    finally:
        ml_service.reset()
