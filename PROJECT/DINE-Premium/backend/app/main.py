from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.database import engine
from app.routers import tables, menu, orders, kitchen, waiter, cashier, payments, admin

settings = get_settings()
app = FastAPI(
    title='DINE Smart Restaurant API',
    version='1.0.1',
    description='FastAPI REST backend for the DINE DBSE project',
)

origins = [x.strip() for x in settings.frontend_origin.split(',') if x.strip()]
allow_all = '*' in origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'] if allow_all else origins,
    allow_credentials=False if allow_all else True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get('/api/health')
def health():
    return {'status': 'ok', 'environment': settings.environment}

@app.get('/api/db-health')
def db_health():
    try:
        with engine.connect() as connection:
            connection.execute(text('SELECT 1'))
            table_count = connection.execute(text('SELECT COUNT(*) FROM restaurant_tables')).scalar_one()
        return {
            'status': 'ok',
            'database': 'dine_db',
            'restaurant_tables': int(table_count),
        }
    except SQLAlchemyError as exc:
        # Local development diagnostic. Keep credentials out of the response.
        message = str(getattr(exc, 'orig', exc))
        raise HTTPException(status_code=503, detail=f'MySQL connection failed: {message}')

for r in [tables.router, menu.router, orders.router, kitchen.router, waiter.router, cashier.router, payments.router, admin.router]:
    app.include_router(r)
