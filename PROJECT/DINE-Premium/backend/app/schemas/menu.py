from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

class MenuItemCreate(BaseModel):
    category_id: int
    name: str = Field(min_length=2, max_length=120)
    description: str = ""
    price: Decimal = Field(gt=0)
    image_url: str = ""
    veg: bool = True
    available: bool = True
    featured: bool = False
    prep_minutes: int = Field(default=15, ge=1, le=120)

class MenuItemUpdate(MenuItemCreate):
    pass

class MenuItemOut(MenuItemCreate):
    id: int
    category_name: str | None = None
    model_config = ConfigDict(from_attributes=True)
