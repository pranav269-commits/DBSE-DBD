"""Exercise actual HTTP behavior with FastAPI's TestClient."""
import importlib.util
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

spec = importlib.util.spec_from_file_location("product_api", Path(__file__).with_name("main.py"))
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)

RECORD = {'name': 'Wireless Mouse', 'category': 'Electronics', 'price': 799.0, 'stock': 25, 'description': 'USB wireless mouse'}
BASE = "/products"

@pytest.fixture
def client():
    api.products.clear()
    with TestClient(api.app) as session:
        yield session
    api.products.clear()

def test_crud_lifecycle(client):
    assert client.get(BASE).json() == []
    created = client.post(BASE + "/101", json=RECORD)
    assert created.status_code == 201
    assert created.json() == {"id": 101, **RECORD}
    assert client.get(BASE + "/101").json() == created.json()
    assert len(client.get(BASE).json()) == 1
    replacement = {**RECORD, "name": "Updated Name"}
    assert client.put(BASE + "/101", json=replacement).json() == {"id": 101, **replacement}
    patched = client.patch(BASE + "/101", json={"name": "Patched Name"})
    assert patched.status_code == 200
    assert patched.json() == {"id": 101, **RECORD, "name": "Patched Name"}
    assert client.delete(BASE + "/101").status_code == 200
    assert client.get(BASE + "/101").status_code == 404
    assert client.get(BASE).json() == []

def test_duplicate_id_does_not_overwrite(client):
    client.post(BASE + "/101", json=RECORD)
    assert client.post(BASE + "/101", json={**RECORD, "name": "Other"}).status_code == 409
    assert client.get(BASE + "/101").json()["name"] == RECORD["name"]

@pytest.mark.parametrize("method", ["get", "put", "patch", "delete"])
def test_missing_record(client, method):
    args = {"json": RECORD} if method == "put" else {"json": {"name": "Other"}} if method == "patch" else {}
    assert getattr(client, method)(BASE + "/999", **args).status_code == 404

@pytest.mark.parametrize("record", [{}, {'name': 'Wireless Mouse', 'category': 'Electronics', 'price': -1, 'stock': 25, 'description': 'USB wireless mouse'}, {'name': 'Wireless Mouse', 'category': 'Electronics', 'price': 799.0, 'stock': -1, 'description': 'USB wireless mouse'}, {'name': '  ', 'category': 'Electronics', 'price': 799.0, 'stock': 25, 'description': 'USB wireless mouse'}, {'name': 'Wireless Mouse', 'category': 'Electronics', 'price': 799.0, 'stock': 25, 'description': 'USB wireless mouse', 'extra': True}])
def test_create_validation(client, record):
    assert client.post(BASE + "/101", json=record).status_code == 422
    assert client.get(BASE).json() == []

@pytest.mark.parametrize("patch", [{}, {"name": None}, {"name": "   "}, {"id": 222}])
def test_invalid_patch_preserves_record(client, patch):
    client.post(BASE + "/101", json=RECORD)
    assert client.patch(BASE + "/101", json=patch).status_code == 422
    assert client.get(BASE + "/101").json() == {"id": 101, **RECORD}

def test_put_requires_complete_body(client):
    client.post(BASE + "/101", json=RECORD)
    assert client.put(BASE + "/101", json={"name": "Only Name"}).status_code == 422
    assert client.get(BASE + "/101").json() == {"id": 101, **RECORD}

def test_id_validation_and_sorted_list(client):
    assert client.post(BASE + "/0", json=RECORD).status_code == 422
    assert client.get(BASE + "/abc").status_code == 422
    client.post(BASE + "/102", json=RECORD)
    client.post(BASE + "/101", json=RECORD)
    assert [item["id"] for item in client.get(BASE).json()] == [101, 102]

def test_swagger_and_openapi(client):
    assert client.get("/docs").status_code == 200
    schema = client.get("/openapi.json").json()
    assert schema["info"]["title"] == "Product Management API"
    methods = schema["paths"][BASE + "/{product_id}"]
    assert {"get", "post", "put", "patch", "delete"} <= set(methods)
