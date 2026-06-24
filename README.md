# DataPulse

DataPulse is an internal developer tool that continuously polls registered API endpoints, tracks uptime/latency/error rate, streams live metrics to a React dashboard over WebSockets, and fires threshold-based alerts (Slack-compatible webhook) with incident logging.

## Architecture

- **Frontend**: React + Vite + TypeScript, Recharts, Vanilla CSS.
- **Backend**: Node.js + Express + TypeScript, native `ws` WebSocket server.
- **Database**: PostgreSQL (manual partitioning/indexing for time-series).
- **Polling Engine**: Node.js worker process.
- **Deployment**: AWS EC2, Nginx, PM2.

## Local Development Setup

### 1. Database

Ensure you have PostgreSQL running. Create a database for the project.

```bash
createdb datapulse
```

Run the schema and seed scripts (located in `db/`).

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

You will need an `.env` file in the `backend` directory:

```env
DATABASE_URL=postgres://user:password@localhost:5432/datapulse
PORT=3001
WS_PORT=3002
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

You will need an `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3002
```

## Production Deployment

Detailed deployment instructions will be added here once the project is fully implemented.
