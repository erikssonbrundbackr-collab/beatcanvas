#!/bin/bash

# Start FastAPI backend
uvicorn server.main:app --host 0.0.0.0 --port 8000 &
FASTAPI_PID=$!

# Start Vite frontend  
vite --port 5000 --host 0.0.0.0 &
VITE_PID=$!

# Wait for both processes
wait $FASTAPI_PID $VITE_PID
