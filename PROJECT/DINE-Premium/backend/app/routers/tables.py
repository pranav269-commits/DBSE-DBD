from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import RestaurantTable
router = APIRouter(prefix='/api/tables', tags=['tables'])
@router.get('')
def list_tables(db: Session=Depends(get_db)):
    rows=db.scalars(select(RestaurantTable).order_by(RestaurantTable.table_number)).all()
    return [{"id":r.id,"table_number":r.table_number,"qr_token":r.qr_token,"status":r.status,"is_active":r.is_active} for r in rows]
@router.get('/token/{token}')
def resolve_token(token:str, db:Session=Depends(get_db)):
    r=db.scalar(select(RestaurantTable).where(RestaurantTable.qr_token==token))
    if not r or not r.is_active: raise HTTPException(404,'Invalid or inactive QR token')
    return {"id":r.id,"table_number":r.table_number,"qr_token":r.qr_token,"status":r.status}
