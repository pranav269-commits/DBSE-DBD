from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.database import get_db
from app.models import Order
from app.services.orders import serialize_order
from app.services.priority import compute_priority
router=APIRouter(prefix='/api/kitchen',tags=['kitchen'])
@router.get('/orders')
def orders(db:Session=Depends(get_db)):
    rows=db.scalars(select(Order).options(selectinload(Order.items),selectinload(Order.table)).where(Order.status.in_(['PLACED','ACCEPTED','PREPARING','READY'])).order_by(Order.created_at)).all()
    out=[]
    for x in rows:
        d=serialize_order(x);d['priority']=compute_priority(x.created_at,x.estimated_minutes,sum(i.quantity for i in x.items));out.append(d)
    return out
