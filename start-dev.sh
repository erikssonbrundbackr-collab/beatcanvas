#!/bin/bash

echo "🚀 Starting Drum MIDI Visualizer..."
echo "----------------------------------------"

pkill -f "vite --port 5000" 2>/dev/null
pkill -f "uvicorn server:app" 2>/dev/null
sleep 1

PYTHON_BIN=$(which python3 2>/dev/null || which python 2>/dev/null)
if [ -z "$PYTHON_BIN" ]; then
    echo "❌ Python not found. Please install Python 3."
    exit 1
fi

echo "📡 Starting FastAPI backend on port 8000..."
$PYTHON_BIN -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload > /tmp/fastapi.log 2>&1 &
FASTAPI_PID=$!

sleep 3

if curl -s http://localhost:8000/ > /dev/null 2>&1; then
    echo "✅ FastAPI backend running on http://localhost:8000"
else
    echo "❌ FastAPI failed to start. Check /tmp/fastapi.log"
    cat /tmp/fastapi.log
    exit 1
fi

echo "🎨 Starting Vite frontend on port 5000..."
npm run dev > /tmp/vite.log 2>&1 &
VITE_PID=$!

sleep 3

if curl -s http://localhost:5000/ > /dev/null 2>&1; then
    echo "✅ Vite frontend running on http://localhost:5000"
else
    echo "❌ Vite failed to start. Check /tmp/vite.log"
    cat /tmp/vite.log
    kill $FASTAPI_PID 2>/dev/null
    exit 1
fi

echo "----------------------------------------"
echo "✨ All servers running!"
echo "   Frontend: http://localhost:5000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo "   Logs:     /tmp/vite.log, /tmp/fastapi.log"
echo ""
echo "Press Ctrl+C to stop all servers"

trap 'echo "Stopping servers..."; kill $FASTAPI_PID $VITE_PID 2>/dev/null; exit' INT

wait $FASTAPI_PID $VITE_PID
