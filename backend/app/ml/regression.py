"""Random forest regression pipeline for waiting-time prediction."""

from __future__ import annotations

from typing import Any

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from app.ml.evaluation import calculate_regression_metrics, extract_feature_importance
from app.ml.features import (
    REGRESSION_CATEGORICAL_FEATURES,
    REGRESSION_INPUT_FEATURES,
    REGRESSION_NUMERIC_FEATURES,
    REGRESSION_TARGET,
    prepare_regression_dataset,
    validate_required_features,
    validate_no_target_leakage,
)

_WAITING_TIME_MODEL: RandomForestRegressor | None = None


def _get_regression_preprocessor() -> ColumnTransformer:
    numeric_transformer = Pipeline(steps=[("imputer", SimpleImputer(strategy="median"))])
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_transformer, REGRESSION_NUMERIC_FEATURES),
            ("categorical", categorical_transformer, REGRESSION_CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )


def set_regression_model(model: RandomForestRegressor | None) -> None:
    global _WAITING_TIME_MODEL
    _WAITING_TIME_MODEL = model


def get_regression_model() -> RandomForestRegressor | None:
    return _WAITING_TIME_MODEL


def clear_regression_model() -> None:
    set_regression_model(None)


def train_regression_model(rows: list[dict[str, Any]]) -> dict[str, Any]:
    validate_no_target_leakage(REGRESSION_INPUT_FEATURES, REGRESSION_TARGET)
    df = prepare_regression_dataset(rows)
    if len(df) < 10:
        raise ValueError("Not enough valid rows for regression training.")

    X = df[REGRESSION_INPUT_FEATURES]
    y = df[REGRESSION_TARGET]
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", _get_regression_preprocessor()),
            (
                "model",
                RandomForestRegressor(
                    n_estimators=200,
                    random_state=42,
                ),
            ),
        ]
    )
    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    metrics = calculate_regression_metrics(y_test.tolist(), predictions.tolist())
    result = {
        "status": "TRAINED",
        "sample_count": len(df),
        "train_count": len(X_train),
        "test_count": len(X_test),
        "features": [feature for feature in REGRESSION_INPUT_FEATURES],
        "target": REGRESSION_TARGET,
        "test_size": 0.2,
        "random_state": 42,
        "feature_importance": extract_feature_importance(pipeline),
        "model": pipeline,
        "metrics": metrics,
    }
    set_regression_model(pipeline)
    return result


def predict_waiting_time(payload: dict[str, Any]) -> dict[str, float]:
    model = get_regression_model()
    if model is None:
        raise ValueError("MODEL_NOT_TRAINED")

    validate_required_features(payload, REGRESSION_INPUT_FEATURES)
    frame = pd.DataFrame([payload])[REGRESSION_INPUT_FEATURES]
    prediction = model.predict(frame)
    return {"predicted_waiting_time": float(prediction[0])}
