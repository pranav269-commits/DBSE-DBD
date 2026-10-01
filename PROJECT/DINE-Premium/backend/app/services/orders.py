from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models import ActivityLog, MenuItem, Order, OrderItem, OrderStatusHistory, RestaurantTable

VALID_TRANSITIONS = {
    "PLACED": {"ACCEPTED"},
    "ACCEPTED": {"PREPARING"},
    "PREPARING": {"READY"},
    "READY": {"SERVED"},
    "SERVED": {"COMPLETED"},
    "COMPLETED": set(),
}

def serialize_order(order: Order) -> dict:
    return {
        "id": order.id,
        "order_number": order.order_number,
        "table_number": order.table.table_number,
        "status": order.status,
        "special_instructions": order.special_instructions,
        "subtotal": str(order.subtotal),
        "tax_amount": str(order.tax_amount),
        "total": str(order.total),
        "estimated_minutes": order.estimated_minutes,
        "bill_requested": order.bill_requested,
        "created_at": order.created_at.isoformat(),
        "items": [{
            "id": x.id,
            "menu_item_id": x.menu_item_id,
            "item_name": x.item_name_snapshot,
            "unit_price": str(x.unit_price),
            "quantity": x.quantity,
            "line_total": str(x.line_total),
        } for x in order.items],
    }

def create_order(db: Session, payload) -> Order:
    table = db.scalar(select(RestaurantTable).where(RestaurantTable.qr_token == payload.qr_token))
    if not table or not table.is_active:
        raise HTTPException(404, "Invalid or inactive table QR")
    existing = db.scalar(select(Order).where(Order.table_id == table.id, Order.status != "COMPLETED"))
    if existing:
        raise HTTPException(409, f"Table already has active order {existing.order_number}")

    ids = [x.menu_item_id for x in payload.items]
    menu_rows = db.scalars(select(MenuItem).where(MenuItem.id.in_(ids))).all()
    menu = {x.id: x for x in menu_rows}
    if len(menu) != len(set(ids)):
        raise HTTPException(400, "One or more menu items are invalid")

    subtotal = Decimal("0.00")
    longest_prep = 0
    item_count = 0
    prepared = []
    for requested in payload.items:
        item = menu[requested.menu_item_id]
        if not item.available:
            raise HTTPException(409, f"{item.name} is sold out")
        line = (item.price * requested.quantity).quantize(Decimal("0.01"))
        subtotal += line
        longest_prep = max(longest_prep, item.prep_minutes)
        item_count += requested.quantity
        prepared.append((item, requested.quantity, line))

    active_orders = db.scalar(select(__import__('sqlalchemy').func.count(Order.id)).where(Order.status.in_(["PLACED","ACCEPTED","PREPARING","READY"]))) or 0
    estimated = longest_prep + max(0, item_count - 1) * 2 + min(int(active_orders) * 2, 10)
    tax_rate = Decimal(str(get_settings().tax_rate))
    tax = (subtotal * tax_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total = (subtotal + tax).quantize(Decimal("0.01"))

    try:
        order = Order(table_id=table.id, status="PLACED", special_instructions=payload.special_instructions,
                      subtotal=subtotal, tax_amount=tax, total=total, estimated_minutes=estimated)
        db.add(order)
        db.flush()
        order.order_number = f"DINE-{1000 + order.id}"
        for item, qty, line in prepared:
            db.add(OrderItem(order_id=order.id, menu_item_id=item.id, item_name_snapshot=item.name,
                             unit_price=item.price, quantity=qty, line_total=line))
        db.add(OrderStatusHistory(order_id=order.id, old_status=None, new_status="PLACED"))
        table.status = "OCCUPIED"
        db.add(ActivityLog(event_type="ORDER_PLACED", message=f"Table {table.table_number:02d} placed {order.order_number}"))
        db.commit()
        db.refresh(order)
        return order
    except Exception:
        db.rollback()
        raise

def change_status(db: Session, order: Order, new_status: str, allow_admin_override: bool = False) -> Order:
    new_status = new_status.upper()
    if new_status not in VALID_TRANSITIONS:
        raise HTTPException(400, "Unknown order status")
    if not allow_admin_override and new_status not in VALID_TRANSITIONS.get(order.status, set()):
        raise HTTPException(409, f"Invalid transition {order.status} → {new_status}")
    old = order.status
    order.status = new_status
    if new_status == "COMPLETED":
        order.completed_at = datetime.utcnow()
        order.table.status = "AVAILABLE"
    elif new_status in {"PREPARING", "READY"}:
        order.table.status = new_status
    elif new_status == "SERVED":
        order.table.status = "OCCUPIED"
    db.add(OrderStatusHistory(order_id=order.id, old_status=old, new_status=new_status))
    db.add(ActivityLog(event_type="ORDER_STATUS", message=f"{order.order_number}: {old} → {new_status}"))
    db.commit()
    db.refresh(order)
    return order
