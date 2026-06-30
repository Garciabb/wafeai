# Como iniciar WafeAI

## Cada vez que quieras correr el proyecto:

### 1. Backend (Terminal 1)
```
cd backend
venv\Scripts\uvicorn main:app --reload --port 8000
```

### 2. Frontend (Terminal 2)
```
cd frontend
node node_modules/vite/bin/vite.js
```

## URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Documentacion API: http://localhost:8000/docs

## Credenciales demo
- Admin:    admin@wafeai.co    / wafeai2026
- Analista: analista@wafeai.co / wafeai2026

## Repoblar base de datos (si es necesario)
```
cd backend
venv\Scripts\python seed.py
```
