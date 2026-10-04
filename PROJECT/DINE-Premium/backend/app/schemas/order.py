from decimal import Decimal
from pydantic import BaseModel, Field

class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int = Field(ge=1, le=20)

class OrderCreate(BaseModel):
    qr_token: str
    items: list[OrderItemCreate] = Field(min_length=1)
    special_instructions: str = Field(default="", max_length=500)

class StatusUpdate(BaseModel):
    status: str

class OrderItemOut(BaseModel):
    id: int
    menu_item_id: int
    item_name: str
    unit_price: Decimal
    quantity: int
    line_total: Decimal

class OrderOut(BaseModel):
    id: int
    order_number: str
    table_number: int
    status: str
    special_instructions: str
    subtotal: Decimal
    tax_amount: Decimal
    total: Decimal
    estimated_minutes: int
    bill_requested: bool
    created_at: str
    items: list[OrderItemOut]
