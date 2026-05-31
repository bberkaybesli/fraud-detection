@echo off
echo ========================================
echo   Fraud Detection System - Demo Baslat
echo ========================================
echo.

echo [1/5] Docker servislerini baslatiyorum...
docker compose up -d

echo.
echo [2/5] Servislerin hazir olmasini bekliyorum (60 saniye)...
timeout /t 60 /nobreak

echo.
echo [3/5] Saglik kontrolu yapiyorum...
curl -s http://localhost:3000/health

echo.
echo [4/5] Dashboard server baslatiliyor...
start /B cmd /c "cd frontend && node server.js"

echo.
echo [5/5] Dashboard aciliyor...
timeout /t 2 /nobreak
start http://localhost:8080

echo.
echo ========================================
echo   HAZIR! Dashboard tarayicida acildi
echo ========================================
echo.
echo Dashboard: http://localhost:8080
echo Backend API: http://localhost:3000
echo Neo4j Browser: http://localhost:7474
echo.
echo Kullanilabilir komutlar:
echo   - Loglari izle: docker compose logs -f backend
echo   - Servisleri durdur: docker compose down
echo.
echo Sunum rehberi: SUNUM_REHBERI.md
echo.
pause
