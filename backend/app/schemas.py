"""Validated request and response models for the BANKTWIN API."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

TransactionType = Literal[
    "Deposit",
    "Withdrawal",
    "Account Opening",
    "Loan Service",
    "Cash Transfer",
    "General Inquiry",
]
PriorityLevel = Literal["Normal", "Priority"]


class SimulationConfig(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    customers: int = Field(gt=0)
    arrival_rate: float = Field(gt=0, description="Mean arrivals per simulation time unit")
    counters: int = Field(gt=0)
    staff: int = Field(gt=0)
    avg_service_time: float = Field(gt=0, description="Mean service duration in time units")
    duration: float = Field(gt=0, description="Simulation horizon in time units")
    transaction_type: TransactionType
    priority: PriorityLevel
    random_seed: int | None = None

    @field_validator("transaction_type", mode="before")
    @classmethod
    def normalize_transaction_type(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = " ".join(value.strip().split()).casefold()
            for transaction_type in TransactionType.__args__:
                if transaction_type.casefold() == normalized:
                    return transaction_type
        return value

    @field_validator("priority", mode="before")
    @classmethod
    def normalize_priority(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip().casefold()
            if normalized == "normal":
                return "Normal"
            if normalized == "priority":
                return "Priority"
        return value


class CustomerResult(BaseModel):
    customer_id: str
    arrival_time: float
    transaction_type: str
    priority: str
    assigned_counter: str | None
    assigned_staff: str | None
    service_start_time: float | None
    service_end_time: float | None
    waiting_time: float | None
    service_time: float | None
    status: Literal["WAITING", "SERVING", "COMPLETED", "DELAYED"]


class CounterResult(BaseModel):
    counter_id: str
    status: Literal["AVAILABLE", "BUSY", "BREAK", "OFFLINE"]
    busy_time: float
    current_customer: str | None


class StaffResult(BaseModel):
    staff_id: str
    role: str
    assigned_counter: str | None
    status: Literal["AVAILABLE", "SERVING", "BREAK", "OFFLINE"]
    busy_time: float
    customers_served: int


class SimulationResult(BaseModel):
    customers_arrived: int
    customers_served: int
    queue_length: int
    peak_queue_length: int
    average_waiting_time: float
    average_service_time: float
    throughput: float
    counter_utilization: float
    staff_utilization: float
    operational_risk: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    simulation_duration: float
    customers: list[CustomerResult]
    counters: list[CounterResult]
    staff: list[StaffResult]


class MLTrainingRequest(BaseModel):
    rows: list[dict[str, Any]] = Field(default_factory=list)
    dataset_name: str | None = None
    dataset_source: str | None = None
    total_rows: int | None = Field(default=None, ge=0)


class MLPredictionRequest(BaseModel):
    payload: dict[str, Any]


class WhatIfScenarioInput(BaseModel):
    name: str
    config: dict[str, Any]


class WhatIfRunRequest(BaseModel):
    scenarios: list[WhatIfScenarioInput] = Field(min_length=1)
    number_of_runs: Literal[1, 5, 10] = 1
    base_seed: int | None = None
    risk_penalties: dict[Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"], float] | None = None
    utilization_threshold: float = Field(default=90.0, gt=0, lt=100)

    @field_validator("risk_penalties")
    @classmethod
    def validate_risk_penalties(cls, value: dict[str, float] | None) -> dict[str, float] | None:
        if value is not None and (set(value) != {"LOW", "MEDIUM", "HIGH", "CRITICAL"} or any(weight < 0 for weight in value.values())):
            raise ValueError("Risk penalties must define non-negative values for LOW, MEDIUM, HIGH, and CRITICAL.")
        return value


class OptimizationRunRequest(BaseModel):
    customers: int = Field(default=50, gt=0)
    arrival_rate: float = Field(default=5, gt=0)
    avg_service_time: float = Field(default=5, gt=0)
    duration: float = Field(default=60, gt=0)
    transaction_type: TransactionType = "Deposit"
    priority: PriorityLevel = "Normal"
    min_counters: int = Field(default=2, gt=0)
    max_counters: int = Field(default=8, gt=0)
    min_staff: int = Field(default=2, gt=0)
    max_staff: int = Field(default=8, gt=0)
    runs: int = Field(default=3, ge=1, le=10)
    base_seed: int = 42
    risk_weights: dict[Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"], float] = Field(
        default_factory=lambda: {"LOW": 0.0, "MEDIUM": 0.25, "HIGH": 0.75, "CRITICAL": 1.5}
    )
    utilization_threshold: float = Field(default=90.0, gt=0, lt=100)
    resource_penalty_weight: float = Field(default=0.15, ge=0)
    baseline: SimulationConfig | None = None

    @model_validator(mode="after")
    def validate_search_ranges(self) -> "OptimizationRunRequest":
        if self.min_counters > self.max_counters:
            raise ValueError("min_counters must be less than or equal to max_counters.")
        if self.min_staff > self.max_staff:
            raise ValueError("min_staff must be less than or equal to max_staff.")
        if set(self.risk_weights) != {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
            raise ValueError("risk_weights must define LOW, MEDIUM, HIGH, and CRITICAL.")
        if any(weight < 0 for weight in self.risk_weights.values()):
            raise ValueError("risk_weights must be non-negative.")
        return self
