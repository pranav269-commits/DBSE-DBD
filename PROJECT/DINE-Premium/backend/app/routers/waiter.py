from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import RestaurantTable, WaiterRequest, ActivityLog
from app.schemas.waiter import WaiterRequestCreate
router=APIRouter(prefix='/api/waiter-requests',tags=['waiter'])
@router.get('')
def list_requests(db:Session=Depends(get_db)):
    rows=db.scalars(select(WaiterRequest).where(WaiterRequest.status=='ACTIVE').order_by(WaiterRequest.created_at)).all();return [{"id":x.id,"table_id":x.table_id,"table_number":db.get(RestaurantTable,x.table_id).table_number,"order_id":x.order_id,"status":x.status,"created_at":x.created_at.isoformat()} for x in rows]
@router.post('')
def create(p:WaiterRequestCreate,db:Session=Depends(get_db)):
    t=db.scalar(select(RestaurantTable).where(RestaurantTable.qr_token==p.qr_token,RestaurantTable.is_active==True))
    if not t:raise HTTPException(404,'Invalid table QR')
    active=db.scalar(select(WaiterRequest).where(WaiterRequest.table_id==t.id,WaiterRequest.status=='ACTIVE'))
    if active:raise HTTPException(409,'An active waiter request already exists')
    x=WaiterRequest(table_id=t.id,order_id=p.order_id,status='ACTIVE');db.add(x);db.add(ActivityLog(event_type='WAITER_REQUEST',message=f'Table {t.table_number:02d} requested assistance'));db.commit();db.refresh(x);return {"id":x.id,"message":"A staff member is on the way."}
@router.patch('/{request_id}/acknowledge')
def ack(request_id:int,db:Session=Depends(get_db)):
    x=db.get(WaiterRequest,request_id)
    if not x:raise HTTPException(404,'Request not found')
    x.status='ACKNOWLEDGED';x.acknowledged_at=datetime.utcnow();db.commit();return {"message":"Request acknowledged"}

@router.get('/order/{order_id}')
def for_order(order_id:int,db:Session=Depends(get_db)):
    x=db.scalar(select(WaiterRequest).where(WaiterRequest.order_id==order_id).order_by(WaiterRequest.created_at.desc()))
    return {"status":x.status if x else None,"request_id":x.id if x else None}
