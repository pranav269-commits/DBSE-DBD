@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was not found. Install Node.js LTS, then run this file again.
  echo.
  pause
  exit /b 1
)
echo.
echo Starting Dine...
echo Tables:  http://localhost:8080
echo Kitchen: http://localhost:8080/kitchen.html
echo Manager: http://localhost:8080/admin.html
echo.
echo Keep this window open while Dine is running.
echo.
npm start
pause
