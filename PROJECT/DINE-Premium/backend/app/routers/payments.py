from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.database import get_db
from app.models import ActivityLog, Order, OrderStatusHistory, Payment
from app.schemas.payment import PaymentCreate
router=APIRouter(prefix='/api/orders',tags=['payments'])
@router.post('/{order_id}/payment')
def pay(order_id:int,p:PaymentCreate,db:Session=Depends(get_db)):
    method=p.payment_method.upper()
    if method not in {'CASH','UPI','CARD'}:raise HTTPException(400,'Payment method must be CASH, UPI, or CARD')
    x=db.scalar(select(Order).options(selectinload(Order.table)).where(Order.id==order_id))
    if not x:raise HTTPException(404,'Order not found')
    if not x.bill_requested:raise HTTPException(409,'Bill has not been requested')
    if db.scalar(select(Payment).where(Payment.order_id==order_id)):raise HTTPException(409,'Payment already exists')
    try:
        payment=Payment(order_id=x.id,amount=x.total,payment_method=method,payment_status='PAID')
        db.add(payment);db.add(OrderStatusHistory(order_id=x.id,old_status=x.status,new_status='COMPLETED'));x.status='COMPLETED';x.completed_at=datetime.utcnow();x.table.status='AVAILABLE';db.add(ActivityLog(event_type='PAYMENT',message=f'{x.order_number} paid by {method}; Table {x.table.table_number:02d} released'));db.commit();db.refresh(payment)
        return {"payment_id":payment.id,"status":"PAID","order_status":"COMPLETED","table_status":"AVAILABLE"}
    except Exception:
        db.rollback();raise
