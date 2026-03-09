@echo off
title ProCoach FCF - Launcher
echo ===============================================
echo   ProCoach FCF - Iniciando servidores...
echo ===============================================
echo.

:: Start FastAPI backend in a new window
echo [1/2] Iniciando API en http://localhost:8080
start "ProCoach API" cmd /k "cd /d %~dp0 && python -m uvicorn api.server:app --reload --host 0.0.0.0 --port 8080 --log-level info"

:: Wait for API to start
echo     Esperando que la API arranque...
timeout /t 4 /nobreak >nul

:: Start Next.js frontend in a new window
echo [2/2] Iniciando Frontend en http://localhost:3000
start "ProCoach Frontend" cmd /k "cd /d %~dp0procoach-next && npm run dev"

:: Wait for frontend to compile
echo     Esperando que el frontend compile...
timeout /t 6 /nobreak >nul

:: Open browser automatically
echo.
echo [3/3] Abriendo navegador...
start "" "http://localhost:3000"

echo.
echo ===============================================
echo   Servidores activos!
echo.
echo   Frontend:  http://localhost:3000
echo   API:       http://localhost:8080
echo   API docs:  http://localhost:8080/docs
echo.
echo   Cierra las ventanas "ProCoach API" y
echo   "ProCoach Frontend" para parar los servidores.
echo ===============================================
echo.
pause
