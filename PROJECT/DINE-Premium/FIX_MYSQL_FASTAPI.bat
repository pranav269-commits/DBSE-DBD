@echo off
setlocal
cd /d "%~dp0backend"
echo Installing MySQL 8 authentication support into the DINE virtual environment...
.venv\Scripts\python.exe -m pip install "PyMySQL[rsa]==1.1.1"
if errorlevel 1 (
  echo.
  echo FIX FAILED. Read the pip error above.
  pause
  exit /b 1
)
echo.
echo FIX COMPLETE.
echo Now close any old DINE FastAPI window and run START_DINE.bat.
pause
