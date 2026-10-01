# API Testing — Swagger / Postman
Base URL: `http://127.0.0.1:8000`

## Health
`GET /api/health`

## Resolve a table QR
`GET /api/tables/token/TBL-G3L91T`

## Get menu
`GET /api/menu`
Optional query parameters: `category_id`, `veg`, `available`.

## Create order
`POST /api/orders`
```json
{
  "qr_token": "TBL-G3L91T",
  "items": [
    {"menu_item_id": 4, "quantity": 1},
    {"menu_item_id": 7, "quantity": 2},
    {"menu_item_id": 11, "quantity": 1}
  ],
  "special_instructions": "Less spicy"
}
```
The server ignores client-side prices and loads current menu prices from MySQL.

## Get order
`GET /api/orders/1`

## Change status
`PATCH /api/orders/1/status`
```json
{"status":"ACCEPTED"}
```
Continue with PREPARING, READY, SERVED. Invalid jumps return HTTP 409.

## Call waiter
`POST /api/waiter-requests`
```json
{"qr_token":"TBL-G3L91T","order_id":1}
```

## Request bill
`POST /api/orders/1/request-bill`

## Pay
`POST /api/orders/1/payment`
```json
{"payment_method":"UPI"}
```

## Dashboard / analytics
- `GET /api/admin/dashboard`
- `GET /api/admin/analytics`
- `GET /api/admin/activity`
