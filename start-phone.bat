@echo off
title Shanghai Project - Phone (Expo Go)
cd /d "%~dp0shanghai_project"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install it from https://nodejs.org/ first.
  pause
  exit /b 1
)

echo ============================================
echo   Shanghai Project - Phone mode (Expo Go)
echo   [1] Backend API server   (port 8787)
echo   [2] Expo dev server + QR code
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
echo Phone steps:
echo   1. Install "Expo Go" from App Store / Google Play
echo   2. Connect phone and PC to the SAME Wi-Fi
echo   3. Scan the QR code below with Expo Go
echo.
echo   If app can not reach backend, allow Node.js inbound
echo   in Windows Firewall (ports 8081 + 8787).
echo.
npx expo start

pause
