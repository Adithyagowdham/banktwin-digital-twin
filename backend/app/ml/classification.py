"""Random forest classification pipeline for operational-risk prediction."""

from __future__ import annotations

from collections import Counter
from typing import Any

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from app.ml.evaluation import calculate_classification_metrics, compute_binary_high_risk_stats, extract_feature_importance
from app.ml.features import (
    CLASSIFICATION_INPUT_FEATURES,
    CLASSIFICATION_TARGET,
    VALID_RISK_LEVELS,
    prepare_classification_dataset,
    validate_required_features,
    validate_no_target_leakage,
)

_RISK_MODEL: RandomForestClassifier | None = None
CLASS_IMBALANCE_MINORITY_SHARE = 0.1


def _get_classifier_preprocessor() -> ColumnTransformer:
    numeric_transformer = Pipeline(steps=[("imputer", SimpleImputer(strategy="median"))])
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_transformer, CLASSIFICATION_INPUT_FEATURES),
            ("categorical", categorical_transformer, []),
        ],
        remainder="drop",
    )


def set_classification_model(model: RandomForestClassifier | None) -> None:
    global _RISK_MODEL
    _RISK_MODEL = model


def get_classification_model() -> RandomForestClassifier | None:
    return _RISK_MODEL


def clear_classification_model() -> None:
    set_classification_model(None)


def train_classification_model(rows: list[dict[str, Any]]) -> dict[str, Any]:
    validate_no_target_leakage(CLASSIFICATION_INPUT_FEATURES, CLASSIFICATION_TARGET)
    df, invalid_label_count = prepare_classification_dataset(rows)
    class_counts = Counter(df[CLASSIFICATION_TARGET].tolist())
    if len(class_counts) < 2:
        raise ValueError("Not enough examples for a valid stratified split.")
    if min(class_counts.values()) < 2:
        raise ValueError("Not enough examples for a valid stratified split.")

    X = df[CLASSIFICATION_INPUT_FEATURES]
    y = df[CLASSIFICATION_TARGET]
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", _get_classifier_preprocessor()),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=200,
                    random_state=42,
                    class_weight="balanced_subsample",
                ),
            ),
        ]
    )
    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    metrics = calculate_classification_metrics(
        y_test.tolist(),
        predictions.tolist(),
        VALID_RISK_LEVELS,
    )
    confusion = __import__("sklearn.metrics").metrics.confusion_matrix(y_test, predictions, labels=VALID_RISK_LEVELS).tolist()
    binary_stats = compute_binary_high_risk_stats(confusion)
    training_distribution = Counter(str(label) for label in y_train.tolist())
    class_distribution = {label: int(training_distribution.get(label, 0)) for label in VALID_RISK_LEVELS}
    total_training_samples = sum(class_distribution.values())
    class_imbalance_warning = (
        total_training_samples > 0
        and min(class_distribution.values()) / total_training_samples < CLASS_IMBALANCE_MINORITY_SHARE
    )
    result = {
        "status": "TRAINED",
        "sample_count": len(df),
        "train_count": len(X_train),
        "test_count": len(X_test),
        "invalid_labels_excluded": invalid_label_count,
        "features": [feature for feature in CLASSIFICATION_INPUT_FEATURES],
        "target": CLASSIFICATION_TARGET,
        "test_size": 0.2,
        "random_state": 42,
        "feature_importance": extract_feature_importance(pipeline),
        "class_distribution": class_distribution,
        "class_imbalance_warning": class_imbalance_warning,
        "averaging": "weighted",
        "model": pipeline,
        "metrics": {
            "accuracy": float(metrics["accuracy"]),
            "precision": float(metrics["precision"]),
            "recall": float(metrics["recall"]),
            "f1": float(metrics["f1"]),
        },
        "confusion_matrix": confusion,
        "HIGH-RISK BINARY DIAGNOSTIC": binary_stats,
    }
    set_classification_model(pipeline)
    return result


def predict_risk(payload: dict[str, Any]) -> dict[str, Any]:
    model = get_classification_model()
    if model is None:
        raise ValueError("MODEL_NOT_TRAINED")

    validate_required_features(payload, CLASSIFICATION_INPUT_FEATURES)
    frame = pd.DataFrame([payload])[CLASSIFICATION_INPUT_FEATURES]
    prediction = model.predict(frame)[0]
    probabilities = model.predict_proba(frame)[0]
    probability_map = {
        label: float(probabilities[index])
        for index, label in enumerate(model.classes_)
    }
    return {
        "predicted_risk": str(prediction),
        "MODEL ESTIMATED PROBABILITY": probability_map,
    }
