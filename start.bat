@echo off
title ProCoach FCF - Launcher
echo ===============================================
echo   ProCoach FCF - Iniciando servidores...
echo ===============================================
echo.

:: Add local packages to Python path
set PYTHONPATH=%~dp0.venv_packages;%PYTHONPATH%

:: Start FastAPI backend in a new window
echo [1/2] Iniciando API en http://localhost:8080
start "ProCoach API" cmd /k "set PYTHONPATH=%~dp0.venv_packages;%PYTHONPATH% && python -m uvicorn api.server:app --reload --host 0.0.0.0 --port 8080 --log-level info"

:: Wait for API to start
echo     Esperando que la API arranque...
timeout /t 4 /nobreak >nul

:: Start React frontend in a new window
echo [2/2] Iniciando Frontend en http://localhost:5173
cd procoach
start "ProCoach Frontend" cmd /k "npm run dev"
cd ..

:: Wait for frontend to compile
echo     Esperando que el frontend compile...
timeout /t 5 /nobreak >nul

:: Open browser automatically
echo.
echo [3/3] Abriendo navegador...
start "" "http://localhost:5173"

echo.
echo ===============================================
echo   Servidores activos!
echo.
echo   Frontend:  http://localhost:5173
echo   API:       http://localhost:8080
echo   API docs:  http://localhost:8080/docs
echo.
echo   Cierra las ventanas "ProCoach API" y
echo   "ProCoach Frontend" para parar los servidores.
echo ===============================================
echo.
pause
