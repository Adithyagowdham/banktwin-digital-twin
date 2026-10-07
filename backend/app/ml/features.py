"""Feature preparation helpers for the BANKTWIN ML pipeline."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

import pandas as pd

REGRESSION_INPUT_FEATURES = [
    "Arrival_Rate",
    "Queue_Length",
    "Active_Counters",
    "Counter_Utilization",
    "Staff_Available",
    "Staff_Utilization",
    "Avg_Service_Time",
    "Transaction_Type",
    "Priority",
    "Current_Workload",
]

REGRESSION_TARGET = "Waiting_Time"
REGRESSION_NUMERIC_FEATURES = [
    "Arrival_Rate",
    "Queue_Length",
    "Active_Counters",
    "Counter_Utilization",
    "Staff_Available",
    "Staff_Utilization",
    "Avg_Service_Time",
    "Current_Workload",
]
REGRESSION_CATEGORICAL_FEATURES = ["Transaction_Type", "Priority"]

CLASSIFICATION_INPUT_FEATURES = [
    "Queue_Length",
    "Waiting_Time",
    "Arrival_Rate",
    "Staff_Available",
    "Counter_Utilization",
    "Staff_Utilization",
    "Service_Time",
    "Current_Workload",
]
CLASSIFICATION_TARGET = "Risk_Level"
VALID_RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def validate_no_target_leakage(input_features: Sequence[str], target: str) -> None:
    if target in input_features:
        raise ValueError(f"Target leakage detected: {target} must not be included in model input features.")


def validate_required_features(row: Mapping[str, Any], required_fields: Sequence[str] | None = None) -> None:
    if required_fields is None:
        required_fields = REGRESSION_INPUT_FEATURES
    missing = [
        field
        for field in required_fields
        if field not in row or row[field] is None or (isinstance(row[field], str) and not row[field].strip())
    ]
    if missing:
        raise ValueError(f"Missing required feature(s): {', '.join(missing)}")


def prepare_regression_dataset(rows: Sequence[Mapping[str, Any]]) -> pd.DataFrame:
    valid_rows: list[dict[str, Any]] = []
    for row in rows:
        try:
            validate_required_features(row, REGRESSION_INPUT_FEATURES + [REGRESSION_TARGET])
        except ValueError:
            continue
        normalized_row = {field: row[field] for field in REGRESSION_INPUT_FEATURES + [REGRESSION_TARGET]}
        valid_rows.append(normalized_row)
    if not valid_rows:
        raise ValueError("No valid rows available for regression training.")

    df = pd.DataFrame(valid_rows)
    for column in [*REGRESSION_NUMERIC_FEATURES, REGRESSION_TARGET]:
        df[column] = pd.to_numeric(df[column], errors="coerce")
    df = df.dropna(subset=[*REGRESSION_NUMERIC_FEATURES, REGRESSION_TARGET]).copy()
    if df.empty:
        raise ValueError("No valid numeric rows available for regression training.")
    return df


def prepare_classification_dataset(rows: Sequence[Mapping[str, Any]]) -> tuple[pd.DataFrame, int]:
    valid_rows: list[dict[str, Any]] = []
    invalid_label_count = 0
    for row in rows:
        try:
            validate_required_features(row, CLASSIFICATION_INPUT_FEATURES + [CLASSIFICATION_TARGET])
        except ValueError:
            continue

        label = str(row[CLASSIFICATION_TARGET]).strip().upper()
        if label not in VALID_RISK_LEVELS:
            invalid_label_count += 1
            continue
        normalized_row = {field: row[field] for field in CLASSIFICATION_INPUT_FEATURES + [CLASSIFICATION_TARGET]}
        normalized_row[CLASSIFICATION_TARGET] = label
        valid_rows.append(normalized_row)

    if not valid_rows:
        raise ValueError("No valid Risk_Level values available for classification training.")

    df = pd.DataFrame(valid_rows)
    for column in CLASSIFICATION_INPUT_FEATURES:
        df[column] = pd.to_numeric(df[column], errors="coerce")
    df[CLASSIFICATION_TARGET] = df[CLASSIFICATION_TARGET].astype(str).str.upper()
    df = df.dropna(subset=[*CLASSIFICATION_INPUT_FEATURES, CLASSIFICATION_TARGET]).copy()
    if df.empty:
        raise ValueError("No valid numeric rows available for classification training.")
    return df, invalid_label_count
