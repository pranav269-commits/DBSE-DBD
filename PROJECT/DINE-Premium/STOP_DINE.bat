@echo off
setlocal
cd /d "%~dp0"
title Stop DINE
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ports=8000,5173; foreach($port in $ports){ Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue ^| ForEach-Object { $p=Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $_.OwningProcess) -ErrorAction SilentlyContinue; if($p -and (($port -eq 8000 -and ($p.Name -match 'python' -or $p.CommandLine -match 'uvicorn')) -or ($port -eq 5173 -and $p.Name -match 'node'))){ Write-Host ('Stopping ' + $p.Name + ' on port ' + $port + ' (PID ' + $p.ProcessId + ')'); Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue } } }; Write-Host 'DINE frontend/backend stopped. MySQL service was left running.' -ForegroundColor Green"
echo.
pause
