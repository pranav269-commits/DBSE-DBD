from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Category, MenuItem
from app.schemas.menu import MenuItemCreate, MenuItemUpdate
router=APIRouter(prefix='/api', tags=['menu'])
def pack(x):
    return {"id":x.id,"category_id":x.category_id,"category_name":x.category.name if x.category else None,"name":x.name,"description":x.description,"price":str(x.price),"image_url":x.image_url,"veg":x.veg,"available":x.available,"featured":x.featured,"prep_minutes":x.prep_minutes}
@router.get('/categories')
def categories(db:Session=Depends(get_db)):
    return [{"id":x.id,"name":x.name,"sort_order":x.sort_order} for x in db.scalars(select(Category).order_by(Category.sort_order)).all()]
@router.get('/menu')
def menu(category_id:int|None=None, veg:bool|None=None, available:bool|None=None, db:Session=Depends(get_db)):
    q=select(MenuItem)
    if category_id is not None:q=q.where(MenuItem.category_id==category_id)
    if veg is not None:q=q.where(MenuItem.veg==veg)
    if available is not None:q=q.where(MenuItem.available==available)
    return [pack(x) for x in db.scalars(q.order_by(MenuItem.featured.desc(),MenuItem.id)).all()]
@router.post('/menu',status_code=status.HTTP_201_CREATED)
def create(p:MenuItemCreate,db:Session=Depends(get_db)):
    x=MenuItem(**p.model_dump());db.add(x);db.commit();db.refresh(x);return pack(x)
@router.put('/menu/{item_id}')
def update(item_id:int,p:MenuItemUpdate,db:Session=Depends(get_db)):
    x=db.get(MenuItem,item_id)
    if not x: raise HTTPException(404,'Menu item not found')
    for k,v in p.model_dump().items():setattr(x,k,v)
    db.commit();db.refresh(x);return pack(x)
@router.patch('/menu/{item_id}/availability')
def availability(item_id:int, available:bool, db:Session=Depends(get_db)):
    x=db.get(MenuItem,item_id)
    if not x:raise HTTPException(404,'Menu item not found')
    x.available=available;db.commit();return pack(x)
@router.delete('/menu/{item_id}',status_code=204)
def delete(item_id:int,db:Session=Depends(get_db)):
    x=db.get(MenuItem,item_id)
    if not x:raise HTTPException(404,'Menu item not found')
    db.delete(x);db.commit()
