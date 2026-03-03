@echo off
echo ===============================================
echo   ProCoach FCF - Starting servers...
echo ===============================================
echo.

:: Add local packages to Python path (for FastAPI/uvicorn if installed locally)
set PYTHONPATH=%~dp0.venv_packages;%PYTHONPATH%

:: Start FastAPI backend in a new window
echo [1/2] Starting FastAPI backend on http://localhost:8000
start "ProCoach API" cmd /k "set PYTHONPATH=%~dp0.venv_packages;%PYTHONPATH% && python -m uvicorn api.server:app --reload --port 8000 --log-level info"

:: Wait a moment for API to start
timeout /t 3 /nobreak >nul

:: Start React frontend
echo [2/2] Starting React frontend on http://localhost:5173
cd procoach
start "ProCoach Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ===============================================
echo   Servidores iniciados!
echo.
echo   Frontend:  http://localhost:5173
echo   API:       http://localhost:8000
echo   API docs:  http://localhost:8000/docs
echo ===============================================
echo.
echo Abre http://localhost:5173 en tu navegador
echo Ve a la pestana "FCF Intelligence" en el sidebar
echo.
pause
