"""In-memory service layer for BANKTWIN ML training and prediction."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.ml.classification import clear_classification_model, train_classification_model, predict_risk as predict_risk_model
from app.ml.regression import clear_regression_model, train_regression_model, predict_waiting_time as predict_waiting_time_model


class MLService:
    def __init__(self) -> None:
        self.regression_status = "NOT_TRAINED"
        self.classification_status = "NOT_TRAINED"
        self.last_training_info: dict[str, Any] | None = None
        self.last_regression_result: dict[str, Any] | None = None
        self.last_classification_result: dict[str, Any] | None = None
        self.regression_model = None
        self.classification_model = None

    def _as_rows(self, payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, list):
            rows = payload
        elif isinstance(payload, dict):
            rows = payload.get("rows") if isinstance(payload.get("rows"), list) else [payload]
        else:
            raise ValueError("Dataset rows must be provided as a list or a payload containing 'rows'.")
        if not all(isinstance(row, dict) for row in rows):
            raise ValueError("Each dataset row must be an object mapping field names to values.")
        return rows

    def _timestamp(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def train_regression(self, rows: Any, dataset_metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        self.regression_status = "TRAINING"
        try:
            dataset = self._as_rows(rows)
            result = train_regression_model(dataset)
            self.regression_model = result.pop("model")
            metrics = result.pop("metrics")
            summary = {
                "status": "TRAINED",
                "training_status": "TRAINED",
                "sample_count": result.get("sample_count"),
                "train_count": result.get("train_count"),
                "test_count": result.get("test_count"),
                "features": result.get("features"),
                "target": result.get("target"),
                "test_size": result.get("test_size"),
                "random_state": result.get("random_state"),
                "feature_importance": result.get("feature_importance"),
                "metrics": metrics,
                "dataset": self._dataset_metadata(dataset_metadata, len(rows)),
                "trained_at": self._timestamp(),
            }
            self.last_regression_result = summary
            self.regression_status = "TRAINED"
            self._update_training_info()
            return summary
        except Exception as exc:  # pragma: no cover - service-level error capture
            self.regression_model = None
            clear_regression_model()
            self.regression_status = "ERROR"
            self.last_regression_result = {"status": "ERROR", "training_status": "ERROR", "error": str(exc), "trained_at": self._timestamp()}
            self._update_training_info()
            return self.last_regression_result

    def train_classification(self, rows: Any, dataset_metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        self.classification_status = "TRAINING"
        try:
            dataset = self._as_rows(rows)
            result = train_classification_model(dataset)
            self.classification_model = result.pop("model")
            metrics = result.pop("metrics")
            classification_summary = {
                "status": "TRAINED",
                "training_status": "TRAINED",
                "sample_count": result.get("sample_count"),
                "train_count": result.get("train_count"),
                "test_count": result.get("test_count"),
                "features": result.get("features"),
                "target": result.get("target"),
                "metrics": metrics,
                "averaging": result.get("averaging"),
                "confusion_matrix": result.get("confusion_matrix"),
                "HIGH-RISK BINARY DIAGNOSTIC": result.get("HIGH-RISK BINARY DIAGNOSTIC"),
                "feature_importance": result.get("feature_importance"),
                "class_distribution": result.get("class_distribution"),
                "class_imbalance_warning": result.get("class_imbalance_warning"),
                "invalid_labels_excluded": result.get("invalid_labels_excluded"),
                "test_size": result.get("test_size"),
                "random_state": result.get("random_state"),
                "dataset": self._dataset_metadata(dataset_metadata, len(rows)),
                "trained_at": self._timestamp(),
            }
            self.last_classification_result = classification_summary
            self.classification_status = "TRAINED"
            self._update_training_info()
            return classification_summary
        except Exception as exc:  # pragma: no cover - service-level error capture
            self.classification_model = None
            clear_classification_model()
            self.classification_status = "ERROR"
            self.last_classification_result = {"status": "ERROR", "training_status": "ERROR", "error": str(exc), "trained_at": self._timestamp()}
            self._update_training_info()
            return self.last_classification_result

    def train_all(self, rows: Any, dataset_metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        dataset = self._as_rows(rows)
        regression = self.train_regression(dataset, dataset_metadata)
        classification = self.train_classification(dataset, dataset_metadata)
        overall_status = "TRAINED" if regression.get("status") == "TRAINED" and classification.get("status") == "TRAINED" else "ERROR"
        return {
            "regression": regression,
            "classification": classification,
            "training_status": overall_status,
            "trained_at": self._timestamp(),
        }

    def predict_waiting_time(self, payload: dict[str, Any]) -> dict[str, Any]:
        if self.regression_model is None:
            raise ValueError("MODEL_NOT_TRAINED")
        return predict_waiting_time_model(payload)

    def predict_risk(self, payload: dict[str, Any]) -> dict[str, Any]:
        if self.classification_model is None:
            raise ValueError("MODEL_NOT_TRAINED")
        return predict_risk_model(payload)

    def status(self) -> dict[str, Any]:
        return {
            "regression_model_status": "TRAINED" if self.regression_model is not None else self.regression_status,
            "risk_model_status": "TRAINED" if self.classification_model is not None else self.classification_status,
            "training_status": self.last_training_info["status"] if self.last_training_info else "NOT_TRAINED",
            "last_training": self.last_training_info,
        }

    def evaluation(self) -> dict[str, Any]:
        return {
            "status": self.status(),
            "training": self.last_training_info,
            "regression": self.last_regression_result,
            "classification": self.last_classification_result,
        }

    def reset(self) -> dict[str, bool]:
        clear_regression_model()
        clear_classification_model()
        self.regression_model = None
        self.classification_model = None
        self.regression_status = "NOT_TRAINED"
        self.classification_status = "NOT_TRAINED"
        self.last_training_info = None
        self.last_regression_result = None
        self.last_classification_result = None
        return {"reset": True}

    @staticmethod
    def _dataset_metadata(metadata: dict[str, Any] | None, row_count: int) -> dict[str, Any]:
        provided = metadata or {}
        return {
            "name": provided.get("name"),
            "source": provided.get("source"),
            "total_rows": provided.get("total_rows", row_count),
        }

    def _update_training_info(self) -> None:
        model_status = "TRAINED" if self.regression_status == "TRAINED" and self.classification_status == "TRAINED" else "ERROR" if self.regression_status == "ERROR" or self.classification_status == "ERROR" else "TRAINING" if self.regression_status == "TRAINING" or self.classification_status == "TRAINING" else "NOT_TRAINED"
        current_evaluations = [
            result
            for result in (self.last_regression_result, self.last_classification_result)
            if result and result.get("status") == "TRAINED"
        ]
        self.last_training_info = {
            "status": model_status,
            "regression_model_status": self.regression_status,
            "risk_model_status": self.classification_status,
            "trained_at": self._timestamp(),
            "dataset": current_evaluations[-1]["dataset"] if current_evaluations else None,
        }


ml_service = MLService()
