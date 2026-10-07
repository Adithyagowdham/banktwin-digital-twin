# BANKTWIN

**Digital Twin of Banking Operations for Predictive Decision-Making and Process Optimization**

BANKTWIN is a local research prototype for discrete-event branch simulation, operational analytics, dataset-backed machine learning, stochastic scenario analysis, exhaustive resource search, and consolidated reporting. Outputs describe the prototype's inputs and assumptions; they are not validated banking prescriptions.

## Technology

- Frontend: Next.js and TypeScript
- Backend: FastAPI and Pydantic
- Simulation: SimPy
- Machine learning: scikit-learn, pandas, numpy, and joblib
- Dataset input: local CSV/XLSX files and explicitly labeled synthetic simulation data

## Project Structure

```text
app/                       Next.js routes and global styles
components/                Dashboard, operations, reports, and analysis UI
lib/                       API clients, app state, and shared types
backend/app/main.py        FastAPI entry point and API routes
backend/app/simulation/    SimPy engine, metrics, and What-If analysis
backend/app/ml/            Model features, training, evaluation, and service
backend/app/optimization/  Exhaustive resource search and objective scoring
backend/tests/             Backend API, simulation, ML, and optimization tests
```

## Run Frontend

From `my-free-app`:

```powershell
npm install
npm run dev
```

The frontend uses port 3001. The backend URL is configured in `.env.local` with `NEXT_PUBLIC_API_URL=http://127.0.0.1:8001`.

## Run Backend

From `my-free-app/backend`, using a Python environment with dependencies installed:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

The API health check is `http://127.0.0.1:8001/api/health`.

## Run Tests and Frontend Checks

Backend, from `my-free-app/backend`:

```powershell
python -m pytest
```

Frontend, from `my-free-app`:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Use BANKTWIN

1. Open Digital Twin, configure branch parameters, and run a SimPy simulation. The latest run feeds Customer Flow, Transactions, Counters & Staff, Analytics, Dashboard, and Reports.
2. Use Dataset Management to inspect a local CSV/XLSX file or generate data labeled `SYNTHETIC / SIMULATED DATA`.
3. Open AI Risk Prediction and explicitly train the in-memory Random Forest models from a dataset containing the required features. Model Validation reports held-out metrics only after training succeeds.
4. Use What-If Analysis to compare selected configurations across 1, 5, or 10 seeded runs. These results do not replace the main simulation result.
5. Use Optimization to exhaustively evaluate counter/staff ranges with repeated SimPy runs. Review the objective formula, prototype weights, Pareto set, and optional current-configuration baseline.
6. Open Reports for a source-labeled view of current simulation, trained-model evaluation, What-If, and Optimization results. Only available data is exported.

## Data Governance

BANKTWIN is a research prototype. Do not upload confidential customer information. Use authorized institutional data where applicable. Public aggregate banking datasets generally do not include individual waiting time, queue length, staff utilization, or counter utilization. Synthetic data is labeled and must not be presented as observed banking data.

## Research Limitations

Simulation assumptions influence results. Model performance depends on dataset quality and representativeness. Synthetic-data metrics do not establish real-bank performance. Optimization weights and thresholds are prototype heuristics, not banking-industry standards. Institutional validation is required before any real deployment; results are not guaranteed operational prescriptions.
