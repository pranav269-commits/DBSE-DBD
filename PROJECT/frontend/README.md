# Frontend

The `frontend` layer contains everything served to the browser.

## Pages

- `index.html` — 12-table QR/access board.
- `menu.html` — customer menu, cart, order tracking and payment flow.
- `kitchen.html` — real-time kitchen order dashboard.
- `admin.html` — manager dashboard, inventory and menu controls.

## JavaScript

- `board.js` — table availability, QR rendering and board SSE updates.
- `menu.js` — menu filters, cart, order submission, billing and customer SSE updates.
- `kitchen.js` — live order queue and kitchen status updates.
- `admin.js` — dashboard metrics, inventory restocking and menu availability.

## Styling and assets

- `styles.css` — shared responsive visual system.
- `assets/menu/` — local dish artwork used by menu items.

The frontend is served by the Node backend. For the complete working application, run `npm start` from the project root rather than opening the HTML files directly.
