from pydantic import BaseModel

class WaiterRequestCreate(BaseModel):
    qr_token: str
    order_id: int | None = None
