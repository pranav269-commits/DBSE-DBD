$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Backend = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'
$SetupScript = Join-Path $Root 'scripts\windows_setup.ps1'
$SetupMarker = Join-Path $Root '.dine_setup_complete'

function Write-Step($text) {
    Write-Host "`n=== $text ===" -ForegroundColor Cyan
}

function Test-Url($url, $contains = $null) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -lt 200 -or $r.StatusCode -ge 500) { return $false }
        if ($contains -and $r.Content -notmatch [regex]::Escape($contains)) { return $false }
        return $true
    }
    catch { return $false }
}

function Get-ListeningProcess($port) {
    try {
        $conn = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction Stop | Select-Object -First 1
        if (-not $conn) { return $null }
        return Get-CimInstance Win32_Process -Filter "ProcessId = $($conn.OwningProcess)" -ErrorAction SilentlyContinue
    }
    catch { return $null }
}

function Clear-StaleDinePort($port, $role) {
    $proc = Get-ListeningProcess $port
    if (-not $proc) { return }

    $name = [string]$proc.Name
    $cmd = [string]$proc.CommandLine
    $isDine = $false

    if ($role -eq 'backend') {
        $isDine = ($name -match '^(python|pythonw)\.exe$') -or ($cmd -match 'uvicorn') -or ($cmd -match 'app\.main:app')
    }
    elseif ($role -eq 'frontend') {
        $isDine = ($name -match '^node\.exe$') -and (($cmd -match 'vite') -or ($cmd -match 'DINE-Premium') -or ($cmd -match 'dine-premium-frontend'))
    }

    if ($isDine) {
        Write-Host "Closing stale DINE $role process on port $port (PID $($proc.ProcessId))..." -ForegroundColor Yellow
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
        Start-Sleep -Seconds 1
        return
    }

    throw "Port $port is being used by $name (PID $($proc.ProcessId)). Close that program and run START_DINE.bat again."
}


function Get-DineLanIp {
    try {
        $configs = Get-NetIPConfiguration -ErrorAction Stop | Where-Object {
            $_.IPv4DefaultGateway -ne $null -and
            $_.NetAdapter.Status -eq 'Up' -and
            $_.IPv4Address -ne $null
        }
        foreach ($c in $configs) {
            foreach ($a in @($c.IPv4Address)) {
                $ip = [string]$a.IPAddress
                if ($ip -and $ip -notlike '169.254.*' -and $ip -ne '127.0.0.1') { return $ip }
            }
        }
    } catch {}
    return $null
}

function Ensure-DineFirewallRules {
    $rule1 = Get-NetFirewallRule -DisplayName 'DINE Frontend 5173' -ErrorAction SilentlyContinue
    if ($rule1) {
        Write-Host 'Windows Firewall: DINE frontend local-subnet rule already exists.' -ForegroundColor Green
        return
    }

    Write-Host 'DINE needs local-network firewall access for phone QR scanning.' -ForegroundColor Yellow
    Write-Host 'Windows may show one Administrator/UAC prompt.' -ForegroundColor Yellow
    $cmd = @"
`$ErrorActionPreference='Stop'
if (-not (Get-NetFirewallRule -DisplayName 'DINE Frontend 5173' -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName 'DINE Frontend 5173' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -RemoteAddress LocalSubnet | Out-Null
}
"@
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
    $proc = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList '-NoProfile','-EncodedCommand',$encoded
    if ($proc.ExitCode -ne 0) {
        Write-Warning 'Firewall rule was not added. The PC may work while the phone is blocked.'
    } else {
        Write-Host 'Windows Firewall: local-subnet access enabled for port 5173.' -ForegroundColor Green
    }
}
function Ensure-MySqlService {
    $svc = Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'MySQL*' } | Select-Object -First 1
    if (-not $svc) {
        Write-Warning 'No MySQL* Windows service was found. Make sure MySQL Community Server is installed and running.'
        return
    }
    if ($svc.Status -eq 'Running') {
        Write-Host "MySQL: RUNNING ($($svc.Name))" -ForegroundColor Green
        return
    }

    Write-Host "MySQL is stopped. Starting $($svc.Name)..." -ForegroundColor Yellow
    try {
        Start-Service -Name $svc.Name -ErrorAction Stop
    }
    catch {
        Write-Host 'Windows may ask for administrator permission to start MySQL.' -ForegroundColor Yellow
        $arg = "-NoProfile -ExecutionPolicy Bypass -Command `"Start-Service -Name '$($svc.Name)'`""
        $p = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList $arg
        if ($p.ExitCode -ne 0) { throw "Could not start MySQL service '$($svc.Name)'." }
    }
    Start-Sleep -Seconds 2
    $svc.Refresh()
    if ($svc.Status -ne 'Running') { throw "MySQL service '$($svc.Name)' is not running." }
    Write-Host 'MySQL: RUNNING' -ForegroundColor Green
}

function Test-SetupReady {
    return (
        (Test-Path $SetupMarker) -and
        (Test-Path (Join-Path $Backend '.env')) -and
        (Test-Path (Join-Path $Frontend '.env')) -and
        (Test-Path (Join-Path $Backend '.venv\Scripts\python.exe')) -and
        (Test-Path (Join-Path $Frontend 'node_modules'))
    )
}

