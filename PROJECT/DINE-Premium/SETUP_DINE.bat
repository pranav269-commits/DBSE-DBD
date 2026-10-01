@echo off
setlocal
cd /d "%~dp0"
title DINE First-Time Setup
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows_setup.ps1"
echo.
if errorlevel 1 (
  echo Setup did not complete. Read the error above.
) else (
  echo Setup finished successfully.
)
echo.
pause
