# Validation Report
Validation performed in the build environment before packaging.

## Passed
- Python source compilation: `backend/` and `scripts/` compile without syntax errors.
- FastAPI application imports successfully when pointed at an isolated SQLAlchemy SQLite test database.
- 22 unique `/api` route paths load, including table-token resolution, menu CRUD, orders, kitchen, waiter, cashier, payment, admin analytics and table detail.
- Service-level end-to-end transaction test passed: create order → ACCEPTED → PREPARING → READY → SERVED → bill/payment completion → table AVAILABLE.
- Duplicate-payment prevention is represented by a unique DB constraint and backend check.
- Exactly 12 unique table tokens are present in `seed.sql`.
- Exactly 12 non-empty QR PNGs are generated in `qr-codes/` and `frontend/public/qr-codes/`.
- QR generator uses `PUBLIC_FRONTEND_URL`, so production QRs can use HTTPS without changing application logic.

## Environment-limited checks
- The build container has no MySQL server, so the actual MySQL Workbench execution of `schema.sql`/`seed.sql` could not be run here.
- The build container cannot reach npm/PyPI registries. `npm install` timed out due unavailable network/DNS, so a Vite production build could not be executed here. `package.json` is pinned to standard React/Vite versions and the exact Windows run steps are in the README.
- The container Python is 3.13; the project requirements are explicitly pinned for Python 3.12 as requested.

Run the local acceptance checklist on the target Windows machine after installing dependencies and starting MySQL.
