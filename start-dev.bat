@echo off
title Shanghai Project - Dev
cd /d "%~dp0shanghai_project"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install it from https://nodejs.org/ first.
  pause
  exit /b 1
)

echo ============================================
echo   Shanghai Project one-click start
echo   [1] Backend API server  (localhost:8787)
echo   [2] Expo web app        (localhost:8081)
echo ============================================
echo.

echo Checking backend...
curl -s --max-time 2 http://localhost:8787/health >nul 2>nul
if errorlevel 1 (
  echo Starting backend server...
  start "Shanghai Backend" cmd /k node server\server.js
  %SystemRoot%\System32\timeout.exe /t 2 /nobreak >nul
) else (
  echo Backend already running, skip.
)

echo.
echo Starting Expo web app...
echo   - For phone demo: press q, then run "npx expo start"
echo   - To stop: close the backend window and press Ctrl+C here
echo.
npm run web

pause
