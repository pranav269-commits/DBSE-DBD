from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.database import get_db
from app.models import ActivityLog, Order, OrderStatusHistory
from app.schemas.order import OrderCreate, StatusUpdate
from app.services.orders import create_order, serialize_order, change_status
router=APIRouter(prefix='/api/orders',tags=['orders'])
def get_order(db,id):
    return db.scalar(select(Order).options(selectinload(Order.items),selectinload(Order.table)).where(Order.id==id))
@router.post('',status_code=status.HTTP_201_CREATED)
def post_order(p:OrderCreate,db:Session=Depends(get_db)):
    return serialize_order(create_order(db,p))
@router.get('/{order_id}')
def read_order(order_id:int,db:Session=Depends(get_db)):
    x=get_order(db,order_id)
    if not x:raise HTTPException(404,'Order not found')
    return serialize_order(x)
@router.get('/{order_id}/history')
def history(order_id:int,db:Session=Depends(get_db)):
    if not db.get(Order,order_id):raise HTTPException(404,'Order not found')
    rows=db.scalars(select(OrderStatusHistory).where(OrderStatusHistory.order_id==order_id).order_by(OrderStatusHistory.changed_at)).all()
    return [{"old_status":x.old_status,"new_status":x.new_status,"changed_at":x.changed_at.isoformat()} for x in rows]
@router.patch('/{order_id}/status')
def patch_status(order_id:int,p:StatusUpdate,db:Session=Depends(get_db)):
    x=get_order(db,order_id)
    if not x:raise HTTPException(404,'Order not found')
    return serialize_order(change_status(db,x,p.status))
@router.post('/{order_id}/request-bill')
def bill(order_id:int,db:Session=Depends(get_db)):
    x=get_order(db,order_id)
    if not x:raise HTTPException(404,'Order not found')
    if x.status!='SERVED':raise HTTPException(409,'Bill can be requested only after the order is SERVED')
    if x.bill_requested:raise HTTPException(409,'Bill already requested')
    x.bill_requested=True;x.table.status='BILL_REQUESTED';db.add(ActivityLog(event_type='BILL_REQUEST',message=f'Table {x.table.table_number:02d} requested bill for {x.order_number}'));db.commit()
    return {"message":"Bill requested","order_id":x.id}
