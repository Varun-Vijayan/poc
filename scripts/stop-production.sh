#!/bin/bash

echo "🛑 Stopping Production Environment..."

# Stop workers
if [ -f worker1.pid ]; then
    WORKER1_PID=$(cat worker1.pid)
    kill $WORKER1_PID 2>/dev/null
    rm worker1.pid
    echo "   ✅ Worker 1 stopped (PID: $WORKER1_PID)"
fi

if [ -f worker2.pid ]; then
    WORKER2_PID=$(cat worker2.pid)
    kill $WORKER2_PID 2>/dev/null
    rm worker2.pid
    echo "   ✅ Worker 2 stopped (PID: $WORKER2_PID)"
fi

# Stop Docker services
echo "🐳 Stopping Docker services..."
docker-compose down

echo "✅ Production environment stopped" 