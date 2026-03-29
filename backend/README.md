# JanVaani Backend (Dockerized)

This backend is isolated from the Vercel frontend and runs with MySQL in Docker.

## Run with Docker

```bash
cd backend
docker-compose up --build
```

Backend: `http://localhost:5000`
MySQL: `localhost:3307`

## Environment

`docker-compose.yml` already contains:
- `DB_HOST=mysql`
- `DB_USER=root`
- `DB_PASSWORD=root1234`
- `DB_NAME=janvaani`

Set your frontend origin in compose:
- `FRONTEND_ORIGIN=https://your-vercel-app.vercel.app`

## Health

- `GET /health` -> `{ "status": "OK" }`

## APIs

- `POST /api/improve`
- `POST /api/classify`
- `POST /api/evidence`
- `POST /api/complaints`
- `GET /api/complaints/status`
- `GET /api/dashboard`
- Auth + generate endpoints are also available under `/api`.

## Deploy Backend (Render/Railway)

Use this folder as service root:
- Build: `npm install`
- Start: `npm start`
- Expose port `5000`

Set env vars:
- `PORT=5000`
- `HOST=0.0.0.0`
- `FRONTEND_ORIGIN=https://your-vercel-app.vercel.app`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
