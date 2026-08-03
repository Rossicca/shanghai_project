@echo off
title Shanghai Project - Dev
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node.js first.
  pause
  exit /b 1
)

echo ============================================
echo   Shanghai Project one-click start
echo   Backend: http://localhost:8787
echo   Web app: Expo will print the final address
echo ============================================
echo.

curl -s --max-time 2 http://localhost:8787/health >nul 2>nul
if errorlevel 1 (
  echo Starting backend server...
  start "Shanghai Backend" cmd /k node server\server.js
  %SystemRoot%\System32\timeout.exe /t 2 /nobreak >nul
) else (
  echo Backend already running.
)

echo Starting Expo web app...
npm run web

pause
