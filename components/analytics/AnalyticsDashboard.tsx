"use client";

import { useMemo } from "react";
import { useSimulation } from "../../lib/SimulationContext";
import { useDataset } from "../../lib/DatasetContext";
import type { CustomerResult } from "../../lib/simulationTypes";
import StatusIndicator from "../ui/StatusIndicator";
import { BarChart, MetricDefinitions, UtilizationChart } from "./AnalyticsCharts";

export interface AnalyticsData {
  arrivals: { label: string; value: number }[];
  queue: { label: string; value: number }[];
  waitingDistribution: { label: string; value: number }[];
  transactionsByType: { label: string; value: number }[];
  counterUtilization: { label: string; value: number }[];
  staffUtilization: { label: string; value: number }[];
  observedSystemSize: number;
  observedArrivalRate: number;
  observedTimeInSystem: number;
  calculatedLambdaW: number;
}

export function calculateAnalytics(customers: CustomerResult[], duration: number, counters: { counter_id: string; busy_time: number }[], staff: { staff_id: string; busy_time: number }[]): AnalyticsData {
  const bucketCount = Math.min(12, Math.max(1, Math.ceil(duration / 5)));
  const bucketSize = duration / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    label: `${(index * bucketSize).toFixed(0)}–${((index + 1) * bucketSize).toFixed(0)}`,
    start: index * bucketSize,
    end: (index + 1) * bucketSize,
    arrivals: 0,
  }));

  for (const customer of customers) {
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor(customer.arrival_time / bucketSize)));
    if (customer.arrival_time <= duration) buckets[index].arrivals += 1;
  }

  const queue = buckets.map((bucket) => {
    const observationTime = bucket.end;
    const waiting = customers.filter((customer) => customer.arrival_time <= observationTime
      && (customer.service_start_time === null || customer.service_start_time > observationTime)).length;
    return { label: bucket.label, value: waiting };
  });

  const waitingRanges = [
    { label: "0–2", min: 0, max: 2 },
    { label: "2–5", min: 2, max: 5 },
    { label: "5–10", min: 5, max: 10 },
    { label: "10+", min: 10, max: Number.POSITIVE_INFINITY },
  ];
  const waitingDistribution = waitingRanges.map((range) => ({
    label: range.label,
    value: customers.filter((customer) => customer.waiting_time !== null && customer.waiting_time >= range.min && customer.waiting_time < range.max).length,
  }));
  const transactionsByType = [...new Set(customers.map((customer) => customer.transaction_type))]
    .sort((left, right) => left.localeCompare(right))
    .map((transactionType) => ({ label: transactionType, value: customers.filter((customer) => customer.transaction_type === transactionType).length }));

  const completed = customers.filter((customer) => customer.service_end_time !== null);
  const totalTimeInSystem = completed.reduce((total, customer) => total + (customer.service_end_time! - customer.arrival_time), 0);
  const observedTimeInSystem = completed.length ? totalTimeInSystem / completed.length : 0;
  const timeInSystemByCustomer = customers.map((customer) => Math.max(0, Math.min(duration, customer.service_end_time ?? duration) - Math.min(duration, customer.arrival_time)));
  const observedSystemSize = duration > 0 ? timeInSystemByCustomer.reduce((total, time) => total + time, 0) / duration : 0;
  const observedArrivalRate = duration > 0 ? customers.filter((customer) => customer.arrival_time <= duration).length / duration : 0;

  return {
    arrivals: buckets.map(({ label, arrivals }) => ({ label, value: arrivals })),
    queue,
    waitingDistribution,
    transactionsByType,
    counterUtilization: counters.map((counter) => ({ label: counter.counter_id, value: duration > 0 ? Math.min(100, counter.busy_time / duration * 100) : 0 })),
    staffUtilization: staff.map((person) => ({ label: person.staff_id, value: duration > 0 ? Math.min(100, person.busy_time / duration * 100) : 0 })),
    observedSystemSize,
    observedArrivalRate,
    observedTimeInSystem,
    calculatedLambdaW: observedArrivalRate * observedTimeInSystem,
  };
}

