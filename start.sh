#!/bin/bash
echo "==============================================="
echo "  ProCoach FCF - Starting servers..."
echo "==============================================="
echo ""

# Install Python deps
pip install -r requirements.txt -q

# Start FastAPI backend in background
echo "[1/2] Starting FastAPI backend on http://localhost:8080 (0.0.0.0 exposed)"
uvicorn api.server:app --reload --host 0.0.0.0 --port 8080 &
API_PID=$!

# Wait for API to start
sleep 2

# Start React frontend in background
echo "[2/2] Starting React frontend on http://localhost:5173"
cd procoach
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "==============================================="
echo "  Servers running!"
echo "  Frontend:  http://localhost:5173"
echo "  API:       http://localhost:8080"
echo "  API docs:  http://localhost:8080/docs"
echo "==============================================="
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait and cleanup on exit
trap "kill $API_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
