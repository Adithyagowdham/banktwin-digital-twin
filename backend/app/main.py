"""FastAPI entry point for the BANKTWIN simulation prototype."""

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.ml.service import ml_service
from app.schemas import MLPredictionRequest, MLTrainingRequest, OptimizationRunRequest, SimulationConfig, SimulationResult, WhatIfRunRequest
from app.simulation.engine import run_simulation
from app.simulation.what_if import run_what_if
from app.optimization.service import run_optimization

app = FastAPI(
    title="BANKTWIN Simulation API",
    description="Local discrete-event banking branch simulation prototype.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

_last_simulation_available = False


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "banktwin-backend"}


@app.get("/api/simulation/status")
def simulation_status() -> dict[str, bool]:
    return {"running": False, "last_simulation_available": _last_simulation_available}


@app.post("/api/simulation/run", response_model=SimulationResult)
def simulate(config: SimulationConfig) -> SimulationResult:
    global _last_simulation_available
    result = run_simulation(config)
    _last_simulation_available = True
    return SimulationResult.model_validate(result)


@app.post("/api/simulation/reset")
def reset_simulation() -> dict[str, bool]:
    global _last_simulation_available
    _last_simulation_available = False
    return {"reset": True}


@app.post("/api/what-if/run")
def run_what_if_analysis(payload: WhatIfRunRequest) -> dict[str, Any]:
    return run_what_if(
        [scenario.model_dump() for scenario in payload.scenarios],
        number_of_runs=payload.number_of_runs,
        base_seed=payload.base_seed,
        risk_penalties=payload.risk_penalties,
        utilization_threshold=payload.utilization_threshold,
    )


@app.post("/api/optimization/run")
def optimize_resources(payload: OptimizationRunRequest) -> dict[str, Any]:
    return run_optimization(payload)


@app.get("/api/ml/status")
def ml_status() -> dict[str, Any]:
    return ml_service.status()


@app.get("/api/ml/evaluation")
def ml_evaluation() -> dict[str, Any]:
    return ml_service.evaluation()


@app.post("/api/ml/train/regression")
def train_regression_model(payload: MLTrainingRequest) -> dict[str, Any]:
    metadata = {"name": payload.dataset_name, "source": payload.dataset_source, "total_rows": payload.total_rows}
    result = ml_service.train_regression(payload.rows, metadata)
    if result.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=result.get("error", "Regression model training failed."))
    return result


@app.post("/api/ml/train/classification")
def train_classification_model(payload: MLTrainingRequest) -> dict[str, Any]:
    metadata = {"name": payload.dataset_name, "source": payload.dataset_source, "total_rows": payload.total_rows}
    result = ml_service.train_classification(payload.rows, metadata)
    if result.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=result.get("error", "Classification model training failed."))
    return result


@app.post("/api/ml/train")
def train_ml_models(payload: MLTrainingRequest) -> dict[str, Any]:
    metadata = {"name": payload.dataset_name, "source": payload.dataset_source, "total_rows": payload.total_rows}
    result = ml_service.train_all(payload.rows, metadata)
    if result.get("training_status") == "ERROR":
        raise HTTPException(status_code=400, detail="One or both models failed to train.")
    return result


@app.post("/api/ml/reset")
def reset_ml_models() -> dict[str, bool]:
    return ml_service.reset()


@app.post("/api/ml/predict/waiting-time")
def predict_waiting_time(payload: MLPredictionRequest) -> dict[str, float]:
    try:
        return ml_service.predict_waiting_time(payload.payload)
    except ValueError as exc:
        message = str(exc)
        if message == "MODEL_NOT_TRAINED":
            raise HTTPException(status_code=400, detail="MODEL_NOT_TRAINED") from exc
        raise HTTPException(status_code=400, detail=message) from exc


@app.post("/api/ml/predict/risk")
def predict_risk(payload: MLPredictionRequest) -> dict[str, Any]:
    try:
        return ml_service.predict_risk(payload.payload)
    except ValueError as exc:
        message = str(exc)
        if message == "MODEL_NOT_TRAINED":
            raise HTTPException(status_code=400, detail="MODEL_NOT_TRAINED") from exc
        raise HTTPException(status_code=400, detail=message) from exc
