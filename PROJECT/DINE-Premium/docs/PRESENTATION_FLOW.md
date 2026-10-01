# Faculty Presentation Flow
1. Open `/` and show 12 scannable QR cards.
2. Explain that each card maps a random `qr_token` to one database table.
3. Scan Table 07 and show mobile-first React menu.
4. Place an order and explain POST `/api/orders`, Pydantic validation, SQLAlchemy, MySQL transaction.
5. Open `/kitchen`; accept → prepare → ready → served.
6. Keep the phone tracking page visible; React polling updates it automatically every ~1.8 seconds.
7. Use Call Waiter to demonstrate another POST/UPDATE lifecycle.
8. After SERVED, request bill and open `/cashier`.
9. Select UPI and Mark Paid. Explain unique payment constraint + transaction + table release.
10. Open `/admin` and show real aggregate metrics/activity.
11. Open `/presentation` to explain React → REST → FastAPI → SQLAlchemy → MySQL.
12. Explain production architecture: public HTTPS frontend/API/cloud MySQL removes same-Wi-Fi dependency.

## Smart priority formula
`score = waiting_minutes + floor(0.5 × estimated_minutes) + (2 × item_count)`
- score < 20 → NORMAL
- 20–34 → MEDIUM
- 35+ → HIGH
This is deterministic and explainable; it is not claimed as AI/ML.
