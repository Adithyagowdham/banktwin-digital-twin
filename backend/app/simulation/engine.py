"""SimPy process model for a small banking branch."""

import math
import random
from collections.abc import Iterator
from typing import Any

import simpy

from app.schemas import SimulationConfig
from app.simulation.metrics import (
    average,
    calculate_operational_risk,
    calculate_throughput,
    calculate_utilization,
)
from app.simulation.models import Counter, Customer, Staff

SERVICE_MULTIPLIERS = {
    "deposit": 0.8,
    "withdrawal": 0.85,
    "account opening": 1.6,
    "loan service": 1.8,
    "cash transfer": 1.0,
    "general inquiry": 1.0,
}
SERVICE_TIME_VARIATION = 0.25


class SimulationEngine:
    """Run one isolated, reproducible branch simulation."""

    def __init__(self, config: SimulationConfig) -> None:
        self.config = config
        self.env = simpy.Environment()
        self.random = random.Random(config.random_seed)
        self.service_pool = simpy.PriorityResource(
            self.env, capacity=min(config.counters, config.staff)
        )
        self.counters = [
            Counter(counter_id=f"C{index:02d}")
            for index in range(1, config.counters + 1)
        ]
        self.staff = [
            Staff(staff_id=f"ST-{index:02d}")
            for index in range(1, config.staff + 1)
        ]
        self.customers: list[Customer] = []
        self.peak_queue_length = 0
        self.delay_threshold = config.avg_service_time * 2
        self.queue_check_interval = min(1.0, max(0.25, config.avg_service_time / 4))

    def run(self) -> dict[str, Any]:
        """Execute events up to the configured horizon and aggregate results."""
        self.env.process(self._customer_source())
        self.env.process(self._mark_delayed_customers())
        self.env.run(until=self.config.duration)
        self._record_in_progress_service_time()

        completed = [customer for customer in self.customers if customer.status == "COMPLETED"]
        waiting_times = [customer.waiting_time for customer in completed if customer.waiting_time is not None]
        service_times = [customer.service_time for customer in completed if customer.service_time is not None]
        queue_length = sum(
            customer.status in ("WAITING", "DELAYED") for customer in self.customers
        )
        average_waiting_time = average(waiting_times)
        counter_utilization = calculate_utilization(
            sum(counter.busy_time for counter in self.counters),
            len(self.counters),
            self.config.duration,
        )
        staff_utilization = calculate_utilization(
            sum(person.busy_time for person in self.staff),
            len(self.staff),
            self.config.duration,
        )
        risk_queue_length = max(queue_length, self.peak_queue_length)

        return {
            "customers_arrived": len(self.customers),
            "customers_served": len(completed),
            "queue_length": queue_length,
            "peak_queue_length": self.peak_queue_length,
            "average_waiting_time": round(average_waiting_time, 3),
            "average_service_time": round(average(service_times), 3),
            "throughput": round(
                calculate_throughput(len(completed), self.config.duration), 3
            ),
            "counter_utilization": round(counter_utilization, 3),
            "staff_utilization": round(staff_utilization, 3),
            "operational_risk": calculate_operational_risk(
                risk_queue_length,
                average_waiting_time,
                counter_utilization,
                staff_utilization,
            ),
            "simulation_duration": self.config.duration,
            "customers": [self._customer_result(customer) for customer in self.customers],
            "counters": [self._counter_result(counter) for counter in self.counters],
            "staff": [self._staff_result(person) for person in self.staff],
        }

    def _customer_source(self) -> Iterator[simpy.Event]:
        for index in range(1, self.config.customers + 1):
            interarrival = self.random.expovariate(self.config.arrival_rate)
            yield self.env.timeout(interarrival)
            customer = Customer(
                customer_id=f"CU-{index:04d}",
                arrival_time=self.env.now,
                transaction_type=self.config.transaction_type,
                priority=self.config.priority,
            )
            self.customers.append(customer)
            self.env.process(self._serve_customer(customer))

    def _serve_customer(self, customer: Customer) -> Iterator[simpy.Event]:
        priority = 0 if customer.priority == "Priority" else 1
        request = self.service_pool.request(priority=priority)
        if not request.triggered:
            self.peak_queue_length = max(self.peak_queue_length, len(self.service_pool.queue))

        with request:
            yield request
            counter = next(item for item in self.counters if item.status == "AVAILABLE")
            person = next(item for item in self.staff if item.status == "AVAILABLE")
            customer.assigned_counter = counter.counter_id
            customer.assigned_staff = person.staff_id
            customer.service_start_time = self.env.now
            customer.waiting_time = max(0.0, self.env.now - customer.arrival_time)
            customer.status = "SERVING"
            counter.status = "BUSY"
            counter.current_customer = customer.customer_id
            person.status = "SERVING"
            person.assigned_counter = counter.counter_id

            service_time = self._service_duration()
            yield self.env.timeout(service_time)

            customer.service_end_time = self.env.now
            customer.service_time = self.env.now - customer.service_start_time
            customer.status = "COMPLETED"
            counter.busy_time += customer.service_time
            person.busy_time += customer.service_time
            person.customers_served += 1
            counter.status = "AVAILABLE"
            counter.current_customer = None
            person.status = "AVAILABLE"
            person.assigned_counter = None

    def _service_duration(self) -> float:
        multiplier = SERVICE_MULTIPLIERS.get(
            self.config.transaction_type.casefold(), 1.0
        )
        mean_duration = self.config.avg_service_time * multiplier
        sigma = SERVICE_TIME_VARIATION
        log_mean = math.log(mean_duration) - (sigma**2 / 2)
        return self.random.lognormvariate(log_mean, sigma)

    def _mark_delayed_customers(self) -> Iterator[simpy.Event]:
        while True:
            yield self.env.timeout(self.queue_check_interval)
            for customer in self.customers:
                if (
                    customer.status == "WAITING"
                    and self.env.now - customer.arrival_time >= self.delay_threshold
                ):
                    customer.status = "DELAYED"
            self.peak_queue_length = max(
                self.peak_queue_length, len(self.service_pool.queue)
            )

    def _record_in_progress_service_time(self) -> None:
        for counter in self.counters:
            if counter.current_customer is None:
                continue
            customer = next(
                item for item in self.customers if item.customer_id == counter.current_customer
            )
            if customer.service_start_time is None:
                continue
            elapsed = max(0.0, self.config.duration - customer.service_start_time)
            counter.busy_time += elapsed
            person = next(
                item for item in self.staff if item.staff_id == customer.assigned_staff
            )
            person.busy_time += elapsed

    @staticmethod
    def _customer_result(customer: Customer) -> dict[str, Any]:
        return {
            "customer_id": customer.customer_id,
            "arrival_time": round(customer.arrival_time, 3),
            "transaction_type": customer.transaction_type,
            "priority": customer.priority,
            "assigned_counter": customer.assigned_counter,
            "assigned_staff": customer.assigned_staff,
            "service_start_time": _rounded(customer.service_start_time),
            "service_end_time": _rounded(customer.service_end_time),
            "waiting_time": _rounded(customer.waiting_time),
            "service_time": _rounded(customer.service_time),
            "status": customer.status,
        }

    @staticmethod
    def _counter_result(counter: Counter) -> dict[str, Any]:
        return {
            "counter_id": counter.counter_id,
            "status": counter.status,
            "busy_time": round(counter.busy_time, 3),
            "current_customer": counter.current_customer,
        }

    @staticmethod
    def _staff_result(person: Staff) -> dict[str, Any]:
        return {
            "staff_id": person.staff_id,
            "role": person.role,
            "assigned_counter": person.assigned_counter,
            "status": person.status,
            "busy_time": round(person.busy_time, 3),
            "customers_served": person.customers_served,
        }


def _rounded(value: float | None) -> float | None:
    return round(value, 3) if value is not None else None


def run_simulation(config: SimulationConfig) -> dict[str, Any]:
    """Convenience entry point for API routes and tests."""
    return SimulationEngine(config).run()
