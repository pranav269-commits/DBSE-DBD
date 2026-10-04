"""Product Management: a FastAPI practical demonstrating five HTTP methods.

Data is stored in memory and resets on restart. Run one Uvicorn worker.
"""
from typing import Annotated

from fastapi import FastAPI, HTTPException, Path
from pydantic import BaseModel, ConfigDict, Field, model_validator

app = FastAPI(
    title="Product Management API",
    version="1.0.0",
    description=("A practical demonstration of GET, POST, PUT, PATCH and DELETE. "
                 "Use Try it out to execute requests. Records are stored in memory "
                 "and reset when the server restarts."),
    openapi_tags=[{"name": "Products", "description": "Create, read, replace, partially update and delete products."}],
    swagger_ui_parameters={"displayRequestDuration": True, "defaultModelsExpandDepth": -1},
)

class ProductBase(BaseModel):
    """Complete request body for POST and PUT."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True,
                             json_schema_extra={"examples": [{'name': 'Wireless Mouse', 'category': 'Electronics', 'price': 799.0, 'stock': 25, 'description': 'USB wireless mouse'}]})
    name: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=100)
    price: float = Field(ge=0, allow_inf_nan=False)
    stock: int = Field(ge=0)
    description: str = Field(min_length=1, max_length=500)

class ProductUpdate(BaseModel):
    """PATCH accepts only the fields that need to change."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True,
                             json_schema_extra={"examples": [{'stock': 30}]})
    name: str | None = Field(default=None, min_length=1, max_length=100)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    price: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    stock: int | None = Field(default=None, ge=0)
    description: str | None = Field(default=None, min_length=1, max_length=500)

    @model_validator(mode="after")
    def validate_changes(self):
        changes = self.model_dump(exclude_unset=True)
        if not changes:
            raise ValueError("Provide at least one field to update")
        if any(value is None for value in changes.values()):
            raise ValueError("Fields cannot be null; omit fields you do not want to change")
        return self

class ProductResponse(ProductBase):
    id: int = Field(gt=0, description="Unique positive record ID")

products: dict[int, ProductResponse] = {}
RecordId = Annotated[int, Path(gt=0, description="Unique positive ID", examples=[101])]
ERRORS = {404: {"description": "Record not found"}}

def require_product(product_id: int) -> ProductResponse:
    if product_id not in products:
        raise HTTPException(status_code=404, detail="Product not found")
    return products[product_id]

@app.get("/products", response_model=list[ProductResponse], tags=["Products"], summary="List all products")
async def list_products():
    return [products[key] for key in sorted(products)]

@app.get("/products/{product_id}", response_model=ProductResponse, tags=["Products"],
         summary="Get a product by ID", responses=ERRORS)
async def get_product(product_id: RecordId):
    return require_product(product_id)

@app.post("/products/{product_id}", response_model=ProductResponse, status_code=201,
          tags=["Products"], summary="Create a product", responses={409: {"description": "ID already exists"}})
async def create_product(product_id: RecordId, product: ProductBase):
    if product_id in products:
        raise HTTPException(status_code=409, detail="Product ID already exists")
    record = ProductResponse(id=product_id, **product.model_dump())
    products[product_id] = record
    return record

@app.put("/products/{product_id}", response_model=ProductResponse, tags=["Products"],
         summary="Replace all product details", responses=ERRORS)
async def replace_product(product_id: RecordId, product: ProductBase):
    require_product(product_id)
    record = ProductResponse(id=product_id, **product.model_dump())
    products[product_id] = record
    return record

@app.patch("/products/{product_id}", response_model=ProductResponse, tags=["Products"],
           summary="Update selected product details", responses=ERRORS)
async def patch_product(product_id: RecordId, changes: ProductUpdate):
    current = require_product(product_id)
    record = ProductResponse(**{**current.model_dump(), **changes.model_dump(exclude_unset=True)})
    products[product_id] = record
    return record

@app.delete("/products/{product_id}", tags=["Products"], summary="Delete a product", responses=ERRORS)
async def delete_product(product_id: RecordId):
    require_product(product_id)
    del products[product_id]
    return {"message": "Product deleted successfully", "id": product_id}
