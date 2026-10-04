# Public Internet Deployment
The goal is to make DINE reachable from any internet connection, not only one LAN.

## Architecture
Customer / Kitchen / Cashier / Admin → HTTPS React frontend → HTTPS FastAPI REST API → managed cloud MySQL.

## A. Cloud MySQL
1. Create a managed MySQL 8 database.
2. Allow the backend host to connect.
3. Execute `database/schema.sql` and `database/seed.sql` against that database.
4. Save the provider connection values securely.

## B. FastAPI backend
1. Deploy the `backend/` folder to a Python-capable host (Render/Railway are examples, not requirements).
2. Use Python 3.12.
3. Install `requirements.txt`.
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (use the provider's port variable syntax).
5. Add `DATABASE_URL`, `FRONTEND_ORIGIN`, `ENVIRONMENT=production`, `TAX_RATE=0.05`.
6. Confirm `https://API_DOMAIN/api/health` and `https://API_DOMAIN/docs`.

## C. React frontend
1. Deploy `frontend/` to Vercel or another Vite host.
2. Build command: `npm run build`; output directory: `dist`.
3. Add `VITE_API_URL=https://API_DOMAIN` and `VITE_PUBLIC_FRONTEND_URL=https://FRONTEND_DOMAIN`.
4. Rebuild after environment-variable changes.
5. Ensure SPA history fallback routes (`/order/...`, `/track/...`, etc.) resolve to `index.html`; Vercel uses the included `vercel.json`.

## D. CORS and HTTPS
`FRONTEND_ORIGIN` must exactly match the public frontend origin. Use HTTPS for both frontend and API. Never put DB credentials into React environment variables.

## E. Production QR codes
From the project root:
```powershell
$env:PUBLIC_FRONTEND_URL="https://FRONTEND_DOMAIN"
python scripts\generate_qr.py
```
Commit/redeploy the regenerated files in `frontend/public/qr-codes/`. The QR target becomes `https://FRONTEND_DOMAIN/order/<TOKEN>` and no longer contains localhost or a private IP.

## F. Cross-network test
1. Kitchen laptop: connect to normal Wi-Fi; open `https://FRONTEND_DOMAIN/kitchen`.
2. Phone: disable Wi-Fi and use 4G/5G.
3. Scan Table 07 QR and place an order.
4. Verify kitchen sees it; update status.
5. Verify phone updates without manual refresh.
6. Request bill, complete payment on cashier, and verify admin metrics/table availability.

If all steps pass, the system has no same-Wi-Fi requirement because both devices use public HTTPS services.