try {
    Write-Host 'DINE - ONE CLICK START' -ForegroundColor Yellow
    Write-Host "Project: $Root"

    if (-not (Test-SetupReady)) {
        Write-Step 'First run detected - starting automatic setup'
        Write-Host 'You will be asked once for your MySQL root password.' -ForegroundColor Yellow
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $SetupScript
        if ($LASTEXITCODE -ne 0) { throw 'Automatic setup did not complete.' }
    }

    Write-Step 'Starting / verifying MySQL'
    Ensure-MySqlService

    Write-Step 'Preparing phone / QR network access'
    $LanIp = Get-DineLanIp
    if (-not $LanIp) {
        throw 'Could not detect an active LAN IPv4 address. Connect the PC to Wi-Fi/Ethernet and run START_DINE.bat again.'
    }
    $LanFrontend = "http://${LanIp}:5173"
    Write-Host "PC LAN address: $LanIp" -ForegroundColor Green
    Ensure-DineFirewallRules

    @('VITE_API_URL=') | Set-Content -Encoding ASCII (Join-Path $Frontend '.env')

    $env:PUBLIC_FRONTEND_URL = $LanFrontend
    try {
        & (Join-Path $Backend '.venv\Scripts\python.exe') (Join-Path $Root 'scripts\generate_qr.py') | Out-Host
        if ($LASTEXITCODE -ne 0) { throw 'QR code generation failed.' }
    }
    finally {
        Remove-Item Env:PUBLIC_FRONTEND_URL -ErrorAction SilentlyContinue
    }

    Write-Step 'Checking Python MySQL authentication support'
    $venvPython = Join-Path $Backend '.venv\Scripts\python.exe'
    & $venvPython -c "import cryptography, pymysql" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Installing MySQL 8 RSA authentication dependency...' -ForegroundColor Yellow
        & $venvPython -m pip install "PyMySQL[rsa]==1.1.1"
        if ($LASTEXITCODE -ne 0) { throw 'Could not install PyMySQL RSA/cryptography support.' }
    }
    Write-Host 'PyMySQL RSA authentication support: READY' -ForegroundColor Green

    Write-Step 'Starting / verifying FastAPI'
    # Always restart DINE FastAPI so this project uses its own current .env and code.
    Clear-StaleDinePort 8000 'backend'
    $backendCommand = "title DINE FastAPI Backend && cd /d `"$Backend`" && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', $backendCommand -WorkingDirectory $Backend | Out-Null

    $ready = $false
    for ($i = 0; $i -lt 35; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Url 'http://127.0.0.1:8000/api/health') { $ready = $true; break }
    }
    if (-not $ready) {
        throw 'FastAPI did not become ready. Check the DINE FastAPI Backend window for the exact error.'
    }
    Write-Host 'FastAPI: RUNNING on http://127.0.0.1:8000' -ForegroundColor Green

    Write-Step 'Verifying MySQL through FastAPI'
    try {
        $dbHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/db-health' -TimeoutSec 8
        $count = [int]$dbHealth.restaurant_tables
        if ($count -ne 12) { throw "API returned $count tables instead of 12." }
        Write-Host 'MySQL -> FastAPI: CONNECTED (12 tables verified)' -ForegroundColor Green
    }
    catch {
        $detail = $_.Exception.Message
        try {
            if ($_.ErrorDetails.Message) {
                $parsed = $_.ErrorDetails.Message | ConvertFrom-Json
                if ($parsed.detail) { $detail = $parsed.detail }
            }
        } catch {}
        throw "FastAPI started, but MySQL verification failed: $detail"
    }

    Write-Step 'Starting / verifying React frontend'
    if (Test-Url 'http://localhost:5173/' 'DINE') {
        Write-Host 'React: already running on port 5173' -ForegroundColor Green
    }
    else {
        Clear-StaleDinePort 5173 'frontend'
        $frontendCommand = "title DINE React Frontend && cd /d `"$Frontend`" && npm run dev"
        Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', $frontendCommand -WorkingDirectory $Frontend | Out-Null

        $ready = $false
        for ($i = 0; $i -lt 35; $i++) {
            Start-Sleep -Seconds 1
            if (Test-Url 'http://localhost:5173/' 'DINE') { $ready = $true; break }
        }
        if (-not $ready) { throw 'React did not become ready. Check the DINE React Frontend window for the exact error.' }
        Write-Host 'React: RUNNING on http://localhost:5173' -ForegroundColor Green
    }

    Write-Host "`nDINE IS READY." -ForegroundColor Green
    Write-Host 'MySQL:   running and verified'
    Write-Host 'FastAPI (PC): http://127.0.0.1:8000'
    Write-Host 'Phone API: proxied through the same port 5173 URL'
    Write-Host 'Swagger: http://127.0.0.1:8000/docs'
    Write-Host 'Home (PC):    http://localhost:5173/'
    Write-Host "Home (phone/LAN): $LanFrontend/"
    Write-Host 'Kitchen: http://localhost:5173/kitchen'
    Write-Host 'Cashier: http://localhost:5173/cashier'
    Write-Host 'Admin:   http://localhost:5173/admin'
    Write-Host "`nPHONE QR URL: $LanFrontend" -ForegroundColor Cyan
    Write-Host 'Phone API requests are proxied through port 5173 to FastAPI inside this PC.' -ForegroundColor Cyan
    Write-Host 'Phone and PC must be on the same local network for this local-development mode.' -ForegroundColor Yellow
    Write-Host 'Keep the FastAPI and React windows open while using DINE.' -ForegroundColor Yellow

    Start-Process 'http://localhost:5173/'
}
catch {
    Write-Host "`nSTART FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Read the message above. Backend/frontend windows, if opened, contain the detailed log.' -ForegroundColor Yellow
    exit 1
}