function number(value: number, digits = 2): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

export default function AnalyticsDashboard() {
  const { result } = useSimulation();
  const { dataset } = useDataset();
  const analytics = useMemo(() => result ? calculateAnalytics(result.customers, result.simulation_duration, result.counters, result.staff) : null, [result]);

  if (!result || !analytics) {
    return <div className="operations-view analytics-view"><PageHeading hasData={false} /><DatasetNotice name={dataset?.name} /><section className="records-empty surface-card analytics-empty"><span className="records-empty__glyph" aria-hidden="true">∅</span><span className="records-empty__code">DATASET / OPERATIONAL_ANALYTICS</span><h2>NO ANALYTICS DATA</h2><p>Run a simulation from the Digital Twin to generate operational analytics.</p><span className="outline-tag">SOURCE / SIMPY BACKEND</span></section></div>;
  }

  const customers = result.customers;
  const activeCustomers = customers.filter((customer) => customer.status === "WAITING" || customer.status === "SERVING" || customer.status === "DELAYED").length;
  const metrics = [
    { label: "CUSTOMERS TODAY", value: String(result.customers_arrived), tone: "cyan" },
    { label: "ACTIVE CUSTOMERS", value: String(activeCustomers), tone: "blue" },
    { label: "AVERAGE WAITING", value: `${number(result.average_waiting_time)} TU`, tone: "warning" },
    { label: "AVERAGE SERVICE", value: `${number(result.average_service_time)} TU`, tone: "blue" },
    { label: "QUEUE LENGTH", value: String(result.queue_length), tone: "warning" },
    { label: "COMPLETED", value: String(result.customers_served), tone: "success" },
    { label: "THROUGHPUT", value: number(result.throughput), tone: "cyan" },
    { label: "COUNTER UTILIZATION", value: `${number(result.counter_utilization)}%`, tone: "blue" },
    { label: "STAFF UTILIZATION", value: `${number(result.staff_utilization)}%`, tone: "blue" },
    { label: "OPERATIONAL RISK", value: result.operational_risk, tone: `risk-${result.operational_risk.toLowerCase()}` },
  ];

  const summary = [
    ["SIMULATION DURATION", `${number(result.simulation_duration)} TU`],
    ["CUSTOMERS ARRIVED", String(result.customers_arrived)],
    ["CUSTOMERS SERVED", String(result.customers_served)],
    ["AVERAGE WAITING TIME", `${number(result.average_waiting_time)} TU`],
    ["AVERAGE SERVICE TIME", `${number(result.average_service_time)} TU`],
    ["THROUGHPUT", number(result.throughput)],
    ["COUNTER UTILIZATION", `${number(result.counter_utilization)}%`],
    ["STAFF UTILIZATION", `${number(result.staff_utilization)}%`],
    ["OPERATIONAL RISK", result.operational_risk],
  ];

  return <div className="operations-view analytics-view">
    <PageHeading hasData />
    <DatasetNotice name={dataset?.name} />
    <div className="analytics-source"><span className="analytics-source__signal" /><span>DATA SOURCE</span><b>SIMULATED / SYNTHETIC DATA</b><i /> <span>RECORDS: {customers.length}</span><span className="analytics-source__run">LATEST SIMULATION · {number(result.simulation_duration)} TU</span></div>
    <section className="analytics-kpis" aria-label="Operational analytics key performance indicators">{metrics.map((metric, index) => <article className="analytics-kpi" key={metric.label}><span><i>{String(index + 1).padStart(2, "0")}</i>{metric.label}</span><b className={`analytics-kpi__value analytics-kpi__value--${metric.tone}`}>{metric.value}</b></article>)}</section>

    <div className="analytics-chart-grid">
      <BarChart title="CUSTOMER ARRIVALS" description="Arrivals grouped across the simulation horizon · TU" points={analytics.arrivals} color="cyan" unit=" customers" />
      <BarChart title="QUEUE LENGTH" description="Customers arrived but not yet started service at each interval · estimated from event times" points={analytics.queue} color="warning" unit=" customers" />
      <BarChart title="WAITING TIME DISTRIBUTION" description="Customer records grouped by observed waiting time · TU" points={analytics.waitingDistribution} color="blue" unit=" customers" />
      <BarChart title="TRANSACTIONS BY TYPE" description="Transaction types present in returned customer records" points={analytics.transactionsByType} color="cyan" unit=" records" />
      <UtilizationChart title="COUNTER UTILIZATION" description="AGGREGATE DATA · per-counter busy time / available time" points={analytics.counterUtilization} />
      <UtilizationChart title="STAFF UTILIZATION" description={analytics.staffUtilization.length ? "Per-staff busy time / available time" : "STAFF-LEVEL DATA NOT AVAILABLE"} points={analytics.staffUtilization} />
    </div>

    <div className="analytics-lower-grid">
      <section className="analytics-summary-panel"><div className="analytics-panel-heading"><div><span className="section-heading__index">01</span><h2>SIMULATION SUMMARY</h2></div><span>BACKEND RESULT</span></div><dl className="analytics-summary-list">{summary.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={label === "OPERATIONAL RISK" ? `analytics-risk--${result.operational_risk.toLowerCase()}` : ""}>{value}</dd></div>)}</dl></section>
      <section className="little-law-panel"><div className="analytics-panel-heading"><div><span className="section-heading__index">02</span><h2>LITTLE&apos;S LAW</h2></div><span>OBSERVED SIMULATION METRIC</span></div><div className="little-law-equation"><span>L</span><i>=</i><span>λ</span><i>W</i></div><p className="little-law-note">Observed L uses time-weighted customer presence; observed W uses completed customer records. Finite-run measurements need not be exactly equal.</p><dl className="little-law-values"><div><dt>OBSERVED L · AVG IN SYSTEM</dt><dd>{number(analytics.observedSystemSize)}</dd></div><div><dt>OBSERVED λ · ARRIVALS / TU</dt><dd>{number(analytics.observedArrivalRate, 3)}</dd></div><div><dt>OBSERVED W · COMPLETED CUSTOMERS</dt><dd>{number(analytics.observedTimeInSystem)} TU</dd></div><div><dt>λ × W</dt><dd>{number(analytics.calculatedLambdaW)}</dd></div></dl></section>
    </div>

    <section className="current-risk-panel" aria-label={`Current operational risk: ${result.operational_risk}`}><div className="analytics-panel-heading"><div><span className="section-heading__index">03</span><h2>CURRENT RISK</h2></div><span>FINAL BACKEND CLASSIFICATION · NO RISK TIME SERIES AVAILABLE</span></div><div className="current-risk-panel__body"><b className={`analytics-risk-badge analytics-risk-badge--${result.operational_risk.toLowerCase()}`}>{result.operational_risk}</b><p>Rule-based operational risk returned by this simulation. A historical risk trend is not available from the current backend response.</p></div></section>

    <MetricDefinitions />
    <p className="analytics-footnote">ALL VISUALIZATIONS ARE DERIVED FROM THE LATEST SIMULATION RESULT · NO HISTORICAL OR SYNTHETIC SERIES ARE GENERATED</p>
  </div>;
}

function PageHeading({ hasData }: { hasData: boolean }) {
  return <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow__line" /> INSIGHTS / OPERATIONAL ANALYTICS</div><h1>ANALYTICS <span>{"//"}</span> OPERATIONS</h1><p className="page-heading__subtitle">Observed branch performance calculated from returned SimPy events</p></div><div className="page-heading__meta"><StatusIndicator label={hasData ? "SIMULATION RESULT" : "NO ANALYTICS DATA"} tone={hasData ? "online" : "neutral"} compact /><span className="mono-label">SOURCE / LATEST SIMULATION</span></div></div>;
}

function DatasetNotice({ name }: { name: string | undefined }) {
  if (!name) return null;
  return <div className="analytics-dataset-separation"><span>SEPARATE DATASET LOADED</span><b>{name}</b><p>Dataset Management data is independent; charts below continue to use simulation results only.</p></div>;
}
