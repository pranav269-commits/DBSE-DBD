# DINE One-Click Windows Launcher

## First time only
Double-click `SETUP_DINE.bat`.

It checks Python 3.12 / Node.js / npm, starts MySQL when possible, creates `backend/.venv`, installs backend and frontend packages, asks once for the MySQL root password, writes the local `.env` files, runs `schema.sql` and `seed.sql`, verifies exactly 12 restaurant tables, and runs a React build check.

## Every normal run
Double-click `START_DINE.bat`.

It:
1. checks/starts the MySQL Windows service,
2. starts FastAPI on `http://127.0.0.1:8000`,
3. waits for `/api/health`,
4. starts React on exactly `http://localhost:5173`,
5. verifies `/api/tables` returns 12 tables,
6. opens the DINE homepage automatically.

The Vite development command uses port 5173 with `--strictPort`, so it will not silently jump to port 5174 and create a CORS mismatch.

If port 5173 or 8000 is occupied by another program, the launcher stops and tells you instead of starting DINE on an unexpected port.

## Important
Do not run `SETUP_DINE.bat` every time. Use it only for the first setup or if you intentionally rebuild the local environment. For normal use, run `START_DINE.bat`.

## Important database setup note

`SETUP_DINE.bat` is the first-time/reset installer. If an older `dine_db` already exists from a previous DINE build, setup recreates that database before loading the current schema. This prevents MySQL ERROR 3780 foreign-key type conflicts. Normal daily use should be through `START_DINE.bat`, which does not reset the database.
