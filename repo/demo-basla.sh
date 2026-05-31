#!/bin/bash

echo "========================================"
echo "  Fraud Detection System - Demo Başlat"
echo "========================================"
echo ""

echo "[1/5] Docker servislerini başlatıyorum..."
docker compose up -d

echo ""
echo "[2/5] Servislerin hazır olmasını bekliyorum (60 saniye)..."
sleep 60

echo ""
echo "[3/5] Sağlık kontrolü yapıyorum..."
curl -s http://localhost:3000/health | jq '.' || curl -s http://localhost:3000/health

echo ""
echo ""
echo "[4/5] Dashboard server başlatılıyor..."
cd frontend
node server.js &
SERVER_PID=$!
cd ..
sleep 2

echo ""
echo "[5/5] Dashboard açılıyor..."

# OS'e göre tarayıcıda aç
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open http://localhost:8080
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open http://localhost:8080 2>/dev/null || echo "Lütfen manuel olarak açın: http://localhost:8080"
else
    echo "Lütfen manuel olarak açın: http://localhost:8080"
fi

echo ""
echo "========================================"
echo "  HAZIR! Dashboard tarayıcıda açıldı"
echo "========================================"
echo ""
echo "Dashboard: http://localhost:8080"
echo "Backend API: http://localhost:3000"
echo "Neo4j Browser: http://localhost:7474"
echo ""
echo "Kullanılabilir komutlar:"
echo "  - Logları izle: docker compose logs -f backend"
echo "  - Servisleri durdur: docker compose down"
echo "  - Dashboard server'ı durdur: kill $SERVER_PID"
echo ""
echo "Sunum rehberi: SUNUM_REHBERI.md"
echo ""
echo "Dashboard server çalışıyor (PID: $SERVER_PID)"
echo "Durdurmak için Ctrl+C"
echo ""

# Wait for Ctrl+C
wait $SERVER_PID
