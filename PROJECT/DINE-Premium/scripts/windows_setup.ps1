$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Backend = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'
$Database = Join-Path $Root 'database'
$SetupMarker = Join-Path $Root '.dine_setup_complete'

function Write-Step($text) {
    Write-Host "`n=== $text ===" -ForegroundColor Cyan
}

function Require-Command($name, $message) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "$message"
    }
}

function Ensure-MySqlService {
    $svc = Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'MySQL*' } | Select-Object -First 1
    if (-not $svc) {
        Write-Warning 'No Windows service named MySQL* was found. If MySQL Server is installed another way, make sure it is running.'
        return
    }
    if ($svc.Status -eq 'Running') {
        Write-Host "MySQL service '$($svc.Name)' is already running." -ForegroundColor Green
        return
    }

    Write-Host "Starting MySQL service '$($svc.Name)'..."
    try {
        Start-Service -Name $svc.Name -ErrorAction Stop
    }
    catch {
        Write-Host 'Administrator permission is required to start MySQL. Windows may show a UAC prompt.' -ForegroundColor Yellow
        $arg = "-NoProfile -ExecutionPolicy Bypass -Command `"Start-Service -Name '$($svc.Name)'`""
        $p = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList $arg
        if ($p.ExitCode -ne 0) {
            throw "Could not start MySQL service '$($svc.Name)'. Start it manually and run SETUP_DINE.bat again."
        }
    }
}

function Find-MySqlExe {
    $cmd = Get-Command mysql.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $candidates = @(
        'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe',
        'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe',
        'C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe'
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }

    $found = Get-ChildItem 'C:\Program Files\MySQL' -Filter mysql.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { return $found.FullName }
    throw 'mysql.exe was not found. Install MySQL Community Server or add its bin folder to PATH.'
}

try {
    # A previous failed setup must never be treated as complete by START_DINE.
    Remove-Item $SetupMarker -Force -ErrorAction SilentlyContinue

    Write-Host 'DINE - FIRST TIME WINDOWS SETUP' -ForegroundColor Yellow
    Write-Host "Project: $Root"

    Write-Step 'Checking required software'
    Require-Command 'py.exe' 'Python launcher (py.exe) was not found. Install Python 3.12 first.'
    Require-Command 'node.exe' 'Node.js was not found. Install Node.js first.'
    Require-Command 'npm.cmd' 'npm was not found. Install Node.js first.'

    & py -3.12 --version | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.12 is required. Install Python 3.12 and rerun setup.' }
    node --version | Out-Host
    npm --version | Out-Host

    Write-Step 'Starting MySQL Server'
    Ensure-MySqlService
    Start-Sleep -Seconds 2
    $mysqlExe = Find-MySqlExe
    Write-Host "Using MySQL client: $mysqlExe"

    Write-Step 'Creating Python virtual environment'
    $venvPython = Join-Path $Backend '.venv\Scripts\python.exe'
    $venvOk = $false
    if (Test-Path $venvPython) {
        try {
            & $venvPython --version | Out-Host
            if ($LASTEXITCODE -eq 0) { $venvOk = $true }
        } catch { $venvOk = $false }
    }
    if (-not $venvOk) {
        $venvDir = Join-Path $Backend '.venv'
        if (Test-Path $venvDir) {
            Write-Host 'Removing incomplete .venv...'
            Remove-Item $venvDir -Recurse -Force
        }
        Push-Location $Backend
        & py -3.12 -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw 'Could not create backend\.venv.' }
        Pop-Location
    } else {
        Write-Host '.venv already exists and is usable.' -ForegroundColor Green
    }

    Write-Step 'Installing FastAPI backend packages'
    & $venvPython -m pip install --upgrade pip
    if ($LASTEXITCODE -ne 0) { throw 'pip upgrade failed.' }
    & $venvPython -m pip install -r (Join-Path $Backend 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }

    Write-Step 'Installing React frontend packages'
    Push-Location $Frontend
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
    Pop-Location

    Write-Step 'Configuring frontend environment'
    @(
        'VITE_API_URL='
    ) | Set-Content -Encoding ASCII (Join-Path $Frontend '.env')

    Write-Step 'Configuring MySQL and backend environment'
    Write-Host 'Enter the SAME MySQL root password you use in MySQL Workbench.' -ForegroundColor Yellow
    $secure = Read-Host 'MySQL root password' -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    if ([string]::IsNullOrWhiteSpace($plain)) { throw 'MySQL password cannot be empty.' }

    $encoded = [uri]::EscapeDataString($plain)
    @(
        "DATABASE_URL=mysql+pymysql://root:$encoded@localhost:3306/dine_db",
        'FRONTEND_ORIGIN=*',
        'ENVIRONMENT=development',
        'TAX_RATE=0.05'
    ) | Set-Content -Encoding ASCII (Join-Path $Backend '.env')

    $env:MYSQL_PWD = $plain
    try {
        Write-Host 'Checking MySQL login...'
        & $mysqlExe -u root --batch --skip-column-names -e 'SELECT 1;'
        if ($LASTEXITCODE -ne 0) { throw 'MySQL login failed. Check the root password.' }

        Write-Step 'Creating and seeding dine_db'

        # DINE previously used more than one database schema during development.
        # If an older dine_db already exists, CREATE TABLE IF NOT EXISTS can leave
        # legacy column types in place and MySQL will reject new foreign keys with
        # ERROR 3780 (incompatible referencing/referenced columns). SETUP_DINE is
        # the first-time/reset installer, so recreate the DINE database cleanly.
        $existingDb = (& $mysqlExe -u root --batch --skip-column-names -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='dine_db';").Trim()
        if ($LASTEXITCODE -ne 0) { throw 'Could not check for an existing dine_db database.' }
        if ($existingDb -eq 'dine_db') {
            Write-Host 'Existing dine_db detected. Recreating it to remove legacy schema conflicts...' -ForegroundColor Yellow
            & $mysqlExe -u root -e 'DROP DATABASE IF EXISTS dine_db;'
            if ($LASTEXITCODE -ne 0) { throw 'Could not reset the existing dine_db database.' }
        }

        $schema = Get-Content -Raw -Encoding UTF8 (Join-Path $Database 'schema.sql')
        $schema | & $mysqlExe -u root --default-character-set=utf8mb4
        if ($LASTEXITCODE -ne 0) { throw 'database\schema.sql failed.' }

        $seed = Get-Content -Raw -Encoding UTF8 (Join-Path $Database 'seed.sql')
        $seed | & $mysqlExe -u root --default-character-set=utf8mb4
        if ($LASTEXITCODE -ne 0) { throw 'database\seed.sql failed.' }

        $tableCount = (& $mysqlExe -u root --batch --skip-column-names -e 'SELECT COUNT(*) FROM dine_db.restaurant_tables;').Trim()
        if ($LASTEXITCODE -ne 0) { throw 'Could not verify restaurant_tables.' }
        Write-Host "Verified restaurant tables: $tableCount"
        if ($tableCount -ne '12') { throw "Expected 12 restaurant tables but found $tableCount." }
    }
    finally {
        Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
        $plain = $null
    }

    Write-Step 'Checking React production build'
    Push-Location $Frontend
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'React build failed.' }
    Pop-Location

    Set-Content -Path $SetupMarker -Value (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') -Encoding ASCII

    Write-Host "`nSETUP COMPLETE." -ForegroundColor Green
    Write-Host 'From now on, double-click START_DINE.bat to run MySQL + FastAPI + React.' -ForegroundColor Green
    Write-Host 'You normally do NOT need to run SETUP_DINE.bat again.'
}
catch {
    Write-Host "`nSETUP FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Fix the message above, then run SETUP_DINE.bat again.' -ForegroundColor Yellow
    exit 1
}
