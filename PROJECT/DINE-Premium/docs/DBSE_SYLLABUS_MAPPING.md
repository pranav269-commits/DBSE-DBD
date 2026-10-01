# DBSE Syllabus Mapping
| Topic | DINE implementation |
|---|---|
| REST API | GET/POST/PUT/PATCH/DELETE endpoints under `/api` |
| FastAPI routing | Separate routers for tables, menu, orders, kitchen, cashier, payments, waiter, admin |
| Path parameters | `/orders/{order_id}`, `/tables/token/{token}` |
| Query parameters | Menu filtering by category/veg/availability |
| Request validation | Pydantic order/menu/payment/waiter schemas |
| HTTP codes | 201 create, 204 delete, 400 validation, 404 missing, 409 state conflict |
| CRUD | Admin menu create/read/update/delete |
| Relational design | 9 related MySQL tables |
| PK/FK/constraints | Defined in `database/schema.sql` |
| JOINs | Views, analytics and ORM relationships |
| Aggregates | Revenue/orders/averages/top dishes |
| GROUP BY | status, dish and hourly analytics |
| Indexes | operational lookup columns indexed |
| Views | active orders and daily sales |
| Transactions / ACID | order creation and payment completion |
| Procedure / trigger | daily-sales procedure and payment-activity trigger |
| Swagger/Postman | `/docs` plus `docs/API_TESTING.md` |
