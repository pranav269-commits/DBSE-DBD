# Dine — Smart Restaurant Ordering System

Dine is a full-stack restaurant ordering project organized into three clear layers: **frontend**, **backend**, and **database**. It supports 12 QR-linked tables, customer ordering, real-time kitchen coordination, exact billing, inventory monitoring, manager analytics, and an optional MySQL relational implementation for database review.

## Project structure

```text
Dine/
├── frontend/               Browser UI
│   ├── index.html
│   ├── menu.html
│   ├── kitchen.html
│   ├── admin.html
│   ├── *.js
│   ├── styles.css
│   └── assets/
│
├── backend/                Application/API layer
│   ├── src/
│   ├── data/
│   └── tests/
│
├── database/               MySQL / DBSE layer
│   ├── schema.sql
│   ├── seed.sql
│   ├── advanced.sql
│   ├── analytics_queries.sql
│   ├── review.sql
│   ├── setup.js
│   └── review.js
│
├── docs/
├── package.json
├── .env.example
└── START_DINE.bat
```

## Main features

- 12 unique table QR codes.
- Customer menu tied to the exact scanned table.
- 32 menu items with local dish artwork.
- Search, categories, dietary filtering and cart management.
- Exact itemised billing with 5% GST.
- Cash and UPI QR payment workflow.
- Real-time customer → kitchen order delivery using Server-Sent Events.
- Real-time kitchen → customer order-status tracking.
- Live table availability and release after served + paid.
- Kitchen-load and quick-serve suggestions.
- Inventory deduction, low-stock detection and manager restocking.
- Manager dashboard with operational metrics.
- MySQL schema with normalization, PK/FK constraints, indexes, transactions, triggers, procedures, functions, views, CTEs and window functions.
- Read-only database-review command for presenting tables, columns, keys, relations and row counts.

## Run the complete project in VS Code

### 1. Extract the ZIP

Open the extracted **Dine-Advanced** folder in VS Code.

### 2. Open the terminal

Use:

```text
Terminal → New Terminal
```

### 3. Start Dine

```powershell
npm start
```

The default local mode uses only Node.js built-in modules, so no `npm install` is required just to run the working application.

Open manually if the browser does not open:

```text
Tables:   http://localhost:8080
Kitchen:  http://localhost:8080/kitchen.html
Manager:  http://localhost:8080/admin.html
```

## Phone QR workflow

1. Keep the laptop and phone on the same Wi-Fi/hotspot.
2. Run `npm start`.
3. Allow Node.js on **Private networks** if Windows Firewall asks.
4. Scan an available table QR from the table board.
5. Order from the phone.
6. Open Kitchen on the laptop; the order arrives without refresh.
7. Progress the order through Confirmed → Preparing → Cooking → Plating → Ready → Served.
8. The phone receives status changes live.
9. Complete payment.
10. Once the order is both paid and served, the table becomes available again.

The terminal prints the LAN address embedded in QR codes, for example:

```text
Phone QR: http://192.168.1.5:8080
```

If the wrong network adapter is selected, set `PUBLIC_HOST` in `.env` to the laptop's Wi-Fi IPv4 address.

## MySQL database mode

For the database review, use the actual MySQL implementation.

### 1. Create `.env`

On Windows Command Prompt:

```cmd
copy .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

### 2. Install the optional MySQL driver

```powershell
npm install mysql2
```

### 3. Configure credentials in `.env`

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=dine_db
```

### 4. Create and seed the database

```powershell
npm run db:setup
```

### 5. Enable MySQL application mode

Change:

```text
USE_MYSQL=false
```

to:

```text
USE_MYSQL=true
```

Then run:

```powershell
npm start
```

## Database review command

After MySQL is configured:

```powershell
npm run db:review
```

This prints every application table with its exact row count, columns, SQL types, primary/index keys and foreign-key relationships.

To inspect one table:

```powershell
npm run db:review -- --table orders
```

You can also open `database/review.sql` in MySQL Workbench for ready-made review queries.

## Verification

Run:

```powershell
npm run verify
```

The automated suite verifies syntax, folder architecture, QR uniqueness, 12-table concurrent ordering, menu artwork, real-time SSE delivery, exact billing, payment consistency, and table release rules.

## Useful commands

```powershell
npm start                         # Run application
npm run dev                       # Run with Node watch mode
npm test                          # Automated tests
npm run check                     # JavaScript syntax checks
npm run verify                    # Full verification
npm run db:setup                  # Build/seed MySQL database
npm run db:review                 # Review every MySQL table
npm run db:review -- --table orders
```

## Architecture and DBSE documentation

- `docs/ARCHITECTURE.md` — frontend/backend/database data flow.
- `docs/DBSE_MAPPING.md` — database concepts mapped to implementation.
- `database/ER_DIAGRAM.md` — relationship map.
- `database/README.md` — database setup/review guide.
- `frontend/README.md` — frontend file responsibilities.
- `backend/README.md` — backend file responsibilities.
