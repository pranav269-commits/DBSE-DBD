from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ActivityLog, MenuItem, Order, OrderItem, Payment, RestaurantTable
router=APIRouter(prefix='/api/admin',tags=['admin'])
@router.get('/dashboard')
def dashboard(db:Session=Depends(get_db)):
    today=func.current_date()
    revenue=db.scalar(select(func.coalesce(func.sum(Payment.amount),0)).where(func.date(Payment.paid_at)==today)) or 0
    total_orders=db.scalar(select(func.count(Order.id)).where(func.date(Order.created_at)==today)) or 0
    active=db.scalar(select(func.count(Order.id)).where(Order.status!='COMPLETED')) or 0
    occupied=db.scalar(select(func.count(RestaurantTable.id)).where(RestaurantTable.status!='AVAILABLE')) or 0
    avg_order=db.scalar(select(func.coalesce(func.avg(Order.total),0)).where(func.date(Order.created_at)==today)) or 0
    avg_prep=db.scalar(select(func.coalesce(func.avg(Order.estimated_minutes),0)).where(func.date(Order.created_at)==today)) or 0
    return {"today_revenue":float(revenue),"total_orders":int(total_orders),"active_orders":int(active),"occupied_tables":int(occupied),"average_order_value":float(avg_order),"average_preparation_time":float(avg_prep)}
@router.get('/analytics')
def analytics(db:Session=Depends(get_db)):
    status_rows=db.execute(select(Order.status,func.count(Order.id)).group_by(Order.status)).all()
    dish_rows=db.execute(select(OrderItem.item_name_snapshot,func.sum(OrderItem.quantity).label('qty')).group_by(OrderItem.item_name_snapshot).order_by(func.sum(OrderItem.quantity).desc()).limit(8)).all()
    hourly=db.execute(select(func.hour(Payment.paid_at),func.sum(Payment.amount)).group_by(func.hour(Payment.paid_at)).order_by(func.hour(Payment.paid_at))).all()
    return {"orders_by_status":[{"status":s,"count":int(c)} for s,c in status_rows],"most_ordered_dishes":[{"name":n,"quantity":int(q)} for n,q in dish_rows],"hourly_revenue":[{"hour":int(h),"revenue":float(r)} for h,r in hourly if h is not None]}
@router.get('/activity')
def activity(db:Session=Depends(get_db)):
    rows=db.scalars(select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(30)).all();return [{"id":x.id,"event_type":x.event_type,"message":x.message,"created_at":x.created_at.isoformat()} for x in rows]

@router.get('/tables/{table_id}')
def table_detail(table_id:int, db:Session=Depends(get_db)):
    table=db.get(RestaurantTable,table_id)
    if not table:
        from fastapi import HTTPException
        raise HTTPException(404,'Table not found')
    order=db.scalar(select(Order).where(Order.table_id==table.id,Order.status!='COMPLETED').order_by(Order.created_at.desc()))
    return {
      "table_number":table.table_number,"status":table.status,
      "order": None if not order else {"id":order.id,"order_number":order.order_number,"status":order.status,"total":float(order.total),"created_at":order.created_at.isoformat(),"bill_requested":order.bill_requested}
    }
