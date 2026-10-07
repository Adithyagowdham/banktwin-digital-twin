"""Metrics helpers for BANKTWIN model evaluation."""

from __future__ import annotations

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
)


def extract_feature_importance(pipeline: object) -> list[dict[str, float | str]] | None:
    """Return fitted forest importances named by the fitted preprocessor."""
    try:
        preprocessor = pipeline.named_steps["preprocessor"]
        estimator = pipeline.named_steps["model"]
        importances = estimator.feature_importances_
        transformed_names = preprocessor.get_feature_names_out()
    except (AttributeError, KeyError, ValueError):
        return None

    if len(importances) != len(transformed_names):
        return None

    categorical_features: dict[str, list[str]] = {}
    for name, transformer, columns in preprocessor.transformers_:
        if name == "remainder" or not columns:
            continue
        fitted_transformer = preprocessor.named_transformers_[name]
        encoder = getattr(fitted_transformer, "named_steps", {}).get("onehot")
        if encoder is not None:
            categorical_features.update(
                (str(column), [str(value) for value in categories])
                for column, categories in zip(columns, encoder.categories_)
            )

    ranked: list[dict[str, float | str]] = []
    for transformed_name, importance in zip(transformed_names, importances):
        feature_name = str(transformed_name)
        if "__" in feature_name:
            feature_name = feature_name.split("__", 1)[1]
        for column, categories in categorical_features.items():
            prefix = f"{column}_"
            if feature_name.startswith(prefix):
                encoded_value = feature_name[len(prefix):]
                matching_category = next(
                    (category for category in categories if category == encoded_value),
                    encoded_value,
                )
                feature_name = f"{column} = {matching_category}"
                break
        ranked.append({"feature": feature_name, "importance": float(importance)})
    return sorted(ranked, key=lambda item: float(item["importance"]), reverse=True)


def calculate_regression_metrics(y_true: list[float] | np.ndarray, y_pred: list[float] | np.ndarray) -> dict[str, float]:
    y_true_array = np.asarray(y_true, dtype=float)
    y_pred_array = np.asarray(y_pred, dtype=float)
    return {
        "mae": float(mean_absolute_error(y_true_array, y_pred_array)),
        "rmse": float(np.sqrt(mean_squared_error(y_true_array, y_pred_array))),
        "r2": float(r2_score(y_true_array, y_pred_array)),
    }


def calculate_classification_metrics(y_true: list[str] | np.ndarray, y_pred: list[str] | np.ndarray, labels: list[str]) -> dict[str, float | list[list[int]]]:
    y_true_array = np.asarray(y_true)
    y_pred_array = np.asarray(y_pred)
    return {
        "accuracy": float(accuracy_score(y_true_array, y_pred_array)),
        "precision": float(precision_score(y_true_array, y_pred_array, average="weighted", zero_division=0)),
        "recall": float(recall_score(y_true_array, y_pred_array, average="weighted", zero_division=0)),
        "f1": float(f1_score(y_true_array, y_pred_array, average="weighted", zero_division=0)),
        "confusion_matrix": confusion_matrix(y_true_array, y_pred_array, labels=labels).tolist(),
    }


def compute_binary_high_risk_stats(confusion_matrix_values: list[list[int]]) -> dict[str, int]:
    matrix = np.asarray(confusion_matrix_values, dtype=int)
    if matrix.shape != (4, 4):
        raise ValueError("Confusion matrix must be 4x4 for the risk classifier.")
    low_medium = (0, 1)
    high_risk = (2, 3)
    tp = int(sum(matrix[i][j] for i in high_risk for j in high_risk))
    tn = int(sum(matrix[i][j] for i in low_medium for j in low_medium))
    fp = int(sum(matrix[i][j] for i in low_medium for j in high_risk))
    fn = int(sum(matrix[i][j] for i in high_risk for j in low_medium))
    return {"TP": tp, "TN": tn, "FP": fp, "FN": fn}
