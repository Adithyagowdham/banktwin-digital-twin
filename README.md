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

## Deploy (Publish to the Web)

BANKTWIN is a full-stack app: the **Next.js frontend** and the **FastAPI backend** are deployed as two separate services and connected by URL. The backend holds in-memory simulation/ML state and runs CPU-heavy SimPy work, so it should be a long-running web service (Render, Railway, Fly.io), not a serverless function.

Recommended: **frontend on Vercel**, **backend on Render** (both have free tiers).

### 1. Push your code to GitHub

```powershell
git add .
git commit -m "Prepare deployment"
git push origin main
```

### 2. Deploy the backend (Render)

1. Go to https://render.com and sign in (GitHub is easiest).
2. **New +** -> **Blueprint** and pick this repository. Render reads the included `render.yaml` and creates the `banktwin-backend` web service. (Alternatively, create a **Web Service** manually with Root Directory `backend`, Build `pip install -r requirements.txt`, Start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, and Health Check Path `/api/health`.)
3. Wait for the deploy to finish, then copy the backend URL Render gives you, e.g. `https://banktwin-backend.onrender.com`.
4. In the backend service **Environment** settings, set `CORS_ALLOW_ORIGINS` to your frontend's public URL (see step 3). You can set this now or update it after the frontend is live.

### 3. Deploy the frontend (Vercel)

1. Go to https://vercel.com and sign in with GitHub.
2. **Add New** -> **Project** and import this repository. Use the repo root as the Root Directory.
3. Under **Environment Variables**, add `NEXT_PUBLIC_API_URL` = your backend URL from step 2 (e.g. `https://banktwin-backend.onrender.com`). This is the value that tells the frontend where to send API calls.
4. **Deploy**. Vercel builds (`next build`) and gives you a URL like `https://your-app.vercel.app`.

### 4. Connect them (CORS)

Open your live frontend URL once, then in the **Render** backend service set `CORS_ALLOW_ORIGINS` to that exact frontend origin (no trailing slash), for example `https://your-app.vercel.app`, and redeploy the backend. If you use a custom domain later, add it to the comma-separated list as well.

### Notes

- `.env.local` is for **local** development only (`NEXT_PUBLIC_API_URL=http://127.0.0.1:8001`). For the live site, the value comes from the Vercel environment variable, not this file. Do not commit real secrets.
- The backend's free tier may "sleep" when idle and take ~30-60s to wake on the first request. Upgrade the plan if you need it always warm.
- After changing the frontend's `NEXT_PUBLIC_API_URL`, you must **redeploy** the frontend, because that value is baked in at build time.
