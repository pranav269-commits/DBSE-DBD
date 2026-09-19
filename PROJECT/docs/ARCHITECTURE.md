# Dine Architecture

Dine is separated into three application layers while keeping a single startup command.

```text
Customer / Kitchen / Manager Browser
                |
                v
+-----------------------------------+
|            FRONTEND               |
| HTML + CSS + Vanilla JavaScript   |
| Fetch API + EventSource (SSE)     |
+-----------------------------------+
                |
      HTTP JSON / SSE streams
                |
                v
+-----------------------------------+
|             BACKEND               |
| Node.js HTTP server               |
| API routes + QR + event hub       |
| Store abstraction                 |
+-----------------------------------+
          |                 |
          |                 |
          v                 v
 Local persistent      MySQL store
 backend/data/              |
                            v
+-----------------------------------+
|            DATABASE               |
| Normalized schema + constraints   |
| Transactions + triggers + views   |
| Procedures + functions + queries  |
+-----------------------------------+
```

## Request flow

1. The table board requests `/api/tables` and renders a QR for each available table.
2. A QR opens `/menu.html?table=N&token=...` on the customer's phone.
3. The backend validates the table/token before allowing table-scoped actions.
4. The customer submits an order through `POST /api/orders`.
5. The store locks/calculates the order and persists it.
6. The backend pushes `new_order` to the kitchen SSE channel.
7. Kitchen status changes are stored and pushed back to the exact table SSE channel.
8. Payment and service state determine when a table becomes available again.
9. Manager metrics are derived from order, inventory and table state.

## Database review flow

For a DBSE review, configure MySQL and run:

```powershell
npm run db:setup
npm run db:review
```

To focus on one table:

```powershell
npm run db:review -- --table orders
```

This shows the physical relational design alongside the working frontend.
