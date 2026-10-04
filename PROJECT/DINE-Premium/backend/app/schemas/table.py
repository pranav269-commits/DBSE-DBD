from pydantic import BaseModel, ConfigDict

class TableOut(BaseModel):
    id: int
    table_number: int
    qr_token: str
    status: str
    is_active: bool
    model_config = ConfigDict(from_attributes=True)
