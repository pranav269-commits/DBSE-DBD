@echo off
setlocal
cd /d "%~dp0"
title DINE One-Click Launcher
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows_start.ps1"
if errorlevel 1 (
  echo.
  echo DINE did not start completely. Read the error above.
  echo.
  pause
)
