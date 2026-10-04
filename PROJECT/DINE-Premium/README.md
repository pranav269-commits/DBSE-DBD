
## Windows one-click start (recommended)

1. Extract the ZIP fully.
2. Double-click **START_DINE.bat**.
3. On the first run, it automatically launches setup and asks for your MySQL root password.
4. It starts/verifies the MySQL Windows service, FastAPI on port **8000**, and React/Vite on port **5173**.
5. It verifies the database by loading all **12 restaurant tables** through FastAPI, then opens the DINE home page.

If an old DINE Node/Vite or Python/Uvicorn process is holding port 5173 or 8000, the launcher closes that stale DINE process before restarting the correct service. It does not stop unrelated programs on those ports; instead it shows which process must be closed.

Use **STOP_DINE.bat** to stop the DINE frontend/backend. MySQL is intentionally left running.

**First-time manual option:** you can still run `SETUP_DINE.bat` first and then use `START_DINE.bat` for later launches.

# DINE — Smart QR-Based Restaurant Ordering & Management System

DINE is a full-stack DBSE university project built with React, FastAPI, SQLAlchemy and MySQL. It presents 12 secure table QR codes, lets a customer order from a phone, sends the order to a live kitchen board, tracks status automatically, supports waiter/bill requests, closes payment at the cashier, releases the table, and updates database-driven analytics.

## 1. Prerequisites (Windows)
- VS Code
- Python **3.12.x**
- Node.js 20+ and npm
- MySQL Community Server 8.x
- MySQL Workbench

## 2. MySQL setup
1. Open MySQL Workbench and connect to your local MySQL server.
2. Open and execute `database/schema.sql`.
3. Open and execute `database/seed.sql`.
4. Confirm `dine_db` contains exactly 12 rows in `restaurant_tables`.
5. Optional verification: `SELECT table_number, qr_token, status FROM dine_db.restaurant_tables ORDER BY table_number;`

## 3. Backend — PowerShell
```powershell
cd DINE-Premium\backend
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```
Edit `.env` and replace `YOUR_PASSWORD` in `DATABASE_URL` with your MySQL password. If the password contains reserved URL characters, URL-encode them.

Start API:
```powershell
uvicorn app.main:app --reload --port 8000
```
- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/api/health

## 4. Frontend — second PowerShell terminal
```powershell
cd DINE-Premium\frontend
npm install
Copy-Item .env.example .env
npm run dev
```
Open http://localhost:5173

## 5. Important local routes
- QR Home: http://localhost:5173/
- Kitchen: http://localhost:5173/kitchen
- Cashier: http://localhost:5173/cashier
- Admin: http://localhost:5173/admin
- Presentation: http://localhost:5173/presentation
- Swagger: http://127.0.0.1:8000/docs

## 6. Complete demo flow
1. Home shows all 12 QR cards.
2. Scan/open Table 07 QR (`TBL-G3L91T`).
3. Add food and place order.
4. Kitchen receives it and advances status.
5. Customer tracking page updates automatically without refresh.
6. After SERVED, customer requests the bill.
7. Cashier chooses CASH / UPI / CARD and marks paid.
8. Backend writes payment, completes the order, and returns the table to AVAILABLE in one transaction.
9. Admin dashboard revenue/order metrics update from MySQL.

## 7. QR generation
Local QR codes are already included. To regenerate them:
```powershell
cd DINE-Premium
$env:PUBLIC_FRONTEND_URL="http://localhost:5173"
python scripts\generate_qr.py
```
For production, set the public HTTPS frontend domain first:
```powershell
$env:PUBLIC_FRONTEND_URL="https://your-dine-domain.example"
python scripts\generate_qr.py
```
This writes the 12 PNGs to both `qr-codes/` and `frontend/public/qr-codes/`.

## 8. Public deployment (removes same-Wi-Fi limitation)
Deploy the three tiers independently:
- `frontend/` → Vercel or any static/Vite host.
- `backend/` → Render, Railway, or any Python host.
- MySQL → managed cloud MySQL.

Set frontend environment variables:
- `VITE_API_URL=https://YOUR_PUBLIC_API_DOMAIN`
- `VITE_PUBLIC_FRONTEND_URL=https://YOUR_PUBLIC_FRONTEND_DOMAIN`

Set backend environment variables:
- `DATABASE_URL=mysql+pymysql://USER:PASSWORD@CLOUD_HOST:3306/dine_db`
- `FRONTEND_ORIGIN=https://YOUR_PUBLIC_FRONTEND_DOMAIN`
- `ENVIRONMENT=production`
- `TAX_RATE=0.05`

Run `database/schema.sql` and `database/seed.sql` on cloud MySQL. Regenerate QR codes using the final HTTPS frontend URL, rebuild/redeploy the frontend, and test a phone on mobile data while the kitchen laptop uses a different network. Both communicate through public HTTPS endpoints, so they do **not** need the same Wi-Fi.

See `docs/DEPLOYMENT.md` for the detailed checklist.

## ONE-CLICK WINDOWS START

For Windows + VS Code users, the project root includes two launchers:

- `SETUP_DINE.bat` — run once for first-time local setup.
- `START_DINE.bat` — use for normal runs; it checks MySQL, starts FastAPI and React, verifies the table API, and opens the homepage.

See `ONE_CLICK_WINDOWS.md` for details.

## Phone QR mode

In this build, the phone uses only the same frontend URL on port **5173**. Browser requests to `/api/...` are proxied by Vite to FastAPI on `127.0.0.1:8000` inside the PC. This avoids direct phone access to port 8000 and fixes the common endless **Loading DINE** symptom caused by a blocked backend port.

## MySQL 8 authentication fix
This build installs `PyMySQL[rsa]` so FastAPI can authenticate to MySQL 8 accounts that use `caching_sha2_password` or `sha256_password`. `START_DINE.bat` also restarts the DINE FastAPI process from the current project folder on every launch and verifies `/api/db-health` before starting React.
