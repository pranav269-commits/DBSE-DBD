# Backend

The `backend` layer contains the Node.js application, real-time event system, local persistence and automated tests.

## Structure

- `src/server.js` — HTTP server, environment loading, LAN address selection and SSE event hub.
- `src/app.js` — REST API routes, static frontend serving and request handling.
- `src/store.js` — local persistent store and MySQL implementation, including transactional order/payment logic.
- `src/qr.js` — QR SVG generation.
- `src/vendor/QRCode/` — bundled QR encoder implementation.
- `data/seed.js` / `seed.json` — application seed data.
- `data/runtime.json` — local-mode runtime state.
- `tests/` — integration, store, structure and database-review tests.

## Main backend concepts

- REST-style JSON APIs using Node's HTTP server.
- Server-Sent Events (SSE) for customer, kitchen, board and manager live updates.
- QR-token validation for table identity.
- Locked item prices and exact GST calculation.
- Transactional MySQL order/payment operations.
- Inventory-aware menu availability.

Run from the project root:

```powershell
npm start
```

Run verification:

```powershell
npm run verify
```
