from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.database import get_db
from app.models import Order
from app.services.orders import serialize_order
router=APIRouter(prefix='/api/cashier',tags=['cashier'])
@router.get('/orders')
def cashier_orders(db:Session=Depends(get_db)):
    rows=db.scalars(select(Order).options(selectinload(Order.items),selectinload(Order.table)).where(Order.bill_requested==True).order_by(Order.created_at.desc())).all()
    return [serialize_order(x)|{"payment_status":x.payment.payment_status if x.payment else 'PENDING'} for x in rows]
