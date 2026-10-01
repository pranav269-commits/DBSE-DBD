from pydantic import BaseModel

class PaymentCreate(BaseModel):
    payment_method: str
