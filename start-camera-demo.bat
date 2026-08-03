@echo off
title Pixel Pet - Camera Demo
cd /d "%~dp0"

where node >/dev/null 2>/dev/null
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install it from https://nodejs.org/ first.
  pause
  exit /b 1
)

echo Starting local server...
start "Pixel Pet Server" node server.js
timeout /t 2 /nobreak >/dev/null
start "" "http://localhost:8000/camera-demo.html"
echo.
echo Demo page opened. Close the Pixel Pet Server window to stop.
pause
