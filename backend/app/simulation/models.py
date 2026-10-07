"""Small domain models for branch simulation entities."""

from dataclasses import dataclass
from typing import Literal

CustomerStatus = Literal["WAITING", "SERVING", "COMPLETED", "DELAYED"]
CounterStatus = Literal["AVAILABLE", "BUSY", "BREAK", "OFFLINE"]
StaffStatus = Literal["AVAILABLE", "SERVING", "BREAK", "OFFLINE"]


@dataclass
class Customer:
    customer_id: str
    arrival_time: float
    transaction_type: str
    priority: str
    assigned_counter: str | None = None
    assigned_staff: str | None = None
    service_start_time: float | None = None
    service_end_time: float | None = None
    waiting_time: float | None = None
    service_time: float | None = None
    status: CustomerStatus = "WAITING"


@dataclass
class Counter:
    counter_id: str
    status: CounterStatus = "AVAILABLE"
    busy_time: float = 0.0
    current_customer: str | None = None


@dataclass
class Staff:
    staff_id: str
    role: str = "SERVICE ASSOCIATE"
    assigned_counter: str | None = None
    status: StaffStatus = "AVAILABLE"
    busy_time: float = 0.0
    customers_served: int = 0
